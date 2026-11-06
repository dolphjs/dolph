'use strict';

/**
 * Produces the numbers on the website. Every path is warmed up first. Each round then
 * measures every path once, in turn, so a slow moment on the machine hits all of them,
 * and the result is the median round.
 *
 *   node benchmark/site-runner.js
 *   node benchmark/site-runner.js --rounds 3 --seconds 3
 */

const { spawn } = require('child_process');
const path = require('path');
const autocannon = require('autocannon');

const option = (name, fallback) => {
    const index = process.argv.indexOf(`--${name}`);

    return index === -1 ? fallback : Number(process.argv[index + 1]);
};

const ROUNDS = option('rounds', 5);
const SECONDS = option('seconds', 6);
const CONNECTIONS = 100;
const WARMUP_SECONDS = 3;

const BENCH_DIR = __dirname;
const ROOT_DIR = path.resolve(BENCH_DIR, '..');
const TS_NODE = path.join(ROOT_DIR, 'node_modules', '.bin', 'ts-node');
const DOLPH_SERVER = [
    '--transpile-only',
    '--project',
    path.join(ROOT_DIR, 'tsconfig.json'),
    path.join(BENCH_DIR, 'servers', 'dolph.ts'),
];
const BODY = JSON.stringify({ hello: 'world', num: 42 });

const dolphPaths = {
    GET: { method: 'GET', url: '/ping' },
    'GET with @DReq': { method: 'GET', url: '/ping-req' },
    POST: { method: 'POST', url: '/echo', body: BODY },
    'POST with a valid DTO': { method: 'POST', url: '/echo-dto', body: BODY },
};

const SERVERS = [
    {
        name: 'Express',
        port: 4102,
        command: process.execPath,
        args: [path.join(BENCH_DIR, 'servers', 'express.js')],
        paths: { GET: dolphPaths.GET, POST: dolphPaths.POST },
    },
    { name: 'Dolph on Express', port: 4101, command: TS_NODE, args: DOLPH_SERVER, paths: dolphPaths },
    {
        name: 'Dolph on Fastify',
        port: 4103,
        command: TS_NODE,
        args: DOLPH_SERVER,
        env: { DOLPH_ADAPTER: 'fastify' },
        paths: dolphPaths,
    },
];

const start = async ({ port, command, args, env }) => {
    const child = spawn(command, args, {
        cwd: BENCH_DIR,
        stdio: 'ignore',
        env: { ...process.env, NODE_ENV: 'production', PORT: String(port), ...env },
    });

    for (let attempt = 0; attempt < 300; attempt += 1) {
        try {
            await fetch(`http://127.0.0.1:${port}/ping`);
            return child;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    child.kill();
    throw new Error(`Server on port ${port} did not start`);
};

const measure = async (port, { method, url, body }, duration = SECONDS) => {
    const result = await autocannon({
        url: `http://127.0.0.1:${port}${url}`,
        method,
        body,
        headers: { 'content-type': 'application/json' },
        connections: CONNECTIONS,
        duration,
    });

    if (result.non2xx || result.errors) {
        throw new Error(`${url} on port ${port}: ${result.non2xx} non-2xx, ${result.errors} errors`);
    }

    return result.requests.average;
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const main = async () => {
    const children = [];
    const samples = {};

    try {
        for (const server of SERVERS) children.push(await start(server));

        const targets = SERVERS.flatMap(({ name, port, paths }) =>
            Object.entries(paths).map(([label, target]) => ({ key: `${name}: ${label}`, port, target })),
        );

        // A cold route is slower until the JIT has seen it, which would penalise whatever runs first.
        for (const { port, target } of targets) await measure(port, target, WARMUP_SECONDS);

        for (let round = 0; round < ROUNDS; round += 1) {
            // Reversed every other round, so no path always follows the same one.
            for (const { key, port, target } of round % 2 ? [...targets].reverse() : targets) {
                (samples[key] ??= []).push(await measure(port, target));
                console.error(`round ${round + 1}/${ROUNDS} ${key}: ${Math.round(samples[key].at(-1))}`);
            }
        }
    } finally {
        children.forEach((child) => child.kill());
    }

    const results = Object.fromEntries(
        Object.entries(samples).map(([key, values]) => [key, Math.round(median(values))]),
    );

    console.log(JSON.stringify({ rounds: ROUNDS, seconds: SECONDS, connections: CONNECTIONS, node: process.version, results }, null, 2));
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
