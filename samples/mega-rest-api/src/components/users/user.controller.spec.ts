/**
 * Tier 2 — controller unit test (see /testing on the docs site).
 *
 * UserController uses FIELD injection (`private UserService: UserService;`
 * with no constructor parameters), not constructor injection — so unlike
 * the recommended pattern in the docs, the mock has to be assigned onto the
 * instance by hand after construction. This is the exact tradeoff the
 * Testing guide calls out: constructor injection would let this test do
 * `new UserController(mockService)` instead.
 *
 * Calling the controller's methods directly also bypasses the `@UseMiddleware`
 * JWT guard on create/update/remove entirely — that guard only applies once
 * Express routing is wired up (see the e2e spec), not to a bare method call.
 */
import { UserController } from './user.controller';
import { UserService } from './user.service';
import type { DResponse } from '../../../../../common';

const mockResponse = () =>
    ({
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    }) as unknown as DResponse;

describe('UserController', () => {
    let controller: UserController;
    let mockService: jest.Mocked<Pick<UserService, 'list' | 'create' | 'getById' | 'update' | 'remove'>>;

    beforeEach(() => {
        controller = new UserController();
        mockService = {
            list: jest.fn(),
            create: jest.fn(),
            getById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };
        // Field injection means the property must be poked in by hand — and
        // it must be named exactly `UserService`, matching the class name.
        (controller as any).UserService = mockService;
    });

    it('list() delegates to the service and returns the count', () => {
        mockService.list.mockReturnValue([{ id: 'u-1' } as any]);
        const res = mockResponse();

        controller.list({} as any, res);

        expect(mockService.list).toHaveBeenCalledWith(undefined);
        expect(res.json).toHaveBeenCalledWith({ users: [{ id: 'u-1' }], total: 1 });
    });

    it('list() forwards the role query param as a filter', () => {
        mockService.list.mockReturnValue([]);
        const res = mockResponse();

        controller.list({ role: 'admin' } as any, res);

        expect(mockService.list).toHaveBeenCalledWith('admin');
    });

    it('details() returns the user found by the service', () => {
        mockService.getById.mockReturnValue({ id: 'u-1', username: 'alpha' } as any);
        const res = mockResponse();

        controller.details({ id: 'u-1' } as any, res);

        expect(mockService.getById).toHaveBeenCalledWith('u-1');
        expect(res.json).toHaveBeenCalledWith({ id: 'u-1', username: 'alpha' });
    });

    it('create() passes the body straight through to the service', () => {
        const body = { username: 'charlie', role: 'user', age: 19 };
        mockService.create.mockReturnValue({ id: 'u-3', ...body } as any);
        const res = mockResponse();

        controller.create(body as any, res);

        expect(mockService.create).toHaveBeenCalledWith(body);
        expect(res.json).toHaveBeenCalledWith({ id: 'u-3', ...body });
    });
});
