import request from 'supertest';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { DolphFactory } from '../core';
import { Component, Get, Route } from '../decorators';

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Query',
        fields: {
            hello: { type: GraphQLString, resolve: () => 'world' },
        },
    }),
});

@Route('rest')
class RestController {
    @Get('ping')
    ping() {
        return { pong: true };
    }
}

@Component({ controllers: [RestController], services: [] })
class RestComponent {}

describe('DolphFactory GraphQL adapter', () => {
    let dolph: DolphFactory;
    let server: Server;

    beforeAll(async () => {
        // start() installs process-wide handlers; see the note in auto_send.test.ts.
        jest.spyOn(process, 'on').mockImplementation(() => process);
        process.env.PORT = '0';

        dolph = new DolphFactory([RestComponent], { graphql: { schema: Promise.resolve(schema) } });
        server = await dolph.start();

        delete process.env.PORT;
    });

    afterAll(async () => {
        jest.restoreAllMocks();
        await dolph.stop();
    });

    it('should bind a port when started in GraphQL mode', () => {
        expect((server.address() as AddressInfo).port).toBeGreaterThan(0);
    });

    it('should answer queries through Apollo', async () => {
        const res = await request(server)
            .post('/graphql')
            .set('apollo-require-preflight', 'true')
            .send({ query: '{ hello }' });

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ hello: 'world' });
    });

    it('should serve controllers next to GraphQL', async () => {
        const res = await request(server).get('/v1/rest/ping');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ pong: true });
    });

    it('should answer other paths with a 404 instead of Apollo', async () => {
        const res = await request(server).post('/v1/missing').send({ query: '{ hello }' });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('this endpoint does not exist');
    });
});
