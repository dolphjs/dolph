import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import BBusboy, { Busboy } from 'busboy';
import { FileInfo, UploadConfig } from '../../common/types/dolph_uploader.type';
import { DRequest, DResponse } from '../../common';
import { inAppLogger } from '../../utilities';
import { DefaultException } from '../../common/api/exceptions/default_exception.api';
import { HttpStatus } from '../../common/api/HttpStatus.api';
import { FileAppender } from './file_appender';
import { Counter } from './counter';
import { DolphFIleUploaderError } from './errors/error_messages';
import { removeUploadedFiles } from './remove_uploaded_files';

export function isMultipart(req: { headers: IncomingMessage['headers'] }): boolean {
    const contentType = req.headers['content-type'] || '';
    return contentType.startsWith('multipart/');
}

function appendField(target: Record<string, any>, key: string, value: any): void {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
        if (!Array.isArray(target[key])) {
            target[key] = [target[key]];
        }
        target[key].push(value);
    } else {
        target[key] = value;
    }
}

function drainStream(stream: NodeJS.ReadableStream): void {
    stream.on('readable', stream.read.bind(stream));
}

export function makeMiddleware(getOptions: () => UploadConfig & { fields?: Array<{ name: string; maxCount?: number }> }) {
    return function uploadMiddleware(req: DRequest, res: DResponse, next: (error?: any) => void): void {
        if (!isMultipart(req)) {
            return next();
        }

        // Express requests are the Node stream. Fastify keeps it on req.raw.
        const nodeRequest = (req.raw ?? req) as unknown as IncomingMessage;

        let options: ReturnType<typeof getOptions>;

        try {
            options = getOptions();
        } catch (error) {
            return next(error);
        }

        req.body = Object.create(null);

        let busboy: Busboy;
        try {
            busboy = BBusboy({
                headers: req.headers,
                limits: options.limits,
                preservePath: options.preservePaths,
            });
        } catch (error) {
            return next(error);
        }

        const appender = new FileAppender(options.fileStrategy, req);
        const pendingWrites = new Counter();
        const uploadedFiles: FileInfo[] = [];
        const activeStreams = new Set<Readable>();
        const remainingByField = new Map(
            (options.fields ?? []).map(({ name, maxCount }) => [name, maxCount ?? Infinity]),
        );

        let isDone = false;
        let readFinished = false;
        let errorOccurred = false;

        function done(err?: any): void {
            if (isDone) return;
            isDone = true;

            // clear all  pending timeout
            if (uploadTimeOut) clearTimeout(uploadTimeOut);

            const reqStream = nodeRequest as NodeJS.ReadableStream & { unpipe?: (dest: unknown) => void };
            if (typeof reqStream.unpipe === 'function') {
                reqStream.unpipe(busboy);
            }
            if (typeof reqStream.on === 'function') {
                drainStream(reqStream);
            }
            busboy.removeAllListeners();

            // onRequestFinished(req, () => next(err));

            // Force resolution with a setImmediate to ensure all callbacks are processed
            setImmediate(() => {
                next(err);
            });
        }

        const uploadTimeOut = setTimeout(() => {
            const timeoutError = new DefaultException('Upload process timed out', HttpStatus.REQUEST_TIMEOUT);

            // A stalled client never ends its stream, so the abort below would wait
            // forever for those writes. Destroying them lets storage clean up.
            abortWithError(timeoutError);
            activeStreams.forEach((stream) => stream.destroy(timeoutError));
        }, options.timeout ?? 30_000);

        function indicateDone(): void {
            if (readFinished && pendingWrites.isZero() && !errorOccurred) {
                done();
            }
        }

        function abortWithError(uploaderError: Error): void {
            if (errorOccurred) return;
            errorOccurred = true;

            pendingWrites.onceZero(() => {
                removeUploadedFiles(
                    uploadedFiles,
                    (file: FileInfo, cb: (error: Error | null) => void) => options.storage.removeFile(req, file, cb),
                    (err: Error | null, storageErrors: Error[]) => {
                        if (err) return done(err);
                        (uploaderError as any).storageErrors = storageErrors;
                        done(uploaderError);
                    },
                );
            });
        }

        function abortWithCode(code: string, field?: string): void {
            abortWithError(new DolphFIleUploaderError(code, field));
        }

        busboy.on('field', (fieldname: string, value: any, info: { nameTruncated: boolean; valueTruncated: boolean }) => {
            if (!fieldname) return abortWithCode('MISSING_FIELD_NAME');
            if (info.nameTruncated) return abortWithCode('LIMIT_FIELD_KEY');
            if (info.valueTruncated) return abortWithCode('LIMIT_FIELD_VALUE', fieldname);

            if (options.limits?.fieldNameSize && fieldname.length > options.limits.fieldNameSize) {
                return abortWithCode('LIMIT_FIELD_KEY');
            }

            appendField(req.body as Record<string, any>, fieldname, value);
        });

        busboy.on(
            'file',
            (fieldname: string, fileStream: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
                if (!fieldname) return fileStream.resume();

                if (options.limits?.fieldNameSize && fieldname.length > options.limits.fieldNameSize) {
                    return abortWithCode('LIMIT_FIELD_KEY');
                }

                // Checked before any bytes are stored, so an extra file costs nothing.
                const remaining = remainingByField.get(fieldname) ?? 0;
                if (remaining < 1) {
                    fileStream.resume();
                    return abortWithCode('LIMIT_UNEXPECTED_FILE', fieldname);
                }
                remainingByField.set(fieldname, remaining - 1);

                const file: FileInfo = {
                    fieldname,
                    originalname: info.filename || '',
                    encoding: info.encoding || '7bit',
                    mimetype: info.mimeType || 'application/octet-stream',
                };

                const placeholder = appender.insertPlaceholder(file);

                // if (!options.fileFilter) {
                //   // options.fileFilter = (req, file) => (err: Error | null, includeFile: boolean) => {
                //   //   if (err || !includeFile) {
                //   //     appender.removePlaceholder(placeholder);
                //   //     return fileStream.resume();
                //   //   }

                //   //   let aborting = false;
                //   //   pendingWrites.increment();

                //   //   Object.defineProperty(file, 'stream', {
                //   //     configurable: true,
                //   //     enumerable: false,
                //   //     value: fileStream,
                //   //   });

                //   //   fileStream.on('error', (err: Error) => {
                //   //     pendingWrites.decrement();
                //   //     abortWithError(err);
                //   //   });

                //   //   fileStream.on('limit', () => {
                //   //     aborting = true;
                //   //     abortWithCode('LIMIT_FILE_SIZE', fieldname);
                //   //   });

                //   //   options.storage.handleFile(req, file, (err: Error | null, info?: Partial<FileInfo>) => {
                //   //     if (aborting) {
                //   //       appender.removePlaceholder(placeholder);
                //   //       uploadedFiles.push({ ...file, ...info });
                //   //       return pendingWrites.decrement();
                //   //     }

                //   //     if (err) {
                //   //       appender.removePlaceholder(placeholder);
                //   //       pendingWrites.decrement();
                //   //       return abortWithError(err);
                //   //     }

                //   //     const fileInfo = { ...file, ...info };
                //   //     appender.replacePlaceholder(placeholder, fileInfo);
                //   //     uploadedFiles.push(fileInfo);
                //   //     pendingWrites.decrement();
                //   //     indicateDone();
                //   //   });
                //   // };
                //   options.fileFilter = (_req, file, callback) => {
                //     callback(null, true);
                //   };
                // } else {
                //   options.fileFilter(req, file, (err: Error | null, includeFile: boolean) => {
                //     if (err || !includeFile) {
                //       appender.removePlaceholder(placeholder);
                //       return fileStream.resume();
                //     }

                //     let aborting = false;
                //     pendingWrites.increment();

                //     Object.defineProperty(file, 'stream', {
                //       configurable: true,
                //       enumerable: false,
                //       value: fileStream,
                //     });

                //     fileStream.on('error', (err: Error) => {
                //       pendingWrites.decrement();
                //       abortWithError(err);
                //     });

                //     fileStream.on('limit', () => {
                //       aborting = true;
                //       abortWithCode('LIMIT_FILE_SIZE', fieldname);
                //     });

                //     options.storage.handleFile(req, file, (err: Error | null, info?: Partial<FileInfo>) => {
                //       if (aborting) {
                //         appender.removePlaceholder(placeholder);
                //         uploadedFiles.push({ ...file, ...info });
                //         return pendingWrites.decrement();
                //       }

                //       if (err) {
                //         appender.removePlaceholder(placeholder);
                //         pendingWrites.decrement();
                //         return abortWithError(err);
                //       }

                //       const fileInfo = { ...file, ...info };
                //       appender.replacePlaceholder(placeholder, fileInfo);
                //       uploadedFiles.push(fileInfo);
                //       pendingWrites.decrement();
                //       indicateDone();
                //     });
                //   });
                // }

                options.fileFilter(req, file, (err: Error | null, includeFile: boolean) => {
                    if (err) {
                        appender.removePlaceholder(placeholder);
                        fileStream.resume();
                        return abortWithError(err);
                    }

                    if (!includeFile) {
                        appender.removePlaceholder(placeholder);
                        return fileStream.resume();
                    }

                    let aborting = false;
                    pendingWrites.increment();

                    const source = fileStream as Readable;
                    const output = options.transformFile?.(file, source) ?? source;

                    activeStreams.add(output);

                    Object.defineProperty(file, 'stream', {
                        configurable: true,
                        enumerable: false,
                        value: output,
                    });

                    output.on('error', (streamErr: Error) => {
                        activeStreams.delete(output);
                        // Busboy waits for each file to be read before moving to the next.
                        source.resume();
                        pendingWrites.decrement();
                        abortWithError(streamErr);
                    });

                    fileStream.on('limit', () => {
                        aborting = true;
                        abortWithCode('LIMIT_FILE_SIZE', fieldname);
                    });

                    options.storage.handleFile(req, file, (storageErr: Error | null, info?: Partial<FileInfo>) => {
                        activeStreams.delete(output);

                        // A slow provider can finish after the request failed and its files were
                        // cleaned up, so nothing else will ever remove this one.
                        if (isDone) {
                            if (!storageErr) {
                                options.storage.removeFile(req, { ...file, ...info }, (removeErr) => {
                                    if (removeErr) inAppLogger.warn(`Could not remove upload: ${removeErr.message}`);
                                });
                            }
                            return;
                        }

                        if (aborting) {
                            appender.removePlaceholder(placeholder);
                            uploadedFiles.push({ ...file, ...info });
                            return pendingWrites.decrement();
                        }

                        if (storageErr) {
                            appender.removePlaceholder(placeholder);
                            pendingWrites.decrement();
                            return abortWithError(storageErr);
                        }

                        const fileInfo = { ...file, ...info };
                        appender.replacePlaceholder(placeholder, fileInfo);
                        uploadedFiles.push(fileInfo);
                        pendingWrites.decrement();
                        indicateDone();
                    });
                });
            },
        );

        busboy.on('error', (err: Error) => abortWithError(err));
        busboy.on('partsLimit', () => abortWithCode('LIMIT_PART_COUNT'));
        busboy.on('filesLimit', () => abortWithCode('LIMIT_FILE_COUNT'));
        busboy.on('fieldsLimit', () => abortWithCode('LIMIT_FIELD_COUNT'));
        busboy.on('finish', () => {
            readFinished = true;
            // this ensures that indicateDone is called in next tick
            setImmediate(indicateDone);
            // indicateDone();
        });

        nodeRequest.pipe(busboy);
    };
}
