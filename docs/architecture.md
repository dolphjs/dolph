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
  - smoke-test steps.
