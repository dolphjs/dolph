import { randomBytes } from 'crypto';
import { createWriteStream, mkdirSync, unlink } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const getFilename = (req, file, next) => {
  randomBytes(16, (err, raw) => {
    next(err, err ? undefined : raw.toString('hex'));
  });
};

const getDestination = (req, file, next) => {
  next(null, tmpdir());
};

const createDirectory = (destination: string) => {
  try {
    mkdirSync(destination, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

class DiskStorage {
  private getFilename: Function;
  private getDestination: Function;

  constructor(options) {
    this.getFilename = options.filename || getFilename;

    if (typeof options.destination === 'string') {
      createDirectory(options.destination);
      this.getDestination = function ($0, $1, cb) {
        cb(null, options.destination);
      };
    } else {
      this.getDestination = options.destination || getDestination;
    }
  }

  handleFile(req, file, next) {
    let _this = this;
    _this.getDestination(req, file, function (err, destination) {
      if (err) return next(err);

      _this.getFilename(req, file, function (err, filename) {
        if (err) return next(err);

        let finalPath = join(destination, filename);
        let outstream = createWriteStream(finalPath);

        file.stream.pipe(outstream);
        outstream.on('error', next);
        outstream.on('finish', function () {
          next(null, {
            destination,
            filename,
            path: finalPath,
            size: outstream.bytesWritten,
          });
        });
      });
    });
  }

  removeFIle(req, file, next) {
    let path = file.path;

    delete file.destination;
    delete file.filename;
    delete file.path;

    unlink(path, next);
  }
}

export const disk = (options) => new DiskStorage(options);
