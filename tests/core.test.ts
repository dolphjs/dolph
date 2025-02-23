import request from 'supertest';
import { DolphFactory } from '../core';

describe('DolphJs Integration Test', () => {
    let server;

    beforeAll(() => {
        const app = new DolphFactory([]);
        server = app.start();
    });

    afterAll(() => {
        server.close();
    });

    it('should return 404 for unknown routes', async () => {
        const response = await request(server).get('/unknown-route');
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('this endpoint does not exist');
    });
});
