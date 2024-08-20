import { DService } from '../../decorators';
import { EventEmitterService } from '../../packages/events/events_module.packages';

@DService()
export class TestEventEmitterService extends EventEmitterService {}

export const testEventEmitterService = new TestEventEmitterService();
