import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Post, Get, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
class UploadController {
    @Get('ping')
    ping() {
        return { message: 'pong' };
    }

    @Post('upload/single')
    @UseInterceptors(FileInterceptor('file'))
    upload(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            return { error: 'No file received' };
        }
        return {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        };
    }
}

@Module({ controllers: [UploadController] })
class AppModule {}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { logger: false });
    const port = parseInt(process.env.PORT || '4008');
    await app.listen(port);
    if (process.send) process.send('ready');
}

bootstrap();
