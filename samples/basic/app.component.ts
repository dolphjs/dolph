import { Component } from '../../decorators';
import { NewController } from './new.controller';
import { NewService } from './new.service';

@Component({ controllers: [NewController], services: [NewService] })
export class AppComponent {}
