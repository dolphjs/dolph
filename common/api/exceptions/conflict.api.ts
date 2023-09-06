import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.CONFLICT` exception
 */
class ConflictException extends DefaultException {
  statusCode: number = HttpStatus.CONFLICT;
  name: string = 'Conflict';
}

export { ConflictException };
