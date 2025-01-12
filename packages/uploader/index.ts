import { memory } from './storage/memory.storage';
import { disk } from './storage/disk.storage';

function allowAll(req, file, cb) {
  cb(null, true);
}

export class MediaParser {
  private storage;
  private limits: number;
  private preservePaths: any;
  private fileFilter: Function;

  constructor(options) {
    if (options.storage) {
      this.storage = options.storage;
    } else if (options.dest) {
      this.storage = disk({ destination: options.dest });
    } else {
      this.storage = memory();
    }

    this.limits = options.limits;
    this.preservePaths = options.preservePaths;
    this.fileFilter = options.fileFilter || allowAll;
  }
}
