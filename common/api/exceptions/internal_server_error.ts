import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.INTERNAL_SERVER_ERROR` exception
 */
class InternalServerErrorException extends DefaultException {
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    name: string = 'Internal Server Error';
}

export { InternalServerErrorException };
