import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

class NotAcceptableException extends DefaultException {
  statusCode: number = HttpStatus.NOT_ACCEPTABLE;
  name: string = 'Not Acceptable';
}

export { NotAcceptableException };
