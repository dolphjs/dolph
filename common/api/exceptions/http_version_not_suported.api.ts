import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.HTTP_VERSION_NOT_SUPPORTED` exception
 */
class HttpVersionUnSupportedException extends DefaultException {
  statusCode: number = HttpStatus.HTTP_VERSION_NOT_SUPPORTED;
  name: string = 'Http Version Not Supported';
}

export { HttpVersionUnSupportedException };
