import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
    constructor(private readonly orders: OrdersService) {}

    @Post()
    create(@Body() dto: CreateOrderDto) {
        return this.orders.create(dto);
    }

    @Get(':id')
    find(@Param('id') id: string) {
        return this.orders.find(id);
    }
}
