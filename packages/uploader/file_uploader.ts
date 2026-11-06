import concat_stream from 'concat-stream';
import { randomBytes } from 'crypto';
import { createWriteStream, mkdirSync, unlink } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable, Transform } from 'stream';
import {
    CloudStorageOptions,
    DiskStorageOptions,
    FileInfo,
    Storage,
    UploadConfig,
    UploadOptionAndConfig,
} from '../../common/types/dolph_uploader.type';
import { DRequest } from '../../common';
import { logger } from '../../utilities';
import { pipeInto } from './header_guard';
import { makeMiddleware } from './make_middleware';

/**
 * @version 2.0
 *
 * @author Utee
 */
class DiskStorage implements Storage {
    private getFilename: NonNullable<DiskStorageOptions['filename']>;
    private getDestination: NonNullable<DiskStorageOptions['destination']>;

    constructor(options: DiskStorageOptions = {}) {
        if (options.destination && typeof options.destination !== 'string') {
            throw new Error('Destination must be a string path');
        }

        this.getFilename = options.filename || defaultGetFilename;

        if (typeof options.destination === 'string') {
            createDirectory(options.destination);
            this.getDestination = (_req, _file, cb) => cb(null, options.destination as string);
        } else {
            this.getDestination = options.destination || defaultGetDestination;
        }
    }

    handleFile(req: DRequest, file: FileInfo, callback: (error: Error | null, info?: Partial<FileInfo>) => void): void {
        // @ts-expect-error legacy typing compatibility
        this.getDestination(req, file, (err, destination) => {
            if (err) return callback(err);

            this.getFilename(req, file, (err, filename) => {
                if (err) return callback(err);

                if (!file.stream) return callback(new Error('file stream is missing'));

                // Naming a file is async, so a rejected upload can already be gone by now.
                // Its error has fired, so nothing below would ever clean up the new file.
                if ((file.stream as Readable).destroyed) return callback(new Error('upload was cancelled'));

                const finalPath = join(destination, filename);
                const outStream = createWriteStream(finalPath);

                // pipe() leaves the destination open when its source fails, which
                // would keep a partial file on disk.
                file.stream.on('error', () => {
                    // The file can still be opening, and removing it before that finishes
                    // would leave an empty file behind.
                    outStream.once('close', () => {
                        unlink(finalPath, (unlinkError) => {
                            if (unlinkError && unlinkError.code !== 'ENOENT') {
                                logger.warn(`Could not remove partial upload ${filename}: ${unlinkError.message}`);
                            }
                        });
                    });
                    outStream.destroy();
                });

                file.stream.pipe(outStream);
                outStream.on('error', callback);
                outStream.on('finish', () => {
                    callback(null, {
                        destination,
                        filename,
                        path: finalPath,
                        size: outStream.bytesWritten,
                    });
                });
            });
        });
    }

    removeFile(req: DRequest, file: FileInfo, callback: (error: Error | null) => void): void {
        const path = file.path;
        if (!path) return callback(new Error('file path is missing'));
        delete file.destination;
        delete file.filename;
        delete file.path;
        unlink(path, callback);
    }
}

// MemoryStorage Implementation
class MemoryStorage implements Storage {
    handleFile(req: DRequest, file: FileInfo, callback: (error: Error | null, info?: Partial<FileInfo>) => void): void {
        if (!file.stream) return callback(new Error('file stream is missing'));
        file.stream.pipe(
            concat_stream({ encoding: 'buffer' }, (data: Buffer) => {
                callback(null, {
                    buffer: data,
                    size: data.length,
                });
            }),
        );
    }

    removeFile(req: DRequest, file: FileInfo, callback: (error: Error | null) => void): void {
        delete file.buffer;
        callback(null);
    }
}

class CloudStorage implements Storage {
    constructor(private readonly options: CloudStorageOptions) {}

    handleFile(req: DRequest, file: FileInfo, callback: (error: Error | null, info?: Partial<FileInfo>) => void): void {
        if (!file.stream) return callback(new Error('file stream is missing'));

        // Providers don't report a size, and a file's final size is only known once it's sent.
        // A Transform rather than a `data` listener, which would start the stream flowing
        // and lose the start of the file for a provider that does async work first.
        let size = 0;
        const counted = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
                size += chunk.length;
                callback(null, chunk);
            },
        });

        // A provider may not be listening yet, and an unheard stream error crashes the
        // process. The failure still reaches the request through `file.stream`.
        counted.on('error', () => undefined);

        const stream = pipeInto(file.stream as Readable, counted);

        this.options.put(file, stream, req).then(
            (result) => callback(null, { ...result, size }),
            (error) => callback(error),
        );
    }

    removeFile(req: DRequest, file: FileInfo, callback: (error: Error | null) => void): void {
        this.options.remove(file, req).then(
            () => callback(null),
            (error) => callback(error),
        );
    }
}

// Default file filter — accepts all files unless the caller provides their own
function defaultFileFilter(_req: DRequest, _file: FileInfo, callback: (error: Error | null, acceptFile: boolean) => void): void {
    callback(null, true);
}

// Helper functions
function defaultGetFilename(
    _req: DRequest,
    _file: FileInfo,
    callback: (error: Error | null, filename: string) => void,
): void {
    randomBytes(16, (err, raw) => {
        callback(err, err ? '' : raw.toString('hex'));
    });
}

function defaultGetDestination(
    _req: DRequest,
    _file: FileInfo,
    callback: (error: Error | null, destination: string) => void,
): void {
    callback(null, tmpdir());
}

function createDirectory(destination: string): void {
    try {
        mkdirSync(destination, { recursive: true });
    } catch (error: any) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

// Middleware creator function
function createUploadMiddleware(options: Partial<UploadOptionAndConfig> = {}) {
    if (!options.fieldname) throw new Error('Provide the `fieldname` option');

    const fileFilter = options.fileFilter ?? defaultFileFilter;

    if (options.type == 'single') {
        return makeMiddleware(
            () =>
                ({
                    ...options,
                    fileFilter,
                    fileStrategy: 'VALUE',
                    fields: [{ name: options.fieldname, maxCount: 1 }],
                }) as UploadConfig,
        );
    } else if (options.type == 'array') {
        if (!options.maxCount) throw new Error('Provide the `maxCount` option');
        return makeMiddleware(
            () =>
                ({
                    ...options,
                    fileFilter,
                    fileStrategy: 'ARRAY',
                    fields: [{ name: options.fieldname, maxCount: options.maxCount }],
                }) as UploadConfig,
        );
    } else if (options.type == 'fields') {
        if (!options.fields) throw new Error('Provide the `field` option');
        return makeMiddleware(
            () =>
                ({
                    ...options,
                    fileFilter,
                    fileStrategy: 'OBJECT',
                    fields: options.fields,
                }) as UploadConfig,
        );
    } else {
        throw new Error('Provide a valid and supported type');
    }
}

export const fileUploader = createUploadMiddleware;
export const diskStorage = (options: DiskStorageOptions) => new DiskStorage(options);
export const memoryStorage = () => new MemoryStorage();
/** Streams uploads to any provider, such as S3 or Cloudinary, through a `put` and `remove` you supply. */
export const cloudStorage = (options: CloudStorageOptions) => new CloudStorage(options);
