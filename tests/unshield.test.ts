import request from 'supertest';
import { createServer, Server } from 'http';
import { DolphFactory } from '../core';
import { Component, Get, Route, Shield, UnShield } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { Dolph, DNextFunc, DRequest, DResponse } from '../common';
import { logger } from '../utilities';

// Same source text for every role, which is what the old comparison tripped on.
const requireRole = (role: string) => (req: DRequest, res: DResponse, next: DNextFunc) => {
    if (req.headers['x-role'] !== role) {
        res.status(403).json({ blockedBy: role });
        return;
    }
    next();
};

const trace = (_req: DRequest, res: DResponse, next: DNextFunc) => {
    res.locals.traced = true;
    next();
};

const admin = requireRole('admin');
const staff = requireRole('staff');

@Shield([trace, admin, staff])
@Route('shielded')
class ShieldedController extends DolphControllerHandler<Dolph> {
    @Get('/all-shields')
    allShields(_req: DRequest, res: DResponse) {
        return { traced: res.locals.traced ?? false };
    }

    @Get('/without-staff')
    @UnShield(staff)
    withoutStaff(_req: DRequest, res: DResponse) {
        return { traced: res.locals.traced ?? false };
    }

    @Get('/without-both')
    @UnShield(admin, staff)
    withoutBoth(_req: DRequest, res: DResponse) {
        return { traced: res.locals.traced ?? false };
    }

    @Get('/array-form')
    @UnShield([admin, staff, trace])
    arrayForm(_req: DRequest, res: DResponse) {
        return { traced: res.locals.traced ?? false };
    }

    @Get('/public')
    @UnShield()
    publicRoute(_req: DRequest, res: DResponse) {
        return { traced: res.locals.traced ?? false };
    }

    @Get('/rebuilt-guard')
    @UnShield(requireRole('staff'))
    rebuiltGuard(_req: DRequest, res: DResponse) {
        return { traced: res.locals.traced ?? false };
    }

    @Get('/not-a-shield')
    @UnShield((_req: DRequest, res: DResponse, next: DNextFunc) => {
        res.locals.injected = true;
        next();
    })
    notAShield(_req: DRequest, res: DResponse) {
        return { injected: res.locals.injected ?? false };
    }
}

@Component({ controllers: [ShieldedController], services: [] })
class ShieldedComponent {}

describe('@UnShield', () => {
    let server: Server;
    let warnings: string[];

    beforeAll(() => {
        warnings = [];
        jest.spyOn(logger, 'warn').mockImplementation(((message: string) => {
            warnings.push(String(message));
            return logger;
        }) as never);
        server = createServer(new DolphFactory([ShieldedComponent]).engine()).listen(0);
    });

    afterAll((done) => {
        jest.restoreAllMocks();
        server.close(done);
    });

    const get = (path: string, role?: string) => {
        const call = request(server).get(`/v1/shielded/${path}`);
        return role ? call.set('x-role', role) : call;
    };

    it('should keep every shield on routes without @UnShield', async () => {
        const res = await get('all-shields', 'admin');

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ blockedBy: 'staff' });
    });

    it('should only remove the named shield when another comes from the same factory', async () => {
        const blocked = await get('without-staff', 'staff');
        const allowed = await get('without-staff', 'admin');

        expect(blocked.status).toBe(403);
        expect(blocked.body).toEqual({ blockedBy: 'admin' });
        expect(allowed.status).toBe(200);
    });

    it('should accept several shields as separate arguments and keep the rest', async () => {
        const res = await get('without-both');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ traced: true });
    });

    it('should accept shields as an array', async () => {
        const res = await get('array-form');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ traced: false });
    });

    it('should remove every shield when called with no arguments', async () => {
        const res = await get('public');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ traced: false });
    });

    it('should stay protected when a rebuilt guard does not match by reference', async () => {
        const res = await get('rebuilt-guard', 'admin');

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ blockedBy: 'staff' });
    });

    it('should not add a function that is not a shield as middleware', async () => {
        const res = await get('not-a-shield', 'admin');

        expect(res.status).toBe(403);
    });

    it('should warn at boot for each @UnShield that matched nothing', () => {
        const unmatched = warnings.filter((message) => message.includes('@UnShield'));

        expect(unmatched).toHaveLength(2);
        expect(unmatched.join('\n')).toContain('ShieldedController.rebuiltGuard');
        expect(unmatched.join('\n')).toContain('ShieldedController.notAShield');
    });
});
