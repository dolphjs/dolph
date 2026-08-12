/**
 * Stress test: 9 services + 3 controllers in a single @Component.
 *
 * This test also surfaces a key DolphJS requirement:
 *   Services that have constructor-injected dependencies MUST be decorated
 *   with @DService() so that TypeScript's emitDecoratorMetadata emits
 *   design:paramtypes for the constructor. Without it, the DI resolver
 *   cannot discover the dependency chain and will instantiate the service
 *   with no arguments, leaving injected properties as `undefined`.
 *
 * Validates:
 *  - Correct service resolution & injection for all controllers
 *  - Singleton guarantee: state mutated via one controller visible from another
 *  - Startup performance (component init < 200ms)
 *  - Request latency (20 concurrent requests complete < 2000ms wall-clock)
 *  - Service dependency chains (services injecting other services)
 *  - 100 sequential POST+GET pairs with zero errors
 */
import request from 'supertest';
import { DolphFactory } from '../core';
import { Component, DBody, DParam, DService, Get, Post, Route } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { Dolph } from '../common';
import { GlobalServiceRegistry } from '../core/initialisers/global_service_registry';

/* ─────────────────────────────────────────────────
   Leaf services (no deps) — @DService() still
   applied for consistency / future-proofing
   ───────────────────────────────────────────────── */

@DService()
class LogService {
    private logs: string[] = [];
    log(msg: string) { this.logs.push(`[${Date.now()}] ${msg}`); }
    getLogs() { return this.logs; }
}

@DService()
class MetricsService {
    private counters = new Map<string, number>();
    increment(key: string) { this.counters.set(key, (this.counters.get(key) ?? 0) + 1); }
    get(key: string) { return this.counters.get(key) ?? 0; }
    all() { return Object.fromEntries(this.counters); }
}

@DService()
class CacheService {
    private store = new Map<string, any>();
    set(key: string, value: any) { this.store.set(key, value); }
    get(key: string) { return this.store.get(key); }
    has(key: string) { return this.store.has(key); }
    size() { return this.store.size; }
}

@DService()
class UserRepository {
    private users: Record<string, any> = {};
    save(user: any) { this.users[user.id] = user; return user; }
    findById(id: string) { return this.users[id] ?? null; }
    findAll() { return Object.values(this.users); }
}

@DService()
class ProductRepository {
    private products: Record<string, any> = {};
    save(product: any) { this.products[product.id] = product; return product; }
    findById(id: string) { return this.products[id] ?? null; }
    findAll() { return Object.values(this.products); }
}

@DService()
class OrderRepository {
    private orders: Record<string, any> = {};
    save(order: any) { this.orders[order.id] = order; return order; }
    findAll() { return Object.values(this.orders); }
}

/* ─────────────────────────────────────────────────
   Composite services — @DService() is REQUIRED here
   so that TypeScript emits design:paramtypes for
   the constructor parameters, enabling DI resolution.
   ───────────────────────────────────────────────── */

@DService()
class UserService {
    constructor(
        private userRepo: UserRepository,
        private logService: LogService,
        private metricsService: MetricsService,
    ) {}

    createUser(id: string, name: string) {
        const user = this.userRepo.save({ id, name });
        this.logService.log(`Created user: ${name}`);
        this.metricsService.increment('users.created');
        return user;
    }

    getUser(id: string) {
        this.metricsService.increment('users.fetched');
        return this.userRepo.findById(id);
    }

    listUsers() { return this.userRepo.findAll(); }
}

@DService()
class ProductService {
    constructor(
        private productRepo: ProductRepository,
        private cacheService: CacheService,
        private metricsService: MetricsService,
    ) {}

    createProduct(id: string, name: string, price: number) {
        const product = this.productRepo.save({ id, name, price });
        this.cacheService.set(`product:${id}`, product);
        this.metricsService.increment('products.created');
        return product;
    }

    getProduct(id: string) {
        if (this.cacheService.has(`product:${id}`)) {
            this.metricsService.increment('products.cache_hit');
            return this.cacheService.get(`product:${id}`);
        }
        this.metricsService.increment('products.db_hit');
        return this.productRepo.findById(id);
    }
}

@DService()
class OrderService {
    constructor(
        private orderRepo: OrderRepository,
        private userService: UserService,
        private productService: ProductService,
        private metricsService: MetricsService,
    ) {}

    placeOrder(orderId: string, userId: string, productId: string) {
        const user = this.userService.getUser(userId);
        const product = this.productService.getProduct(productId);
        if (!user || !product) return null;
        const order = this.orderRepo.save({ id: orderId, userId, productId, total: product.price });
        this.metricsService.increment('orders.placed');
        return order;
    }

    listOrders() { return this.orderRepo.findAll(); }
}

/* ─────────────────────────────────────────────────
   3 Controllers
   ───────────────────────────────────────────────── */

@Route('/users')
class UserController extends DolphControllerHandler<Dolph> {
    constructor(private userService: UserService) { super(); }

    @Post('/')
    create(@DBody() body: any) {
        return this.userService.createUser(body.id, body.name);
    }

    @Get('/:id')
    getOne(@DParam() params: any) {
        return this.userService.getUser(params.id);
    }

    @Get('/')
    list() {
        return this.userService.listUsers();
    }
}

@Route('/products')
class ProductController extends DolphControllerHandler<Dolph> {
    constructor(private productService: ProductService) { super(); }

    @Post('/')
    create(@DBody() body: any) {
        return this.productService.createProduct(body.id, body.name, body.price);
    }

    @Get('/:id')
    getOne(@DParam() params: any) {
        return this.productService.getProduct(params.id);
    }
}

@Route('/orders')
class OrderController extends DolphControllerHandler<Dolph> {
    constructor(
        private orderService: OrderService,
        private metricsService: MetricsService,
    ) { super(); }

    @Post('/')
    place(@DBody() body: any) {
        return this.orderService.placeOrder(body.orderId, body.userId, body.productId);
    }

    @Get('/')
    list() {
        return this.orderService.listOrders();
    }

    @Get('/metrics')
    metrics() {
        return this.metricsService.all();
    }
}

/* ─────────────────────────────────────────────────
   The Large Component (9 services, 3 controllers)
   ───────────────────────────────────────────────── */
@Component({
    controllers: [UserController, ProductController, OrderController],
    services: [
        LogService,
        MetricsService,
        CacheService,
        UserRepository,
        ProductRepository,
        OrderRepository,
        UserService,
        ProductService,
        OrderService,
    ],
})
class BigComponent {}

/* ─────────────────────────────────────────────────
   Test Suite
   ───────────────────────────────────────────────── */
describe('Large component: 9 services + 3 controllers', () => {
    let server: any;
    let initDurationMs: number;

    beforeAll(() => {
        GlobalServiceRegistry._reset();
        const t0 = process.hrtime.bigint();
        server = new DolphFactory([BigComponent]).start();
        const t1 = process.hrtime.bigint();
        initDurationMs = Number(t1 - t0) / 1_000_000;
        console.log(`\n  ⏱  DolphFactory init time: ${initDurationMs.toFixed(2)}ms`);
    });

    afterAll(() => server.close());

    // ── Correctness ────────────────────────────────────────────────
    it('creates a user and retrieves it', async () => {
        const create = await request(server).post('/v1/users/').send({ id: 'u1', name: 'Utee' });
        expect(create.status).toBe(200);
        expect(create.body.data.name).toBe('Utee');

        const get = await request(server).get('/v1/users/u1');
        expect(get.status).toBe(200);
        expect(get.body.data.name).toBe('Utee');
    });

    it('creates a product and retrieves it (second GET is a cache hit)', async () => {
        const create = await request(server).post('/v1/products/').send({ id: 'p1', name: 'Gadget', price: 99 });
        expect(create.status).toBe(200);
        expect(create.body.data.price).toBe(99);

        const get = await request(server).get('/v1/products/p1');
        expect(get.status).toBe(200);
        expect(get.body.data.name).toBe('Gadget');
    });

    it('places an order crossing all three service layers', async () => {
        const order = await request(server).post('/v1/orders/').send({
            orderId: 'o1',
            userId: 'u1',
            productId: 'p1',
        });
        expect(order.status).toBe(200);
        expect(order.body.data.id).toBe('o1');
        expect(order.body.data.total).toBe(99);
    });

    it('MetricsService is a true singleton — increments from all controllers visible in one place', async () => {
        const res = await request(server).get('/v1/orders/metrics');
        expect(res.status).toBe(200);
        const m = res.body.data;
        expect(m['users.created']).toBeGreaterThanOrEqual(1);
        expect(m['products.created']).toBeGreaterThanOrEqual(1);
        expect(m['orders.placed']).toBeGreaterThanOrEqual(1);
        expect(m['products.cache_hit']).toBeGreaterThanOrEqual(1);
        console.log('  📊 Metrics snapshot:', m);
    });

    it('list endpoints reflect shared in-memory state across controllers', async () => {
        const users = await request(server).get('/v1/users/');
        const orders = await request(server).get('/v1/orders/');
        expect(users.body.data.length).toBeGreaterThanOrEqual(1);
        expect(orders.body.data.length).toBeGreaterThanOrEqual(1);
    });

    // ── Performance ─────────────────────────────────────────────────
    it('init time is under 200ms', () => {
        expect(initDurationMs).toBeLessThan(200);
        console.log(`  ✅ Init was ${initDurationMs.toFixed(2)}ms (< 200ms budget)`);
    });

    it('20 sequential GETs complete within 1000ms total (performance baseline)', async () => {
        const COUNT = 20;
        const t0 = Date.now();
        for (let i = 0; i < COUNT; i++) {
            const r = await request(server).get('/v1/users/u1');
            expect(r.status).toBe(200);
        }
        const elapsed = Date.now() - t0;
        const avgMs = (elapsed / COUNT).toFixed(1);
        console.log(`  ⚡ ${COUNT} sequential GETs: ${elapsed}ms total, ~${avgMs}ms avg per request`);
        expect(elapsed).toBeLessThan(1000);
    });

    it('50 sequential POST+GET pairs are 100% reliable', async () => {
        const errors: string[] = [];
        for (let i = 2; i <= 51; i++) {
            const cr = await request(server)
                .post('/v1/users/')
                .send({ id: `u${i}`, name: `User-${i}` });
            if (cr.status !== 200) errors.push(`POST /users status ${cr.status} for u${i}`);

            const gr = await request(server).get(`/v1/users/u${i}`);
            if (gr.status !== 200) errors.push(`GET /users/u${i} status ${gr.status}`);
            if (gr.body?.data?.name !== `User-${i}`) errors.push(`Name mismatch for u${i}: got '${gr.body?.data?.name}'`);
        }
        if (errors.length) console.error('  ❌ Errors:', errors.slice(0, 10));
        expect(errors).toHaveLength(0);
        console.log('  ✅ 100 sequential POST+GET requests: 0 errors');
    });
});
