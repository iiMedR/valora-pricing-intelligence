# Public deployment: Render + Cloudflare Pages

Status: deployment files are prepared and tested locally. No Render service or Cloudflare Pages project has been created or published. Neon PostgreSQL is already configured; see [Neon setup](neon-setup.md).

## When you are back

1. Push the reviewed changes to GitHub (including the earlier UI work). Do not upload any `.env*` files.
2. Create a Cloudflare Pages project connected to `iiMedR/valora-pricing-intelligence`:
   - Project name: `valora-pricing-intelligence` (choose another if unavailable).
   - Production branch: `main`.
   - Root directory: `frontend`.
   - Build command: `npm ci && npm run build`.
   - Output directory: `dist/frontend/browser`.
   - Node: `24.22.1` (also specified in `frontend/.node-version`).
   - The initial static page may work before its backend is configured; API requests will return a controlled 503 if the configured Render origin is unavailable.
3. Note the actual Pages URL. On your local machine run:

   ```powershell
   npm run render:env -- --frontend-origin=https://YOUR-PROJECT.pages.dev
   ```

   This writes the three Render values to the Git-ignored `.env.render.local` without printing them. The current test file uses `https://localhost:8788`; regenerate it with the actual public URL before deploying.
4. In Render, select **New → Blueprint**, connect the repository and use `render.yaml` on `main`. The service is named `valora-backend`, uses the **Free** plan and builds `backend/Dockerfile` with `backend` as its build context. Choose a region near the Neon database if available.
5. Supply these prompted Render values from the private environment file:
   - `NEON_JDBC_URL`: JDBC URL for the restricted demo database (no embedded password).
   - `NEON_DB_PASSWORD`: restricted application-role password.
   - `FRONTEND_ORIGIN`: the exact Pages origin, with HTTPS and no trailing slash.

   The Blueprint already sets `demo,portfolio,neon,cloud` and disables Shopify. Do not use the Neon admin connection. Render supplies `PORT`; the app binds to `0.0.0.0`. Health path: `/api/v1/health`.
6. The production Pages runtime binding is versioned in `frontend/wrangler.jsonc`:

   ```json
   { "vars": { "BACKEND_ORIGIN": "https://valora-backend-qf12.onrender.com" } }
   ```

   Wrangler is the source of truth for Pages runtime bindings. If the Render service URL changes, edit this file and redeploy Pages; setting a dashboard build variable alone is insufficient. The URL is public, not a credential. No database secrets belong in Cloudflare. Preview bindings are intentionally empty, so preview deployments do not call the production backend.
7. Verify the deployed URLs:
   - `/` shows the landing page.
   - Direct `/dashboard`, `/products`, and `/forecasting` navigation works; anonymous users reach login.
   - Demo login, refreshing a protected URL, analytics and forecasts work.
   - Logout removes access; editing/imports remain blocked.
   - `/api/v1/health` through Pages returns JSON, not `index.html`.
   - Session cookie is Secure/HttpOnly/SameSite=Lax; XSRF cookie is Secure and readable by Angular.
8. Optional: in GitHub **Settings → Secrets and variables → Actions → Variables**, create `BACKEND_HEALTH_URL` with `https://YOUR-SERVICE.onrender.com/api/v1/health`. The included health workflow then sends a request every ten minutes and supports manual runs. With no variable it skips. Scheduled runs can be delayed or disabled after repository inactivity, and do not guarantee uptime or remove provider quotas.

## How the deployment works

```text
Browser → Cloudflare Pages
             ├─ static Angular files and SPA routes
             └─ /api/* Pages Function → Render Spring Boot → Neon PostgreSQL
```

The function preserves request bodies, cookies, Origin, CSRF headers, API error statuses and separate Set-Cookie headers. It replaces untrusted forwarded-host/protocol headers, does not follow backend redirects, and returns `Cache-Control: no-store` for API responses. Credentials stay on Render. Missing/invalid upstream configuration and network failures return a safe 503; no automatic write retry is introduced.

The app keeps its existing driver, authentication, protected routes, demo identity guard, pricing algorithms, and frozen dataset. Startup runs existing guarded Flyway migrations but never auto-seeds or resets data.

The container is Java 21, runs as a nonroot numeric user, uses a bounded heap for a small instance, and receives no secrets during image construction. HTTPS cookies are enforced by the cloud profile; forwarded request information supports the same-origin proxy.

Render's free service can take about a minute to wake. Angular's shorter API timeouts can surface a connection error during cold start; wait and retry/reload. The proxy gives a friendly message on network failures, but no always-on claim is made.

## Local production-runtime test

Requires Docker, Node 24 and the existing private Neon setup files:

```powershell
npm ci
npm run build
npm run test:deployment
npm run pages:build
npm run render:env -- --frontend-origin=https://localhost:8788
docker build -f backend/Dockerfile -t valora-backend:deployment-check backend
docker run -d --name valora-deployment-check --memory=512m --env-file .env.render.local -p 127.0.0.1:8089:10000 valora-backend:deployment-check
```

In another terminal:

```powershell
node node_modules/wrangler/bin/wrangler.js pages dev --cwd frontend --port 8788 --local-protocol https --binding BACKEND_ORIGIN=http://127.0.0.1:8089
```

Visit `https://localhost:8788`. Wrangler uses a local development certificate. The gateway permits an HTTP loopback upstream only when the incoming hostname is also loopback; a public deployment requires an HTTPS upstream. Never disable production TLS checks.

After testing, stop Wrangler and stop the named test container. Existing local app instances and database containers do not need to be stopped.

References: [Render Blueprint](https://render.com/docs/blueprint-spec), [Cloudflare Functions routing](https://developers.cloudflare.com/pages/functions/routing/), [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

## Verification (2026-11-15)

- `npm run build`: Angular bundle complete and Maven `BUILD SUCCESS`.
- `npm run test:deployment`: 9 passed, 0 failed (headers, body/query forwarding, multiple cookies, errors, redirects, configuration validation, and open-proxy protection).
- `npm run pages:build`: `Compiled Worker successfully`.
- Production Docker image built successfully and ran as user `10001:10001` under a 512 MiB memory limit. Observed post-test memory was about 308 MiB; this is a local measurement, not a hosting SLA.
- Playwright used the production Angular bundle through Wrangler's actual local HTTPS runtime, the production Docker container and live Neon database. Browser plugin not available; regular Playwright was used. The flow was protected route → demo sign-in → catalog/analytics/forecast → blocked edit → sign-out.
- Browser checks passed for anonymous API denial, demo login, 30 catalog products, Analytics financial rows, observed/forecast chart, Secure/HttpOnly/SameSite=Lax session cookie, Secure readable CSRF cookie, blocked writes with a valid CSRF token, and protected-access denial after logout.
- The backend independently recalculated the frozen portfolio checksum: `5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6` (30 variants, 9,863 orders, 54 refunds).
- No database secrets were written into frontend assets or versioned configuration. Env files, Wrangler caches and generated Worker output are Git-ignored.
- The initial dependency-prefetch image build was unnecessarily slow; the final Dockerfile uses a cached Maven package step. Wrangler's local self-signed certificate can emit certificate-handshake notices during testing; only local browser QA ignores that development certificate. Production TLS verification remains enabled.

Public account setup and live Render/Pages deployment remain pending until the owner is available. No public-host verification or publication is claimed.

Production login follow-up: the public Render session API responded successfully, but Pages returned its missing/invalid-gateway-configuration 503. The public Render URL is now declared in Wrangler rather than relying on a dashboard-only build variable. A separate direct request with the public Origin returned `Invalid CORS request`; Render's `FRONTEND_ORIGIN` must match the actual Pages origin exactly.
