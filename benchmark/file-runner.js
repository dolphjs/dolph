'use strict';

const { spawn } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const path = require('path');

const argv = process.argv.slice(2);
const QUICK = argv.includes('--quick');
const VERBOSE = argv.includes('--verbose');
const onlyIdx = argv.indexOf('--only');
const ONLY = onlyIdx !== -1 ? argv[onlyIdx + 1] : null;

const DURATION = QUICK ? 5 : 15;
const CONNECTIONS = 50; // lower than the perf benchmark — multipart parsing is heavier
const PIPELINING = 1;
const READY_TIMEOUT_MS = 90_000;

const BENCH_DIR = __dirname;
const ROOT_DIR = path.resolve(BENCH_DIR, '..');
const BENCH_TS_NODE = path.join(BENCH_DIR, 'node_modules', '.bin', 'ts-node');
const ROOT_TS_NODE = path.join(ROOT_DIR, 'node_modules', '.bin', 'ts-node');

// ── Servers ───────────────────────────────────────────────────────────────────

const ALL_FRAMEWORKS = [
    {
        name: 'dolph',
        port: 4006,
        cmd: ROOT_TS_NODE,
        args: ['--project', path.join(ROOT_DIR, 'tsconfig.json'), path.join(BENCH_DIR, 'servers', 'dolph-upload.ts')],
        cwd: BENCH_DIR,
        env: { PORT: '4006' },
    },
    {
        name: 'express+multer',
        port: 4007,
        cmd: process.execPath,
        args: [path.join(BENCH_DIR, 'servers', 'express-upload.js')],
        cwd: BENCH_DIR,
        env: { PORT: '4007' },
    },
    {
        name: 'nest-express',
        port: 4008,
        cmd: BENCH_TS_NODE,
        args: ['--project', path.join(BENCH_DIR, 'tsconfig.json'), path.join(BENCH_DIR, 'servers', 'nest-express-upload.ts')],
        cwd: BENCH_DIR,
        env: { PORT: '4008' },
    },
    {
        name: 'nest-fastify',
        port: 4009,
        cmd: BENCH_TS_NODE,
        args: ['--project', path.join(BENCH_DIR, 'tsconfig.json'), path.join(BENCH_DIR, 'servers', 'nest-fastify-upload.ts')],
        cwd: BENCH_DIR,
        env: { PORT: '4009' },
    },
];

const FRAMEWORKS = ONLY ? ALL_FRAMEWORKS.filter((f) => f.name === ONLY) : ALL_FRAMEWORKS;

// ── File Fixtures ─────────────────────────────────────────────────────────────
// Each fixture is a ~10 KB buffer with the correct magic bytes for its format.
// The parser must handle the full multipart envelope regardless of content, so
// realistic magic bytes give accurate MIME detection parity without needing real
// encoded images/documents.

function makeFileFixture(magic, padByte, name, mimetype, targetSize = 10 * 1024) {
    const magicBuf = Buffer.isBuffer(magic) ? magic : Buffer.from(magic);
    const pad = Buffer.alloc(Math.max(0, targetSize - magicBuf.length), padByte ?? 0x00);
    return { name, mimetype, data: Buffer.concat([magicBuf, pad]) };
}

function makeCsvFixture(targetRows = 150) {
    const header = 'id,name,email,age,score,city,country';
    const rows = [header];
    for (let i = 1; i <= targetRows; i++) {
        rows.push(`${i},User${i},user${i}@bench.test,${20 + (i % 50)},${(i * 7) % 100},City${i % 30},Country${i % 10}`);
    }
    return {
        name: 'data.csv',
        mimetype: 'text/csv',
        data: Buffer.from(rows.join('\n') + '\n'),
    };
}

const FIXTURES = {
    // PNG  — magic: \x89 P N G \r \n \x1a \n
    png: makeFileFixture([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0x00, 'image.png', 'image/png'),
    // JPEG — magic: \xff \xd8 \xff \xe0 … JFIF
    jpeg: makeFileFixture(
        [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01],
        0x00,
        'photo.jpg',
        'image/jpeg',
    ),
    // PDF  — magic: %PDF-
    pdf: makeFileFixture(Buffer.from('%PDF-1.4\n'), 0x20, 'document.pdf', 'application/pdf'),
    // CSV  — plain text rows
    csv: makeCsvFixture(150),
    // DOCX — magic: PK\x03\x04 (ZIP-based Office Open XML)
    docx: makeFileFixture(
        [0x50, 0x4b, 0x03, 0x04],
        0x20,
        'report.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ),
};

// ── Multipart body builder ────────────────────────────────────────────────────
// Builds a static multipart/form-data body suitable for autocannon's fixed body.

function buildMultipartBody(fieldname, fixture) {
    const boundary = 'BenchBoundary' + crypto.randomBytes(8).toString('hex');
    const head = Buffer.from(
        `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${fieldname}"; filename="${fixture.name}"\r\n` +
            `Content-Type: ${fixture.mimetype}\r\n` +
            `\r\n`,
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, fixture.data, tail]);
    const contentType = `multipart/form-data; boundary=${boundary}`;
    return { body, contentType };
}

// Pre-build all multipart bodies once — reused across every autocannon run
const MULTIPART = {};
for (const [id, fixture] of Object.entries(FIXTURES)) {
    MULTIPART[id] = buildMultipartBody('file', fixture);
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

const ENDPOINTS = [
    { id: 'png', title: 'POST /upload/single  [PNG  ~10 KB]', path: '/upload/single', format: 'png' },
    { id: 'jpeg', title: 'POST /upload/single  [JPEG ~10 KB]', path: '/upload/single', format: 'jpeg' },
    { id: 'pdf', title: 'POST /upload/single  [PDF  ~10 KB]', path: '/upload/single', format: 'pdf' },
    { id: 'csv', title: 'POST /upload/single  [CSV  ~10 KB]', path: '/upload/single', format: 'csv' },
    { id: 'docx', title: 'POST /upload/single  [DOCX ~10 KB]', path: '/upload/single', format: 'docx' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function waitForServer(port, timeout = READY_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeout;
        let dots = 0;

        const attempt = () => {
            if (Date.now() > deadline) {
                process.stdout.write('\n');
                return reject(new Error(`Server on :${port} did not become ready within ${timeout / 1000}s`));
            }

            const req = http.get({ hostname: '127.0.0.1', port, path: '/ping', timeout: 1000 }, (res) => {
                res.resume();
                if (res.statusCode < 500) {
                    process.stdout.write('\n');
                    resolve();
                } else {
                    setTimeout(attempt, 250);
                }
            });

            req.on('error', () => {
                if (dots % 4 === 0) process.stdout.write('.');
                dots++;
                setTimeout(attempt, 250);
            });

            req.on('timeout', () => {
                req.destroy();
                setTimeout(attempt, 250);
            });
        };

        attempt();
    });
}

function runAutocannon(url, opts) {
    let autocannon;
    try {
        autocannon = require(path.join(BENCH_DIR, 'node_modules', 'autocannon'));
    } catch {
        autocannon = require(path.join(ROOT_DIR, 'node_modules', 'autocannon'));
    }

    return new Promise((resolve, reject) => {
        const instance = autocannon(
            {
                url,
                connections: CONNECTIONS,
                pipelining: PIPELINING,
                duration: DURATION,
                method: 'POST',
                body: opts.body,
                headers: { 'content-type': opts.contentType },
                bailout: 500,
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            },
        );

        if (VERBOSE) {
            autocannon.track(instance, { renderProgressBar: true });
        }
    });
}

function killProcess(proc) {
    return new Promise((resolve) => {
        if (!proc || proc.exitCode !== null) return resolve();
        proc.once('exit', resolve);
        proc.kill('SIGTERM');
        setTimeout(() => {
            if (proc.exitCode === null) proc.kill('SIGKILL');
        }, 3000);
    });
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmt(n, decimals = 0) {
    if (n === undefined || n === null) return 'N/A';
    return Number(n).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function fmtBytes(bytes) {
    if (!bytes) return 'N/A';
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`;
    return `${(bytes / 1024).toFixed(1)} KB/s`;
}

function fmtFileSize(bytes) {
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

function printTable(endpointTitle, rows) {
    const cols = [
        { key: 'name', label: 'Parser', width: 18 },
        { key: 'reqps', label: 'Req/s', width: 10 },
        { key: 'latAvg', label: 'Lat avg', width: 10 },
        { key: 'latP99', label: 'Lat p99', width: 10 },
        { key: 'throughput', label: 'Throughput', width: 12 },
        { key: 'errors', label: 'Errors', width: 8 },
    ];

    const sep = cols.map((c) => '─'.repeat(c.width + 2)).join('┼');
    const top = cols.map((c) => '─'.repeat(c.width + 2)).join('┬');
    const bot = cols.map((c) => '─'.repeat(c.width + 2)).join('┴');
    const lpad = (s, w) => String(s).padEnd(w);
    const rpad = (s, w) => String(s).padStart(w);

    console.log(`\n  ${endpointTitle}`);
    console.log(`┌${top}┐`);
    console.log(`│ ${cols.map((c) => lpad(c.label, c.width)).join(' │ ')} │`);
    console.log(`├${sep}┤`);

    const sorted = [...rows].sort((a, b) => (b.reqps || 0) - (a.reqps || 0));
    const best = sorted[0]?.reqps || 1;

    for (const row of sorted) {
        const marker = row.reqps === best ? ' ◀' : '';
        const cells = [
            lpad(row.name, cols[0].width),
            rpad(row.reqps ? fmt(row.reqps) + marker : 'FAILED', cols[1].width),
            rpad(row.latAvg ? fmt(row.latAvg, 2) + 'ms' : '-', cols[2].width),
            rpad(row.latP99 ? fmt(row.latP99, 2) + 'ms' : '-', cols[3].width),
            rpad(row.throughput ? fmtBytes(row.throughput) : '-', cols[4].width),
            rpad(row.errors ?? '-', cols[5].width),
        ];
        console.log(`│ ${cells.join(' │ ')} │`);
    }

    console.log(`└${bot}┘`);
}

function printSummary(allResults) {
    console.log('\n\n══════════════════════════════════════════════════════════════');
    console.log('  FILE UPLOAD BENCHMARK SUMMARY');
    console.log(`  ${CONNECTIONS} connections · ${PIPELINING} pipelining · ${DURATION}s per endpoint`);
    console.log('  dolph (busboy) · express+multer · nest-express (multer) · nest-fastify (@fastify/multipart)');
    console.log('══════════════════════════════════════════════════════════════');

    for (const ep of ENDPOINTS) {
        const fixture = FIXTURES[ep.format];
        const title = `${ep.title}  [file: ${fmtFileSize(fixture.data.length)}, body: ${fmtFileSize(MULTIPART[ep.format].body.length)}]`;

        const rows = FRAMEWORKS.map((fw) => {
            const r = allResults[fw.name]?.[ep.id];
            if (!r) return { name: fw.name };
            return {
                name: fw.name,
                reqps: r.requests?.average,
                latAvg: r.latency?.average,
                latP99: r.latency?.p99,
                throughput: r.throughput?.average,
                errors: r.errors,
            };
        });

        printTable(title, rows);
    }

    console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (FRAMEWORKS.length === 0) {
        console.error(`Unknown framework: ${ONLY}`);
        console.error(`Available: ${ALL_FRAMEWORKS.map((f) => f.name).join(', ')}`);
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  dolphjs file upload benchmark');
    console.log(`  mode: ${QUICK ? 'quick (5s)' : 'full (15s)'} · connections: ${CONNECTIONS} · pipelining: ${PIPELINING}`);
    console.log(`  servers: ${FRAMEWORKS.map((f) => f.name).join(', ')}`);
    console.log('  formats: PNG, JPEG, PDF, CSV, DOCX  (~10 KB each)');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const allResults = {};

    for (const fw of FRAMEWORKS) {
        console.log(`▶ Starting ${fw.name} on :${fw.port}...`);

        const proc = spawn(fw.cmd, fw.args, {
            cwd: fw.cwd,
            env: { ...process.env, ...fw.env, NODE_ENV: 'production' },
            stdio: VERBOSE ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'],
        });

        proc.on('error', (err) => {
            console.error(`  [${fw.name}] spawn error: ${err.message}`);
        });

        if (!VERBOSE && proc.stdout) proc.stdout.on('data', () => {});
        if (!VERBOSE && proc.stderr) proc.stderr.on('data', () => {});

        try {
            process.stdout.write(`  Waiting for ${fw.name} `);
            await waitForServer(fw.port);
            console.log(`  ${fw.name} ready`);

            allResults[fw.name] = {};

            for (const ep of ENDPOINTS) {
                const mp = MULTIPART[ep.format];
                process.stdout.write(`  ↳ ${ep.id.toUpperCase().padEnd(6)} `);
                const result = await runAutocannon(`http://127.0.0.1:${fw.port}${ep.path}`, {
                    body: mp.body,
                    contentType: mp.contentType,
                });
                allResults[fw.name][ep.id] = result;
                console.log(`${fmt(result.requests.average).padStart(8)} req/s   p99 ${fmt(result.latency.p99, 1)}ms   errors ${result.errors}`);
            }
        } catch (err) {
            console.error(`  ✗ ${fw.name} failed: ${err.message}`);
            allResults[fw.name] = null;
        } finally {
            await killProcess(proc);
            await new Promise((r) => setTimeout(r, 500));
        }
    }

    printSummary(allResults);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
