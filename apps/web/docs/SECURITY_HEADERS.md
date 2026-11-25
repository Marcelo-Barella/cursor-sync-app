# Web security headers

Production and staging deployments set HTTP response headers from `VITE_API_URL` at build time.

## Build pipeline

`npm run build` and `npm run build:staging` run `scripts/generate-security-headers.mjs` before TypeScript and Vite, then Vite injects the same CSP (and Referrer-Policy meta) into `index.html` for hosts that serve the SPA without custom HTTP headers (for example some static hosts). The script:

1. Validates `VITE_API_URL` as an origin-only URL (no userinfo; path must be `/` or empty). HTTPS is required for remote hosts; `http://localhost` and `http://127.0.0.1` are allowed for local Docker.
2. Merges the same directives into `vercel.json` `headers` when that file is present (useful for self-hosted previews). Vercel also receives CSP via the built `index.html` meta tag because platform routing is fixed before the build step runs.
3. Renders `nginx.conf` from `nginx.conf.template` for the Docker/nginx image.
4. Records the resolved policy in `.generated-security-headers.json` (build artifact, gitignored).

`connect-src` always includes `'self'` and the validated API origin exactly.

## Policy shape

See `src/lib/csp.ts` for the canonical directive list. Google Fonts are allowed in `style-src` and `font-src`; the app does not load third-party scripts or analytics. `style-src 'unsafe-inline'` is required for existing component inline styles.

## API base override (removed in production)

Runtime `?api=` and `localStorage` overrides are dev-only. Production and staging bundles resolve the API host only from `VITE_API_URL`. On every load, poisoned `localStorage` keys are deleted and `api` is removed from the query string.