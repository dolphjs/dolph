import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

class NotModifiedException extends DefaultException {
  statusCode: number = HttpStatus.NOT_MODIFIED;
  name: string = 'Not Modified';
}

export { NotModifiedException };
