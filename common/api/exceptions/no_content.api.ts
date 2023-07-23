import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

class NoContentException extends DefaultException {
  statusCode: number = HttpStatus.NO_CONTENT;
  name: string = 'No Content';
}

export { NoContentException };
