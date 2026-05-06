import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const sampleRoot = resolve(__dirname, '..');
const webRoot = join(sampleRoot, 'web');
const frontendPort = 5174;
const backendUrl = 'http://localhost:3040';

const mimeMap = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
};

const backendProcess = spawn('npx', ['ts-node', 'src/server.ts'], {
    cwd: sampleRoot,
    stdio: 'inherit',
    shell: false,
});

async function waitForBackend(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.request(
                    `${backendUrl}/api/v1/health/`,
                    { method: 'GET', timeout: 1000 },
                    (res) => {
                        if ((res.statusCode || 500) < 500) resolve(true);
                        else reject(new Error('backend not ready'));
                    },
                );
                req.on('error', reject);
                req.on('timeout', () => req.destroy(new Error('timeout')));
                req.end();
            });
            return true;
        } catch (_error) {
            await new Promise((r) => setTimeout(r, 500));
        }
    }
    return false;
}

const staticServer = createServer(async (req, res) => {
    try {
        if (req.url?.startsWith('/api/') || req.url?.startsWith('/socket.io/')) {
            const target = new URL(req.url, backendUrl);
            const proxyReq = http.request(
                {
                    hostname: target.hostname,
                    port: target.port,
                    path: target.pathname + target.search,
                    method: req.method,
                    headers: req.headers,
                },
                (proxyRes) => {
                    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
                    proxyRes.pipe(res);
                },
            );
            req.pipe(proxyReq);
            proxyReq.on('error', () => {
                res.statusCode = 502;
                res.end('Proxy error');
            });
            return;
        }

        const requestedPath = req.url === '/' ? '/index.html' : req.url || '/index.html';
        const cleanPath = requestedPath.split('?')[0];
        const absolutePath = join(webRoot, cleanPath);
        const content = await readFile(absolutePath);
        const extension = extname(absolutePath);
        res.setHeader('Content-Type', mimeMap[extension] || 'application/octet-stream');
        res.end(content);
    } catch (_error) {
        res.statusCode = 404;
        res.end('Not found');
    }
});

staticServer.listen(frontendPort, async () => {
    const frontendUrl = `http://localhost:${frontendPort}`;
    const backendReady = await waitForBackend();
    if (!backendReady) {
        console.log('[playground] backend did not become ready in time; UI will still open.');
    }
    console.log(`[playground] backend: ${backendUrl}`);
    console.log(`[playground] frontend: ${frontendUrl}`);
    const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(openCmd, [frontendUrl], { stdio: 'ignore', shell: true });
});

const shutdown = () => {
    staticServer.close();
    if (!backendProcess.killed) {
        backendProcess.kill('SIGTERM');
    }
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
backendProcess.on('exit', shutdown);
