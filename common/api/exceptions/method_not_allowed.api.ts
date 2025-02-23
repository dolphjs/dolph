import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.METHOD_NOT_ALLOWED` exception
 */

class MethodNotAllowedException extends DefaultException {
    statusCode: number = HttpStatus.METHOD_NOT_ALLOWED;
    name: string = 'Method Not Allowed';
}

export { MethodNotAllowedException };
