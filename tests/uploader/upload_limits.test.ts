import express, { Express } from 'express';
import request from 'supertest';
import { DNextFunc, DRequest, DResponse } from '../../common';
import { useFileUploader, fileUploader, memoryStorage } from '../../packages';

const png = Buffer.from('fake image');

const appWith = (middleware: ReturnType<typeof useFileUploader>): Express => {
    const app = express();

    app.post('/', middleware, (req, res) => {
        const dolphReq = req as unknown as DRequest;
        const files = dolphReq.files ?? [];

        res.json({
            file: dolphReq.file?.originalname ?? null,
            files: Array.isArray(files) ? files.length : Object.keys(files),
            body: req.body,
        });
    });
    app.use((err: { statusCode?: number; message: string }, _req: DRequest, res: DResponse, _next: DNextFunc) => {
        res.status(err.statusCode ?? 500).json({ error: err.message });
    });

    return app;
};

describe('Upload limits', () => {
    describe('array uploads', () => {
        const app = appWith(useFileUploader({ type: 'array', fieldname: 'photos', maxCount: 2 }));

        it('should accept files up to maxCount', async () => {
            const res = await request(app)
                .post('/')
                .attach('photos', png, 'one.png')
                .attach('photos', png, 'two.png');

            expect(res.status).toBe(200);
            expect(res.body.files).toBe(2);
        });

        it('should return 400 when maxCount is exceeded', async () => {
            const res = await request(app)
                .post('/')
                .attach('photos', png, 'one.png')
                .attach('photos', png, 'two.png')
                .attach('photos', png, 'three.png');

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Unexpected field');
        });

        it('should return 400 for a file on an unexpected field', async () => {
            const res = await request(app).post('/').attach('other', png, 'one.png');

            expect(res.status).toBe(400);
        });

        it('should still accept text fields alongside files', async () => {
            const res = await request(app).post('/').field('title', 'hello').attach('photos', png, 'one.png');

            expect(res.status).toBe(200);
            expect(res.body.body).toEqual({ title: 'hello' });
        });
    });

    describe('single uploads', () => {
        const app = appWith(useFileUploader({ type: 'single', fieldname: 'upload' }));

        it('should return 400 for a second file', async () => {
            const res = await request(app)
                .post('/')
                .attach('upload', png, 'one.png')
                .attach('upload', png, 'two.png');

            expect(res.status).toBe(400);
        });

        it('should return 415 for a file type that is not allowed', async () => {
            const res = await request(app).post('/').attach('upload', Buffer.from('MZ'), 'evil.exe');

            expect(res.status).toBe(415);
            expect(res.body.error).toBe('Unsupported media file');
        });

        it.each(['page.html', 'page.xhtml', 'feed.xml'])('should reject %s by default', async (filename) => {
            const res = await request(app).post('/').attach('upload', Buffer.from('<script></script>'), filename);

            expect(res.status).toBe(415);
        });

        it('should accept a blob with an allowed type', async () => {
            const res = await request(app)
                .post('/')
                .attach('upload', png, { filename: 'blob', contentType: 'image/png' });

            expect(res.status).toBe(200);
            expect(res.body.file).toBe('blob');
        });

        it('should reject a blob with a type that is not allowed', async () => {
            const res = await request(app)
                .post('/')
                .attach('upload', Buffer.from('MZ'), { filename: 'blob', contentType: 'application/x-msdownload' });

            expect(res.status).toBe(415);
        });

        it('should let html through when an app allows it explicitly', async () => {
            const allowed = appWith(useFileUploader({ type: 'single', fieldname: 'upload', extensions: ['.html'] }));

            const res = await request(allowed).post('/').attach('upload', Buffer.from('<p></p>'), 'page.html');

            expect(res.status).toBe(200);
        });
    });

    describe('fields uploads', () => {
        const app = appWith(
            fileUploader({
                type: 'fields',
                storage: memoryStorage(),
                fieldname: 'upload',
                fields: [
                    { name: 'avatar', maxCount: 1 },
                    { name: 'gallery', maxCount: 2 },
                ],
            }),
        );

        it('should apply each field limit separately', async () => {
            const res = await request(app)
                .post('/')
                .attach('avatar', png, 'a.png')
                .attach('gallery', png, 'b.png')
                .attach('gallery', png, 'c.png');

            expect(res.status).toBe(200);
            expect(res.body.files).toEqual(['avatar', 'gallery']);
        });

        it('should return 400 when one field goes over its limit', async () => {
            const res = await request(app).post('/').attach('avatar', png, 'a.png').attach('avatar', png, 'b.png');

            expect(res.status).toBe(400);
        });
    });
});
