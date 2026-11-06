export { DolphFIleUploaderError as DFileUploaderError } from './errors/error_messages';
import { extname } from 'path';
import { Readable } from 'stream';
import mime from 'mime-types';
import { DRequest, DResponse, UnSupportedMediaException } from '../../common';
import { FileInfo, UploadOptions } from '../../common/types/dolph_uploader.type';
import { defaultFileExtensions } from '../../utilities/media/file_extensions.utilities';
import { cloudStorage, diskStorage, fileUploader, memoryStorage } from './file_uploader';
import { detectFileType, EXTENSION_TYPES, IMAGE_MIME_TYPES, SIGNATURE_BYTES } from './file_signature';
import { HeaderGuard, pipeInto } from './header_guard';

const DEFAULT_MAX_FIELDS = 100;

// Browsers name a FormData Blob 'blob', so its declared type is all there is to check.
const fileExtension = (file: FileInfo) =>
    file.originalname === 'blob' ? `.${mime.extension(file.mimetype)}` : extname(file.originalname).toLowerCase();

const verifyContent = (file: FileInfo, source: Readable): Readable => {
    const expected = EXTENSION_TYPES[fileExtension(file)];

    if (!expected) return source;

    return pipeInto(
        source,
        new HeaderGuard(SIGNATURE_BYTES, (header) => {
            const detected = detectFileType(header);

            if (!detected || !expected.includes(detected)) {
                throw new UnSupportedMediaException('File contents do not match its type');
            }

            file.mimetype = IMAGE_MIME_TYPES[detected] ?? file.mimetype;
        }),
    );
};

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
    ({
        storage,
        fileFilter,
        extensions,
        type,
        fieldname,
        fields,
        limit,
        maxCount,
        timeout,
        verifyContent: shouldVerifyContent = true,
        maxFields = DEFAULT_MAX_FIELDS,
    }: UploadOptions) =>
    (req, res: DResponse, next) => {
        let _filter = fileFilter;

        if (!_filter) {
            const _extensions = extensions?.length ? extensions : defaultFileExtensions;

            _filter = (req: DRequest, file: FileInfo, callback) => {
                if (!_extensions.includes(fileExtension(file))) {
                    return callback(new UnSupportedMediaException('Unsupported media file'), false);
                }

                return callback(null, true);
            };
        }

        const uploadMiddleware = fileUploader({
            storage: storage || memoryStorage(),
            limits: {
                fileSize: limit || 5 * 1024 * 1024, // 5MB
                fields: maxFields,
            },
            fieldname: fieldname || 'upload',
            fileFilter: _filter,
            type,
            maxCount,
            fields,
            timeout,
            transformFile: shouldVerifyContent ? verifyContent : undefined,
        });

        uploadMiddleware(req, res, next);
    };

export { fileUploader, diskStorage, memoryStorage, cloudStorage };
export { imageUpload } from './image_upload';
