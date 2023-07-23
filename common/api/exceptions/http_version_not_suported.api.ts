import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

class HttpVersionUnSupportedException extends DefaultException {
  statusCode: number = HttpStatus.HTTP_VERSION_NOT_SUPPORTED;
  name: string = 'Http Version Not Supported';
}

export { HttpVersionUnSupportedException };
