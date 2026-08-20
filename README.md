# cursor-sync-app

Cursor Sync website, auth API, and Postgres (sync.bergamota.dev).

Monorepo for the Cursor Sync backend and (future) website. This slice provides email/password auth via a TypeScript API backed by Postgres 16.

## Structure

```
apps/
  api/     Auth API (Hono + Postgres)
  web/     Website stub (not implemented yet)
db/
  init/    Postgres schema applied on first container boot
```

## Local development (Docker Compose only)

This setup is for local development. It does not deploy to marcelo-1 or any remote host.

### Prerequisites

- Docker and Docker Compose

### Quick start

```bash
cp .env.example .env
# Edit JWT_SECRET in .env for anything beyond local smoke tests

docker compose up --build
```

The API listens on **http://localhost:8100**. Postgres runs inside the Docker network only (port 5432 is not published to the host).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + DB connectivity |
| POST | `/auth/signup` | `{ "email", "password" }` → `{ "token" }` |
| POST | `/auth/login` | `{ "email", "password" }` → `{ "token" }` |
| GET | `/auth/me` | `Authorization: Bearer <token>` → `{ "id", "email", "secrets_version" }` |

Passwords are hashed with **argon2id** and never returned. The `master_password` column exists for future trusted-server encryption but is not exposed or set in this slice.

### Session model

Auth uses **JWT bearer tokens** (7-day expiry). There is no server-side logout endpoint; clients discard the token. A future slice may add opaque sessions with `POST /auth/logout`.

Send the token as:

```
Authorization: Bearer <token>
```

### Example

```bash
curl -s http://localhost:8100/health

curl -s -X POST http://localhost:8100/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secretpass"}'

curl -s -X POST http://localhost:8100/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secretpass"}'

curl -s http://localhost:8100/auth/me \
  -H 'Authorization: Bearer <token>'
```

### Environment variables

See `.env.example`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string (set automatically in Compose) |
| `JWT_SECRET` | Secret for signing session JWTs |
| `PORT` | API port (default `8100`) |

### Database schema

Schema is initialized from `db/init/001_schema.sql` on first Postgres boot via `docker-entrypoint-initdb.d`.

#### Master password cache-bust (future)

When master password is set or rotated, bump `secrets_version` in the same transaction so clients know cached secrets are stale:

```sql
UPDATE users
SET master_password = $1,
    secrets_version = secrets_version + 1,
    updated_at = now()
WHERE id = $2;
```

### Not in this slice

- Cursor extension URI callback (`cursor://MarceloBarella.cursor-sync/auth`)
- Website UI (`apps/web` is a stub)
- Remote deploy, migrations on production, Supabase, Cloudflare Workers, R2
- Set/change master password endpoints

## Planned production URL

Tailscale: `http://100.78.40.83:8100` — not wired up in this PR.
