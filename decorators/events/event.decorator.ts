import { getInjectedService } from '../../core';
import { EventEmitterService } from '../../packages/events/events_module.packages';

function OnEvent(eventName: string, priority: number = 0, once: boolean = false) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const eventEmitter: EventEmitterService = getInjectedService(EventEmitterService.name) as any;

            eventEmitter.emitEvent(eventName, originalMethod.bind(this), priority, once);
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}

function OnceEvent(eventName: string, priority: number = 0) {
    return OnEvent(eventName, priority, true);
}

function OffEvent(eventName: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const eventEmitter: EventEmitterService = getInjectedService(EventEmitterService.name) as any;

            eventEmitter.unregisterEvent(eventName, originalMethod.bind(this));
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}

export { OnEvent, OnceEvent, OffEvent };
