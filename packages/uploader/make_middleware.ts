import { IncomingMessage } from 'http';
import BBusboy, { Busboy } from 'busboy';
import { FileInfo, UploadConfig } from '../../common/types/dolph_uploader.type';
import { DRequest, DResponse } from '../../common';
import { FileAppender } from './file_appender';
import { Counter } from './counter';
import { DolphFIleUploaderError } from './errors/error_messages';
import { removeUploadedFiles } from './remove_uploaded_files';

export function isMultipart(req: IncomingMessage): boolean {
    const contentType = req.headers['content-type'] || '';
    return contentType.startsWith('multipart/');
}

function onRequestFinished(req: IncomingMessage, callback: () => void): void {
    req.on('end', callback);
    req.on('close', callback);
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

        let isDone = false;
        let readFinished = false;
        let errorOccurred = false;

        let uploadTimeOut: NodeJS.Timeout;

        function done(err?: any): void {
            if (isDone) return;
            isDone = true;

            // clear all  pending timeout
            if (uploadTimeOut) clearTimeout(uploadTimeOut);

            req.unpipe(busboy);
            drainStream(req);
            busboy.removeAllListeners();

            // onRequestFinished(req, () => next(err));

            // Force resolution with a setImmediate to ensure all callbacks are processed
            setImmediate(() => {
                next(err);
            });
        }

        /**
         * Todo: allow developer to set the modify the timeout from outside.
         */
        uploadTimeOut = setTimeout(() => {
            console.error('Upload middleware timed out');
            done(new Error('Upload process timed out'));
        }, 3000);

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

        busboy.on('field', (fieldname: string, value: any, fieldNameTruncated: boolean, valueTruncated: boolean) => {
            if (!fieldname) return abortWithCode('MISSING_FIELD_NAME');
            if (fieldNameTruncated) return abortWithCode('LIMIT_FIELD_KEY');
            if (valueTruncated) return abortWithCode('LIMIT_FIELD_VALUE', fieldname);

            if (options.limits?.fieldNameSize && fieldname.length > options.limits.fieldNameSize) {
                return abortWithCode('LIMIT_FIELD_KEY');
            }

            appendField(req.body!, fieldname, value);
        });

        busboy.on(
            'file',
            (fieldname: string, fileStream: NodeJS.ReadableStream, filename: any, encoding: string, mimetype: string) => {
                if (!fieldname) return fileStream.resume();

                if (options.limits?.fieldNameSize && fieldname.length > options.limits.fieldNameSize) {
                    return abortWithCode('LIMIT_FIELD_KEY');
                }

                const file: FileInfo = {
                    fieldname,
                    originalname: filename.filename || filename,
                    encoding: filename.encoding || encoding || '7bit',
                    mimetype: filename.mimeType || mimetype || 'application/octet-stream',
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
                    if (err || !includeFile) {
                        appender.removePlaceholder(placeholder);
                        return fileStream.resume();
                    }

                    let aborting = false;
                    pendingWrites.increment();

                    Object.defineProperty(file, 'stream', {
                        configurable: true,
                        enumerable: false,
                        value: fileStream,
                    });

                    fileStream.on('error', (streamErr: Error) => {
                        pendingWrites.decrement();
                        abortWithError(streamErr);
                    });

                    fileStream.on('limit', () => {
                        aborting = true;
                        abortWithCode('LIMIT_FILE_SIZE', fieldname);
                    });

                    options.storage.handleFile(req, file, (storageErr: Error | null, info?: Partial<FileInfo>) => {
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

        req.pipe(busboy);
    };
}
