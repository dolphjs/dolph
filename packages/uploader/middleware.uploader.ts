import Busboy from 'busboy';
import extend from 'xtend';
import { IncomingMessage, ServerResponse } from 'http';
import { Counter } from './counter.uploader';
import { DolphFIleUploaderError } from './errors/error_messages';
import { FileAppender } from './file_appender.uploader';
import { removeUploadedFiles } from './remove_uploaded_files';

function isMultipart(req: IncomingMessage): boolean {
  const contentType = req.headers['content-type'] || '';
  return contentType.startsWith('multipart/');
}

function onRequestFinished(req: IncomingMessage, callback: () => void): void {
  req.on('end', callback);
  req.on('close', callback);
}

function appendField(target: Record<string, any>, key: string, value: any): void {
  if (Object.prototype.hasOwnProperty.call(target, key)) {
    if (!Array.isArray(target[key])) {
      target[key] = [target[key]];
    }
    target[key].push(value);
  } else {
    target[key] = value;
  }
}

function drainStream(stream: IncomingMessage): void {
  stream.on('readable', stream.read.bind(stream));
}

interface SetupOptions {
  limits?: Record<string, any>;
  storage: any;
  fileFilter: (req: IncomingMessage, file: any, callback: (err: Error | null, includeFile: boolean) => void) => void;
  fileStrategy: string;
  preservePath: boolean;
}

export default function makeMiddleware(setup: () => SetupOptions) {
  return function DFileUploaderMiddleware(req: IncomingMessage, res: ServerResponse, next: (err?: any) => void): void {
    if (!isMultipart(req)) return next();

    const options = setup();

    const { limits, storage, fileFilter, fileStrategy, preservePath } = options;

    //@ts-expect-error
    req.body = Object.create(null);

    let busboy: Busboy;

    try {
      busboy = new Busboy({ headers: req.headers, limits, preservePath });
    } catch (error) {
      return next(error);
    }

    const appender = new FileAppender(fileStrategy, req);
    let isDone = false;
    let readFinished = false;
    let errorOccurred = false;
    const pendingWrites = new Counter();
    const uploadedFiles: Array<Record<string, any>> = [];

    function done(err?: any): void {
      if (isDone) return;
      isDone = true;

      req.unpipe(busboy);
      drainStream(req);
      busboy.removeAllListeners();

      onRequestFinished(req, () => next(err));
    }

    function indicateDone(): void {
      if (readFinished && pendingWrites.isZero() && !errorOccurred) done();
    }

    function abortWithError(uploaderError: Error): void {
      if (errorOccurred) return;
      errorOccurred = true;

      pendingWrites.onceZero(() => {
        const remove = (file: any, next: (err?: any) => void) => storage.removeFIle(req, file, next);

        removeUploadedFiles(uploadedFiles, remove, (err: any, storageErrors: any) => {
          if (err) return done(err);

          (uploaderError as any).storageErrors = storageErrors;
          done(uploaderError);
        });
      });
    }

    function abortWithCode(code: string, optionalFields?: string): void {
      abortWithError(new DolphFIleUploaderError(code, optionalFields));
    }

    busboy.on('field', (fieldname, value, fieldNameTruncated, valueTruncated) => {
      if (fieldname == null) return abortWithCode('MISSING_FIELD_NAME');
      if (fieldNameTruncated) return abortWithCode('LIMIT_FIELD_KEY');
      if (valueTruncated) return abortWithCode('LIMIT_FIELD_VALUE', fieldname);

      if (limits?.fieldNameSize && fieldname.length > limits.fieldNameSize) {
        return abortWithCode('LIMIT_FIELD_KEY');
      }

      //@ts-expect-error
      appendField(req.body, fieldname, value);
    });

    busboy.on('file', (fieldname, fileStream, filename, encoding, mimetype) => {
      if (!fieldname) return fileStream.resume();

      if (limits?.fieldNameSize && fieldname.length > limits.fieldNameSize) {
        return abortWithCode('LIMIT_FIELD_KEY');
      }

      const file = {
        fieldname,
        originalname: filename,
        encoding,
        mimetype,
      };

      const placeholder = appender.insertPlaceholder(file);

      fileFilter(req, file, (err, includeFile) => {
        if (err) {
          appender.removePlaceholder(placeholder);
          return fileStream.resume();
        }

        let aborting = false;
        pendingWrites.increment();

        Object.defineProperty(file, 'stream', {
          configurable: true,
          enumerable: false,
          value: fileStream,
        });

        fileStream.on('error', (err) => {
          pendingWrites.decrement();
          abortWithError(err);
        });

        fileStream.on('limit', () => {
          aborting = true;
          abortWithCode('LIMIT_FILE_SIZE', fieldname);
        });

        storage.handleFile(req, file, (err: any, info: any) => {
          if (aborting) {
            appender.removePlaceholder(placeholder);
            uploadedFiles.push(extend(file, info));
            return pendingWrites.decrement();
          }

          if (err) {
            appender.removePlaceholder(placeholder);
            pendingWrites.decrement();
            return abortWithError(err);
          }

          const fileInfo = extend(file, info);

          appender.replacePlaceholder(placeholder, fileInfo);
          uploadedFiles.push(fileInfo);
          pendingWrites.decrement();
          indicateDone();
        });
      });
    });

    busboy.on('error', (err) => abortWithError(err));
    busboy.on('partsLimit', () => abortWithCode('LIMIT_PART_COUNT'));
    busboy.on('filesLimit', () => abortWithCode('LIMIT_FILE_COUNT'));
    busboy.on('fieldsLimit', () => abortWithCode('LIMIT_FIELD_COUNT'));
    busboy.on('finish', () => {
      readFinished = true;
      indicateDone();
    });

    req.pipe(busboy);
  };
}
