import { DolphServiceHandler } from '../../classes';
import { Dolph } from '../../common';

export class TestEventService extends DolphServiceHandler<Dolph> {
  constructor() {
    super('test');
  }

  logData(data: any) {
    console.log(data);
  }
}
