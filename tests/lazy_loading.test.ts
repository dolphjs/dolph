import { execFileSync } from 'child_process';
import mongoose from 'mongoose';
import request from 'supertest';
import express, { Express } from 'express';
import { DolphFactory, MVCAdapter } from '../core';
import { errorConverter, errorHandler } from '../core/error.core';
import { DNextFunc, DRequest, DResponse, MongooseConfig } from '../common';
import { initMongo } from '../packages';
import { loadOptionalDriver } from '../utilities/load_optional_driver.utilities';

const OPTIONAL_PACKAGES = ['mongoose', 'typeorm', 'sequelize', 'socket.io', 'express-handlebars'];

// Runs in a fresh process: inside jest the registry is shared with this file's
// own imports, so it can't show what the framework alone pulls in.
const script = `
require('ts-node').register({ transpileOnly: true });
require('./index');
const loaded = ${JSON.stringify(OPTIONAL_PACKAGES)}.filter((name) =>
    Object.keys(require.cache).some((file) => file.includes('/node_modules/' + name + '/')),
);
process.stdout.write('RESULT' + JSON.stringify(loaded));
`;

const appThrowing = (error: unknown): Express => {
    const app = express();

    app.get('/', () => {
        throw error;
    });
    app.use((err: unknown, req: DRequest, res: DResponse, next: DNextFunc) => errorConverter(err, req, res, next));
    app.use(errorHandler);

    return app;
};

describe('Lazy loading optional packages', () => {
    it('should not load database, socket or view packages when the framework is imported', () => {
        const output = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' });

        expect(JSON.parse(output.split('RESULT')[1])).toEqual([]);
    }, 60_000);

    it('should load mongoose when a connection is requested', async () => {
        const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
        const config = { url: 'mongodb://localhost/test', options: {} } as MongooseConfig;

        await expect(initMongo(config)).resolves.toBe(mongoose);

        expect(connect).toHaveBeenCalledWith(config.url, config.options);
        connect.mockRestore();
    });

    it('should register handlebars when it is the configured view engine', () => {
        MVCAdapter.setViewEngine('handlebars');
        MVCAdapter.setStaticAssets('tests');
        MVCAdapter.setViewsDir('views');

        const engine = new DolphFactory([]).engine();

        expect((engine as unknown as { engines: Record<string, unknown> }).engines['.handlebars']).toBeDefined();
    });
});

describe('Missing database drivers', () => {
    it('should say which package to install', () => {
        const load = () => require('a-driver-that-is-not-installed');

        expect(() => loadOptionalDriver('a-driver-that-is-not-installed', load)).toThrow(
            'Run `npm install a-driver-that-is-not-installed`',
        );
    });

    it('should not hide errors from inside an installed driver', () => {
        const failure = Object.assign(new Error("Cannot find module 'its-own-dependency'"), { code: 'MODULE_NOT_FOUND' });

        expect(() =>
            loadOptionalDriver('mongoose', () => {
                throw failure;
            }),
        ).toThrow(failure);
    });

    it('should return the driver when it is installed', () => {
        expect(loadOptionalDriver('mongoose', () => mongoose)).toBe(mongoose);
    });
});

describe('Error conversion without mongoose loaded', () => {
    it('should return 400 for mongoose errors', async () => {
        const res = await request(appThrowing(new mongoose.Error('bad document'))).get('/');

        expect(res.status).toBe(400);
    });

    it('should return 400 for mongoose error subclasses', async () => {
        const res = await request(appThrowing(new mongoose.Error.ValidationError())).get('/');

        expect(res.status).toBe(400);
    });

    it('should return 500 for other errors', async () => {
        const res = await request(appThrowing(new Error('boom'))).get('/');

        expect(res.status).toBe(500);
    });

    it('should not throw when the thrown value has no prototype', async () => {
        const res = await request(appThrowing(Object.create(null))).get('/');

        expect(res.status).toBe(500);
    });
});
