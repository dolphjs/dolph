import Joi from 'joi';

const createUser = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    age: Joi.number().required().min(15),
    work: Joi.string().required(),
    height: Joi.number().required(),
  }),
};

export { createUser };
