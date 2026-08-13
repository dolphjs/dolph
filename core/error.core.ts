import { DNextFunc, DRequest, DResponse } from '../common';
import mongoose from 'mongoose';
import httpStatus from 'http-status';
import { configs } from './config.core';
import { logger } from '../utilities';
import clc from 'cli-color';
import { DefaultException } from '../common/api/exceptions/default_exception.api';

export const errorConverter = (err: any, req: DRequest, res: DResponse, next: DNextFunc) => {
    let error = err;

    if (!(error instanceof DefaultException)) {
        const statusCode =
            error.statusCode ||
            (error instanceof mongoose.Error ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR);
        const message = error.message || httpStatus[statusCode];
        error = new DefaultException(message, statusCode, false, err.stack);
    }

    next(error);
};

export const errorHandler = (err: any, req: DRequest, res: DResponse, _next: DNextFunc) => {
    let statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    let message = err.message || 'An unexpected server error occurred';

    if (configs.NODE_ENV === 'production' && !err.isOperational) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        message = 'Internal Server Error';
    }

    res.locals.errorMessage = message;

    // class-validator ValidationError[] attached by ValidationException —
    // flattened to field/messages pairs so DTO validation failures are
    // actionable instead of just a generic "validation failed" string.
    const errors: { field: string; messages: string[] }[] | undefined = Array.isArray(err.errors)
        ? err.errors.map((error: any) => ({
              field: error.property,
              messages: Object.values(error.constraints || {}) as string[],
          }))
        : undefined;

    const response = {
        code: statusCode,
        message,
        ...(errors?.length && { errors }),
        ...(configs.NODE_ENV === 'development' && { stack: err.stack }),
    };

    if (configs.NODE_ENV === 'test') {
        logger.error(clc.red(err));
    }

    // TODO: remove this to allow for other content types
    res.set('Content-Type', 'application/json');
    res.status(statusCode).json(response);
};
