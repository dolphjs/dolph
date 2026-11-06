export { DolphFIleUploaderError as DFileUploaderError } from './errors/error_messages';
import { extname } from 'path';
import mime from 'mime-types';
import { DRequest, DResponse, UnSupportedMediaException } from '../../common';
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
            const _extensions = extensions?.length ? extensions : defaultFileExtensions;

            _filter = (req: DRequest, file: FileInfo, callback) => {
                // Browsers name a FormData Blob 'blob', so its declared type is all there is to check.
                const extension =
                    file.originalname === 'blob'
                        ? `.${mime.extension(file.mimetype)}`
                        : extname(file.originalname).toLowerCase();

                if (!_extensions.includes(extension)) {
                    return callback(new UnSupportedMediaException('Unsupported media file'), false);
                }

                return callback(null, true);
            };
        }

        // The bug is here at the fieldname upload 

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
