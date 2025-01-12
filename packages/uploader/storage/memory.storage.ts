import concat_stream from 'concat-stream';
import { DRequest } from '../../../common';

class MemStorage {
  constructor(options?: any) {}

  handleFIle(req: DRequest, file: any, next: any) {
    file.stream.pipe(
      concat_stream({ encoding: 'buffer' }, function (data) {
        next(null, {
          buffer: data,
          size: data.length,
        });
      }),
    );
  }

  removeFile(req: DRequest, file: any, next: any) {
    delete file.buffer;
    next(null);
  }
}

export const memory = (options?) => new MemStorage(options);
