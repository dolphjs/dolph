import fs from 'fs';
import request from 'supertest';
import { DolphFactory } from '../core';

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

    it('should apply helmet headers to responses for malformed bodies', async () => {
        const res = await request(appWithConfig('middlewares:\n  helmet: true\n'))
            .post('/missing')
            .set('Content-Type', 'application/json')
            .send('{ not json');

        expect(res.status).toBe(400);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
});
