# DolphJS Architecture

## Core Runtime Flow

1. `DolphFactory` loads config (`dolph_config.yaml`) and environment values.
2. Global middleware is registered (JSON/urlencoded, external middleware, registry middleware).
3. Route handlers are mounted from:
   - class-based route handlers (`DolphRouteHandler`)
   - decorator-based controllers via `@Component` + `@Route`.
4. Error converter/handler and fallback `404` endpoint are attached.
5. Optional integrations are initialised (Mongo, sockets, GraphQL adapter).

## Module Boundaries

- `core/`: bootstrap, middleware registration, route/controller wiring, runtime orchestration.
- `decorators/`: metadata-based API (`@Route`, HTTP decorators, parameter decorators, component/socket decorators).
- `classes/`: base controller/service/router/auth/socket abstractions.
- `common/`: request/response interfaces, exceptions, middleware utilities, framework types.
- `packages/`: integration modules (uploader, sockets, mongoose, sequelize, events).
- `utilities/`: auth/token helpers, logger, validators, normalizers.

## TypeScript environment

- App/library compile: `tsconfig.json` (includes `skipLibCheck` to avoid conflicting transitive `.d.ts` from dependencies).
- Tests and ESLint typed rules: `tsconfig.spec.json` includes `tests/**/*` and `**/*.test.ts`.
- Contributors should run `npx tsc -p tsconfig.json --noEmit` before pushing; CI runs the same.
- Prefer a single `graphql` major in the tree (removed legacy `express-graphql` which conflicted with Apollo / `graphql@16`).

## Dependency injection (controllers & services)

- Register services on `@Component({ services: [...] })`. The component decorator wires instances onto controllers that declare matching constructor parameters (via `design:paramtypes`) or can attach services as named properties for zero-arg controllers.
- For **auth-heavy** handlers, prefer `@UseMiddleware(JwtAuthMiddleware(...))` or `cookieAuthVerify(...)` over `@JWTAuthVerifyDec` / `@JWTAuthorizeDec` when you see `this` or `req` undefined at runtime—those decorators replace the method and can break instance or argument binding.
- For **shared service access** without constructor injection, the codebase uses an `InjectServiceHandler` + small “services bag” class pattern (see mega-rest-api admin/auth controllers); that is a supported style for decorator-wrapped routes.
- Do not mix fragile patterns: avoid `this.myService` on the same method stack as decorators that wrap with a plain function unless you have verified `apply`/`bind` behavior.

## Middleware helpers

- `DolphAsyncMiddleware` / `DolphAsyncMiddlewareDec` resolve the inner async function and **return** the resulting Promise so callers can `await` correctly; errors are passed to `next(err)`.
- `DolphMiddleware` wraps sync handlers and forwards sync throws to `next(err)`.
- `validationMiddlewareOne` in `global_validation_middleware.middlewares.ts` is legacy/experimental for route-attached DTO metadata; prefer per-route `transformAndValidateDto` via `@DBody` / `@DQuery` / `@DParam` or explicit `validateBodyMiddleware`.

## Sample Conventions

- New samples should follow feature-sliced components:
  - `components/<domain>/<domain>.controller.ts`
  - `components/<domain>/<domain>.service.ts`
  - `components/<domain>/<domain>.component.ts`
- Use route decorators for framework-style controllers.
- Use `useFileUploader` / `fileUploader` for multipart processing (not deprecated `MediaParser`).
- Prefer middleware-based auth wrappers on endpoints where decorator wrappers can conflict with context binding.
- Add a runnable sample `README.md` with:
  - start command
  - endpoint catalog
  - smoke-test steps (and optional cURL, as in `samples/mega-rest-api/README.md`).
