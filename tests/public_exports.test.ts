import * as root from '../index';
import * as core from '../core';
import * as common from '../common';
import * as classes from '../classes';
import * as decorators from '../decorators';
import * as packages from '../packages';
import * as utilities from '../utilities';
import {
    Component,
    DBody,
    DolphFactory,
    DRequest,
    DService,
    generateVerificationCode,
    getDataSource,
    Get,
    IPayload,
    JwtBasicAuth,
    NotFoundException,
    Route,
    socketJwtAuth,
    SuccessResponse,
    useFileUploader,
} from '../index';

const modules = { core, common, classes, decorators, packages, utilities };

// Exported by more than one module with different values, so the root has to pick one.
const resolvedClashes: Record<string, unknown> = { TryCatchAsyncDec: decorators.TryCatchAsyncDec };

describe('Root package exports', () => {
    it.each(Object.keys(modules) as (keyof typeof modules)[])('should expose everything from %s', (name) => {
        const missing = Object.keys(modules[name]).filter(
            (key) => key !== 'default' && !(key in resolvedClashes) && !(key in root),
        );

        expect(missing).toEqual([]);
    });

    it('should not let any new export clash silently', () => {
        const owners = new Map<string, unknown>();
        const clashes: string[] = [];

        Object.values(modules).forEach((module) => {
            Object.entries(module).forEach(([key, value]) => {
                if (owners.has(key) && owners.get(key) !== value) clashes.push(key);
                owners.set(key, value);
            });
        });

        expect(clashes).toEqual(Object.keys(resolvedClashes));
    });

    it('should resolve clashes to the intended export', () => {
        expect(root.TryCatchAsyncDec).toBe(decorators.TryCatchAsyncDec);
    });

    it('should give the same object as the sub-paths', () => {
        expect(root.Route).toBe(decorators.Route);
        expect(root.SuccessResponse).toBe(common.SuccessResponse);
        expect(root.JwtBasicAuth).toBe(classes.JwtBasicAuth);
    });

    it('should keep the namespaced exports', () => {
        expect(root.common.SuccessResponse).toBe(common.SuccessResponse);
        expect(root.decorators.Get).toBe(decorators.Get);
    });

    it('should export one of everything an app needs, types included', () => {
        const payload: IPayload | undefined = undefined;
        const req = undefined as DRequest | undefined;

        expect([
            Component,
            DBody,
            DolphFactory,
            DService,
            generateVerificationCode,
            getDataSource,
            Get,
            JwtBasicAuth,
            NotFoundException,
            Route,
            socketJwtAuth,
            SuccessResponse,
            useFileUploader,
        ].every(Boolean)).toBe(true);
        expect([payload, req]).toEqual([undefined, undefined]);
    });
});
