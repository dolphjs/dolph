'use strict';

const express = require('express');

const app = express();
app.disable('x-powered-by');
app.use(express.json());

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.get('/ping', (_req, res) => {
    res.json({ message: 'pong' });
});

app.get('/users/:id', (req, res) => {
    res.json({ id: req.params.id, name: 'John Doe' });
});

app.post('/echo', (req, res) => {
    res.json(req.body);
});

// ── Async workload endpoints ──────────────────────────────────────────

/** 1. Pure async overhead — no delay */
app.get('/async/instant', async (_req, res) => {
    const data = await Promise.resolve({ delay: 0, message: 'done' });
    res.json(data);
});

/** 2. 10 ms */
app.get('/async/micro', async (_req, res) => {
    await sleep(10);
    res.json({ delay: 10, message: 'done' });
});

/** 3. 50 ms */
app.get('/async/light', async (_req, res) => {
    await sleep(50);
    res.json({ delay: 50, message: 'done' });
});

/** 4. 150 ms */
app.get('/async/medium', async (_req, res) => {
    await sleep(150);
    res.json({ delay: 150, message: 'done' });
});

/** 5. 500 ms */
app.get('/async/heavy', async (_req, res) => {
    await sleep(500);
    res.json({ delay: 500, message: 'done' });
});

/** 6. 1 000 ms */
app.get('/async/1s', async (_req, res) => {
    await sleep(1000);
    res.json({ delay: 1000, message: 'done' });
});

/** 7. 2 000 ms */
app.get('/async/2s', async (_req, res) => {
    await sleep(2000);
    res.json({ delay: 2000, message: 'done' });
});

/** 8. 3 000 ms */
app.get('/async/3s', async (_req, res) => {
    await sleep(3000);
    res.json({ delay: 3000, message: 'done' });
});

/** 9. Fan-out — 3 parallel 100 ms tasks */
app.get('/async/fanout', async (_req, res) => {
    const [a, b, c] = await Promise.all([
        sleep(100).then(() => 'task-a'),
        sleep(100).then(() => 'task-b'),
        sleep(100).then(() => 'task-c'),
    ]);
    res.json({ delay: 100, tasks: [a, b, c], message: 'done' });
});

/** 10. Pipeline — parse body + 75 ms simulated persistence */
app.post('/async/pipeline', async (req, res) => {
    const input = req.body;
    const enriched = await Promise.resolve({ ...input, enriched: true, ts: Date.now() });
    await sleep(75);
    res.json(enriched);
});

const port = parseInt(process.env.PORT || '4002');
app.listen(port, '0.0.0.0', () => {
    if (process.send) process.send('ready');
});
