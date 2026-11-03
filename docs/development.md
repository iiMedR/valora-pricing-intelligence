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
- Port 5433 occupied: set `$env:POSTGRES_PORT = '5434'` in both the Compose and backend terminals before startup. An explicit `DB_URL` overrides this setting; update or remove a stale `DB_URL` if necessary. For backend HTTP port changes, also update the frontend proxy target.
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

The delivered scope ends at Milestone 03. Begin Milestone 04 only after a new user instruction. No new package installation or external service is required.
