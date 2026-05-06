# dolphjs Benchmark

Compares dolphjs against **Express**, **Hono**, **NestJS (Express)**, and **NestJS (Fastify)** across three endpoint patterns.

## Endpoints

| Route | Description |
|---|---|
| `GET /ping` | Minimal JSON response — measures raw framework overhead |
| `GET /users/:id` | Parametric route — measures route param extraction |
| `POST /echo` | JSON body parsing + echo — measures body handling |

## Setup

Install benchmark dependencies (NestJS, Hono, ts-node, etc.):

```bash
cd benchmark
npm install
```

The root project's `node_modules` must also be present (for dolph source imports and autocannon):

```bash
cd ..
npm install
```

## Running

```bash
# Full benchmark (15s per endpoint per framework)
node runner.js

# Quick run (5s — for a fast sanity check)
node runner.js --quick

# Single framework only
node runner.js --only dolph
node runner.js --only express
node runner.js --only hono
node runner.js --only nest-express
node runner.js --only nest-fastify

# Show server output (useful for debugging startup issues)
node runner.js --verbose
```

Or via npm scripts from the benchmark directory:

```bash
npm run bench
npm run bench:quick
```

## Benchmark settings

| Setting | Value |
|---|---|
| Concurrent connections | 100 |
| HTTP pipelining | 1 (standard keep-alive, no pipelining) |
| Duration (full) | 15 seconds per endpoint |
| Duration (quick) | 5 seconds per endpoint |

## Important caveats

**dolph vs bare Express**: dolphjs includes additional middleware by default that bare Express does not — a fallback response middleware and error converters. Morgan and cookie-parser are opt-in via the middleware registry. This reflects the real overhead of using the framework, but means the gap is not purely routing overhead.

**NestJS logger disabled**: NestJS servers run with `logger: false` to suppress startup logs. This matches how you'd deploy them in production.

**ts-node startup time**: dolph, nest-express, and nest-fastify servers use ts-node for compilation. There is a cold-start cost (5–30s) before the server is ready; the runner waits automatically. Once running, this does not affect per-request throughput numbers.

**Response format**: dolph wraps responses in a `SuccessResponse` envelope (`{ status, body }`), while Express, Hono, and NestJS return data directly. Response payload size is slightly larger for dolph.
