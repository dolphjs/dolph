import express, { Express } from 'express';
import request from 'supertest';
import { DResponse, ErrorResponse, SuccessResponse } from '../common';

const appWith = (handler: (res: DResponse) => void): { app: Express; failures: unknown[] } => {
    const failures: unknown[] = [];
    const app = express();

    app.get('/', (_req, res) => {
        try {
            handler(res as DResponse);
        } catch (error) {
            failures.push(error);
        }
    });

    return { app, failures };
};

describe('Response helpers', () => {
    it('should send once when SuccessResponse gets both body and msg', async () => {
        const { app, failures } = appWith((res) => SuccessResponse({ res, body: { id: 1 }, msg: 'created' }));

        const res = await request(app).get('/');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 1, message: 'created' });
        expect(failures).toEqual([]);
    });

    it('should send once when ErrorResponse gets both body and msg', async () => {
        const { app, failures } = appWith((res) => ErrorResponse({ res, body: { id: 1 }, msg: 'rejected' }));

        const res = await request(app).get('/');

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ id: 1, message: 'rejected' });
        expect(failures).toEqual([]);
    });

    it('should respect a custom status alongside body and msg', async () => {
        const { app } = appWith((res) => SuccessResponse({ res, status: 201, body: { id: 1 }, msg: 'created' }));

        const res = await request(app).get('/');

        expect(res.status).toBe(201);
    });

    it('should keep sending body only and msg only responses', async () => {
        const body = await request(appWith((res) => SuccessResponse({ res, body: { id: 1 } })).app).get('/');
        const msg = await request(appWith((res) => ErrorResponse({ res, msg: 'nope' })).app).get('/');

        expect(body.body).toEqual({ id: 1 });
        expect(msg.status).toBe(400);
        expect(msg.text).toBe('nope');
        expect(msg.headers['content-type']).toMatch(/^text\/plain/);
    });
});
