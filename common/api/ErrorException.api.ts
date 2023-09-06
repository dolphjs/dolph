import { AppRes } from '@dolphjs/core';

/**
 * throws a new error exception including the stack, error and message
 * similar to `AppRes` from the `dolphjs@core` package
 *
 *  see [https://github.com/dolphjs/core]
 */
class ErrorException extends AppRes {}
export { ErrorException };
