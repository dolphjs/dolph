import { AppRes } from '@dolphjs/core';
import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

/**
 * @returns `HttpStatus.GATEWAY_TIMEOUT` exception
 */
class TimeOutException extends DefaultException {
  statusCode: number = HttpStatus.GATEWAY_TIMEOUT;
  name: string = 'Gateway Time Out';
}

export { TimeOutException };
