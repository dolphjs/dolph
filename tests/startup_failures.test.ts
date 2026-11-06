import { DolphFactory } from '../core';
import { Component, Get, Route } from '../decorators';
import { DolphControllerHandler, DolphServiceHandler } from '../classes';
import { Dolph } from '../common';

@Route('/healthy')
class HealthyController extends DolphControllerHandler<Dolph> {
    @Get('/ping')
    ping() {
        return 'pong';
    }
}

class NotAController {}

class ExplodingService extends DolphServiceHandler<Dolph> {
    constructor() {
        super('exploding');
        throw new Error('missing API key');
    }
}

@Route('/exploding')
class ExplodingController extends DolphControllerHandler<Dolph> {
    constructor() {
        super();
        throw new Error('bad controller setup');
    }

    @Get('/ping')
    ping() {
        return 'pong';
    }
}

const applyComponent = (params: Parameters<typeof Component>[0]) => {
    class TestComponent {}
    Component(params)(TestComponent);
    return TestComponent;
};

describe('Startup failures', () => {
    it('should throw when a controller does not extend DolphControllerHandler', () => {
        expect(() => applyComponent({ controllers: [NotAController as never], services: [] })).toThrow(
            'Invalid `controllers` array',
        );
    });

    it('should throw when a service is not a class', () => {
        expect(() => applyComponent({ controllers: [HealthyController], services: ['nope' as never] })).toThrow(
            'Invalid `services` array',
        );
    });

    it('should throw and name the component when a service cannot be created', () => {
        expect(() => applyComponent({ controllers: [HealthyController], services: [ExplodingService] })).toThrow(
            /\[TestComponent\] Failed to Initialise services: .*missing API key/,
        );
    });

    it('should throw and name the controller when a controller cannot be created', () => {
        const component = applyComponent({ controllers: [ExplodingController], services: [] });

        expect(() => new DolphFactory([component])).toThrow(
            'Error initialising controller ExplodingController: bad controller setup',
        );
    });

    it('should keep booting when every component is valid', () => {
        const component = applyComponent({ controllers: [HealthyController], services: [] });

        expect(() => new DolphFactory([component])).not.toThrow();
    });
});
