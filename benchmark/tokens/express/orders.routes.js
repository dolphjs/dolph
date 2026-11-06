const { Router } = require('express');
const { orderSchema } = require('./orders.schema');
const orders = require('./orders.service');

const router = Router();

router.post('/', (req, res, next) => {
    try {
        const { error, value } = orderSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.message });
        res.status(201).json(orders.create(value));
    } catch (err) {
        next(err);
    }
});

router.get('/:id', (req, res, next) => {
    try {
        const order = orders.find(req.params.id);
        if (!order) return res.status(404).json({ message: 'order not found' });
        res.json(order);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
