import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get, Post, Body, Param } from '@nestjs/common';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

    // ── Async workload endpoints ──────────────────────────────────────────

    /** 1. Pure async overhead — no delay */
    @Get('async/instant')
    async asyncInstant() {
        return await Promise.resolve({ delay: 0, message: 'done' });
    }

    /** 2. 10 ms */
    @Get('async/micro')
    async asyncMicro() {
        await sleep(10);
        return { delay: 10, message: 'done' };
    }

    /** 3. 50 ms */
    @Get('async/light')
    async asyncLight() {
        await sleep(50);
        return { delay: 50, message: 'done' };
    }

    /** 4. 150 ms */
    @Get('async/medium')
    async asyncMedium() {
        await sleep(150);
        return { delay: 150, message: 'done' };
    }

    /** 5. 500 ms */
    @Get('async/heavy')
    async asyncHeavy() {
        await sleep(500);
        return { delay: 500, message: 'done' };
    }

    /** 6. 1 000 ms */
    @Get('async/1s')
    async async1s() {
        await sleep(1000);
        return { delay: 1000, message: 'done' };
    }

    /** 7. 2 000 ms */
    @Get('async/2s')
    async async2s() {
        await sleep(2000);
        return { delay: 2000, message: 'done' };
    }

    /** 8. 3 000 ms */
    @Get('async/3s')
    async async3s() {
        await sleep(3000);
        return { delay: 3000, message: 'done' };
    }

    /** 9. Fan-out — 3 parallel 100 ms tasks */
    @Get('async/fanout')
    async asyncFanout() {
        const [a, b, c] = await Promise.all([
            sleep(100).then(() => 'task-a'),
            sleep(100).then(() => 'task-b'),
            sleep(100).then(() => 'task-c'),
        ]);
        return { delay: 100, tasks: [a, b, c], message: 'done' };
    }

    /** 10. Pipeline — parse body + 75 ms simulated persistence */
    @Post('async/pipeline')
    async asyncPipeline(@Body() body: Record<string, unknown>) {
        const enriched = await Promise.resolve({ ...body, enriched: true, ts: Date.now() });
        await sleep(75);
        return enriched;
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
