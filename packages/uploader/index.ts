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

export const useFileUploader =
  ({ storage, fileFilter, extensions }: UploadOptions) =>
  (req, res: DResponse, next) => {
    let filter = fileFilter;

    if (filter) {
      let _extensions = defaultFileExtensions;

      if (extensions?.length) {
        _extensions = extensions;
      }

      filter = (req: DRequest, file: FileInfo, callback) => {
        const extensionCheck = _extensions.includes(extname(file.originalname).toLowerCase());

        if (!extensionCheck && file.originalname !== 'blob') {
          callback(next(res.status(400).json({ message: 'The media file you sent is not unsupported' })), false);
        } else {
          callback(null, true);
        }
      };
    }

    fileUploader({
      storage: storage || memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: filter,
      type: 'single',
      fieldname: 'upload',
    });

    next();
  };

export { fileUploader, diskStorage, memoryStorage };
