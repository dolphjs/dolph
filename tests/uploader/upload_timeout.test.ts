import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { createServer, request as httpRequest, Server } from 'http';
import { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import express from 'express';
import { DNextFunc, DRequest, DResponse } from '../../common';
import { diskStorage, memoryStorage, useFileUploader } from '../../packages';

const boundary = '----dolphTimeoutBoundary';

const filePart = (name: string, filename: string, content: string) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
    `Content-Type: image/png\r\n\r\n${content}`;

// Sends the body then goes quiet, like a client that stalls partway through.
const stalledUpload = (server: Server, body: string) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = httpRequest(
            {
                port: (server.address() as AddressInfo).port,
                method: 'POST',
                headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': 1_000_000 },
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    req.destroy();
                    resolve({ status: res.statusCode ?? 0, body: data });
                });
            },
        );

        req.on('error', reject);
        req.write(body);
    });

const waitUntil = async (predicate: () => boolean) => {
    const start = Date.now();
    while (!predicate() && Date.now() - start < 3000) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
};

describe('Upload timeout', () => {
    let directory: string;
    let servers: Server[];

    const serve = (options: Partial<Parameters<typeof useFileUploader>[0]>) => {
        const app = express();

        app.post('/', useFileUploader({ type: 'array', fieldname: 'photos', maxCount: 3, verifyContent: false, ...options }), (_req, res) => {
            res.json({ ok: true });
        });
        app.use((err: { statusCode?: number; message: string }, _req: DRequest, res: DResponse, _next: DNextFunc) => {
            res.status(err.statusCode ?? 500).json({ error: err.message });
        });

        const server = createServer(app).listen(0);
        servers.push(server);
        return server;
    };

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), 'dolph-upload-'));
        servers = [];
    });

    afterEach(async () => {
        await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
        rmSync(directory, { recursive: true, force: true });
    });

    it('should return 408 and remove a partial file from disk', async () => {
        const server = serve({ storage: diskStorage({ destination: directory }), timeout: 150 });

        const res = await stalledUpload(server, filePart('photos', 'partial.png', 'x'.repeat(2048)));

        expect(res.status).toBe(408);
        expect(JSON.parse(res.body)).toEqual({ error: 'Upload process timed out' });
        await waitUntil(() => readdirSync(directory).length === 0);
        expect(readdirSync(directory)).toEqual([]);
    });

    it('should remove files that finished before the timeout', async () => {
        const server = serve({ storage: diskStorage({ destination: directory }), timeout: 150 });
        const body = `${filePart('photos', 'done.png', 'complete')}\r\n${filePart('photos', 'partial.png', 'x'.repeat(2048))}`;

        const res = await stalledUpload(server, body);

        expect(res.status).toBe(408);
        await waitUntil(() => readdirSync(directory).length === 0);
        expect(readdirSync(directory)).toEqual([]);
    });

    it('should return 408 when a stall leaves a file too short to check', async () => {
        const server = serve({ storage: memoryStorage(), timeout: 150, verifyContent: true });

        const res = await stalledUpload(server, filePart('photos', 'short.pdf', '%PDF-'));

        expect(res.status).toBe(408);
    });

    it('should return 408 with memory storage', async () => {
        const server = serve({ storage: memoryStorage(), timeout: 150 });

        const res = await stalledUpload(server, filePart('photos', 'partial.png', 'x'.repeat(2048)));

        expect(res.status).toBe(408);
    });

    it('should return 408 when the client stalls before sending a file', async () => {
        const server = serve({ timeout: 150 });

        const res = await stalledUpload(server, `--${boundary}\r\n`);

        expect(res.status).toBe(408);
    });

    it('should keep the server responsive after a timeout', async () => {
        const server = serve({ storage: diskStorage({ destination: directory }), timeout: 150 });

        const first = await stalledUpload(server, filePart('photos', 'a.png', 'x'.repeat(2048)));
        const second = await stalledUpload(server, filePart('photos', 'b.png', 'x'.repeat(2048)));

        expect(first.status).toBe(408);
        expect(second.status).toBe(408);
    });
});
