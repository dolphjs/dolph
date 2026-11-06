import 'reflect-metadata';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import clc from 'cli-color';
import { logger } from '../utilities';
import { ValidationException } from './adapters/exception_handlers';

export type TransformDtoOptions = {
    forbidNonWhitelisted?: boolean;
};

const NON_DTO_TYPES = new Set<unknown>([String, Number, Boolean, Object]);

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
    if (typeof dtoClass !== 'function' || NON_DTO_TYPES.has(dtoClass)) {
        logger.error(clc.red(`Invalid DTO class provided for ${contextDescription}. Received: ${String(dtoClass)}`));
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
        // Not logged: bad client input isn't a server fault, the response already
        // names the failing fields, and a per-request log lets any client flood the logs.
        throw new ValidationException(errors, `Validation failed for ${contextDescription}`);
    }

    return dtoInstance;
}
