import multer from 'multer';
import { mediaType } from '..';

export interface IMediaParserOptions {
    extensions?: string[];
    type: mediaType;
    storage?: multer.DiskStorageOptions;
    fieldname: string;
    limit?: number;
}
