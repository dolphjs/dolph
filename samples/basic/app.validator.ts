import Joi from 'joi';

const createUser = {
    param: Joi.object().keys({
        name: Joi.string().required(),
        age: Joi.number().required().min(15),
        work: Joi.string().required(),
        height: Joi.number().required(),
    }),
};

const testCase = {
    body: Joi.object().keys({
        name: Joi.string().required(),
    }),
};

export { createUser, testCase };
