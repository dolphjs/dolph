import { DService, NotFoundException } from '@dolphjs/dolph';
import { randomUUID } from 'crypto';
import { CreateOrderDto } from './orders.dto';

@DService()
export class OrdersService {
    private orders = new Map<string, CreateOrderDto>();

    create(dto: CreateOrderDto) {
        const id = randomUUID();
        this.orders.set(id, dto);
        return { id, ...dto };
    }

    find(id: string) {
        const order = this.orders.get(id);
        if (!order) throw new NotFoundException('order not found');
        return { id, ...order };
    }
}
