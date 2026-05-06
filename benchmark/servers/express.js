'use strict';

const express = require('express');

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/ping', (_req, res) => {
    res.json({ message: 'pong' });
});

app.get('/users/:id', (req, res) => {
    res.json({ id: req.params.id, name: 'John Doe' });
});

app.post('/echo', (req, res) => {
    res.json(req.body);
});

const port = parseInt(process.env.PORT || '4002');
app.listen(port, '0.0.0.0', () => {
    if (process.send) process.send('ready');
});
