import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.IM_A_TEAPOT` exception
 */

class ImTeaPotException extends DefaultException {
    statusCode: number = HttpStatus.IM_A_TEAPOT;
    name: string = "I'm  a Teapot";
}

export { ImTeaPotException };
