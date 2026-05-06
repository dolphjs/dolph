import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import clc from 'cli-color';
import { logger } from '../utilities';
import { ValidationException } from './adapters/exception_handlers';

export type TransformDtoOptions = {
    forbidNonWhitelisted?: boolean;
};

export async function transformAndValidateDto<T extends object>(
    dtoClass: ClassConstructor<T> | undefined,
    plainObject: any,
    contextDescription: string,
    options?: TransformDtoOptions,
): Promise<T> {
    const source = plainObject ?? {};
    if (!dtoClass) {
        return source as T;
    }
    if (typeof dtoClass !== 'function' || [String, Number, Boolean, Object].includes(dtoClass as any)) {
        logger.error(clc.red(`Invalid DTO class provided for ${contextDescription}. Received:, dtoClass`));
        throw new Error(`Dolph: Misconfigured DTO type for ${contextDescription}.`);
    }

    const dtoInstance = plainToInstance(dtoClass, source, {
        enableImplicitConversion: true,
    });

    const forbidNonWhitelisted = options?.forbidNonWhitelisted ?? true;

    const errors: ValidationError[] = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted,
    });

    if (errors.length > 0) {
        logger.error(clc.red(`Validation failed for ${contextDescription}:`), errors);
        throw new ValidationException(errors, `Validation failed for ${contextDescription}`);
    }

    return dtoInstance;
}
