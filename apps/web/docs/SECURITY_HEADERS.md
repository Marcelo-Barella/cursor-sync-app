# Web security headers

## Vercel (static `vercel.json`)

`apps/web/vercel.json` is **committed as-is** (not modified at build time). Header rules are ordered so Vercel applies the fallback first and **later matching rules override the same header name**:

1. **Fallback** (no `has`) — `connect-src` includes `https://api-staging.cursor-sync.com` for `*.vercel.app` previews and other hosts.
2. **`staging.cursor-sync.com`** — staging API in `connect-src`.
3. **`cursor-sync.com` / `www.cursor-sync.com`** — production API in `connect-src`.

Each rule sets `Content-Security-Policy` (including `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `Referrer-Policy`, `X-Content-Type-Options`, and `Permissions-Policy`.

Tests in `src/lib/vercelJsonHeaders.test.ts` parse this file and assert host-specific `connect-src`, framing protection, and allowed origins.

## Docker / nginx

`npm run build` runs `scripts/generate-security-headers.mjs`, which renders `nginx.conf` from `nginx.conf.template` using the build’s `VITE_API_URL` (local `http://localhost:8100` allowed).

## HTML meta (defense in depth)

Vite injects a **meta** CSP without `frame-ancestors` (ignored in meta policies) and with `connect-src 'self'` plus **both** API origins so the effective policy intersects cleanly with the host-specific HTTP header. Framing protection comes from the HTTP response headers on Vercel.

## API base override (production)

Runtime `?api=` and `localStorage` overrides are dev-only. See the root README.