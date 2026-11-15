# Neon PostgreSQL setup

Valora keeps its Angular frontend and Java 21 / Spring Boot backend. Neon hosts PostgreSQL; `neon deploy` does not host the Spring server or frontend. The backend keeps Spring Data JPA, Flyway, PostgreSQL JDBC, session authentication, and CSRF protection. No browser code receives database credentials. The root `pg` dev dependency is for the provisioning/import scripts only.

## Linked project

- Organization: `org-little-mountain-19435338`
- Project: `gentle-recipe-84314203`
- Branch: `production` (`br-frosty-dream-b98g9wg0`)
- Requested service: PostgreSQL only; Neon Auth and other primitives are not enabled.
- `neon.ts` is versioned. `.neon`, `.env.local`, and `.env.neon.local` are ignored.

## Setup and run

```powershell
npm ci
npm i -g neon@latest
neon login
neon init -y --org-id org-little-mountain-19435338 --project-id gentle-recipe-84314203 --branch production --services postgres
neon deploy
npm run neon:setup
npm run build
```

`neon deploy` pulls `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into `.env.local` (or the existing `.env`). Setup uses the direct admin connection solely to provision a dedicated `smartpricing_demo` database and separated roles. The runtime connection is generated in `.env.neon.local` as `NEON_APP_DATABASE_URL`.

Initial dataset loading has two options. On a machine with the verified existing portfolio Docker database, the exact snapshot import is faster:

```powershell
npm run neon:import
```

The importer requires the existing container `smartpricing-portfolio-postgres-portfolio-1`, refuses a nonempty target, uses a transaction, preserves validation triggers, and copies only the frozen dataset tables, not accounts, saved evaluations, or integration credentials. It validates the expected checksum metadata and counts before commit. The existing backend command then independently recalculates the canonical checksum:

```powershell
npm run neon:seed
```

Without a local snapshot, `npm run neon:seed` creates the same frozen dataset using the original generator, but per-record remote round trips make initial generation slower. It is idempotent: an existing dataset must match its checksum and is not reset.

Start these in separate terminals:

```powershell
npm start
npm run start:frontend
```

Open `http://localhost:4208`. The backend listens on `127.0.0.1:8088`; the frontend proxies `/api` to it. Existing local servers and databases are unchanged.

## Security and hosting

- Runtime uses the nonsuperuser `smartpricing_demo` role, not Neon's administrative connection.
- The `demo_control.environment` identity marker belongs to `smartpricing_demo_admin`; the runtime role can read but cannot mutate it.
- `demo,portfolio,neon` are the active profiles. Existing demo safety checks run before Flyway migrations and startup.
- JDBC uses `sslmode=verify-full` and `DefaultJavaSSLFactory` for certificate-chain and hostname validation with the Java trust store. It uses a small Hikari pool with no idle minimum. A direct connection is retained for this long-running JDBC app and its guarded startup migrations.
- The launcher reads server-only env files; it never substitutes database secrets into the Angular build.
- Public deployment still requires hosting the Spring server and Cloudflare Pages. On a host, configure `SERVER_ADDRESS=0.0.0.0`, `PORT`, `FRONTEND_ORIGIN`, `CORS_ALLOWED_ORIGINS`, and `SESSION_COOKIE_SECURE=true`. Keep the frontend API requests on the same origin through a cookie-preserving proxy.
- Do not run the snapshot importer against a populated database, expose the admin URL to browsers, or disable demo guards.

## Verification: 2026-11-15

`neon deploy` reported:

```text
No changes — branch production already matches the policy.
Utilized services: Postgres
Pulled 5 Neon variables into .env.local
```

`npm run build` builds Angular and packages the Java backend, ending with Maven `BUILD SUCCESS`. Packaging skips tests explicitly; browser/service tests are separate.

The existing backend seed command independently verified:

- Generator: `portfolio-v1`, seed `20251114`
- 30 variants, 9,863 orders, 54 refunds
- Canonical checksum: `5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6`

Setup was run twice; the second run verified the existing database without changing data.

Resolved setup failures: browser authentication initially timed out; a subsequent `neon login` succeeded. JDBC initially lacked a usable root-certificate configuration; Java trust-store validation fixed it. Two snapshot import attempts rolled back completely due to the initial settings foreign key and the dump search path; preserving the row with an upsert and retaining `public` for existing trigger functions fixed them. No migrations, pricing algorithms, or synthetic data definitions changed.

End-to-end browser checks against Angular on port 4208 and Spring on port 8088 passed: backend health through the Angular proxy, anonymous catalog denial, demo login, 30 catalog products, independent canonical checksum calculation, Analytics financial rows, observed/forecast chart, CSRF cookie issuance, demo write rejection with a valid CSRF token, and protected-access denial after logout.

Regression results:

```text
Frontend: Test Files 39 passed (39); Tests 167 passed (167)
DemoSafetyGuardTest: Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
Maven: BUILD SUCCESS
```

The JSDOM test environment emits its existing canvas-not-implemented notices; all 167 frontend tests passed. No unresolved deployment/database failures remain. The backend and frontend have been started locally for verification; only the database is hosted remotely by this setup.

A final rebuild initially encountered Windows locking Maven's running JAR. The launcher now runs an isolated copy under the ignored backend/target directory. The final root build and end-to-end checks were repeated with the app running successfully.

