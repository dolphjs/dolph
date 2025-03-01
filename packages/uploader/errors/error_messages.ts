const errorMessages = {
    LIMIT_PART_COUNT: 'Too many parts',
    LIMIT_FILE_SIZE: 'File too large',
    LIMIT_FILE_COUNT: 'Too many files',
    LIMIT_FIELD_KEY: 'Field name too long',
    LIMIT_FIELD_VALUE: 'Field value too long',
    LIMIT_FIELD_COUNT: 'Too many fields',
    LIMIT_UNEXPECTED_FILE: 'Unexpected field',
    MISSING_FIELD_NAME: 'Field name missing',
};

export class DolphFIleUploaderError extends Error {
    private code: string;
    private field: string;

    constructor(code: string, field: string) {
        super(errorMessages[code]);

        this.name = 'UploaderError';

        this.code = code;

        if (field) {
            this.field = field;
        }
        Error.captureStackTrace(this, DolphFIleUploaderError);
    }
}
