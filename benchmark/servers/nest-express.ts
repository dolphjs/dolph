import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller()
class BenchController {
    @Get('ping')
    ping() {
        return { message: 'pong' };
    }

    @Get('users/:id')
    getUser(@Param('id') id: string) {
        return { id, name: 'John Doe' };
    }

    @Post('echo')
    echo(@Body() body: unknown) {
        return body;
    }
}

@Module({ controllers: [BenchController] })
class AppModule {}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { logger: false });
    const port = parseInt(process.env.PORT || '4004');
    await app.listen(port, '0.0.0.0');
    if (process.send) process.send('ready');
}

bootstrap();
