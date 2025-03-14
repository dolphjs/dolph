import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.MISDIRECTED_REQUEST` exception
 */

class MisDirectedException extends DefaultException {
    statusCode: number = HttpStatus.MISDIRECTED_REQUEST;
    name: string = 'Misdirected Request';
}

export { MisDirectedException };
