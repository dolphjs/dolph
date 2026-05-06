import { Readable } from 'stream';
import { fileUploader, memoryStorage } from '../../packages';
import { DRequest, DResponse } from '../../common';

function buildMultipartBody(
    boundary: string,
    parts: Array<{ name: string; filename?: string; content: string; contentType?: string }>,
): Buffer {
    const chunks: string[] = [];
    for (const p of parts) {
        chunks.push(`--${boundary}\r\n`);
        if (p.filename !== undefined) {
            chunks.push(`Content-Disposition: form-data; name="${p.name}"; filename="${p.filename}"\r\n`);
            if (p.contentType) {
                chunks.push(`Content-Type: ${p.contentType}\r\n`);
            }
        } else {
            chunks.push(`Content-Disposition: form-data; name="${p.name}"\r\n`);
        }
        chunks.push(`\r\n`);
        chunks.push(p.content);
        chunks.push(`\r\n`);
    }
    chunks.push(`--${boundary}--\r\n`);
    return Buffer.from(chunks.join(''), 'utf8');
}

function createMultipartRequest(body: Buffer, boundary: string): DRequest {
    const stream = new Readable({
        read() {
            this.push(body);
            this.push(null);
        },
    });
    (stream as unknown as DRequest).headers = {
        'content-type': `multipart/form-data; boundary=${boundary}`,
    };
    return stream as unknown as DRequest;
}

describe('File Uploader Test', () => {
    const boundary = '----dolphTestBoundary';
    let upload: ReturnType<typeof fileUploader>;

    beforeEach(() => {
        upload = fileUploader({
            storage: memoryStorage(),
            type: 'single',
            fieldname: 'avatar',
        });
    });

    test('single file upload should work correctly', (done) => {
        const body = buildMultipartBody(boundary, [
            { name: 'avatar', filename: 'test.txt', content: 'test file content', contentType: 'text/plain' },
        ]);
        const mockRequest = createMultipartRequest(body, boundary);
        const mockResponse = {} as DResponse;

        upload(mockRequest, mockResponse, (error) => {
            try {
                expect(error).toBeUndefined();
                expect(mockRequest.file).toBeDefined();
                expect(mockRequest.file?.buffer?.length).toBeGreaterThan(0);
                done();
            } catch (err) {
                done(err);
            }
        });
    }, 15000);

    test('array upload should handle multiple files', (done) => {
        const arrayUpload = fileUploader({
            type: 'array',
            fieldname: 'photos',
            maxCount: 3,
            storage: memoryStorage(),
        });

        const body = buildMultipartBody(boundary, [
            { name: 'photos', filename: 'test1.txt', content: 'a', contentType: 'text/plain' },
            { name: 'photos', filename: 'test2.txt', content: 'b', contentType: 'text/plain' },
        ]);
        const mockRequest = createMultipartRequest(body, boundary);
        const mockResponse = {} as DResponse;

        arrayUpload(mockRequest, mockResponse, (error) => {
            try {
                expect(error).toBeUndefined();
                expect(Array.isArray(mockRequest.files)).toBe(true);
                expect((mockRequest.files as unknown[]).length).toBe(2);
                done();
            } catch (err) {
                done(err);
            }
        });
    }, 15000);

    test('should handle non-multipart requests', (done) => {
        const middleware = upload;
        const mockRequest = {
            headers: {
                'content-type': 'application/json',
            },
        } as unknown as DRequest;
        const mockResponse = {} as DResponse;

        middleware(mockRequest, mockResponse, (error) => {
            expect(error).toBeUndefined();
            expect(mockRequest.file).toBeUndefined();
            done();
        });
    });

    test('fields upload should handle multiple fields', (done) => {
        const fieldsUpload = fileUploader({
            type: 'fields',
            fields: [
                { name: 'avatar', maxCount: 1 },
                { name: 'gallery', maxCount: 3 },
            ],
            fieldname: 'upload',
            storage: memoryStorage(),
        });

        const body = buildMultipartBody(boundary, [
            { name: 'avatar', filename: 'avatar.jpg', content: 'img-bytes', contentType: 'image/jpeg' },
            { name: 'gallery', filename: 'gallery1.jpg', content: 'g1', contentType: 'image/jpeg' },
        ]);
        const mockRequest = createMultipartRequest(body, boundary);
        const mockResponse = {} as DResponse;

        fieldsUpload(mockRequest, mockResponse, (error) => {
            try {
                expect(error).toBeUndefined();
                expect(mockRequest.files).toBeDefined();
                const files = mockRequest.files as Record<string, unknown[]>;
                expect(files.avatar?.length).toBe(1);
                expect(files.gallery?.length).toBe(1);
                done();
            } catch (err) {
                done(err);
            }
        });
    }, 15000);
});
