'use strict';

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const argv = process.argv.slice(2);
const QUICK = argv.includes('--quick');
const VERBOSE = argv.includes('--verbose');
const onlyIdx = argv.indexOf('--only');
const ONLY = onlyIdx !== -1 ? argv[onlyIdx + 1] : null;

const DURATION = QUICK ? 5 : 15;
const CONNECTIONS = 100;
const PIPELINING = 1;
// Slow async endpoints use fewer connections so the pool doesn't overwhelm the event loop
// but still measures concurrency handling under realistic load.
const ASYNC_CONNECTIONS = 50;
const READY_TIMEOUT_MS = 90_000;

const BENCH_DIR = __dirname;
// The dolph server is run from the benchmark dir so readFileSync('dolph_config.yaml') resolves here.
// ts-node is invoked with the root tsconfig so decorator metadata compilation works.
const ROOT_DIR = path.resolve(BENCH_DIR, '..');
const BENCH_TS_NODE = path.join(BENCH_DIR, 'node_modules', '.bin', 'ts-node');
const ROOT_TS_NODE = path.join(ROOT_DIR, 'node_modules', '.bin', 'ts-node');

// Framework definitions

const ALL_FRAMEWORKS = [
    {
        name: 'dolph',
        port: 4001,
        // Run ts-node from the benchmark dir (so cwd = benchmark/) using the ROOT tsconfig
        // so all dolph source imports resolve correctly.
        cmd: ROOT_TS_NODE,
        args: ['--project', path.join(ROOT_DIR, 'tsconfig.json'), path.join(BENCH_DIR, 'servers', 'dolph.ts')],
        cwd: BENCH_DIR,
        env: { PORT: '4001' },
    },
    {
        name: 'express',
        port: 4002,
        cmd: process.execPath,
        args: [path.join(BENCH_DIR, 'servers', 'express.js')],
        cwd: BENCH_DIR,
        env: { PORT: '4002' },
    },
    {
        name: 'hono',
        port: 4003,
        cmd: process.execPath,
        args: [path.join(BENCH_DIR, 'servers', 'hono.js')],
        cwd: BENCH_DIR,
        env: { PORT: '4003' },
    },
    {
        name: 'nest-express',
        port: 4004,
        cmd: BENCH_TS_NODE,
        args: ['--project', path.join(BENCH_DIR, 'tsconfig.json'), path.join(BENCH_DIR, 'servers', 'nest-express.ts')],
        cwd: BENCH_DIR,
        env: { PORT: '4004' },
    },
    {
        name: 'nest-fastify',
        port: 4005,
        cmd: BENCH_TS_NODE,
        args: ['--project', path.join(BENCH_DIR, 'tsconfig.json'), path.join(BENCH_DIR, 'servers', 'nest-fastify.ts')],
        cwd: BENCH_DIR,
        env: { PORT: '4005' },
    },
];

const FRAMEWORKS = ONLY ? ALL_FRAMEWORKS.filter((f) => f.name === ONLY) : ALL_FRAMEWORKS;

// Endpoints
// Each entry may have an optional `connections` override (defaults to CONNECTIONS).
const ENDPOINTS = [
    // ── Baseline sync endpoints ───────────────────────────────────────────
    {
        id: 'ping',
        title: 'GET /ping',
        path: '/ping',
        method: 'GET',
    },
    {
        id: 'param',
        title: 'GET /users/:id',
        path: '/users/42',
        method: 'GET',
    },
    {
        id: 'post',
        title: 'POST /echo',
        path: '/echo',
        method: 'POST',
        body: JSON.stringify({ hello: 'world', num: 42 }),
        headers: { 'content-type': 'application/json' },
    },

    // ── Async workload endpoints ──────────────────────────────────────────
    // 1. Pure async overhead (Promise.resolve, no timer)
    {
        id: 'async-instant',
        title: 'GET /async/instant',
        path: '/async/instant',
        method: 'GET',
        connections: CONNECTIONS,
    },
    // 2. 10 ms — micro I/O latency
    {
        id: 'async-micro',
        title: 'GET /async/micro (10ms)',
        path: '/async/micro',
        method: 'GET',
        connections: CONNECTIONS,
    },
    // 3. 50 ms — light I/O
    {
        id: 'async-light',
        title: 'GET /async/light (50ms)',
        path: '/async/light',
        method: 'GET',
        connections: CONNECTIONS,
    },
    // 4. 150 ms — typical remote API call
    {
        id: 'async-medium',
        title: 'GET /async/medium (150ms)',
        path: '/async/medium',
        method: 'GET',
        connections: ASYNC_CONNECTIONS,
    },
    // 5. 500 ms — heavy I/O
    {
        id: 'async-heavy',
        title: 'GET /async/heavy (500ms)',
        path: '/async/heavy',
        method: 'GET',
        connections: ASYNC_CONNECTIONS,
    },
    // 6. 1 s delay
    {
        id: 'async-1s',
        title: 'GET /async/1s',
        path: '/async/1s',
        method: 'GET',
        connections: ASYNC_CONNECTIONS,
    },
    // 7. 2 s delay
    {
        id: 'async-2s',
        title: 'GET /async/2s',
        path: '/async/2s',
        method: 'GET',
        connections: ASYNC_CONNECTIONS,
    },
    // 8. 3 s delay
    {
        id: 'async-3s',
        title: 'GET /async/3s',
        path: '/async/3s',
        method: 'GET',
        connections: ASYNC_CONNECTIONS,
    },
    // 9. Fan-out — 3 parallel 100 ms tasks (~100 ms wall-time)
    {
        id: 'async-fanout',
        title: 'GET /async/fanout (3×100ms)',
        path: '/async/fanout',
        method: 'GET',
        connections: ASYNC_CONNECTIONS,
    },
    // 10. Pipeline — body parse + enrich + 75 ms persist
    {
        id: 'async-pipeline',
        title: 'POST /async/pipeline (75ms)',
        path: '/async/pipeline',
        method: 'POST',
        body: JSON.stringify({ user: 'bench', value: 42 }),
        headers: { 'content-type': 'application/json' },
        connections: ASYNC_CONNECTIONS,
    },
];

// Helpers
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
    // Require autocannon from parent project node_modules if not in benchmark's
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
                connections: opts.connections || CONNECTIONS,
                pipelining: PIPELINING,
                duration: DURATION,
                method: opts.method || 'GET',
                body: opts.body,
                headers: opts.headers,
                bailout: 1000,
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
        // Force kill after 3s if SIGTERM is ignored
        setTimeout(() => {
            if (proc.exitCode === null) proc.kill('SIGKILL');
        }, 3000);
    });
}

// Formatting
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

function printTable(endpointTitle, rows) {
    const cols = [
        { key: 'name', label: 'Framework', width: 16 },
        { key: 'reqps', label: 'Req/s', width: 10 },
        { key: 'latAvg', label: 'Lat avg', width: 10 },
        { key: 'latP99', label: 'Lat p99', width: 10 },
        { key: 'throughput', label: 'Throughput', width: 12 },
        { key: 'errors', label: 'Errors', width: 8 },
    ];

    const sep = cols.map((c) => '─'.repeat(c.width + 2)).join('┼');
    const top = cols.map((c) => '─'.repeat(c.width + 2)).join('┬');
    const bot = cols.map((c) => '─'.repeat(c.width + 2)).join('┴');
    const pad = (s, w) => String(s).padStart(w);
    const lpad = (s, w) => String(s).padEnd(w);

    console.log(`\n  ${endpointTitle}`);
    console.log(`┌${top}┐`);
    console.log(`│ ${cols.map((c) => lpad(c.label, c.width)).join(' │ ')} │`);
    console.log(`├${sep}┤`);

    // Sort by req/s descending
    const sorted = [...rows].sort((a, b) => (b.reqps || 0) - (a.reqps || 0));
    const best = sorted[0]?.reqps || 1;

    for (const row of sorted) {
        const marker = row.reqps === best ? ' ◀' : '';
        const cells = [
            lpad(row.name, cols[0].width),
            pad(row.reqps ? fmt(row.reqps) + marker : 'FAILED', cols[1].width),
            pad(row.latAvg ? fmt(row.latAvg, 2) + 'ms' : '-', cols[2].width),
            pad(row.latP99 ? fmt(row.latP99, 2) + 'ms' : '-', cols[3].width),
            pad(row.throughput ? fmtBytes(row.throughput) : '-', cols[4].width),
            pad(row.errors ?? '-', cols[5].width),
        ];
        console.log(`│ ${cells.join(' │ ')} │`);
    }

    console.log(`└${bot}┘`);
}

function printSummary(allResults) {
    const baselineIds = ['ping', 'param', 'post'];
    const asyncIds = ENDPOINTS.filter((e) => !baselineIds.includes(e.id)).map((e) => e.id);

    console.log('\n\n══════════════════════════════════════════════════════');
    console.log('  BENCHMARK SUMMARY — BASELINE (sync)');
    console.log(`  ${CONNECTIONS} connections · ${PIPELINING} pipelining · ${DURATION}s duration`);
    console.log('══════════════════════════════════════════════════════');

    for (const endpoint of ENDPOINTS.filter((e) => baselineIds.includes(e.id))) {
        const rows = FRAMEWORKS.map((fw) => {
            const r = allResults[fw.name]?.[endpoint.id];
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
        printTable(endpoint.title, rows);
    }

    console.log('\n\n══════════════════════════════════════════════════════');
    console.log('  BENCHMARK SUMMARY — ASYNC WORKLOADS');
    console.log(`  ${ASYNC_CONNECTIONS}–${CONNECTIONS} connections · ${PIPELINING} pipelining · ${DURATION}s duration`);
    console.log('══════════════════════════════════════════════════════');

    for (const endpoint of ENDPOINTS.filter((e) => asyncIds.includes(e.id))) {
        const rows = FRAMEWORKS.map((fw) => {
            const r = allResults[fw.name]?.[endpoint.id];
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
        printTable(endpoint.title, rows);
    }

    console.log('');
}

// Main
async function main() {
    if (FRAMEWORKS.length === 0) {
        console.error(`Unknown framework: ${ONLY}`);
        console.error(`Available: ${ALL_FRAMEWORKS.map((f) => f.name).join(', ')}`);
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  dolphjs benchmark');
    console.log(`  mode: ${QUICK ? 'quick (5s)' : 'full (15s)'} · connections: ${CONNECTIONS} · pipelining: ${PIPELINING}`);
    console.log(`  frameworks: ${FRAMEWORKS.map((f) => f.name).join(', ')}`);
    console.log('═══════════════════════════════════════════════════════════\n');

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

        if (!VERBOSE && proc.stdout) {
            proc.stdout.on('data', () => {}); // drain to prevent buffer blocking
        }
        if (!VERBOSE && proc.stderr) {
            proc.stderr.on('data', () => {}); // drain to prevent buffer blocking
        }

        try {
            process.stdout.write(`  Waiting for ${fw.name} `);
            await waitForServer(fw.port);
            console.log(`  ${fw.name} ready`);

            allResults[fw.name] = {};

            for (const ep of ENDPOINTS) {
                process.stdout.write(`  ↳ ${ep.title.padEnd(22)} `);
                const result = await runAutocannon(`http://127.0.0.1:${fw.port}${ep.path}`, {
                    method: ep.method,
                    body: ep.body,
                    headers: ep.headers,
                    connections: ep.connections,
                });
                allResults[fw.name][ep.id] = result;
                console.log(`${fmt(result.requests.average).padStart(8)} req/s   p99 ${fmt(result.latency.p99, 1)}ms`);
            }
        } catch (err) {
            console.error(`  ✗ ${fw.name} failed: ${err.message}`);
            allResults[fw.name] = null;
        } finally {
            await killProcess(proc);
            // Brief pause between servers so ports are fully released
            await new Promise((r) => setTimeout(r, 500));
        }
    }

    printSummary(allResults);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
