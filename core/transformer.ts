import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import clc from 'cli-color';
import { logger } from '../utilities';
import { ValidationException } from './adapters/exception_handlers';

export async function transformAndValidateDto<T extends object>(
    dtoClass: ClassConstructor<T> | undefined,
    plainObject: any,
    // e.g., "request body", "query parameters"
    contextDescription: string,
): Promise<T> {
    // Ensure dtoClass is a valid class constructor for DTOs
    if (!dtoClass || typeof dtoClass !== 'function' || [String, Number, Boolean, Object].includes(dtoClass as any)) {
        // Object constructor itself is not a DTO
        // This scenario should ideally be caught by the @DBody decorator's type checking.
        // However, if it somehow gets here, it's an internal error or misconfiguration.
        logger.error(clc.red(`Invalid DTO class provided for ${contextDescription}. Received:, dtoClass`));
        throw new Error(`Dolph: Misconfigured DTO type for ${contextDescription}.`);
    }

    const dtoInstance = plainToInstance(dtoClass, plainObject, {
        enableImplicitConversion: true,
    });

    const errors: ValidationError[] = await validate(dtoInstance, {
        // Remove properties that do not have any validation decorators
        whitelist: true,
        // Throw an error if non-whitelisted properties are present
        forbidNonWhitelisted: true,
        // validationError: { target: false }, // Optionally hide the target object in errors
    });

    if (errors.length > 0) {
        logger.error(clc.red(`Validation failed for ${contextDescription}:`), errors);
        throw new ValidationException(errors, `Validation failed for ${contextDescription}`);
    }

    return dtoInstance;
}
