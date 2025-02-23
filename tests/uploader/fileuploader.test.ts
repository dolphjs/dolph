import { join } from 'path';
import { diskStorage, fileUploader } from '../../packages';
import { DRequest, DResponse } from '../../common';
import { Readable } from 'stream';

describe('File Uploader Test', () => {
    const mockNext = jest.fn();
    let upload: ReturnType<typeof fileUploader>;

    beforeEach(() => {
        upload = fileUploader({
            storage: diskStorage({ destination: join(__dirname, 'uploads') }),
            type: 'single', // Add this to match current fileUploader implementation
            fieldname: 'avatar', // Add a default fieldname
        });
        mockNext.mockClear();
    });

    test('single file upload should work correctly', (done) => {
        const middleware = upload;

        const mockFileStream = new Readable();
        mockFileStream.push('test file content');
        mockFileStream.push(null);

        const mockRequest = {
            headers: {
                'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
            },
            on: jest.fn((event, handler) => {
                if (event === 'file') {
                    handler('avatar', {
                        stream: mockFileStream,
                        filename: 'test.txt',
                        encoding: '7bit',
                        mimetype: 'text/plain',
                    });
                }
                if (event === 'finish') {
                    handler();
                }
                return mockRequest;
            }),
            pipe: jest.fn(),
        } as unknown as DRequest;

        const mockResponse = {} as DResponse;

        middleware(mockRequest, mockResponse, (error) => {
            try {
                expect(error).toBeUndefined();
                expect(mockRequest.file).toBeDefined();
                done();
            } catch (err) {
                done(err);
            }
        });

        mockRequest.on('finish', () => {});
    }, 15000);

    test('array upload should handle multiple files', (done) => {
        const upload = fileUploader({
            type: 'array',
            fieldname: 'photos',
            maxCount: 3,
            storage: diskStorage({ destination: join(__dirname, 'uploads') }),
        });

        const middleware = upload;

        const mockFileStream = new Readable();
        mockFileStream.push('test file content');
        mockFileStream.push(null);

        const mockRequest = {
            headers: {
                'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
            },
            on: jest.fn((event, handler) => {
                if (event === 'file') {
                    // Simulate multiple files
                    handler('photos', {
                        stream: mockFileStream,
                        filename: 'test1.txt',
                        encoding: '7bit',
                        mimetype: 'text/plain',
                    });
                    handler('photos', {
                        stream: mockFileStream,
                        filename: 'test2.txt',
                        encoding: '7bit',
                        mimetype: 'text/plain',
                    });
                }
                if (event === 'finish') {
                    handler();
                }
                return mockRequest;
            }),
            pipe: jest.fn(),
        } as unknown as DRequest;

        const mockResponse = {} as DResponse;

        middleware(mockRequest, mockResponse, (error) => {
            try {
                expect(error).toBeUndefined();
                expect(Array.isArray(mockRequest.files)).toBeTruthy();
                done();
            } catch (err) {
                done(err);
            }
        });

        mockRequest.on('finish', () => {});
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
        const upload = fileUploader({
            type: 'fields',
            fields: [
                { name: 'avatar', maxCount: 1 },
                { name: 'gallery', maxCount: 3 },
            ],
            fieldname: 'upload',
            storage: diskStorage({ destination: join(__dirname, 'uploads') }),
        });

        const middleware = upload;

        const mockFileStream = new Readable();
        mockFileStream.push('test file content');
        mockFileStream.push(null);

        const mockRequest = {
            headers: {
                'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
            },
            on: jest.fn((event, handler) => {
                if (event === 'file') {
                    // Simulate files for different fields
                    handler('avatar', {
                        stream: mockFileStream,
                        filename: 'avatar.jpg',
                        encoding: '7bit',
                        mimetype: 'image/jpeg',
                    });
                    handler('gallery', {
                        stream: mockFileStream,
                        filename: 'gallery1.jpg',
                        encoding: '7bit',
                        mimetype: 'image/jpeg',
                    });
                }
                if (event === 'finish') {
                    handler();
                }
                return mockRequest;
            }),
            pipe: jest.fn(),
        } as unknown as DRequest;

        const mockResponse = {} as DResponse;

        middleware(mockRequest, mockResponse, (error) => {
            try {
                expect(error).toBeUndefined();
                expect(mockRequest.files).toBeDefined();
                done();
            } catch (err) {
                done(err);
            }
        });

        mockRequest.on('finish', () => {});
    }, 1500);
});
