import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.BAD_REQUEST` exception
 */
class BadRequestException extends DefaultException {
    statusCode: number = HttpStatus.BAD_REQUEST;
    name: string = 'Bad Request';
}

export { BadRequestException };
