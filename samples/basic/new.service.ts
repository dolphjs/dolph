import { Model } from 'mongoose';
import { DolphServiceHandler } from '../../classes';
import { Dolph } from '../../common';

export class NewService extends DolphServiceHandler<Dolph> {
  constructor() {
    super('newService');
  }

  logger() {
    console.log('Okay, reached');
  }
}
