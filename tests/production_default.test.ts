import express, { Express } from 'express';
import request from 'supertest';
import { configs, resolveNodeEnv } from '../core/config.core';
import { errorConverter, errorHandler } from '../core/error.core';
import { BadRequestException, DNextFunc, DRequest, DResponse } from '../common';

const appThrowing = (error: unknown): Express => {
    const app = express();

    app.get('/', () => {
        throw error;
    });
    app.use((err: unknown, req: DRequest, res: DResponse, next: DNextFunc) => errorConverter(err, req, res, next));
    app.use(errorHandler);

    return app;
};

const clientError = () => Object.assign(new Error('Unexpected token in JSON at /srv/app'), { statusCode: 400 });

describe('resolveNodeEnv', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it.each([
        [undefined, undefined, 'production'],
        ['development', undefined, 'development'],
        [undefined, 'development', 'development'],
        ['development', 'development', 'development'],
        [undefined, 'production', 'production'],
        ['production', undefined, 'production'],
        ['production', 'development', 'production'],
        ['development', 'production', 'production'],
        ['staging', undefined, 'staging'],
        ['test', 'development', 'test'],
        ['', undefined, 'production'],
    ])('should resolve NODE_ENV=%s and env=%s to %s', (nodeEnv, configEnv, expected) => {
        if (nodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = nodeEnv;

        expect(resolveNodeEnv(configEnv)).toBe(expected);
    });
});

describe('Error details by environment', () => {
    const originalEnv = configs.NODE_ENV;

    afterEach(() => {
        configs.NODE_ENV = originalEnv;
    });

    describe.each(['production', 'staging', 'test'])('in %s', (env) => {
        beforeEach(() => {
            configs.NODE_ENV = env;
        });

        it('should hide the message and stack of unexpected errors', async () => {
            const res = await request(appThrowing(new Error('connect ECONNREFUSED db.internal:5432'))).get('/');

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ code: 500, message: 'Internal Server Error' });
        });

        it('should keep the status of client errors but hide their message', async () => {
            const res = await request(appThrowing(clientError())).get('/');

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ code: 400, message: 'Bad Request' });
        });

        it('should keep the message of exceptions thrown on purpose', async () => {
            const res = await request(appThrowing(new BadRequestException('email is taken'))).get('/');

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('email is taken');
            expect(res.body.stack).toBeUndefined();
        });
    });

    it('should show the message and stack in development', async () => {
        configs.NODE_ENV = 'development';

        const res = await request(appThrowing(new Error('connect ECONNREFUSED'))).get('/');

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('connect ECONNREFUSED');
        expect(res.body.stack).toContain('Error: connect ECONNREFUSED');
    });
});
