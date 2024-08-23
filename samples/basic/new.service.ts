import { DolphServiceHandler } from '../../classes';
import { Dolph } from '../../common';
import { DService, OnEvent } from '../../decorators';
import { EventEmitterService } from '../../packages/events/events_module.packages';
import { AppService } from './app.service';

@DService()
export class NewService extends DolphServiceHandler<Dolph> {
  private emitterService: EventEmitterService = new EventEmitterService();
  private AppService: AppService;

  constructor() {
    super('newService');
  }

  logger() {
    this.emitterService.emitEvent('test');
    console.log('Okay, reached');
  }

  newA() {
    return this.AppService.greeting({ name: 'Aemn', age: 12 });
  }

  @OnEvent('test')
  test() {
    console.log('it works');
  }
}
