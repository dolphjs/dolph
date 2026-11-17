/**
 * Phase-1 spike: pure Bun.serve engine ceiling — no Express, no Fastify, no Dolph.
 * Measures whether a native Bun HTTP path can beat Fastify on latency/throughput
 * before we invest in wiring it into core/adapters as a third HttpAdapter.
 *
 * Response shapes match benchmark/servers/express.js (raw JSON, no envelope)
 * so numbers are comparable to express/hono/fastify rows.
 */

const PORT = parseInt(process.env.PORT || '4007', 10);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' } as const;

const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

// ── Handlers ────────────────────────────────────────────────────────────────

const ping = () => json({ message: 'pong' });

const echo = async (req: Request) => {
    const text = await req.text();
    let body: unknown = {};
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        return json({ message: 'Invalid JSON' }, 400);
    }
    return json(body);
};

const pipeline = async (req: Request) => {
    const text = await req.text();
    let input: Record<string, unknown> = {};
    try {
        input = text ? JSON.parse(text) : {};
    } catch {
        return json({ message: 'Invalid JSON' }, 400);
    }
    const enriched = await Promise.resolve({ ...input, enriched: true, ts: Date.now() });
    await sleep(75);
    return json(enriched);
};

// ── Minimal router (static table + one param route) ────────────────────────
// Phase-1 only; a production adapter needs a radix/automaton matcher.

type Handler = (req: Request, params?: Record<string, string>) => Response | Promise<Response>;

const routes = new Map<string, Handler>();

routes.set('GET /ping', ping);
routes.set('POST /echo', echo);
routes.set('GET /async/instant', async () => json(await Promise.resolve({ delay: 0, message: 'done' })));
routes.set('GET /async/micro', async () => {
    await sleep(10);
    return json({ delay: 10, message: 'done' });
});
routes.set('GET /async/light', async () => {
    await sleep(50);
    return json({ delay: 50, message: 'done' });
});
routes.set('GET /async/medium', async () => {
    await sleep(150);
    return json({ delay: 150, message: 'done' });
});
routes.set('GET /async/heavy', async () => {
    await sleep(500);
    return json({ delay: 500, message: 'done' });
});
routes.set('GET /async/1s', async () => {
    await sleep(1000);
    return json({ delay: 1000, message: 'done' });
});
routes.set('GET /async/2s', async () => {
    await sleep(2000);
    return json({ delay: 2000, message: 'done' });
});
routes.set('GET /async/3s', async () => {
    await sleep(3000);
    return json({ delay: 3000, message: 'done' });
});
routes.set('GET /async/fanout', async () => {
    const [a, b, c] = await Promise.all([
        sleep(100).then(() => 'task-a'),
        sleep(100).then(() => 'task-b'),
        sleep(100).then(() => 'task-c'),
    ]);
    return json({ delay: 100, tasks: [a, b, c], message: 'done' });
});
routes.set('POST /async/pipeline', pipeline);

const NOT_FOUND = json({ message: 'Not Found' }, 404);

const fetchHandler = (req: Request): Response | Promise<Response> => {
    const { pathname } = new URL(req.url);
    const key = `${req.method} ${pathname}`;

    // Fast path: exact match (covers /ping, /echo, /async/*).
    const handler = routes.get(key);
    if (handler) return handler(req);

    // Param path: GET /users/:id
    if (req.method === 'GET' && pathname.startsWith('/users/')) {
        const id = pathname.slice('/users/'.length);
        if (id && !id.includes('/')) return json({ id, name: 'John Doe' });
    }

    return NOT_FOUND;
};

Bun.serve({
    port: PORT,
    hostname: '0.0.0.0',
    fetch: fetchHandler,
    // Idle keep-alive tuned for autocannon's 100 persistent connections.
    idleTimeout: 30,
});

if (typeof process.send === 'function') process.send('ready');
console.log(`bun-native listening on :${PORT}`);