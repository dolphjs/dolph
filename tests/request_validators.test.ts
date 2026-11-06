import express, { Express, RequestHandler } from 'express';
import request from 'supertest';
import Joi from 'joi';
import { IsInt, IsString, Min } from 'class-validator';
import 'reflect-metadata';
import {
    DNextFunc,
    DRequest,
    DResponse,
    reqValidatorMiddleware,
    validateBodyMiddleware,
    validateParamMiddleware,
    validateQueryMiddleware,
} from '../common';
import { ValidateReq } from '../decorators';

class NameDto {
    @IsString()
    name: string;
}

class IdDto {
    @IsInt()
    @Min(1)
    id: number;
}

const echo: RequestHandler = (req, res) => {
    res.json({ body: req.body, query: req.query, params: req.params });
};

const appWith = (method: 'get' | 'post', path: string, middleware: RequestHandler): Express => {
    const app = express();

    app.use(express.json());
    app[method](path, middleware, echo);
    app.use((err: { message: string }, _req: DRequest, res: DResponse, _next: DNextFunc) => {
        res.status(400).json({ error: err.message });
    });

    return app;
};

describe('validateBodyMiddleware', () => {
    const app = appWith('post', '/', validateBodyMiddleware(NameDto) as unknown as RequestHandler);

    it('should reject fields that are not on the DTO', async () => {
        const res = await request(app).post('/').send({ name: 'dolph', role: 'admin', isAdmin: true });

        expect(res.status).toBe(400);
    });

    it('should pass valid bodies through', async () => {
        const res = await request(app).post('/').send({ name: 'dolph' });

        expect(res.status).toBe(200);
        expect(res.body.body).toEqual({ name: 'dolph' });
    });

    it('should return 400 when there is no body', async () => {
        const res = await request(app).post('/');

        expect(res.status).toBe(400);
    });
});

describe('validateParamMiddleware', () => {
    const app = appWith('get', '/:id', validateParamMiddleware(IdDto) as unknown as RequestHandler);

    it('should validate route params', async () => {
        const res = await request(app).get('/5');

        expect(res.status).toBe(200);
        expect(res.body.params).toEqual({ id: 5 });
    });

    it('should reject invalid route params', async () => {
        const res = await request(app).get('/0');

        expect(res.status).toBe(400);
    });

    it('should not read the query string', async () => {
        const res = await request(app).get('/0').query({ id: 5 });

        expect(res.status).toBe(400);
    });
});

describe('validateQueryMiddleware', () => {
    const app = express();
    app.use(express.json());
    app.post('/', validateQueryMiddleware(NameDto) as unknown as RequestHandler, echo);

    it('should leave the request body alone', async () => {
        const res = await request(app).post('/').query({ name: 'dolph' }).send({ untouched: true });

        expect(res.status).toBe(200);
        expect(res.body.body).toEqual({ untouched: true });
        expect(res.body.query).toEqual({ name: 'dolph' });
    });

    it('should drop unknown query keys', async () => {
        const res = await request(app).post('/').query({ name: 'dolph', utm_source: 'mail' });

        expect(res.status).toBe(200);
        expect(res.body.query).toEqual({ name: 'dolph' });
    });

    it('should reject invalid queries', async () => {
        const res = await request(app).post('/');

        expect(res.status).toBe(400);
    });
});

describe.each([
    ['params', { params: Joi.object({ id: Joi.number().required() }) }],
    ['param', { param: Joi.object({ id: Joi.number().required() }) }],
])('reqValidatorMiddleware with a %s schema', (_key, schema) => {
    const app = appWith('get', '/:id', reqValidatorMiddleware(schema));

    it('should reject invalid route params', async () => {
        const res = await request(app).get('/not-a-number');

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('id');
    });

    it('should accept valid route params', async () => {
        const res = await request(app).get('/42');

        expect(res.status).toBe(200);
    });
});

describe('reqValidatorMiddleware', () => {
    const schema = {
        body: Joi.object({ name: Joi.string().required() }),
        query: Joi.object({ page: Joi.number() }),
    };
    const app = appWith('post', '/', reqValidatorMiddleware(schema));

    it('should validate the body and query together', async () => {
        const bad = await request(app).post('/').query({ page: 'x' }).send({});
        const good = await request(app).post('/').query({ page: 1 }).send({ name: 'dolph' });

        expect(bad.status).toBe(400);
        expect(good.status).toBe(200);
    });
});

describe('@ValidateReq', () => {
    class Controller {
        @ValidateReq({ params: Joi.object({ id: Joi.number().required() }) })
        handle(_req: DRequest, res: DResponse) {
            res.json({ ok: true });
        }
    }

    const app = express();
    const controller = new Controller();
    app.get('/:id', (req, res, next) => (controller.handle as Function)(req, res, next));
    app.use((_err: unknown, _req: DRequest, res: DResponse, _next: DNextFunc) => {
        res.status(400).json({ rejected: true });
    });

    it('should validate route params', async () => {
        const bad = await request(app).get('/not-a-number');
        const good = await request(app).get('/42');

        expect(bad.status).toBe(400);
        expect(good.status).toBe(200);
    });
});
