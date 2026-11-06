import request from 'supertest';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { DolphFactory } from '../core';

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Query',
        fields: {
            hello: { type: GraphQLString, resolve: () => 'world' },
        },
    }),
});

const waitForListening = async (server: Server): Promise<void> => {
    const start = Date.now();
    while (!server.listening) {
        if (Date.now() - start > 5000) throw new Error('GraphQL server never started listening');
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
};

describe('DolphFactory GraphQL adapter', () => {
    let server: Server;

    beforeAll(async () => {
        // start() installs process-wide handlers; see the note in auto_send.test.ts.
        jest.spyOn(process, 'on').mockImplementation(() => process);

        const dolph = new DolphFactory({ graphql: true, schema: Promise.resolve(schema) });
        dolph.port = 0;
        server = dolph.start();
        await waitForListening(server);
    });

    afterAll((done) => {
        jest.restoreAllMocks();
        server.close(done);
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
});
