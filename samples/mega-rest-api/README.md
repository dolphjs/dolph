# Mega REST API Playground

## Run

From repository root:

```bash
npm run playground --prefix samples/mega-rest-api
```

This command will:

- start the Dolph sample backend on `http://localhost:3040`
- start the playground frontend on `http://localhost:5174`
- open the browser automatically

Use `Ctrl + C` to stop both.

## What it tests

- Auth endpoints (`/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/cookie-me`)
- Health + public routes (`/health`, `/public/docs`, `/public/echo`)
- Full users CRUD (`/users`)
- Admin guarded endpoints (`/admin/logs`, `/admin/tasks/reindex`)
- File upload/parsing (`/files/single`, `/files/array`, `/files/fields`, `/files/history`)
- Socket flows (`chat:*`, `notification:*`)
