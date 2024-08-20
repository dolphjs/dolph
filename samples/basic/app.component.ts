import { Component } from '../../decorators';
import { AppService } from './app.service';
import { NewController } from './new.controller';
import { NewService } from './new.service';

@Component({ controllers: [NewController], services: [NewService, AppService] })
export class AppComponent {}
