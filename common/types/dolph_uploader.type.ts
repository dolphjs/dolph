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
  /**
   * accepts either **diskStorage** or **memoryStorage**
   *
   * defaults to *memoryStorage*
   *
   * @type {Storage}
   */
  storage?: Storage;
  /**
   * the name that file(s) sent to the dolph app will be identified by
   *
   * defaults to *upload*
   */
  fieldname?: string;
  /**
   * the limit in fileSize for media being processed
   *
   * defaults to *5MB*
   */
  limit?: number;

  /**
   * type of media process to use
   *
   * **single** accepts only one file
   *
   *
   * **array** accepts an array of files
   *
   * only when set to **array** does **maxCount** matter
   *
   * **fields** accepts fields/object of files
   *
   */
  type: 'single' | 'fields' | 'array';

  /**
   * @type {FileFilter}
   *
   * defaults to use the default *FileFilter* function which should suit most use-cases
   */
  fileFilter?: FileFilter;

  /**
   * specify what file extensions should be allowed in this format: **[".png", ".pdf"]**
   */
  extensions?: string[];

  /**
   * max count of files that can be uploaded
   *
   * only works when `type` is of *array*
   */
  maxCount?: number;

  /**
   * @type {UploadFields}
   */
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
