import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

class UnSupportedMediaException extends DefaultException {
  statusCode: number = HttpStatus.UNSUPPORTED_MEDIA_TYPE;
  name: string = 'Unsupported Media Type';
}

export { UnSupportedMediaException };
