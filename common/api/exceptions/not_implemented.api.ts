import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.NOT_IMPLEMENTED` exception
 */

class NotImplementedException extends DefaultException {
  statusCode: number = HttpStatus.NOT_IMPLEMENTED;
  name: string = 'Not Implemented';
}

export { NotImplementedException };
