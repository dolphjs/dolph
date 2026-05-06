'use strict';

const { Hono } = require('hono');
const { serve } = require('@hono/node-server');

const app = new Hono();

app.get('/ping', (c) => c.json({ message: 'pong' }));

app.get('/users/:id', (c) => c.json({ id: c.req.param('id'), name: 'John Doe' }));

app.post('/echo', async (c) => {
    const body = await c.req.json();
    return c.json(body);
});

// ── Async workload endpoints ──────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 1. Pure async overhead — no delay */
app.get('/async/instant', async (c) => {
    const data = await Promise.resolve({ delay: 0, message: 'done' });
    return c.json(data);
});

/** 2. 10 ms */
app.get('/async/micro', async (c) => {
    await sleep(10);
    return c.json({ delay: 10, message: 'done' });
});

/** 3. 50 ms */
app.get('/async/light', async (c) => {
    await sleep(50);
    return c.json({ delay: 50, message: 'done' });
});

/** 4. 150 ms */
app.get('/async/medium', async (c) => {
    await sleep(150);
    return c.json({ delay: 150, message: 'done' });
});

/** 5. 500 ms */
app.get('/async/heavy', async (c) => {
    await sleep(500);
    return c.json({ delay: 500, message: 'done' });
});

/** 6. 1 000 ms */
app.get('/async/1s', async (c) => {
    await sleep(1000);
    return c.json({ delay: 1000, message: 'done' });
});

/** 7. 2 000 ms */
app.get('/async/2s', async (c) => {
    await sleep(2000);
    return c.json({ delay: 2000, message: 'done' });
});

/** 8. 3 000 ms */
app.get('/async/3s', async (c) => {
    await sleep(3000);
    return c.json({ delay: 3000, message: 'done' });
});

/** 9. Fan-out — 3 parallel 100 ms tasks */
app.get('/async/fanout', async (c) => {
    const [a, b, cc] = await Promise.all([
        sleep(100).then(() => 'task-a'),
        sleep(100).then(() => 'task-b'),
        sleep(100).then(() => 'task-c'),
    ]);
    return c.json({ delay: 100, tasks: [a, b, cc], message: 'done' });
});

/** 10. Pipeline — parse body + 75 ms simulated persistence */
app.post('/async/pipeline', async (c) => {
    const input = await c.req.json();
    const enriched = await Promise.resolve({ ...input, enriched: true, ts: Date.now() });
    await sleep(75);
    return c.json(enriched);
});

const port = parseInt(process.env.PORT || '4003');
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
    if (process.send) process.send('ready');
});
