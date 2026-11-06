import { Readable, Transform, TransformCallback } from 'stream';

/**
 * Holds back the start of a stream until `check` has seen it. None of a rejected
 * file's bytes reach storage.
 */
export class HeaderGuard extends Transform {
    private chunks: Buffer[] = [];
    private received = 0;
    private released = false;

    constructor(
        private readonly headerBytes: number,
        private readonly check: (header: Buffer) => void,
    ) {
        super();
    }

    private release(callback: TransformCallback) {
        const header = Buffer.concat(this.chunks);

        this.chunks = [];
        this.released = true;

        try {
            this.check(header);
        } catch (error) {
            return callback(error);
        }

        callback(null, header);
    }

    _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
        if (this.released) return callback(null, chunk);

        this.chunks.push(chunk);
        this.received += chunk.length;

        if (this.received < this.headerBytes) return callback();

        this.release(callback);
    }

    _flush(callback: TransformCallback) {
        if (this.released) return callback();

        this.release(callback);
    }
}

/** `pipe()` doesn't pass errors on, and a destination left open would never finish. */
export const pipeInto = <T extends NodeJS.ReadWriteStream & { destroy(error?: Error): unknown }>(
    source: Readable,
    destination: T,
): T => {
    source.on('error', (error) => destination.destroy(error));

    return source.pipe(destination) as T;
};
