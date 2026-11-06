import fs from 'fs';
import request from 'supertest';
import { DolphFactory } from '../core';
import { logger } from '../utilities';

const realReadFileSync = fs.readFileSync;

// Mocks the read rather than rewriting the file: dolph_config.yaml is shared
// with every other test file running in the same directory.
const appWithConfig = (yaml: string) => {
    jest.spyOn(fs, 'readFileSync').mockImplementation(((path: fs.PathOrFileDescriptor, options?: never) =>
        path === 'dolph_config.yaml' ? yaml : realReadFileSync(path, options)) as typeof fs.readFileSync);

    return new DolphFactory([]).engine();
};

describe('Middlewares set in dolph_config.yaml', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should set helmet headers when helmet is true', async () => {
        const res = await request(appWithConfig('middlewares:\n  helmet: true\n')).get('/missing');

        expect(res.headers['content-security-policy']).toBeDefined();
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should pass helmet options through when helmet is an object', async () => {
        const yaml = 'middlewares:\n  helmet:\n    contentSecurityPolicy: false\n';

        const res = await request(appWithConfig(yaml)).get('/missing');

        expect(res.headers['content-security-policy']).toBeUndefined();
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should not set helmet headers when helmet is false', async () => {
        const res = await request(appWithConfig('middlewares:\n  helmet: false\n')).get('/missing');

        expect(res.headers['x-content-type-options']).toBeUndefined();
    });

    it('should not set helmet headers when helmet is not configured', async () => {
        const res = await request(appWithConfig('port: 3030\n')).get('/missing');

        expect(res.headers['x-content-type-options']).toBeUndefined();
    });

    it('should only blame dolph_config.yaml when the file is missing', () => {
        const errors = jest.spyOn(logger, 'error').mockImplementation(() => logger);
        jest.spyOn(fs, 'readFileSync').mockImplementation((() => {
            throw new Error('some other failure');
        }) as typeof fs.readFileSync);

        expect(() => new DolphFactory([]).engine()).toThrow('some other failure');
        expect(errors).not.toHaveBeenCalled();
    });

    describe('cors', () => {
        const preflight = (yaml: string, origin = 'https://app.example.com') =>
            request(appWithConfig(yaml))
                .options('/anything')
                .set('Origin', origin)
                .set('Access-Control-Request-Method', 'PUT');

        const cors = (lines: string) => `middlewares:\n  cors:\n    activate: true\n${lines}`;

        it.each([
            ['missing', ''],
            ['empty', "    origin: ''\n"],
            ['null', '    origin:\n'],
        ])('should allow no site when origin is %s', async (_name, lines) => {
            const warn = jest.spyOn(logger, 'warn').mockImplementation(() => logger);

            const res = await request(appWithConfig(cors(lines)))
                .get('/missing')
                .set('Origin', 'https://evil.example.com');

            expect(res.headers['access-control-allow-origin']).toBeUndefined();
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('`origin` is empty'));
        });

        it('should allow every site when origin is explicitly *', async () => {
            const res = await request(appWithConfig(cors("    origin: '*'\n")))
                .get('/missing')
                .set('Origin', 'https://anyone.example.com');

            expect(res.headers['access-control-allow-origin']).toBe('*');
        });

        it('should only name the configured site', async () => {
            const res = await request(appWithConfig(cors("    origin: 'https://app.example.com'\n")))
                .get('/missing')
                .set('Origin', 'https://evil.example.com');

            expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
        });

        it('should accept a list of sites', async () => {
            const yaml = cors("    origin:\n      - 'https://a.example.com'\n      - 'https://b.example.com'\n");

            const allowed = await request(appWithConfig(yaml)).get('/missing').set('Origin', 'https://b.example.com');
            const blocked = await request(appWithConfig(yaml)).get('/missing').set('Origin', 'https://c.example.com');

            expect(allowed.headers['access-control-allow-origin']).toBe('https://b.example.com');
            expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
        });

        it('should answer preflight requests with the default status', async () => {
            const res = await preflight(cors("    origin: 'https://app.example.com'\n"));

            expect(res.status).toBe(204);
            expect(res.headers['access-control-allow-methods']).toContain('PUT');
        });

        it('should apply configured methods', async () => {
            const res = await preflight(cors("    origin: 'https://app.example.com'\n    methods:\n      - GET\n"));

            expect(res.headers['access-control-allow-methods']).toBe('GET');
        });
    });

    it('should apply helmet headers to responses for malformed bodies', async () => {
        const res = await request(appWithConfig('middlewares:\n  helmet: true\n'))
            .post('/missing')
            .set('Content-Type', 'application/json')
            .send('{ not json');

        expect(res.status).toBe(400);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
});
