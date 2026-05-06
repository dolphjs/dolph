import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.SERVICE_UNAVAILABLE` exception
 */
class ServiceUnavaliableException extends DefaultException {
    statusCode: number = HttpStatus.SERVICE_UNAVAILABLE;
    name = 'Service Unavailable';
}

export { ServiceUnavaliableException };
