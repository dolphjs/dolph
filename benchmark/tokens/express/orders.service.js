const { randomUUID } = require('crypto');

const orders = new Map();

const create = (dto) => {
    const id = randomUUID();
    orders.set(id, dto);
    return { id, ...dto };
};

const find = (id) => {
    const order = orders.get(id);
    return order && { id, ...order };
};

module.exports = { create, find };
