export { DolphFIleUploaderError as DFileUploaderError } from './errors/error_messages';
import { extname } from 'path';
import { DRequest, DResponse } from '../../common';
import { FileInfo, UploadOptions } from '../../common/types/dolph_uploader.type';
import { defaultFileExtensions } from '../../utilities/media/file_extensions.utilities';
import { diskStorage, fileUploader, memoryStorage } from './file_uploader';

/**
 * diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
              cb(null, Date.now() + '-' + file.originalname);
            },
 */

/**
 *  Use this middleware to process media files
 *  @version 1.4.0
 *
 * @author Utee
 *
 */
export const useFileUploader =
    ({ storage, fileFilter, extensions, type, fieldname, fields, limit, maxCount }: UploadOptions) =>
    (req, res: DResponse, next) => {
        let _filter = fileFilter;

        if (!_filter) {
            let _extensions = extensions?.length ? extensions : defaultFileExtensions;

            _filter = (req: DRequest, file: FileInfo, callback) => {
                const extensionCheck = _extensions.includes(extname(file.originalname).toLowerCase());

                if (!extensionCheck && file.originalname !== 'blob') {
                    return callback(new Error('Unsupported media file'), false);
                }

                return callback(null, true);
            };
        }

        const uploadMiddleware = fileUploader({
            storage: storage || memoryStorage(),
            limits: {
                fileSize: limit || 5 * 1024 * 1024, // 5MB
            },
            fieldname: fieldname || 'upload',
            fileFilter: _filter,
            type,
            maxCount,
            fields,
        });

        uploadMiddleware(req, res, next);
    };

export { fileUploader, diskStorage, memoryStorage };
