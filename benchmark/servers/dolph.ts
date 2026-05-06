import 'reflect-metadata';
import { DolphFactory } from '../../core';
import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../common';
import { Component, Get, Post, Route } from '../../decorators';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

@Route('')
class BenchController extends DolphControllerHandler<Dolph> {
    constructor() {
        super();
    }

    @Get('ping')
    ping(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { message: 'pong' } });
    }

    @Get('users/:id')
    getUser(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { id: req.params.id, name: 'John Doe' } });
    }

    @Post('echo')
    echo(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: req.body });
    }

    // ── Async workload endpoints ──────────────────────────────────────────

    /** 1. Pure async overhead — no delay, just await a resolved promise */
    @Get('async/instant')
    async asyncInstant(req: DRequest, res: DResponse) {
        const data = await Promise.resolve({ delay: 0, message: 'done' });
        SuccessResponse({ res, body: data });
    }

    /** 2. 10 ms — micro I/O latency (e.g. in-process cache lookup) */
    @Get('async/micro')
    async asyncMicro(req: DRequest, res: DResponse) {
        await sleep(10);
        SuccessResponse({ res, body: { delay: 10, message: 'done' } });
    }

    /** 3. 50 ms — light I/O (fast DB query, local network call) */
    @Get('async/light')
    async asyncLight(req: DRequest, res: DResponse) {
        await sleep(50);
        SuccessResponse({ res, body: { delay: 50, message: 'done' } });
    }

    /** 4. 150 ms — medium I/O (typical remote API call) */
    @Get('async/medium')
    async asyncMedium(req: DRequest, res: DResponse) {
        await sleep(150);
        SuccessResponse({ res, body: { delay: 150, message: 'done' } });
    }

    /** 5. 500 ms — heavy I/O (slow query, cold-start lambda) */
    @Get('async/heavy')
    async asyncHeavy(req: DRequest, res: DResponse) {
        await sleep(500);
        SuccessResponse({ res, body: { delay: 500, message: 'done' } });
    }

    /** 6. 1 000 ms — 1-second delay */
    @Get('async/1s')
    async async1s(req: DRequest, res: DResponse) {
        await sleep(1000);
        SuccessResponse({ res, body: { delay: 1000, message: 'done' } });
    }

    /** 7. 2 000 ms — 2-second delay */
    @Get('async/2s')
    async async2s(req: DRequest, res: DResponse) {
        await sleep(2000);
        SuccessResponse({ res, body: { delay: 2000, message: 'done' } });
    }

    /** 8. 3 000 ms — 3-second delay */
    @Get('async/3s')
    async async3s(req: DRequest, res: DResponse) {
        await sleep(3000);
        SuccessResponse({ res, body: { delay: 3000, message: 'done' } });
    }

    /** 9. Fan-out — 3 parallel 100 ms tasks (tests concurrency, ~100 ms wall-time) */
    @Get('async/fanout')
    async asyncFanout(req: DRequest, res: DResponse) {
        const [a, b, c] = await Promise.all([
            sleep(100).then(() => 'task-a'),
            sleep(100).then(() => 'task-b'),
            sleep(100).then(() => 'task-c'),
        ]);
        SuccessResponse({ res, body: { delay: 100, tasks: [a, b, c], message: 'done' } });
    }

    /** 10. Pipeline — parse body, async transform, 75 ms simulated persistence */
    @Post('async/pipeline')
    async asyncPipeline(req: DRequest, res: DResponse) {
        const input = req.body as Record<string, unknown>;
        // Simulate async transform (e.g. enrichment / validation service)
        const enriched = await Promise.resolve({ ...input, enriched: true, ts: Date.now() });
        await sleep(75);
        SuccessResponse({ res, body: enriched });
    }
}

@Component({ controllers: [BenchController], services: [] })
class BenchComponent {}

const app = new DolphFactory([BenchComponent]);
app.start();
