import { Module } from '@nestjs/common';
import { OrdersModule } from './orders.module';

@Module({ imports: [OrdersModule] })
export class AppModule {}
