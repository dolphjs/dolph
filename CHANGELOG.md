# Changelog

## 3.0.0 (unreleased)

3.0.0 closes several security holes and changes some defaults. Apps stay on 2.x until they upgrade. **If you use RSA JWTs, `@UnShield` or `validateBodyMiddleware`, read the upgrade steps first.**

### Upgrading from 2.x

#### Requirements

- **Node:** `^20.19.0 || ^22.13.0 || >=24.11.0`. Node 18 is no longer supported.
- **Local development:** set `NODE_ENV=development`, or `env: development` in `dolph_config.yaml`. Production mode is now the default, which hides stack traces and marks the auth cookie `secure`.

- **Install your database driver.** `mongoose`, `typeorm` and `sequelize` are now optional peer dependencies, so a fresh install doesn't include them. Add the one you use:

  ```bash
  npm install mongoose
  ```

  TypeORM is `^1.1.0`, Sequelize `^6.37.8` and Mongoose `^8.24.8`. Apps using a driver without installing it stop at startup with a message saying which package to add.

#### Authentication

- **RSA JWTs must say so.** Passing a key path as an HMAC secret now stops the app at startup:

  ```ts
  new JwtBasicAuth('keys/public.pem', { algorithm: 'RS256' });
  @JWTAuthVerifyDec('keys/public.pem', { algorithm: 'RS256' })
  @JWTAuthorizeDec('keys/public.pem', authorizeFn, { algorithm: 'RS256' })
  ```

  HMAC reads only the `authorization` header, and RSA reads only `x-auth-token`.
- **`JwtBasicAuth.Verify`** now takes only `req`, and rejects instead of calling `next`.
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

#### Validation and responses

- **Controller strings are never sent as HTML.** They always go out as JSON. Use `res.send()` or `@Render` for HTML.
- **`validateBodyMiddleware` and `validateParamMiddleware`** return `400` for fields that aren't on the DTO.
- **`validateParamMiddleware`** now reads route params, not the query string, and **`validateQueryMiddleware`** no longer overwrites `req.body`.
- **Joi `params` schemas now run.** Routes that were passing without validation may start returning `400`.
- **`UseDto` is removed.** Use `@DBody`, `@DQuery` or `@DParam`.
- **Responses with only `msg`** are sent as `text/plain` instead of `application/json`.

- **`validatePassword` is removed.** Its rules were too weak to rely on. Use a Joi or `class-validator` rule that matches your own password policy.

#### File uploads

- `maxCount` and field names are enforced. Extra or unexpected files return `400`.
- A file type that isn't allowed returns `415`. It used to return `200` with the file dropped.
- `.html`, `.xml` and `.xhtml` need listing in `extensions`.
- A timed-out upload returns `408` instead of `500`, and its files are removed from disk. `useFileUploader` now honours `timeout`.

#### Startup and middleware

- **CORS needs an `origin`.** An empty `origin` used to allow every site. It now allows none, and logs a warning. Use `origin: '*'` if you want every site.
- **Wiring errors stop the app.** Invalid `@Component` params and service or controller setup errors used to be logged, leaving the app running without those services or routes.
- **`.middlewares()`, `enableHelmet()` and `enableCors()`** now run before your routes. Error handlers passed to `.middlewares()` no longer catch route errors, so use `setGlobalExceptionHandler()`.
- **`middlewares.helmet` in `dolph_config.yaml` now works.** Apps that already set it get real headers, including a Content Security Policy that may block inline scripts.

### Added

- `enableHelmet()`, the correctly spelled `enableHemet()`, which still works but logs a deprecation warning.
- `compareHashedStringAsync`, a non-blocking password check. Prefer it on login routes.
- `generateVerificationCode(digits)`.
- `helmet` in `dolph_config.yaml`, as `true` or an options object.
- `@UnShield()` with no arguments removes every shield, and `@UnShield(a, b)` takes several.

### Changed

- Installs are smaller, because database drivers are no longer installed with the framework.
- Mongoose, TypeORM, Sequelize, socket.io and express-handlebars load on first use, which halves framework load time.
- Dependency minimums are raised to clear known vulnerabilities.
- Failed DTO validation no longer writes a log line. The `400` response still names the fields.
- In production, unexpected client errors keep their status with a generic message, instead of becoming `500`.

### Fixed

- Non-`async` handlers that return a Promise are awaited.
- GraphQL mode starts.
- `SuccessResponse` and `ErrorResponse` no longer send twice when given both `body` and `msg`.
- `hashString` no longer blocks the event loop.
