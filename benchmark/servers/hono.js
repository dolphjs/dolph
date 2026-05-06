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

const port = parseInt(process.env.PORT || '4003');
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
    if (process.send) process.send('ready');
});
