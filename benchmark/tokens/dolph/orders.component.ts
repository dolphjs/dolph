import { Component } from '@dolphjs/dolph';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Component({ controllers: [OrdersController], services: [OrdersService] })
export class OrdersComponent {}
