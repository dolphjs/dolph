import { ValidationError } from 'class-validator';
import { DefaultException } from '../../common/api/exceptions/default_exception.api';
import { HttpStatus } from '../../common/api/HttpStatus.api';

// Extends DefaultException (not a plain Error) so it flows through
// errorConverter's `instanceof DefaultException` check unchanged, preserving
// `errors` and the real 400 statusCode instead of being coerced to a generic
// 500 — DefaultException uses `statusCode`, not `status`, which is what
// errorConverter/errorHandler actually read.
export class ValidationException extends DefaultException {
    public errors: ValidationError[];

    constructor(errors: ValidationError[], message = 'Input validation failed') {
        super(message, HttpStatus.BAD_REQUEST, true);
        this.name = 'ValidationException';
        this.errors = errors; // Array of validation errors from class-validator
    }
}
