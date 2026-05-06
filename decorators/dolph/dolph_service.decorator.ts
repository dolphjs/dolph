import { DolphConstructor, DolphServiceMapping } from '../../common';

/**
 *
 * Injects an array of `DolphServiceHandler` into a parent class which  is then shared by controllers using this services
 *
 * - top-level class
 * @version 1.0.0
 */
function InjectServiceHandler(serivceMappings: DolphServiceMapping<any>[]) {
    return function <Base extends DolphConstructor>(BaseClass: Base): Base {
        return class extends BaseClass {
            constructor(...args: any[]) {
                super(...args);
                for (const mapping of serivceMappings) {
                    // @ts-expect-error legacy typing compatibility
                    this[mapping.serviceName] = new mapping.serviceHandler();
                }
            }
            //   initServiceHandlers() {
            //   }
        };
    };
}

export { InjectServiceHandler };
