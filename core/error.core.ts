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

export const errorHandler = (err: any, req: DRequest, res: DResponse, next: DNextFunc) => {
    let statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    let message = err.message || 'An unexpected server error occurred';

    if (configs.NODE_ENV === 'production' && !err.isOperational) {
        if (!statusCode) {
            statusCode = httpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal Server Error';
        }
    }

    res.locals.errorMessage = message;

    const response = {
        code: statusCode,
        message,
        ...(configs.NODE_ENV === 'development' && { stack: err.stack }),
    };

    if (configs.NODE_ENV === 'test') {
        logger.error(clc.red(err));
    }

    res.set('Content-Type', 'application/json');
    res.status(statusCode).json(response);
};
