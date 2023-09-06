import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.BAD_GATEWAY` exception
 */
class BadGatewayException extends DefaultException {
  statusCode: number = HttpStatus.BAD_GATEWAY;
  name: string = 'Bad Gateway';
}

export { BadGatewayException };
