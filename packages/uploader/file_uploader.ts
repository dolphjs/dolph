import concat_stream from 'concat-stream';
import { randomBytes } from 'crypto';
import { createWriteStream, mkdirSync, unlink } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  DiskStorageOptions,
  FileInfo,
  Storage,
  UploadConfig,
  UploadOptionAndConfig,
} from '../../common/types/dolph_uploader.type';
import { DRequest } from '../../common';
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
    this.getFilename = options.filename || defaultGetFilename;

    if (typeof options.destination === 'string') {
      createDirectory(options.destination);
      this.getDestination = (_req, _file, cb) => cb(null, options.destination as string);
    } else {
      this.getDestination = options.destination || defaultGetDestination;
    }
  }

  handleFile(req: DRequest, file: FileInfo, callback: (error: Error | null, info?: Partial<FileInfo>) => void): void {
    //@ts-expect-error
    this.getDestination(req, file, (err, destination) => {
      if (err) return callback(err);

      this.getFilename(req, file, (err, filename) => {
        if (err) return callback(err);

        const finalPath = join(destination, filename);
        const outStream = createWriteStream(finalPath);

        file.stream!.pipe(outStream);
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
    delete file.destination;
    delete file.filename;
    delete file.path;
    unlink(path!, callback);
  }
}

// MemoryStorage Implementation
class MemoryStorage implements Storage {
  handleFile(req: DRequest, file: FileInfo, callback: (error: Error | null, info?: Partial<FileInfo>) => void): void {
    file.stream!.pipe(
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
  if (options.type == 'single') {
    return makeMiddleware(
      () =>
        ({
          ...options,
          fileStrategy: 'VALUE',
          fields: [{ name: options.fieldname, maxCount: 1 }],
        } as UploadConfig),
    );
  } else if (options.type == 'array') {
    if (!options.maxCount) throw new Error('Provide the `maxCount` option');
    return makeMiddleware(
      () =>
        ({
          ...options,
          fileStrategy: 'ARRAY',
          fields: [{ name: options.fieldname, maxCount: options.maxCount }],
        } as UploadConfig),
    );
  } else if (options.type == 'fields') {
    if (!options.fields) throw new Error('Provide the `field` option');
    return makeMiddleware(
      () =>
        ({
          ...options,
          fileStrategy: 'OBJECT',
          fields: options.fields,
        } as UploadConfig),
    );
  } else {
    throw new Error('Provide a valid and supported type');
  }

  //   return {
  //     fields(fields: Array<{ name: string; maxCount?: number }>) {

  //     },

  //     none() {
  //       return makeMiddleware(
  //         () =>
  //           ({
  //             ...options,
  //             fileStrategy: 'NONE',
  //             fields: [],
  //           } as UploadConfig),
  //       );
  //     },

  //     any() {
  //       return makeMiddleware(
  //         () =>
  //           ({
  //             ...options,
  //             fileStrategy: 'ARRAY',
  //           } as UploadConfig),
  //       );
  //     },
  //   };
}

export const fileUploader = createUploadMiddleware;
export const diskStorage = (options: DiskStorageOptions) => new DiskStorage(options);
export const memoryStorage = () => new MemoryStorage();
