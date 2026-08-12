/**
 * Tier 3 — component e2e test (see /testing on the docs site).
 *
 * Exercises the real Express app built from `@Route`/`@Get` metadata on the
 * actual UserController, routed through the actual UserComponent — with
 * UserService swapped for a mock. `@dolphjs/testing` isn't published yet,
 * so it's resolved from its source in the sibling `../../../testing` repo
 * (see jest.config.js / tsconfig.json in this sample) rather than npm — the
 * import below is exactly what it will look like once it is published.
 */
import request from 'supertest';
import { createTestingApp, TestingApp } from '@dolphjs/testing';
import { UserService } from './user.service';

describe('UserComponent (e2e)', () => {
    let app: TestingApp;
    let mockUserService: jest.Mocked<Pick<UserService, 'list' | 'getById'>>;

    beforeAll(async () => {
        mockUserService = {
            list: jest.fn().mockReturnValue([{ id: 'u-1', username: 'alpha', role: 'admin', age: 30 }]),
            getById: jest.fn().mockReturnValue({ id: 'u-1', username: 'alpha', role: 'admin', age: 30 }),
        };

        app = await createTestingApp({
            // A lazy loader, not a static import — @Component resolves
            // UserService the moment user.component.ts is first evaluated,
            // so the mock above has to be seeded into the registry before
            // that import happens, not after.
            components: [() => import('./user.component').then((m) => m.UserComponent)],
            overrides: [{ service: UserService, useValue: mockUserService }],
        });
    });

    afterAll(() => app.close());

    it('GET /api/v1/users serves through real routing, backed by the mocked service', async () => {
        const res = await request(app.engine).get('/api/v1/users');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.users).toEqual([{ id: 'u-1', username: 'alpha', role: 'admin', age: 30 }]);
        expect(mockUserService.list).toHaveBeenCalledWith(undefined);
    });

    it('GET /api/v1/users/:id resolves the :id param and forwards it to the service', async () => {
        const res = await request(app.engine).get('/api/v1/users/u-1');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 'u-1', username: 'alpha', role: 'admin', age: 30 });
        expect(mockUserService.getById).toHaveBeenCalledWith('u-1');
    });
});
