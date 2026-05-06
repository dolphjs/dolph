import request from 'supertest';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DolphFactory } from '../core';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../common';
import { Component, DBody, DParam, DPayload, DQuery, DRes, Get, Post, Route, UseMiddleware } from '../decorators';
import { DolphControllerHandler } from '../classes';

class OptionalQueryDto {
    @IsOptional()
    @IsString()
    filter?: string;
}

class RequiredQueryDto {
    @IsString()
    q!: string;
}

class ParamDto {
    @IsString()
    id!: string;
}

class BodyDto {
    @IsString()
    name!: string;

    @IsInt()
    @Min(1)
    age!: number;
}

@Route('/decorator-args')
class DecoratorArgsController extends DolphControllerHandler<Dolph> {
    @Get('/query')
    query(@DQuery(OptionalQueryDto) query: OptionalQueryDto, @DRes() res: DResponse) {
        SuccessResponse({ res, body: { query } });
    }

    @Get('/query-required')
    queryRequired(@DQuery(RequiredQueryDto) query: RequiredQueryDto, @DRes() res: DResponse) {
        SuccessResponse({ res, body: { query } });
    }

    @Get('/param/:id')
    param(@DParam(ParamDto) params: ParamDto, @DRes() res: DResponse) {
        SuccessResponse({ res, body: { params } });
    }

    @Post('/body')
    body(@DBody(BodyDto) body: BodyDto, @DRes() res: DResponse) {
        SuccessResponse({ res, body: { body } });
    }

    @Get('/payload')
    @UseMiddleware((req: DRequest, _res: DResponse, next) => {
        req.payload = { sub: 'tester', iat: Date.now(), exp: Date.now() + 1000 } as any;
        next();
    })
    payload(@DPayload() payload: any, @DRes() res: DResponse) {
        SuccessResponse({ res, body: { payload } });
    }
}

@Component({ controllers: [DecoratorArgsController], services: [] })
class DecoratorArgsComponent {}

describe('Decorator argument integration', () => {
    let server: any;

    beforeAll(() => {
        server = new DolphFactory([DecoratorArgsComponent]).start();
    });

    afterAll(() => {
        server.close();
    });

    it('maps DQuery with optional fields and ignores unknown query keys', async () => {
        const empty = await request(server).get('/v1/decorator-args/query');
        expect(empty.status).toBe(200);
        expect(empty.body.query).toEqual({});

        const withFilter = await request(server).get('/v1/decorator-args/query').query({ filter: 'books' });
        expect(withFilter.status).toBe(200);
        expect(withFilter.body.query.filter).toBe('books');

        const withNoise = await request(server).get('/v1/decorator-args/query').query({ filter: 'x', unused: 'y' });
        expect(withNoise.status).toBe(200);
        expect(withNoise.body.query.filter).toBe('x');
        expect(withNoise.body.query.unused).toBeUndefined();
    });

    it('validates required DQuery fields', async () => {
        const bad = await request(server).get('/v1/decorator-args/query-required');
        expect(bad.status).toBeGreaterThanOrEqual(400);

        const ok = await request(server).get('/v1/decorator-args/query-required').query({ q: 'find-me' });
        expect(ok.status).toBe(200);
        expect(ok.body.query.q).toBe('find-me');
    });

    it('maps DParam arguments', async () => {
        const paramRes = await request(server).get('/v1/decorator-args/param/abc123');
        expect(paramRes.status).toBe(200);
        expect(paramRes.body.params.id).toBe('abc123');
    });

    it('maps DBody and validates body DTO', async () => {
        const okRes = await request(server).post('/v1/decorator-args/body').send({ name: 'Utee', age: 20 });
        expect(okRes.status).toBe(200);
        expect(okRes.body.body.name).toBe('Utee');

        const badRes = await request(server).post('/v1/decorator-args/body').send({ name: 'Utee', age: 0 });
        expect(badRes.status).toBeGreaterThanOrEqual(400);
    });

    it('maps DPayload from middleware', async () => {
        const payloadRes = await request(server).get('/v1/decorator-args/payload');
        expect(payloadRes.status).toBe(200);
        expect(payloadRes.body.payload.sub).toBe('tester');
    });
});
