const Joi = require('joi');

const orderSchema = Joi.object({
    item: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
});

module.exports = { orderSchema };
