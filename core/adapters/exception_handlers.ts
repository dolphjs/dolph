// e.g., in common/exceptions/validation.exception.ts
import { ValidationError } from 'class-validator';
// You might use a library like 'http-status-codes' for status codes
const HTTP_STATUS_BAD_REQUEST = 400;

export class ValidationException extends Error {
    public errors: ValidationError[];
    public status: number;

    constructor(errors: ValidationError[], message: string = 'Input validation failed') {
        super(message); // Message for the error
        this.name = 'ValidationException';
        this.errors = errors; // Array of validation errors from class-validator
        this.status = HTTP_STATUS_BAD_REQUEST;
        Object.setPrototypeOf(this, ValidationException.prototype); // Ensures 'instanceof ValidationException' works
    }
}
