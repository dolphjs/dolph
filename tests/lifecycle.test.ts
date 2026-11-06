import { Server } from 'http';
import { AddressInfo, createServer as createNetServer } from 'net';
import request from 'supertest';
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DolphFactory } from '../core';
import { Component, Get, Route } from '../decorators';
import { getDataSource } from '../packages';
import { inAppLogger } from '../utilities';
import { useConfig } from './utils/isolated_config';

@Entity()
class LifecycleUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}

let releaseSlow: () => void;

@Route('life')
class LifeController {
    @Get('ping')
    ping() {
        return { pong: true };
    }

    @Get('slow')
    async slow() {
        await new Promise<void>((resolve) => {
            releaseSlow = resolve;
        });
        return { slow: true };
    }
}

@Component({ controllers: [LifeController], services: [] })
class LifeComponent {}

const sqlite = {
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [__filename],
    synchronize: true,
    logging: false,
};

// Nothing is listening on port 1, and the short timeout keeps the failure fast.
const unreachableMongo = { url: 'mongodb://127.0.0.1:1/dolph', options: { serverSelectionTimeoutMS: 50 } };

const addressOf = (server: Server) => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

describe('DolphFactory lifecycle', () => {
    let restoreConfig: (() => void) | undefined;
    const started: DolphFactory[] = [];

    const factory = (config: object | null = {}) => {
        restoreConfig = useConfig(config);

        const dolph = new DolphFactory([LifeComponent]);
        started.push(dolph);

        return dolph;
    };

    beforeEach(() => {
        process.env.PORT = '0';
        // start() installs process-wide handlers, and these would outlive a failed test.
        jest.spyOn(process, 'on').mockImplementation(() => process);
    });

    afterEach(async () => {
        await Promise.all(started.splice(0).map((dolph) => dolph.stop()));
        restoreConfig?.();
        restoreConfig = undefined;
        delete process.env.PORT;
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should not read the config file or touch anything', () => {
            expect(() => factory(null)).not.toThrow();
        });

        it('should report a missing config file when the app is wired', () => {
            expect(() => factory(null).engine()).toThrow('ENOENT');
        });
    });

    describe('engine()', () => {
        it('should serve requests without connecting a database', async () => {
            const dolph = factory({ database: { mongo: unreachableMongo } });

            const res = await request(dolph.engine()).get('/v1/life/ping');

            expect(res.status).toBe(200);
        });

        it('should wire once when called twice', async () => {
            const dolph = factory();

            dolph.engine();
            const res = await request(dolph.engine()).get('/v1/life/ping');

            expect(res.status).toBe(200);
        });
    });

    describe('ready()', () => {
        it('should connect the database before resolving', async () => {
            const dolph = factory({ database: { typeorm: { options: sqlite } } });

            await dolph.ready();

            expect(getDataSource().isInitialized).toBe(true);
        });

        it('should connect once when called twice', async () => {
            const initialize = jest.spyOn(DataSource.prototype, 'initialize');
            const dolph = factory({ database: { typeorm: { options: sqlite } } });

            await Promise.all([dolph.ready(), dolph.ready()]);

            expect(initialize).toHaveBeenCalledTimes(1);
        });

        it('should reject when a required database cannot connect', async () => {
            const dolph = factory({ database: { mongo: unreachableMongo } });

            await expect(dolph.ready()).rejects.toThrow('Could not connect to MongoDB');
        });

        it('should reject when MONGO_URL is missing', async () => {
            const url = process.env.MONGO_URL;
            delete process.env.MONGO_URL;

            const dolph = factory({ database: { mongo: { url: 'sensitive' } } });

            await expect(dolph.ready()).rejects.toThrow('MONGO_URL');

            if (url) process.env.MONGO_URL = url;
        });

        it('should continue when a database is not required', async () => {
            const warn = jest.spyOn(inAppLogger, 'warn').mockImplementation(() => inAppLogger);
            const dolph = factory({ database: { mongo: { ...unreachableMongo, required: false } } });

            await expect(dolph.ready()).resolves.toBeUndefined();

            expect(warn).toHaveBeenCalledWith(expect.stringContaining('Continuing without MongoDB'));
        });
    });

    describe('start()', () => {
        it('should resolve with a listening server', async () => {
            const server = await factory().start();

            expect(server.listening).toBe(true);
        });

        it('should start once when called twice', async () => {
            const dolph = factory();

            expect(await dolph.start()).toBe(await dolph.start());
        });

        it('should not listen when a required database cannot connect', async () => {
            const dolph = factory({ database: { mongo: unreachableMongo } });

            await expect(dolph.start()).rejects.toThrow('Could not connect to MongoDB');

            expect((dolph as unknown as { server: Server }).server.listening).toBe(false);
        });

        it('should reject when the port is taken', async () => {
            const taken = createNetServer().listen(0);
            await new Promise((resolve) => taken.once('listening', resolve));

            process.env.PORT = String((taken.address() as AddressInfo).port);

            await expect(factory().start()).rejects.toThrow('EADDRINUSE');

            await new Promise((resolve) => taken.close(resolve));
        });

        it('should exit with code 1 when a failed start is not awaited', async () => {
            const handlers: Record<string, (error: Error) => void> = {};
            (process.on as jest.Mock).mockImplementation((event: string, handler: (error: Error) => void) => {
                handlers[event] = handler;
                return process;
            });
            const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
            const dolph = factory({ database: { mongo: unreachableMongo } });

            const failure = await dolph.start().catch((error) => error);
            handlers.unhandledRejection(failure);
            await dolph.stop();
            await new Promise((resolve) => setImmediate(resolve));

            expect(exit).toHaveBeenCalledWith(1);
        });

        it('should stop and exit with code 0 on SIGTERM', async () => {
            const handlers: Record<string, () => void> = {};
            (process.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
                handlers[event] = handler;
                return process;
            });
            const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
            const dolph = factory();
            const server = await dolph.start();

            handlers.SIGTERM();
            await dolph.stop();
            await new Promise((resolve) => setImmediate(resolve));

            expect(server.listening).toBe(false);
            expect(exit).toHaveBeenCalledWith(0);
        });
    });

    describe('stop()', () => {
        it('should close the server and the database', async () => {
            const dolph = factory({ database: { typeorm: { options: sqlite } } });
            const server = await dolph.start();
            const dataSource = getDataSource();

            await dolph.stop();

            expect(server.listening).toBe(false);
            expect(dataSource.isInitialized).toBe(false);
        });

        it('should let an open request finish', async () => {
            const dolph = factory();
            const server = await dolph.start();

            const open = request(addressOf(server)).get('/v1/life/slow').then((res) => res);
            await new Promise<void>((resolve) => {
                const wait = () => (releaseSlow ? resolve() : setTimeout(wait, 5));
                wait();
            });

            const stopped = dolph.stop();
            releaseSlow();

            expect((await open).body.data).toEqual({ slow: true });
            await expect(stopped).resolves.toBeUndefined();
        });

        it('should be safe on an app that never started', async () => {
            await expect(factory().stop()).resolves.toBeUndefined();
        });

        it('should be safe to call twice', async () => {
            const dolph = factory();
            await dolph.start();

            await dolph.stop();

            await expect(dolph.stop()).resolves.toBeUndefined();
        });

        it('should remove the process handlers', async () => {
            const off = jest.spyOn(process, 'off');
            const dolph = factory();
            await dolph.start();

            await dolph.stop();

            expect(off.mock.calls.map(([event]) => event)).toEqual(
                expect.arrayContaining(['uncaughtException', 'unhandledRejection', 'SIGTERM']),
            );
        });
    });

    describe('dolph_config.yaml', () => {
        it('should let PORT beat the file', async () => {
            const taken = createNetServer().listen(0);
            await new Promise((resolve) => taken.once('listening', resolve));
            const port = (taken.address() as AddressInfo).port;
            await new Promise((resolve) => taken.close(resolve));

            process.env.PORT = String(port);

            const server = await factory({ port: 1 }).start();

            expect((server.address() as AddressInfo).port).toBe(port);
        });

        it('should use the file when PORT is not set', async () => {
            delete process.env.PORT;

            const server = await factory({ port: 0 }).start();

            expect(server.listening).toBe(true);
        });

        it('should warn about an invalid port', () => {
            const warn = jest.spyOn(inAppLogger, 'warn').mockImplementation(() => inAppLogger);
            process.env.PORT = 'not-a-port';

            factory().engine();

            expect(warn).toHaveBeenCalledWith(expect.stringContaining("Invalid port 'not-a-port'"));
        });

        it('should refuse database.sequelize instead of running without a database', () => {
            expect(() => factory({ database: { sequelize: { database: 'dolph' } } }).engine()).toThrow(
                '`database.sequelize` is no longer supported',
            );
        });

        it('should warn that globalExceptionFilter does nothing', () => {
            const warn = jest.spyOn(inAppLogger, 'warn').mockImplementation(() => inAppLogger);

            factory({ globalExceptionFilter: true }).engine();

            expect(warn).toHaveBeenCalledWith(expect.stringContaining('`onError`'));
        });

        it('should reject incomplete views', () => {
            expect(() => factory({ views: { engine: 'ejs' } }).engine()).toThrow('`engine`, `dir` and `assets`');
        });
    });
});
