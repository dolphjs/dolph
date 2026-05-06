import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.NOT_ACCEPTABLE` exception
 */
class NotAcceptableException extends DefaultException {
    statusCode: number = HttpStatus.NOT_ACCEPTABLE;
    name = 'Not Acceptable';
}

export { NotAcceptableException };
