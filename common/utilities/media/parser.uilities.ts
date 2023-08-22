import multer from 'multer';
import { IMediaParserOptions } from '../../interfaces';
import { ErrorResponse, TryCatchAsyncFn } from '../..';
import { NextFunction, Request, Response } from 'express';
import { defaultFileExtensions } from './file_extensions.utilities';
import path from 'path';

const singleUpload = (storage: multer.DiskStorageOptions, fileFilter: multer.Options['fileFilter'], fieldName: string) => {
  const uploadFunc = multer({
    storage: multer.diskStorage(storage),
    fileFilter,
  }).single(fieldName);
  return uploadFunc;
};

const arrayUpload = (
  storage: multer.DiskStorageOptions,
  fileFilter: multer.Options['fileFilter'],
  fieldNames: string,
  limit: number,
) => {
  const uploadFunc = multer({
    storage: multer.diskStorage(storage),
    fileFilter,
  }).array(fieldNames, limit);
  return uploadFunc;
};

function MediaParser(options: IMediaParserOptions) {
  return (_target: any, _propertyKey: string, desccriptor?: TypedPropertyDescriptor<any>) => {
    const originalMethod = desccriptor.value;

    desccriptor.value = TryCatchAsyncFn(async (req: Request, res: Response, next: NextFunction) => {
      if (!req.headers['content-type'].startsWith('multipart/form-data')) {
        return ErrorResponse({
          res,
          status: 400,
          msg: 'The request body has no media file atached, epected `multipart/form-data`',
        });
      }

      const { fieldname, type, extensions, limit, storage } = options;

      let _extensions = defaultFileExtensions;

      if (extensions?.length) {
        _extensions = extensions;
      }

      const filter = (req: Request, file: Express.Multer.File, callback) => {
        // if (!file) return ErrorResponse({ res, status: 400, msg: 'The request body has no media file atached' });

        const extensionCheck = _extensions.includes(path.extname(file.originalname).toLowerCase());

        if (!extensionCheck && file.originalname !== 'blob') {
          callback(
            ErrorResponse({
              res,
              status: 400,
              msg: 'The media file you sent is not supported by this application',
            }),
            false,
          );
        } else {
          callback(null, true);
        }
      };

      if (type === 'single') {
        const uploadMiddleware = singleUpload(storage || {}, filter, fieldname);
        await new Promise<void>((resolve, reject) => {
          uploadMiddleware(req, res, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }

      if (type === 'array') {
        const uploadMiddleware = arrayUpload(storage || {}, filter, fieldname, limit || 10);
        await new Promise<void>((resolve, reject) => {
          uploadMiddleware(req, res, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } else {
        return originalMethod.apply(this, [req, res, next]);
      }
    });
  };
}

export { MediaParser };
