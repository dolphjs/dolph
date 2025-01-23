import { unlinkSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { diskStorage } from '../../packages';
import { DRequest } from '../../common';

describe('Disk Storage Test', () => {
  const testDestination = join(__dirname, 'uploads');
  let storage: ReturnType<typeof diskStorage>;

  beforeEach(() => {
    storage = diskStorage({ destination: testDestination });
  });

  afterEach(() => {
    try {
      unlinkSync(join(testDestination, 'test-file.txt'));
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  test('should handle file upload correctly', (done) => {
    const mockFile = {
      fieldname: 'testFile',
      originalname: 'test-file.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      stream: Readable.from(Buffer.from('test content')),
    };

    const mockRequest = {} as DRequest;

    storage.handleFile(mockRequest, mockFile, (error, info) => {
      expect(error).toBeNull();
      expect(info).toBeDefined();
      expect(info?.destination).toBe(testDestination);
      expect(info?.filename).toBeDefined();
      expect(info?.path).toBeDefined();
      expect(info?.size).toBe(12); // length of 'test content'
      done();
    });
  });

  test('should remove file correctly', (done) => {
    const filePath = join(testDestination, 'test-file.txt');
    const mockFile = {
      fieldname: 'testFile',
      originalname: 'test-file.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      path: filePath,
    };

    const mockRequest = {} as DRequest;

    storage.removeFile(mockRequest, mockFile, (error) => {
      expect(error).toBeNull();
      expect(mockFile).not.toHaveProperty('path');
      expect(mockFile).not.toHaveProperty('destination');
      expect(mockFile).not.toHaveProperty('filename');
      done();
    });
  });

  test('should handle custom filename function', (done) => {
    const customStorage = diskStorage({
      destination: testDestination,
      filename: (_req, file, cb) => {
        cb(null, `${file.originalname}`);
      },
    });

    const mockFile = {
      fieldname: 'testFile',
      originalname: 'test-file.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      stream: Readable.from(Buffer.from('test content')),
    };

    const mockRequest = {} as DRequest;

    customStorage.handleFile(mockRequest, mockFile, (error, info) => {
      expect(error).toBeNull();
      expect(info?.filename).toBe('test-file.txt');
      done();
    });
  });
});
