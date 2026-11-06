# Local development

Follow the exact startup commands in the root README. Run commands from the documented directory; PowerShell requires `.\mvnw.cmd`, and Java must resolve to JDK 21. The wrapper bootstraps Maven on first use and needs network access. Node 24.22.1 is compatible with pinned Angular 22.2.6.

Use the local Spring profile explicitly. Stop the backend and Angular server with Ctrl+C. Stop infrastructure without deleting data:

```powershell
docker compose -f infra/compose.yaml down
```

## Database reset

**Warning: this permanently destroys all local SmartPricing database data in the Compose volume.** Run only when intentionally resetting the local workspace, from the repository root:

```powershell
docker compose -f infra/compose.yaml down --volumes
docker compose -f infra/compose.yaml up -d --wait
```

Restart the backend to apply Flyway migrations. Startup never automatically resets the database. Add a new numbered migration for schema changes rather than editing an applied migration.

## Troubleshooting

- Docker reports `Docker Desktop is unable to start`: inspect Desktop's startup error. This machine had a stale `WSL update required` state. `wsl --update` confirmed WSL 3.0.5.0 was already current; `docker desktop restart --timeout 50` cleared the failure and started the Linux engine. Verify `docker version` shows a Server section before starting Compose. Never reset Docker data to address this error.
- SmartPricing uses host port 5433 by default, keeping the existing Windows PostgreSQL service on 5432 separate. No changes to that service or its credentials are required.
- Port 5433 occupied: choose an unused port other than 5434 (reserved for the isolated demo) and set `POSTGRES_PORT` in both the Compose and backend terminals. An explicit `DB_URL` overrides this setting; update or remove a stale `DB_URL` if necessary. For backend HTTP port changes, also update the frontend proxy target.
- Backend unavailable in the UI: verify the direct health URL, local profile, PostgreSQL health, and backend logs. The UI times out after five seconds and permits retry.
- Credential changes do not alter users in an existing PostgreSQL volume. Use the original credentials or intentionally reset local data after reading the warning above.
- A sandbox temporary-file ENOENT during Angular tests can be an environment restriction; rerun in a normal terminal. Do not interpret a build as a passed unit test.
- Maven/Node downloads need access to Maven Central and npm. Never substitute H2 or SQLite to work around unavailable Docker.

## Milestone workflow

Inspect the working tree before changes, implement only the current milestone, run independent tests first, then PostgreSQL integration tests and browser checks. Keep unit tests independent of Docker: Surefire runs `*Test`; Failsafe runs `*IT` during `verify`. The full-context integration test starts real PostgreSQL, verifies V1 and the empty metadata table, and exercises HTTP health. An unavailable Docker engine fails that check rather than silently passing it.

Use conventional local commits with genuine timestamps and the configured author. Do not push, fetch, create remotes, or begin a later milestone without a new instruction. Formatting: UTF-8, LF, two spaces for TypeScript/config, four spaces for Java. Source and lockfiles belong in Git; generated output and secrets do not.

## Catalog development (Milestone 02)

See [catalog.md](catalog.md) for archived-first product creation, decimal-string prices, versioned updates, and the currency restriction. V2 upgrades the existing local database automatically on backend startup; never reset a volume to apply this milestone. Fresh-database and V1-upgrade tests use isolated PostgreSQL containers. The complete current check results are in [milestone-02-verification.md](milestone-02-verification.md).

Milestone 03 extends this catalog with immutable sales/refund history and variant observations; see [history.md](history.md). V3 applies during normal startup and preserves catalog data. Verification includes fresh migration and V2-to-V3 retention tests in isolated containers. Do not reset local volumes.

On Windows, a running `java -jar target/...jar` can lock the file and prevent Maven repackaging. Stop only that application process before rebuilding, or use `mvnw.cmd spring-boot:run` for local development so the target JAR is not held open. Restart the backend after changes; the Angular development server reloads frontend changes automatically.

The delivered scope ends at Milestone 09. Administrator sessions, Shopify connection lifecycle and bounded read-only imports are included alongside analytics, forecasting and recommendations. Real-store onboarding/readiness, tenancy, automatic price changes and deployment remain future work. Live Shopify validation is still unavailable.

## Isolated demo development (Milestone 04)

Follow [demo-data.md](demo-data.md) for explicit initialization, seed, summary, serve and confirmed reset commands. Demo PostgreSQL has its own Compose project, volume, restricted role, database identity marker and port 5434. Do not use the normal database reset commands above for demo setup. Ordinary startup in either profile never seeds. The demo backend runs on 8081, and `npm.cmd run start:demo` runs Angular on 4201. Credentials stay in ignored `infra/.env.demo.local`.

Run backend builds sequentially; integration tests seed several independent PostgreSQL databases and take several minutes. They validate atomic rollback, reproducibility, controlled variation and refusal against preexisting normal data. Milestone 04 reused existing business tables; Milestone 08's V4 adds empty security metadata without changing seed/reset data or checksum. Control metadata is bootstrapped only in the isolated demo database. See [Milestone 04 verification](milestone-04-verification.md).

## Analytics development (Milestone 05)

Navigate to `/analytics` in either workspace. Read [analytics.md](analytics.md) before changing accounting or date filters. All analytics operations are read-only, report UTC half-open date ranges, preserve unknown costs/stock and never use generator ground truth. No analytics migration, chart package, npm dependency change or reseed is needed. Run `mvnw.cmd verify`, frontend tests/build and browser checks; full backend verification includes the existing multi-database demo reproducibility fixture. See [Milestone 05 verification](milestone-05-verification.md).

## Demand forecasting (Milestone 06)

Navigate to `/forecasting`. Read [forecasting.md](forecasting.md) for event-time semantics, availability exclusions, thresholds, zero handling and explicit limitations. Java typed `app.forecasting` settings are validated at startup. Runtime code never reads demo ground truth; only test fixtures compare known scenarios. Run the same full backend/frontend checks. No schema migration, infrastructure, package installation or reseed is required. Historical as-of reports intentionally do not simulate late import arrival. Never present the baseline as a price recommendation or latent-demand estimate.

## Contribution recommendations (Milestone 07)

Navigate to `/optimization`, using normal/demo startup (normal now requires sign-in). Read [optimization.md](optimization.md) before altering constraints, evidence gates, freshness or rounding. Typed `app.optimization` settings govern conservative actionability; existing M06 estimation is reused. Effective price/cost and stock are batched at the retrospective evaluation instant. GETs never write or apply prices; evaluation history is intentionally not implemented, and M07 needed no migration. The permanent demo correctly abstains under calendar-confounding gates. A separate ephemeral PostgreSQL fixture tests supported actionable cases; never alter permanent demo data to manufacture a suggestion. Run full Maven verify, Angular tests/build, UI and checksum checks.

## Authentication and Shopify connection (Milestone 08)

Follow [authentication.md](authentication.md) for explicit one-time `.\scripts\admin.ps1 -Username owner` provisioning and session/CSRF contracts. Normal business APIs require ADMIN; public health/environment/session lookup remain available. Existing API integration tests now use real cookie/CSRF login through `auth/TestHttp`, without disabling security filters. Dedicated HTTP tests verify cookie attributes, fixation and logout revocation. Demo remains anonymous with server-enforced GET-only business access.

V4 is forward-only; never edit V1–V3 or reset volumes. `SecurityMigrationIT` verifies a V3 upgrade and retained migration checksums/data; historical V2-to-V3 testing explicitly targets V3. Spring Boot manages Spring Security 6.5.11, including its test module. No Angular dependency changes are required. Run Maven builds sequentially, then `npm.cmd test -- --watch=false` and `npm.cmd run build` in frontend. See [Shopify setup](shopify-connection.md) for optional disabled-by-default configuration and provider mock tests; actual OAuth needs a real app and public HTTPS validation.

## Read-only Shopify imports (Milestone 09)

M09 implements [explicit background imports](shopify-sync.md). V5 preserves V1–V4 and existing data. Source mappings never match manual records by SKU. Page transactions atomically commit canonical records and checkpoints; a PostgreSQL guard prevents concurrent active jobs and recovers unfinished work after process restart. Provider reads happen outside write transactions, with generation revalidation before applying data. Refresh rotation alone uses the connection lock across its bounded provider request.

`SyncIT` imports sanitized GraphQL fixtures into disposable PostgreSQL and tests replay, financial conflicts, refunds, unknown costs, pagination, resume, archival/reappearance and refresh. `SyncMigrationIT` checks V4-to-V5 retention. Existing isolated cleanup and guarded demo reset explicitly include `shopify_order_metadata` because of its FK to immutable orders; safety/confirmation checks and permanent demo checksum are unchanged. Never run those fixture/reset operations on normal user data. Ordinary startup never seeds. Browser fixture jobs are intercepted outside the server, not imported into either persistent workspace. No dependency/framework upgrade is needed. Run full backend verify and frontend tests/build; see [Milestone 09 evidence](milestone-09-verification.md).
