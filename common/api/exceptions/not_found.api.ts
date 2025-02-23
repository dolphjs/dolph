import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.NOT_FOUND` exception
 */

class NotFoundException extends DefaultException {
    statusCode: number = HttpStatus.NOT_FOUND;
    name: string = 'Not Found';
}

export { NotFoundException };
