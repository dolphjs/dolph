import request from 'supertest';
import { createServer } from 'http';
import { DolphFactory } from '../core';

describe('DolphJs Integration Test', () => {
    let server;

    beforeAll(() => {
        // One real ephemeral listener per file, not DolphFactory#start()
        // (avoids its process-level signal handlers) and not a bare
        // `.engine()` passed straight to supertest (which would rebind a
        // fresh ephemeral server on every single request).
        const app = new DolphFactory([]);
        server = createServer(app.engine()).listen(0);
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
