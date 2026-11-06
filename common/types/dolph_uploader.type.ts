import { Readable } from 'stream';
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
    /** Where cloud storage put the file. */
    url?: string;
    /** What cloud storage calls the file, for removing it later. */
    key?: string;
    /** Set by `imageUpload()`. */
    width?: number;
    /** Set by `imageUpload()`. */
    height?: number;
}

/** A file from `imageUpload()`, whose dimensions are always known. */
export type UploadedImage = FileInfo & { width: number; height: number };

export interface UploadConfig {
    limits?: Record<string, any>;
    preservePaths?: boolean;
    storage: Storage;
    fileFilter: FileFilter;
    fileStrategy: FileStrategy;
    /** Upload processing timeout in milliseconds. Defaults to 30 000 ms. */
    timeout?: number;
    /** Runs a file through extra streams before storage, and returns the last one. */
    transformFile?: (file: FileInfo, source: Readable) => Readable;
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
     * Upload processing timeout in milliseconds.
     * Defaults to 30 000 ms.
     */
    timeout?: number;

    /**
     * Checks that each file's contents match its extension, for the types with a known
     * signature. Set to `false` for formats a signature check would wrongly reject.
     *
     * defaults to *true*
     */
    verifyContent?: boolean;

    /**
     * the most text fields a request can carry
     *
     * defaults to *100*
     */
    maxFields?: number;

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

export type ImageType = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'avif' | 'heic';

export type ImageOutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';

export type ImageResizeOptions = {
    width?: number;
    height?: number;
    /** How the image fits the box. Defaults to `inside`, which keeps its proportions. */
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    /** Defaults to `true`, so small images stay as they are. */
    withoutEnlargement?: boolean;
};

export type ImageUploadOptions = {
    /** The form field holding the image. Defaults to `image`. */
    field?: string;
    /** A size like `'5mb'`, or a number of bytes. Defaults to `5mb`. */
    maxSize?: string | number;
    /** The most pixels one image can have. Defaults to 40 million. */
    maxPixels?: number;
    /** Above 1, images arrive on `req.files`. Defaults to 1. */
    maxCount?: number;
    /** The most text fields a request can carry. Defaults to 100. */
    maxFields?: number;
    /** Defaults to `jpeg`, `png`, `webp` and `gif`. */
    types?: ImageType[];
    /** Defaults to *memoryStorage*. */
    storage?: Storage;
    /** Upload processing timeout in milliseconds. Defaults to 30 000 ms. */
    timeout?: number;
    /** Keeps EXIF data, which can include GPS location. Defaults to `false`. Needs no `sharp`. */
    keepMetadata?: boolean;
    /** Needs `sharp`. */
    resize?: ImageResizeOptions;
    /** Converts every image to this format. Needs `sharp`. */
    format?: ImageOutputFormat;
    /** Output quality from 1 to 100. Needs `sharp`. */
    quality?: number;
};

export type CloudStorageResult = Pick<FileInfo, 'url' | 'key'> & Record<string, unknown>;

export interface CloudStorageOptions {
    /** Sends the file somewhere and resolves with what's needed to find it again. */
    put: (file: FileInfo, stream: Readable, req: DRequest) => Promise<CloudStorageResult>;
    /** Removes a file `put` stored, when the rest of its request failed. */
    remove: (file: FileInfo, req: DRequest) => Promise<unknown>;
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
