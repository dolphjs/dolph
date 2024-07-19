import { DolphServiceHandler } from '../../classes';
import { Dolph } from '../../common';
import { DService, OnEvent } from '../../decorators';
import { EventEmitterService } from '../../packages/events/events_module.packages';

@DService()
export class NewService extends DolphServiceHandler<Dolph> {
  private emitterService: EventEmitterService = new EventEmitterService();

  constructor() {
    super('newService');
  }

  logger() {
    this.emitterService.emitEvent('test');
    console.log('Okay, reached');
  }

  @OnEvent('test')
  test() {
    console.log('it works');
  }
}
