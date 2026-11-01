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

- Docker reports `Docker Desktop is unable to start`: restore Docker Desktop's Linux engine, then rerun `docker version` and the Compose startup. PostgreSQL, Flyway runtime verification, full context tests, and a live connected UI remain blocked until then.
- Port 5432 occupied: set `POSTGRES_PORT` and match the backend `DB_URL`. For backend port changes, also update the frontend proxy target.
- On this machine an existing PostgreSQL service answers on port 5432 and rejects the default SmartPricing credentials (`28P01`). Do not modify that unrelated server. Once Docker works, start Compose on another port: set `$env:POSTGRES_PORT = '5433'` before `docker compose -f infra/compose.yaml up -d --wait`, and set `$env:DB_URL = 'jdbc:postgresql://localhost:5433/smartpricing'` in the backend terminal before startup.
- Backend unavailable in the UI: verify the direct health URL, local profile, PostgreSQL health, and backend logs. The UI times out after five seconds and permits retry.
- Credential changes do not alter users in an existing PostgreSQL volume. Use the original credentials or intentionally reset local data after reading the warning above.
- A sandbox temporary-file ENOENT during Angular tests can be an environment restriction; rerun in a normal terminal. Do not interpret a build as a passed unit test.
- Maven/Node downloads need access to Maven Central and npm. Never substitute H2 or SQLite to work around unavailable Docker.

## Milestone workflow

Inspect the working tree before changes, implement only the current milestone, run independent tests first, then PostgreSQL integration tests and browser checks. Keep unit tests independent of Docker: Surefire runs `*Test`; Failsafe runs `*IT` during `verify`. The full-context integration test starts real PostgreSQL, verifies V1 and the empty metadata table, and exercises HTTP health. An unavailable Docker engine fails that check rather than silently passing it.

Use conventional local commits with genuine timestamps and the configured author. Do not push, fetch, create remotes, or begin Milestone 02 without a new instruction. Formatting: UTF-8, LF, two spaces for TypeScript/config, four spaces for Java. Source and lockfiles belong in Git; generated output and secrets do not.
