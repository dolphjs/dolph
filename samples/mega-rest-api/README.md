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

Backend only:

```bash
npm run backend --prefix samples/mega-rest-api
```

## Base URL

HTTP API prefix from `dolph_config.yaml`: **`http://localhost:3040/api/v1`**

Socket.IO server (client connects here): **`http://localhost:3040`**

## What it tests

- Auth (`/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/cookie-me`)
- Health + public routes (`/health`, `/public/docs`, `/public/echo`)
- Users CRUD (`/users`)
- Admin (`/admin/logs`, `/admin/tasks/reindex`) — JWT must be for a user whose role is `admin` (e.g. username containing `admin`)
- File upload (`/files/single`, `/files/array`, `/files/fields`, `/files/history`)
- Sockets (`chat:*`, `notification:*`)

## cURL smoke sheet

Set a base and log in. This sample uses **raw JWT in `Authorization`** (no `Bearer` prefix) for HMAC routes.

```bash
export BASE=http://localhost:3040/api/v1
export JSON='Content-Type: application/json'
```

### Auth

```bash
curl -sS -X POST "$BASE/auth/login" -H "$JSON" \
  -d '{"username":"admin-demo","password":"secret"}' | tee /tmp/login.json

export TOKEN="$(jq -r .accessToken /tmp/login.json)"
export REFRESH="$(jq -r .refreshToken /tmp/login.json)"

curl -sS "$BASE/auth/me" -H "Authorization: $TOKEN" -H "$JSON"
curl -sS -X POST "$BASE/auth/refresh" -H "$JSON" -d "{\"refreshToken\":\"$REFRESH\"}"

curl -sS -c /tmp/mega.cookies -b /tmp/mega.cookies "$BASE/auth/cookie-me" \
  -H "Authorization: $TOKEN"
```

(`cookie-me` expects the session cookie set at login; use a client that stores cookies, or repeat login with `-c`/`-b`.)

### Health & public

```bash
curl -sS "$BASE/health/"
curl -sS "$BASE/public/docs"
curl -sS -X POST "$BASE/public/echo" -H "$JSON" -d '{"message":"hello"}'
```

### Users

```bash
curl -sS "$BASE/users/"
curl -sS "$BASE/users/?role=admin"

curl -sS -X POST "$BASE/users/" -H "$JSON" -H "Authorization: $TOKEN" \
  -d '{"username":"curl-user","role":"user","age":21}'

curl -sS "$BASE/users/<id>" -H "Authorization: $TOKEN"
curl -sS -X PUT "$BASE/users/<id>" -H "$JSON" -H "Authorization: $TOKEN" \
  -d '{"role":"user","age":22}'
curl -sS -X DELETE "$BASE/users/<id>" -H "Authorization: $TOKEN"
```

### Admin (admin JWT required)

```bash
curl -sS "$BASE/admin/logs" -H "Authorization: $TOKEN"
curl -sS -X POST "$BASE/admin/tasks/reindex" -H "Authorization: $TOKEN" -H "$JSON" -d '{}'
```

### Files

These routes are not JWT-wrapped in the sample (only multipart middleware).

```bash
echo 'hello' > /tmp/sample.txt
curl -sS -X POST "$BASE/files/single" -F "avatar=@/tmp/sample.txt"

curl -sS -X POST "$BASE/files/array" \
  -F "attachments=@/tmp/sample.txt" -F "attachments=@/tmp/sample.txt"

curl -sS -X POST "$BASE/files/fields" \
  -F "avatar=@/tmp/sample.txt" -F "gallery=@/tmp/sample.txt"

curl -sS "$BASE/files/history"
```

(Field names match `file.controller.ts`: `avatar`, `attachments`, and for `/fields` also `gallery` / `docs`.)

### Sockets

Use the playground UI or any Socket.IO client against `http://localhost:3040` (same host as the API port in this sample). Events include `chat:message` / `chat:broadcast` and notification names defined in `src/sockets/`.
