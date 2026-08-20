# cursor-sync-app

Cursor Sync website, auth API, and Postgres (sync.bergamota.dev).

Monorepo for the Cursor Sync backend and (future) website. This slice provides email/password auth via a TypeScript API backed by Postgres 16.

## Environments

| Environment | Postgres | API | Who runs it |
|-------------|----------|-----|-------------|
| **Local dev** | Postgres 16 in `docker-compose.yml` (this repo) | `localhost:8100` via compose port map | You |
| **Lab** | Separate docker-internal Postgres on marcelo-1 | DevOps (Tailscale, e.g. `http://100.78.40.83:8100`) | DevOps |

**Local compose is for development only.** The Postgres container in this repo is not the lab or production database.

**Lab database** is a separate Postgres instance that DevOps operates on marcelo-1. This repo does not deploy, bind, or publish Postgres there — and must not add a second Postgres on marcelo-1. Do not run migrations or deploy to marcelo-1 from this repo yet.

In local compose, **port 8100 is the API only** (`api:8100` mapped to the host). Postgres stays on the Docker Compose network with **no host port** (5432 is not published).

## Structure

```
apps/
  api/     Auth API (Hono + Postgres)
  web/     Website stub (not implemented yet)
db/
  init/    Postgres schema applied on first container boot
```

## Local development (Docker Compose)

Use compose to run a throwaway Postgres plus the API on your machine. This is not wired to the lab stack on marcelo-1.

### Prerequisites

- Docker and Docker Compose

### Quick start

```bash
cp .env.example .env
# Edit JWT_SECRET in .env for anything beyond local smoke tests

docker compose up --build
```

The API listens on **http://localhost:8100** (host map to `api:8100`). The compose Postgres service is reachable only as `postgres:5432` inside the compose network — it is not exposed on the host.

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

The locked DBA schema lives in `db/init/001_schema.sql`. In local dev it is applied automatically on first boot of the **compose** Postgres container via `docker-entrypoint-initdb.d`. DevOps applies the same schema to the lab database on marcelo-1 separately — not from this repo.

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
- Deploy or migrate to marcelo-1 (lab DB and API are DevOps-owned)
- Supabase, Cloudflare Workers, R2
- Set/change master password endpoints
