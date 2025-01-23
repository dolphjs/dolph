import { Readable } from 'stream';
import { memoryStorage } from '../../packages';
import { DRequest } from '../../common';

describe('Memory Storage Test', () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
  });

  test('should store file in memory correctly', (done) => {
    const testContent = 'test content';
    const mockFile = {
      fieldname: 'testFile',
      originalname: 'test-file.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      stream: Readable.from(Buffer.from(testContent)),
    };

    const mockRequest = {} as DRequest;

    storage.handleFile(mockRequest, mockFile, (error, info) => {
      expect(error).toBeNull();
      expect(info?.buffer).toBeDefined();
      expect(info?.size).toBe(testContent.length);
      expect(info?.buffer?.toString()).toBe(testContent);
      done();
    });
  });

  test('should remove file from memory correctly', (done) => {
    const mockFile = {
      fieldname: 'testFile',
      originalname: 'test-file.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      buffer: Buffer.from('test content'),
    };

    const mockRequest = {} as DRequest;

    storage.removeFile(mockRequest, mockFile, (error) => {
      expect(error).toBeNull();
      expect(mockFile).not.toHaveProperty('buffer');
      done();
    });
  });
});
