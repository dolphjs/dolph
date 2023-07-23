import { AppRes } from '@dolphjs/core';
import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

class GoneException extends DefaultException {
  statusCode: number = HttpStatus.GONE;
  name: string = 'Gone';
}

export { GoneException };
