import request from 'supertest';
import { createServer } from 'http';
import { DolphFactory } from '../core';
import { DolphControllerHandler } from '../classes';
import { Dolph, DRequest, DResponse, SuccessResponse } from '../common';
import { Component, Post, Route, UseMiddleware } from '../decorators';
import { memoryStorage, useFileUploader } from '../packages/uploader';

@Route('/upload-route')
class MultipartRouteController extends DolphControllerHandler<Dolph> {
    @Post('/memory-single')
    @UseMiddleware(
        useFileUploader({
            storage: memoryStorage(),
            type: 'single',
            fieldname: 'doc',
        }),
    )
    uploadSingle(req: DRequest, res: DResponse) {
        const file = req.file;
        SuccessResponse({
            res,
            body: {
                originalname: file?.originalname,
                mimetype: file?.mimetype,
                received: Boolean(file?.buffer && file.buffer.length > 0),
            },
        });
    }
}

@Component({ controllers: [MultipartRouteController], services: [] })
class MultipartRouteComponent {}

describe('Multipart upload through Dolph route', () => {
    let server: any;

    beforeAll(() => {
        // One real ephemeral listener per file — see auto_send.test.ts for why.
        server = createServer(new DolphFactory([MultipartRouteComponent]).engine()).listen(0);
    });

    afterAll(() => {
        server.close();
    });

    it('parses a single file into req.file with memory storage', async () => {
        const res = await request(server)
            .post('/v1/upload-route/memory-single')
            .attach('doc', Buffer.from('route-upload-bytes'), 'payload.txt');

        expect(res.status).toBe(200);
        expect(res.body.originalname).toBe('payload.txt');
        expect(res.body.mimetype).toBeDefined();
        expect(res.body.received).toBe(true);
    });
});
