import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

class ForbiddenException extends DefaultException {
  statusCode: number = HttpStatus.FORBIDDEN;
  name: string = 'Forbidden';
}

export { ForbiddenException };
