import { DBody, DParam, Get, Post, Route } from '@dolphjs/dolph';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Route('orders')
export class OrdersController {
    constructor(private orders: OrdersService) {}

    @Post()
    create(@DBody(CreateOrderDto) dto: CreateOrderDto) {
        return this.orders.create(dto);
    }

    @Get(':id')
    find(@DParam() params: { id: string }) {
        return this.orders.find(params.id);
    }
}
