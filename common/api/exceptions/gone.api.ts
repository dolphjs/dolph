import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.GONE` exception
 */
class GoneException extends DefaultException {
    statusCode: number = HttpStatus.GONE;
    name = 'Gone';
}

export { GoneException };
