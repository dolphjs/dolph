import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import express from 'express';
import sharp from 'sharp';
import request from 'supertest';
import { DNextFunc, DRequest, DResponse, FileInfo } from '../../common';
import { DolphFactory } from '../../core';
import { Component, DFile, DFiles, Post, Route, UseMiddleware } from '../../decorators';
import { cloudStorage, diskStorage, imageUpload, useFileUploader } from '../../packages';

const size = { width: 40, height: 30 };
const solid = () => sharp({ create: { ...size, channels: 3, background: 'teal' } });

const appWith = (middleware: ReturnType<typeof imageUpload>) => {
    const app = express();

    app.post('/', middleware, (req, res) => {
        const dreq = req as unknown as DRequest;
        const describe = (file?: FileInfo) =>
            file && { name: file.originalname, type: file.mimetype, width: file.width, height: file.height, size: file.size, url: file.url, key: file.key };

        res.json({ file: describe(dreq.file), files: (dreq.files as FileInfo[] | undefined)?.map(describe) });
    });
    app.use((err: { statusCode?: number; message: string }, _req: DRequest, res: DResponse, _next: DNextFunc) => {
        res.status(err.statusCode ?? 500).json({ error: err.message });
    });

    return app;
};

// Without a stored buffer, what the client would receive is what storage received.
const stored = (middleware: (req: DRequest, res: DResponse, next: DNextFunc) => unknown) => {
    const app = express();

    app.post('/', middleware as never, (req, res) => {
        res.type('application/octet-stream').send((req as unknown as DRequest).file?.buffer);
    });

    return app;
};

const binary = (req: request.Test) =>
    req.buffer(true).parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
    });

// A valid PNG header claiming 50,000 x 50,000 pixels, in under 40 bytes.
const pixelBomb = () => {
    const header = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]).copy(header);
    header.write('IHDR', 12, 'latin1');
    header.writeUInt32BE(50_000, 16);
    header.writeUInt32BE(50_000, 20);
    return header;
};

describe('imageUpload', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('what it accepts', () => {
        it.each(['jpeg', 'png', 'webp', 'gif'] as const)('should accept a real %s', async (format) => {
            const image = await solid().toFormat(format).toBuffer();

            const res = await request(appWith(imageUpload()))
                .post('/')
                .attach('image', image, 'photo.bin');

            expect(res.status).toBe(200);
            expect(res.body.file).toMatchObject({ ...size, type: `image/${format}` });
        });

        it('should trust the contents over the declared type', async () => {
            const res = await request(appWith(imageUpload()))
                .post('/')
                .attach('image', await solid().png().toBuffer(), { filename: 'x.jpg', contentType: 'image/jpeg' });

            expect(res.body.file.type).toBe('image/png');
        });

        it('should reject a type that was not asked for', async () => {
            const res = await request(appWith(imageUpload({ types: ['png'] })))
                .post('/')
                .attach('image', await solid().jpeg().toBuffer(), 'photo.jpg');

            expect(res.status).toBe(415);
        });

        it.each([
            ['a renamed executable', Buffer.from('MZ\x90\0\x03\0\0\0'), 'photo.png'],
            ['html', Buffer.from('<script>alert(1)</script>'), 'photo.jpg'],
            ['svg, which can run scripts', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'photo.svg'],
            ['an empty file', Buffer.alloc(0), 'photo.png'],
        ])('should reject %s', async (_name, content, filename) => {
            const res = await request(appWith(imageUpload())).post('/').attach('image', content, filename);

            expect(res.status).toBe(415);
        });

        it('should reject a file over maxSize', async () => {
            const res = await request(appWith(imageUpload({ maxSize: 100, keepMetadata: true })))
                .post('/')
                .attach('image', await solid().png({ compressionLevel: 0 }).toBuffer(), 'photo.png');

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('File too large');
        });

        it('should reject too many text fields', async () => {
            const req = request(appWith(imageUpload({ maxFields: 2 }))).post('/');

            ['a', 'b', 'c'].forEach((name) => req.field(name, 'value'));

            const res = await req;

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Too many fields');
        });
    });

    describe('dimensions', () => {
        it('should reject a tiny file that decodes to billions of pixels, without decoding it', async () => {
            const res = await request(appWith(imageUpload({ keepMetadata: true })))
                .post('/')
                .attach('image', pixelBomb(), 'bomb.png');

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Image dimensions too large');
        });

        it('should reject an image over maxPixels', async () => {
            const res = await request(appWith(imageUpload({ maxPixels: 100 })))
                .post('/')
                .attach('image', await solid().png().toBuffer(), 'photo.png');

            expect(res.status).toBe(400);
        });

        it('should reject an image whose dimensions cannot be read', async () => {
            const png = await solid().png().toBuffer();

            const res = await request(appWith(imageUpload()))
                .post('/')
                .attach('image', png.subarray(0, 12), 'cut.png');

            expect(res.status).toBe(415);
        });
    });

    describe('processing', () => {
        const withGps = () =>
            solid()
                .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '6/1 27/1 0/1' }, IFD0: { Copyright: 'someone' } })
                .jpeg()
                .toBuffer();

        it('should remove metadata such as GPS location by default', async () => {
            const original = await withGps();
            expect((await sharp(original).metadata()).exif).toBeDefined();

            const res = await binary(request(stored(imageUpload())).post('/').attach('image', original, 'photo.jpg'));

            expect(res.status).toBe(200);
            expect((await sharp(res.body).metadata()).exif).toBeUndefined();
        });

        it('should keep metadata when asked', async () => {
            const original = await withGps();

            const res = await binary(
                request(stored(imageUpload({ keepMetadata: true }))).post('/').attach('image', original, 'photo.jpg'),
            );

            expect(res.body.equals(original)).toBe(true);
        });

        it('should turn the pixels so a rotated photo stays upright', async () => {
            const rotated = await solid().withMetadata({ orientation: 6 }).jpeg().toBuffer();

            const res = await binary(request(stored(imageUpload())).post('/').attach('image', rotated, 'photo.jpg'));
            const { width, height } = await sharp(res.body).metadata();

            expect({ width, height }).toEqual({ width: 30, height: 40 });
        });

        it('should keep animation', async () => {
            const frames = await Promise.all(['red', 'blue'].map((background) =>
                sharp({ create: { width: 10, height: 10, channels: 3, background } }).png().toBuffer(),
            ));
            const gif = await sharp(frames, { join: { animated: true } }).gif().toBuffer();

            const res = await binary(request(stored(imageUpload())).post('/').attach('image', gif, 'moving.gif'));

            expect((await sharp(res.body, { animated: true }).metadata()).pages).toBe(2);
        });

        it('should resize, convert, and report the final size and type', async () => {
            const upload = imageUpload({ resize: { width: 20 }, format: 'webp', quality: 60 });

            const res = await request(appWith(upload)).post('/').attach('image', await solid().png().toBuffer(), 'photo.png');

            expect(res.body.file).toMatchObject({ width: 20, height: 15, type: 'image/webp' });
        });

        it('should not enlarge a small image', async () => {
            const res = await request(appWith(imageUpload({ resize: { width: 400 } })))
                .post('/')
                .attach('image', await solid().png().toBuffer(), 'photo.png');

            expect(res.body.file.width).toBe(40);
        });

        it('should answer 415 for a corrupt image with a valid header', async () => {
            const png = await solid().png().toBuffer();
            const corrupt = Buffer.concat([png.subarray(0, 40), Buffer.alloc(200, 0x41)]);

            const res = await request(appWith(imageUpload())).post('/').attach('image', corrupt, 'corrupt.png');

            expect(res.status).toBe(415);
            expect(res.body.error).toBe('Image could not be processed');
        });
    });

    describe('without sharp', () => {
        const withoutSharp = () => {
            let isolated!: typeof import('../../packages/uploader/image_upload');
            let warning!: jest.SpyInstance;

            jest.isolateModules(() => {
                jest.doMock('sharp', () => {
                    throw Object.assign(new Error("Cannot find module 'sharp'"), { code: 'MODULE_NOT_FOUND' });
                });
                warning = jest.spyOn(require('../../utilities').inAppLogger, 'warn').mockImplementation(() => undefined);
                isolated = require('../../packages/uploader/image_upload');
            });

            return { upload: isolated.imageUpload, warning };
        };

        afterEach(() => jest.dontMock('sharp'));

        it('should warn that metadata is being kept', () => {
            const { upload, warning } = withoutSharp();

            expect(() => upload()).not.toThrow();
            expect(warning).toHaveBeenCalledWith(expect.stringContaining('GPS'));
        });

        it('should not warn when keeping metadata was asked for', () => {
            const { upload, warning } = withoutSharp();

            upload({ keepMetadata: true });

            expect(warning).not.toHaveBeenCalled();
        });

        it('should stop at startup when an option needs it', () => {
            const { upload } = withoutSharp();

            expect(() => upload({ resize: { width: 10 } })).toThrow('`sharp` package is not installed');
        });
    });

    describe('storage', () => {
        let directory: string;

        beforeEach(() => {
            directory = mkdtempSync(join(tmpdir(), 'dolph-image-'));
        });

        afterEach(() => {
            rmSync(directory, { recursive: true, force: true });
        });

        const isEmpty = async () => {
            for (let attempt = 0; attempt < 100 && readdirSync(directory).length; attempt += 1) {
                await new Promise((resolve) => setTimeout(resolve, 10));
            }

            return readdirSync(directory);
        };

        it('should leave nothing on disk for a rejected file', async () => {
            const res = await request(appWith(imageUpload({ storage: diskStorage({ destination: directory }) })))
                .post('/')
                .attach('image', Buffer.from('MZ\x90\0\x03\0\0\0'), 'photo.png');

            expect(res.status).toBe(415);
            expect(await isEmpty()).toEqual([]);
        });

        it('should remove good files when a later one in the request is rejected', async () => {
            const upload = imageUpload({ maxCount: 2, storage: diskStorage({ destination: directory }) });

            const res = await request(appWith(upload))
                .post('/')
                .attach('image', await solid().png().toBuffer(), 'good.png')
                .attach('image', Buffer.from('MZ\x90\0\x03\0\0\0'), 'bad.png');

            expect(res.status).toBe(415);
            expect(await isEmpty()).toEqual([]);
        });
    });

    it('should put several images on req.files', async () => {
        const res = await request(appWith(imageUpload({ maxCount: 2 })))
            .post('/')
            .attach('image', await solid().png().toBuffer(), 'one.png')
            .attach('image', await solid().jpeg().toBuffer(), 'two.jpg');

        expect(res.body.files.map((file: { type: string }) => file.type)).toEqual(['image/png', 'image/jpeg']);
    });
});

describe('cloudStorage', () => {
    const provider = () => {
        const objects = new Map<string, Buffer>();
        let count = 0;

        return {
            objects,
            put: jest.fn(async (_file: FileInfo, stream: Readable) => {
                const chunks: Buffer[] = [];
                for await (const chunk of stream) chunks.push(chunk as Buffer);

                count += 1;
                const key = `image-${count}`;
                objects.set(key, Buffer.concat(chunks));

                return { key, url: `https://cdn.example.com/${key}` };
            }),
            remove: jest.fn(async (file: FileInfo) => objects.delete(file.key as string)),
        };
    };

    it('should stream the processed file to the provider and report where it went', async () => {
        const cloud = provider();
        const original = await solid().withExif({ IFD0: { Copyright: 'someone' } }).jpeg().toBuffer();

        const res = await request(appWith(imageUpload({ storage: cloudStorage(cloud) })))
            .post('/')
            .attach('image', original, 'photo.jpg');

        expect(res.status).toBe(200);
        expect(res.body.file).toMatchObject({ key: 'image-1', url: 'https://cdn.example.com/image-1' });

        const object = cloud.objects.get('image-1') as Buffer;

        expect(res.body.file.size).toBe(object.length);
        expect((await sharp(object).metadata()).exif).toBeUndefined();
    });

    it('should never send a rejected file to the provider', async () => {
        const cloud = provider();

        const res = await request(appWith(imageUpload({ storage: cloudStorage(cloud) })))
            .post('/')
            .attach('image', Buffer.from('MZ\x90\0\x03\0\0\0'), 'photo.png');

        expect(res.status).toBe(415);
        expect(cloud.objects.size).toBe(0);
    });

    it('should remove stored files when a later one in the request fails', async () => {
        const cloud = provider();
        const upload = imageUpload({ maxCount: 2, keepMetadata: true, storage: cloudStorage(cloud) });

        const res = await request(appWith(upload))
            .post('/')
            .attach('image', await solid().png().toBuffer(), 'good.png')
            .attach('image', Buffer.from('MZ\x90\0\x03\0\0\0'), 'bad.png');

        expect(res.status).toBe(415);
        expect(cloud.objects.size).toBe(0);
    });

    it('should report a provider failure', async () => {
        const storage = cloudStorage({
            put: async (_file, stream) => {
                stream.resume();
                throw new Error('provider is down');
            },
            remove: async () => undefined,
        });

        const res = await request(appWith(imageUpload({ storage })))
            .post('/')
            .attach('image', await solid().png().toBuffer(), 'photo.png');

        expect(res.status).toBe(500);
    });
});

describe('useFileUploader content checks', () => {
    const upload = (options = {}) => appWith(useFileUploader({ type: 'single', fieldname: 'upload', ...options }) as never);

    it('should reject a renamed file', async () => {
        const res = await request(upload()).post('/').attach('upload', Buffer.from('MZ\x90\0\x03\0\0\0'), 'report.pdf');

        expect(res.status).toBe(415);
        expect(res.body.error).toBe('File contents do not match its type');
    });

    it('should reject a blob that lies about its type', async () => {
        const res = await request(upload())
            .post('/')
            .attach('upload', Buffer.from('MZ\x90\0\x03\0\0\0'), { filename: 'blob', contentType: 'image/png' });

        expect(res.status).toBe(415);
    });

    it('should accept matching contents', async () => {
        const res = await request(upload()).post('/').attach('upload', await solid().webp().toBuffer(), 'photo.webp');

        expect(res.status).toBe(200);
    });

    it('should let through extensions with no signature', async () => {
        const res = await request(upload()).post('/').attach('upload', Buffer.from('plain notes'), 'notes.txt');

        expect(res.status).toBe(200);
    });

    it('should skip the check when turned off', async () => {
        const res = await request(upload({ verifyContent: false })).post('/').attach('upload', Buffer.from('x'), 'a.pdf');

        expect(res.status).toBe(200);
    });

    it('should accept gif and bmp by default', async () => {
        const gif = await request(upload()).post('/').attach('upload', await solid().gif().toBuffer(), 'a.gif');
        const bmp = await request(upload()).post('/').attach('upload', Buffer.from('BM............'), 'a.bmp');

        expect([gif.status, bmp.status]).toEqual([200, 200]);
    });

    it('should cap text fields', async () => {
        const req = request(upload({ maxFields: 1 })).post('/');

        ['a', 'b'].forEach((name) => req.field(name, 'value'));

        expect((await req).status).toBe(400);
    });
});

@Route('images')
class ImageController {
    @Post('one')
    @UseMiddleware(imageUpload())
    one(@DFile() image: FileInfo) {
        return { width: image.width, type: image.mimetype };
    }

    @Post('many')
    @UseMiddleware(imageUpload({ maxCount: 2 }))
    many(@DFiles() images: FileInfo[]) {
        return { count: images.length };
    }
}

@Component({ controllers: [ImageController], services: [] })
class ImageComponent {}

describe('imageUpload on a route', () => {
    const app = new DolphFactory([ImageComponent]).engine();

    it('should reach the handler through @DFile', async () => {
        const res = await request(app).post('/v1/images/one').attach('image', await solid().png().toBuffer(), 'a.png');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ width: 40, type: 'image/png' });
    });

    it('should reach the handler through @DFiles', async () => {
        const res = await request(app)
            .post('/v1/images/many')
            .attach('image', await solid().png().toBuffer(), 'a.png')
            .attach('image', await solid().png().toBuffer(), 'b.png');

        expect(res.body.data).toEqual({ count: 2 });
    });

    it('should answer 415 for a renamed file', async () => {
        const res = await request(app).post('/v1/images/one').attach('image', Buffer.from('MZ\x90\0\x03\0\0\0'), 'a.png');

        expect(res.status).toBe(415);
    });
});
