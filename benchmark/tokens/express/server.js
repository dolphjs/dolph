const express = require('express');
const ordersRouter = require('./orders.routes');

const app = express();
app.use(express.json());
app.use('/orders', ordersRouter);

app.use((err, req, res, next) => {
    res.status(500).json({ message: 'something went wrong' });
});

app.listen(3000);
