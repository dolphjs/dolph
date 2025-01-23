import { DRequest } from '../interfaces';

export interface FileInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination?: string;
  filename?: string;
  path?: string;
  size?: number;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
}

export interface UploadConfig {
  limits?: Record<string, any>;
  preservePaths?: boolean;
  storage: Storage;
  fileFilter: FileFilter;
  fileStrategy: FileStrategy;
}

export type UploadOptionAndConfig = UploadConfig & Omit<UploadOptions, 'fileFilter'> & {};

export type FileFilter = (
  req: DRequest,
  file: FileInfo,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => void;

export type FileStrategy = 'NONE' | 'VALUE' | 'ARRAY' | 'OBJECT';

export type UploadOptions = {
  //defaults to memoryStorage
  storage?: Storage;
  // defaults to `Date.now() + '-' + file.originalname `
  fieldname?: string;
  // defaults to 5MB
  limit?: number;
  type: 'single' | 'fields' | 'array';
  fileFilter?: FileFilter;
  // this is an array containing allowed file extensions and only needed were `fileFilter` is not provided
  extensions?: string[];
  // max count of files, only used when type is array
  maxCount?: number;

  fields?: UploadFields[];
};

export type UploadFields = {
  name: string;
  maxCount?: number;
};

export interface Storage {
  handleFile: (req: DRequest, file: FileInfo, callback: (error: Error | null, info?: Partial<FileInfo>) => void) => void;
  removeFile: (req: DRequest, file: FileInfo, callback: (error: Error | null) => void) => void;
}

export interface FileRemoveCallback {
  (error: Error | null, storageErrors?: Error[]): void;
}
export interface FileHandler {
  (file: FileInfo, callback: (error: Error | null) => void): void;
}

export interface DiskStorageOptions {
  destination?:
    | string
    | ((req: DRequest, file: FileInfo, callback: (error: Error | null, destination: string) => void) => void);
  filename?: (req: DRequest, file: FileInfo, callback: (error: Error | null, filename: string) => void) => void;
}
