import { DefaultException } from './exceptions/default_exception.api';

/**
 * throws a new error exception including the stack, error and message
 * similar to `DefaultException`
 *
 */
class ErrorException extends DefaultException {}
export { ErrorException };
