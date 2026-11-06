import 'reflect-metadata';
import { DolphFactory } from '../../core';
import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph } from '../../common';
import { Component, DBody, DReq, Get, Post, Route } from '../../decorators';
import { IsInt, IsString } from 'class-validator';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class EchoDto {
    @IsString()
    hello: string;

    @IsInt()
    num: number;
}

@Route('')
class BenchController extends DolphControllerHandler<Dolph> {
    constructor() {
        super();
    }

    @Get('ping')
    ping(req: DRequest) {
        return { message: 'pong' };
    }

    @Get('users/:id')
    getUser(req: DRequest) {
        return { id: req.params.id, name: 'John Doe' };
    }

    @Post('echo')
    echo(req: DRequest) {
        return req.body;
    }

    @Get('ping-req')
    pingWithDecorator(@DReq() req: DRequest) {
        return { message: 'pong', method: req.method };
    }

    @Post('echo-dto')
    echoWithDto(@DBody(EchoDto) body: EchoDto) {
        return body;
    }

    // ── Async workload endpoints ──────────────────────────────────────────

    /** 1. Pure async overhead — no delay, just await a resolved promise */
    @Get('async/instant')
    async asyncInstant(req: DRequest) {
        const data = await Promise.resolve({ delay: 0, message: 'done' });
        return data;
    }

    /** 2. 10 ms — micro I/O latency (e.g. in-process cache lookup) */
    @Get('async/micro')
    async asyncMicro(req: DRequest) {
        await sleep(10);
        return { delay: 10, message: 'done' };
    }

    /** 3. 50 ms — light I/O (fast DB query, local network call) */
    @Get('async/light')
    async asyncLight(req: DRequest) {
        await sleep(50);
        return { delay: 50, message: 'done' };
    }

    /** 4. 150 ms — medium I/O (typical remote API call) */
    @Get('async/medium')
    async asyncMedium(req: DRequest) {
        await sleep(150);
        return { delay: 150, message: 'done' };
    }

    /** 5. 500 ms — heavy I/O (slow query, cold-start lambda) */
    @Get('async/heavy')
    async asyncHeavy(req: DRequest) {
        await sleep(500);
        return { delay: 500, message: 'done' };
    }

    /** 6. 1 000 ms — 1-second delay */
    @Get('async/1s')
    async async1s(req: DRequest) {
        await sleep(1000);
        return { delay: 1000, message: 'done' };
    }

    /** 7. 2 000 ms — 2-second delay */
    @Get('async/2s')
    async async2s(req: DRequest) {
        await sleep(2000);
        return { delay: 2000, message: 'done' };
    }

    /** 8. 3 000 ms — 3-second delay */
    @Get('async/3s')
    async async3s(req: DRequest) {
        await sleep(3000);
        return { delay: 3000, message: 'done' };
    }

    /** 9. Fan-out — 3 parallel 100 ms tasks (tests concurrency, ~100 ms wall-time) */
    @Get('async/fanout')
    async asyncFanout(req: DRequest) {
        const [a, b, c] = await Promise.all([
            sleep(100).then(() => 'task-a'),
            sleep(100).then(() => 'task-b'),
            sleep(100).then(() => 'task-c'),
        ]);
        return { delay: 100, tasks: [a, b, c], message: 'done' };
    }

    /** 10. Pipeline — parse body, async transform, 75 ms simulated persistence */
    @Post('async/pipeline')
    async asyncPipeline(req: DRequest) {
        const input = req.body as Record<string, unknown>;
        // Simulate async transform (e.g. enrichment / validation service)
        const enriched = await Promise.resolve({ ...input, enriched: true, ts: Date.now() });
        await sleep(75);
        return enriched;
    }
}

@Component({ controllers: [BenchController], services: [] })
class BenchComponent {}

const app = new DolphFactory([BenchComponent]);
app.start();
