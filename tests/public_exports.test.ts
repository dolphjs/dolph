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
    jwtAuth,
    NotFoundException,
    Route,
    socketJwtAuth,
    useFileUploader,
} from '../index';

const modules = { core, common, classes, decorators, packages, utilities };

describe('Root package exports', () => {
    it.each(Object.keys(modules) as (keyof typeof modules)[])('should expose everything from %s', (name) => {
        const missing = Object.keys(modules[name]).filter(
            (key) => key !== 'default' && !(key in root),
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

        expect(clashes).toEqual([]);
    });

    it('should give the same object as the sub-paths', () => {
        expect(root.Route).toBe(decorators.Route);
        expect(root.NotFoundException).toBe(common.NotFoundException);
        expect(root.jwtAuth).toBe(classes.jwtAuth);
    });

    it('should keep the namespaced exports', () => {
        expect(root.common.NotFoundException).toBe(common.NotFoundException);
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
            jwtAuth,
            NotFoundException,
            Route,
            socketJwtAuth,
            useFileUploader,
        ].every(Boolean)).toBe(true);
        expect([payload, req]).toEqual([undefined, undefined]);
    });
});
