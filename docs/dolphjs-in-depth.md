# DolphJS In-Depth Documentation

This guide is a comprehensive, practical reference for DolphJS based on the current framework code in this repository. It is written for both first-time adopters and contributors who need precise behavior details.

## Table of contents

- What DolphJS is
- Installation and runtime requirements
- Project structure and architecture
- Bootstrapping with `DolphFactory`
- Routing models
- Decorator API reference
- Controller and service base classes
- Authentication and authorization
- Validation patterns
- File upload system
- Socket support
- Response and exception helpers
- Middleware patterns
- Configuration (`dolph_config.yaml`)
- Testing recommendations
- Production guidance
- Recent framework updates
- End-to-end example

## What DolphJS is

DolphJS is an Express-based framework with:

- Decorator-driven controllers (`@Route`, `@Get`, `@Post`, etc.)
- Route-handler classes (`DolphRouteHandler`) for explicit router composition
- Lightweight service composition via `@Component` and `InjectServiceHandler`
- Built-in middleware helpers, validation, upload tools, socket integration, and API response helpers

It supports Node.js and can be used in Bun-compatible environments where your dependency stack permits.

## Installation and runtime requirements

```bash
npm install @dolphjs/dolph
```

If you are developing the framework itself, use:

```bash
npm ci
npx tsc -p tsconfig.json --noEmit
npm test -- --runInBand
```

## Project structure and architecture

Core module boundaries:

- `core/`: bootstrap lifecycle, router/controller registration, config loading, error pipeline
- `decorators/`: route/middleware/DI metadata decorators
- `classes/`: framework base classes (`DolphControllerHandler`, `DolphRouteHandler`, etc.)
- `common/`: request/response types, middlewares, exceptions, API helpers
- `packages/`: sockets, uploader, DB integration helpers
- `utilities/`: auth/token utilities, normalizers, logger helpers

See also `docs/architecture.md` for module-level design notes.

## Bootstrapping with `DolphFactory`

`DolphFactory` is the framework entry point.

### Constructor forms

1. Standard HTTP app:

```ts
const app = new DolphFactory(
  [HealthComponent, AuthComponent, new PublicRoutes()],
  [helmet(), cookieParser()]
);
app.start();
```

2. HTTP app + sockets:

```ts
const app = new DolphFactory(
  [HealthComponent],
  {
    socketService: SocketService,
    component: new RealtimeComponent(),
    options: { cors: { origin: "*" } }
  }
);
app.start();
```

3. GraphQL adapter mode:

```ts
const app = new DolphFactory({
  graphql: true,
  schema,
  context
});
app.start();
```

### What happens during startup

At startup, DolphJS:

1. Loads and parses `dolph_config.yaml`
2. Initializes JSON/urlencoded body middleware
3. Applies external middlewares and global middleware registry entries
4. Registers route-handler classes and decorator controllers
5. Adds error conversion + error handler + 404 fallback (for non-GraphQL mode)
6. Starts HTTP server
7. Initializes sockets (if configured)

## Routing models

DolphJS supports two routing styles:

### 1) Decorator-based controllers

Use `@Component` to register controllers and services, then use route decorators on controller methods.

### 2) Class route handlers (`DolphRouteHandler`)

Define `path`, `router`, `controller`, and `initRoutes()`. Useful when you prefer explicit Express routing.

## Decorator API reference

### Controller routing decorators

- `@Route(basePath)` on class
- `@Get(path)`, `@Post(path)`, `@Put(path)`, `@Patch(path)`, `@Delete(path)` on methods
- `@UseMiddleware(mw)` for method-level middleware
- `@Shield(mw | mw[])` for class-level middleware
- `@UnShield(mw | mw[])` for method-level middleware subtraction/override behavior
- `@Render(template)` for MVC rendering use cases

### Method parameter decorators

- `@DReq()`: inject request
- `@DRes()`: inject response
- `@DNext()`: inject next
- `@DBody(Dto?)`: inject and optionally transform/validate body
- `@DParam(Dto?)`: inject and optionally transform/validate params
- `@DQuery(Dto?)`: inject and optionally transform/validate query
- `@DPayload()`: inject `req.payload`

#### Query behavior note

Current behavior keeps `whitelist: true` and disables `forbidNonWhitelisted` for `@DQuery` resolution, so unknown query keys are stripped instead of failing validation. This is practical for real query strings.

### DI and component decorators

- `@Component({ controllers, services })`: registers controllers/services and wires service instances
- `InjectServiceHandler([{ serviceHandler, serviceName }])`: class wrapper for explicit property injection

### Auth decorators

- `@JWTAuthVerifyDec(secret)`
- `@JWTAuthorizeDec(secret, authorizeFn?)`
- `@CookieAuthVerifyDec(secret)`

Use middleware alternatives (`JwtAuthMiddleware`, `cookieAuthVerify`) when you need strict control over call context and execution order.

### Validation decorator

- `@ValidateReq(schema)` for Joi-based validation of body/params/query

### Event decorators (currently not released)

- `@OnEvent(name, priority?, once?)`
- `@OnceEvent(name, priority?)`
- `@OffEvent(name)`

### Socket decorator

- `@Socket({ services, socketServices })` on socket component class

### Mongoose/MySQL injection decorators

- `InjectMongo(propertyName, model)`
- `InjectMySQL(propertyName, model)`

## Controller and service base classes

### `DolphControllerHandler<T>`

Base class for decorator controllers and route controllers.

### `DolphRouteHandler<T>`

Base class for explicit router modules:

- `path`
- `router`
- `controller`
- `initRoutes()`

### `DolphServiceHandler<T>`

Base service class with named service identity.

### `DolphSocketServiceHandler<T>`

Provides lazy socket server access via `socketService` and `socket`.

## Authentication and authorization

### JWT flow with middleware (recommended in many route stacks)

```ts
@Get("/me")
@UseMiddleware(JwtAuthMiddleware(new JwtBasicAuth(APP_SECRET)))
me(@DPayload() payload: any, @DRes() res: DResponse) {
  SuccessResponse({ res, body: { payload } });
}
```

### JWT flow with decorators

```ts
@Get("/admin/logs")
@JWTAuthorizeDec(APP_SECRET, async payload => payload.role === "admin")
logs(req: DRequest, res: DResponse) {
  SuccessResponse({ res, body: { ok: true } });
}
```

### Header format

Current auth code checks:

- `authorization` (HMAC path)
- `x-auth-token` (RSA path)

The existing sample sends raw JWT in `Authorization` without the `Bearer` prefix.

## Validation patterns

Use DTO validation with parameter decorators:

```ts
class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  role?: string;
}

@Get("/")
list(@DQuery(ListUsersQueryDto) query: ListUsersQueryDto, @DRes() res: DResponse) {
  SuccessResponse({ res, body: { role: query?.role ?? null } });
}
```

Use Joi middleware when schema-based request validation is preferred:

```ts
this.router.post(
  "/echo",
  reqValidatorMiddleware({
    body: Joi.object({ message: Joi.string().required() })
  }),
  this.controller.echo
);
```

## File upload system

Use `useFileUploader` for endpoint middleware and `fileUploader` for lower-level control.

### Single file

```ts
@Post("/single")
@UseMiddleware(
  useFileUploader({
    type: "single",
    fieldname: "avatar",
    storage: diskStorage({ destination: "./tmp-uploads" })
  })
)
uploadSingle(req: DRequest, res: DResponse) {
  SuccessResponse({ res, body: { file: req.file } });
}
```

### Array and fields

```ts
useFileUploader({
  type: "array",
  fieldname: "attachments",
  maxCount: 5,
  storage: diskStorage({ destination: "./tmp-uploads" })
});

useFileUploader({
  type: "fields",
  fields: [
    { name: "avatar", maxCount: 1 },
    { name: "gallery", maxCount: 4 }
  ],
  storage: diskStorage({ destination: "./tmp-uploads" })
});
```

### Storage options

- `diskStorage(...)`
- `memoryStorage()`

## Socket support

Socket setup requires:

1. `DolphFactory` socket init object (`socketService`, `component`, optional options)
2. Socket component decorated by `@Socket(...)`
3. One or more classes extending `DolphSocketServiceHandler`

Example service:

```ts
export class ChatSocketService extends DolphSocketServiceHandler<Dolph> {
  constructor() {
    super();
    const io = this.socketService.getSocket();
    io.on("connection", (socket) => {
      socket.emit("chat:ready", { id: socket.id });
      socket.on("chat:message", (data) => io.emit("chat:broadcast", data));
    });
  }
}
```

## Response and exception helpers

Use:

- `SuccessResponse({ res, body?, msg?, status? })`
- `ErrorResponse(...)`
- `HttpStatus`
- Exceptions from `common/api/exceptions`

`SuccessResponse` standardizes JSON content type and status handling.

## Middleware patterns

Core helpers:

- `TryCatchAsyncFn`
- `TryCatchFn`
- `DolphAsyncMiddleware`
- `DolphMiddleware`
- `DolphAsyncMiddlewareDec`

Current wrappers return Promise chains for async branches and forward errors to `next(err)`.

## Configuration (`dolph_config.yaml`)

Supported keys include:

- `port`
- `env`
- `routing.base`
- `jsonLimit`
- `middlewares.cors`
- `database.mongo`
- `database.mysql` (declared type, active bootstrap focus is Mongo)
- `globalExceptionFilter`

Example:

```yaml
port: 3040
env: development
jsonLimit: 20mb
routing:
  base: /api/v1
middlewares:
  cors:
    activate: true
    origin: "*"
database:
  mongo:
    url: ""
    autoCreate: false
```

Port parsing in current core runtime coerces string ports and validates finite positive numbers.

## Testing recommendations

Use layered tests:

- Unit tests for helpers and pure logic
- Integration tests for decorators and controller argument mapping
- Upload middleware tests with real multipart stream construction
- Socket smoke tests using `socket.io-client`

Useful commands:

```bash
npx tsc -p tsconfig.json --noEmit
npx eslint "classes/**/*.ts" "common/**/*.ts" "core/**/*.ts" "decorators/**/*.ts" "packages/**/*.ts" "utilities/**/*.ts" "tests/**/*.ts"
npm test -- --runInBand
```

## Production guidance

- Register security middleware early (`helmet`, `cors`, cookie parser)
- Keep auth strategy consistent per route group
- Validate payloads close to the route boundary
- Prefer explicit DTOs for body/query/params
- Keep upload field names and limits explicit
- Pin CI to typecheck + lint + test gates

## Recent framework updates reflected in this guide

- Improved `@DQuery` transform/validation behavior for optional and noisy querystrings
- Socket initialization safety in `DolphFactory` (constructor narrowing)
- Async middleware wrappers now return Promise chains
- JWT header handling normalized to lowercase `authorization`
- CI/install path updated to avoid `express-graphql` peer conflicts with `graphql@16`
- Expanded test coverage: decorator args, JWT parity, multipart route, socket smoke, uploader paths

## End-to-end example flow (mega sample)

Sample location: `samples/mega-rest-api`

```bash
npm run playground --prefix samples/mega-rest-api
```

Then use:

- Browser playground UI for endpoint + socket interaction
- `samples/mega-rest-api/README.md` cURL smoke section for CLI verification

---

If you maintain the separate docs repository (`dolphjs/docs`), this file can be split into:

1. Getting Started
2. Core API Reference
3. Decorators Reference
4. Uploads + Sockets
5. Testing + Production Guides

This makes the docs site easier to navigate while preserving the same technical depth.
