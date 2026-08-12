/**
 * Tier 1 — service unit test (see /testing on the docs site).
 *
 * UserService is a plain class — no @dolphjs/testing import needed here at
 * all, just `new` it directly. This exercises the real, already-shipped
 * service from this sample, not a toy stand-in.
 */
import { UserService } from './user.service';
import { NotFoundException } from '../../../../../common';

describe('UserService', () => {
    let service: UserService;

    beforeEach(() => {
        service = new UserService();
    });

    it('seeds two users on construction', () => {
        expect(service.list()).toHaveLength(2);
    });

    it('filters by role', () => {
        expect(service.list('admin')).toEqual([expect.objectContaining({ username: 'alpha', role: 'admin' })]);
    });

    it('creates a user and assigns it an id', () => {
        const created = service.create({ username: 'charlie', role: 'user', age: 19 });

        expect(created).toEqual(expect.objectContaining({ username: 'charlie', role: 'user', age: 19 }));
        expect(service.list()).toHaveLength(3);
    });

    it('retrieves a user by id', () => {
        expect(service.getById('u-1')).toEqual(expect.objectContaining({ username: 'alpha' }));
    });

    it('throws NotFoundException for an unknown id', () => {
        expect(() => service.getById('does-not-exist')).toThrow(NotFoundException);
    });

    it('updates a user in place', () => {
        const updated = service.update('u-2', { role: 'moderator' });
        expect(updated.role).toBe('moderator');
        expect(service.getById('u-2').role).toBe('moderator');
    });

    it('removes a user', () => {
        service.remove('u-1');
        expect(() => service.getById('u-1')).toThrow(NotFoundException);
        expect(service.list()).toHaveLength(1);
    });
});
