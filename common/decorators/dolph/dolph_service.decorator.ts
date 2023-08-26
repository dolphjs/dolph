import { DolphControllerHandler, DolphServiceMapping } from '../..';
import { DolphConstructor } from '../../interfaces';

function InjectServiceHandler<T>(serivceMappings: DolphServiceMapping<any>[]) {
  return function <Base extends DolphConstructor>(BaseClass: Base) {
    return class extends BaseClass {
      constructor(...args: any[]) {
        super(...args);
        for (const mapping of serivceMappings) {
          //@ts-expect-error
          this[mapping.serviceName] = new mapping.serviceHandler();
        }
      }
      //   initServiceHandlers() {
      //   }
    };
  };
}

export { InjectServiceHandler };
