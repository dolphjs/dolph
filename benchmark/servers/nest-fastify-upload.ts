import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Post, Get, Req } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';

@Controller()
class UploadController {
    @Get('ping')
    ping() {
        return { message: 'pong' };
    }

    @Post('upload/single')
    async upload(@Req() req: any) {
        const data = await req.file();
        if (!data) {
            return { error: 'No file received' };
        }
        // Drain the stream so the connection stays healthy under load
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
            chunks.push(chunk);
        }
        const size = chunks.reduce((n, c) => n + c.length, 0);
        return {
            fieldname: data.fieldname,
            originalname: data.filename,
            mimetype: data.mimetype,
            size,
        };
    }
}

@Module({ controllers: [UploadController] })
class AppModule {}

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false });
    await app.register(multipart);
    const port = parseInt(process.env.PORT || '4009');
    await app.listen(port, '0.0.0.0');
    if (process.send) process.send('ready');
}

bootstrap();
