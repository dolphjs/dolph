# Changelog

## 3.0.0 (unreleased)

3.0.0 adds Fastify support, gives every startup job one way to do it, closes several security holes and changes some defaults. Apps stay on 2.x until they upgrade. **If you use RSA JWTs, `@UnShield` or `validateBodyMiddleware`, read the upgrade steps first.**

### Fastify

DolphJS now runs on Fastify 5 as well as Express. Install `fastify` and `@fastify/middie`, then set `adapter: fastify` in `dolph_config.yaml`. Controllers, services, shields and middleware don't change, and Express middleware keeps working. In benchmarks it handled 2.2x to 3.1x the requests of Express. See the Fastify guide for the differences.

### Upgrading from 2.x

#### Requirements

- **Node:** `^20.19.0 || ^22.13.0 || >=24.11.0`. Node 18 is no longer supported.
- **Local development:** set `NODE_ENV=development`, or `env: development` in `dolph_config.yaml`. Production mode is now the default, which hides stack traces and marks the auth cookie `secure`.

- **Install your database driver.** `mongoose` and `typeorm` are now optional peer dependencies, so a fresh install doesn't include them. Add the one you use:

  ```bash
  npm install mongoose
  ```

  TypeORM is `^1.1.0` and Mongoose `^8.24.8`. Apps using a driver without installing it stop at startup with a message saying which package to add.

#### Databases

- **Sequelize support is gone.** Dolph's SQL path is now TypeORM. `database.sequelize`, `getSequelize()`, `initSql()`, `autoInitSql()` and `@InjectMySQL` are removed. Move your models to TypeORM entities and configure MySQL under `database.typeorm`:

  ```yaml
  database:
    typeorm:
      options:
        type: mysql
        host: sensitive
        username: sensitive
        password: sensitive
        database: my_app
        entities:
          - src/**/*.entity.ts
  ```

#### Authentication

- **RSA JWTs must say so.** Passing a key path as an HMAC secret now stops the app at startup:

  ```ts
  jwtAuth('keys/public.pem', { algorithm: 'RS256' });
  ```

  HMAC reads only the `authorization` header, and RSA reads only `x-auth-token`.
- **Bad tokens** return `401` instead of `500`.
- **`@UnShield` needs the same function you gave `@Shield`.** A guard rebuilt by calling a factory again no longer matches. Store it in a variable:

  ```ts
  const adminOnly = requireRole('admin');

  @Shield(adminOnly)
  class AdminController {
      @UnShield(adminOnly)
      publicRoute() {}
  }
  ```

  If nothing matches, the route stays protected and a warning is logged at startup. Anything that isn't a shield is no longer added as middleware.
- **`newAuthCookie`** now returns `sameSite: 'lax'`, and is always `httpOnly`. Pass `sameSite` to `res.cookie`.
- **`uniqueFiveDigitsCode`, `uniqueSixDigitsCode` and `uniqueSevenDigitsCode` are removed.** They were fixed for the life of the process. Call `generateVerificationCode(digits)` for each code.

#### Types

- **`DRequest` and `DResponse` are now DolphJS's own interfaces**, covering what works on both adapters. Express-only members such as `res.sendFile` are gone from them. Use `req.raw` and `res.raw`, or the Express types in Express-only code.
- **`express.Router()` and `DolphRouteHandler` only work on the Express adapter.**

#### Controllers and routes

There is now one way to do each job inside a request too:

| Removed | Use instead |
|---|---|
| `SuccessResponse({ res, body })` | `return body` |
| `SuccessResponse({ res, status: 201, body })` | `res.status(201); return body;` with `@DRes()` |
| `ErrorResponse({ res, status, body })` | `throw new BadRequestException(message)`, or another exception |
| `@JWTAuthVerifyDec(secret)`, `JwtAuthMiddleware(new JwtBasicAuth(secret))` | `@UseMiddleware(jwtAuth(secret))` or `@Shield(jwtAuth(secret))` |
| `@JWTAuthorizeDec(secret, authorize)` | `jwtAuth(secret, { authorize })` |
| `@CookieAuthVerifyDec(secret)`, `cookieAuthVerify(secret)` | `jwtAuth(secret, { cookie: true })` |
| `validateBodyMiddleware(Dto)`, and the param and query versions | `@DBody(Dto)`, `@DParam(Dto)`, `@DQuery(Dto)` |
| `reqValidatorMiddleware`, `@ValidateReq` | A DTO with `class-validator` |
| `TryCatchAsyncDec`, `TryCatchDec` | Remove them. Controllers already catch errors |
| `TryCatchFn`, `TryCatchAsyncFn` | `DolphAsyncMiddleware`, for functions on an Express router |

- **Controller responses now use the envelope.** Replacing `SuccessResponse` with `return` changes the body from your object to `{ success, status, message, data }`. Pass `onResponse` to `DolphFactory` to keep your own shape.
- **`joi` is no longer installed with Dolph.** Add it to your app if you use it directly.
- **`@UseMiddleware(a, b)`** takes several functions, left to right. Stacked `@UseMiddleware` keeps its bottom-first order.

#### Validation and responses

- **Controller strings are never sent as HTML.** They always go out as JSON. Use `res.send()` or `@Render` for HTML.
- **`UseDto` is removed.** Use `@DBody`, `@DQuery` or `@DParam`.
- **`validatePassword` is removed.** Its rules were too weak to rely on. Use a `class-validator` rule that matches your own password policy.

#### Sockets

- **Browser clients on another origin need `cors.origin`.** Browsers don't apply CORS to WebSockets, so DolphJS now checks it on the connection. With none set, only the same origin can connect. Non-browser clients aren't affected.
- **Add `auth` to your socket config.** Sockets have no authentication by default. Use `socketJwtAuth(secret)` or your own middleware. Without it, the app logs a warning at startup, and `auth: false` silences that for sockets that are public on purpose.
- **`@Socket` services are now shared.** They use the same instance as `@Component`, so sockets and controllers see the same state. A service with constructor dependencies must be listed on a `@Component`.
- **Invalid `socketServices` stop the app** at startup.

#### File uploads

- `maxCount` and field names are enforced. Extra or unexpected files return `400`.
- A file type that isn't allowed returns `415`. It used to return `200` with the file dropped.
- `.html`, `.xml` and `.xhtml` need listing in `extensions`.
- A timed-out upload returns `408` instead of `500`, and its files are removed from disk. `useFileUploader` now honours `timeout`.

#### Startup and middleware

There is now one way to set up an app. Plain values go in `dolph_config.yaml`, and functions go in the options passed to `DolphFactory`:

```ts
const dolph = new DolphFactory([UserComponent], {
    middlewares: [cookieParser()],
    sockets: { component: new ChatComponent(), auth: socketJwtAuth(secret) },
    graphql: { schema, context },
    onError: myErrorHandler,
    onResponse: myInterceptor,
});

await dolph.start();
```

| Removed | Use instead |
|---|---|
| `new DolphFactory(routes, [middleware], sockets)` | `new DolphFactory(routes, { middlewares, sockets })` |
| `middlewareRegistry`, `dolph.middlewares()` | `middlewares` option |
| `enableHelmet()`, `enableHemet()`, `enableCors()` | `middlewares.helmet` and `middlewares.cors` in YAML |
| `setGlobalExceptionHandler()`, `globalExceptionFilter` | `onError` option |
| `setResponseInterceptor()` | `onResponse` option |
| `socketService: SocketService` | Leave it out. Put the rest under the `sockets` option |
| `new DolphFactory({ graphql: true, schema, context })` | `new DolphFactory([], { graphql: { schema, context } })` |
| `MVCAdapter` | `views: { engine, dir, assets }` in YAML |
| `autoInitMongo()`, `autoInitTypeOrm()` | `database` in YAML |
| `dolph.port = 4000` | `port` in YAML, or the `PORT` variable |

- **`new DolphFactory()` no longer does anything on its own.** Setup errors now appear at `start()`, `ready()` or `engine()`.
- **`start()` returns a promise.** It used to return the server. Use `const server = await dolph.start()`.
- **A database that can't connect stops the app.** It used to be logged while the app kept serving. Set `required: false` on the database to keep the old behaviour.
- **`getDataSource()` works after `await dolph.ready()`**, not straight after the constructor. Inside a request nothing changes.
- **`PORT` beats `port` in `dolph_config.yaml`.** It was the other way round, which broke hosts like Heroku and Render that assign the port.
- **GraphQL is served at `/graphql` only.** It used to answer every path, and now sits alongside controllers.
- **`@Render` on Handlebars no longer applies a default layout.** Name a layout when rendering if you need one.
- **CORS needs an `origin`.** An empty `origin` used to allow every site. It now allows none, and logs a warning. Use `origin: '*'` if you want every site.
- **Wiring errors stop the app.** Invalid `@Component` params and service or controller setup errors used to be logged, leaving the app running without those services or routes.
- **`middlewares.helmet` in `dolph_config.yaml` now works.** Apps that already set it get real headers, including a Content Security Policy that may block inline scripts.

### Added

- A Fastify adapter, chosen with `adapter: fastify` or `DOLPH_ADAPTER`.
- Everything can be imported from `@dolphjs/dolph`. Sub-paths like `@dolphjs/dolph/decorators` still work.
- Controllers and services can be plain classes. `DolphControllerHandler` and `DolphServiceHandler` stay for existing code, but the base class, `super('name')` and `<Dolph>` are no longer needed. Add `@DService()` to a service with constructor dependencies.
- `socketJwtAuth(secret, options)` and the `auth` socket option, which covers every namespace.
- `dolph.ready()` and `dolph.stop()`. `stop()` finishes open requests and closes sockets and databases, and `SIGTERM` now uses it.
- `required: false` on a database, to start without it.
- `compareHashedStringAsync`, a non-blocking password check. Prefer it on login routes.
- `generateVerificationCode(digits)`.
- `helmet` in `dolph_config.yaml`, as `true` or an options object.
- `@UnShield()` with no arguments removes every shield, and `@UnShield(a, b)` takes several.

### Changed

- Installs are smaller, because database drivers are no longer installed with the framework.
- Mongoose, TypeORM, socket.io and express-handlebars load on first use, which halves framework load time.
- Dependency minimums are raised to clear known vulnerabilities.
- Failed DTO validation no longer writes a log line. The `400` response still names the fields.
- In production, unexpected client errors keep their status with a generic message, instead of becoming `500`.

### Fixed

- A socket handler that throws or rejects no longer shuts down the server.
- `this.socket` works straight away in socket services, so the documented example no longer crashes at startup.
- Non-`async` handlers that return a Promise are awaited.
- GraphQL mode starts.
- `hashString` no longer blocks the event loop.
