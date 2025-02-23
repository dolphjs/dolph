import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.UNAUTHORIZED` exception
 */
class UnauthorizedException extends DefaultException {
    statusCode: number = HttpStatus.UNAUTHORIZED;
    name: string = 'Unauthorized';
}

export { UnauthorizedException };
