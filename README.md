# SmartPricing

A single-business pricing optimization platform. Milestone 01 provides the local application foundation only: Angular shell, health API, PostgreSQL configuration, and Flyway baseline. No business data, pricing engine, authentication, or store integration is implemented.

The existing `SmartPricing` directory is the repository root (no redundant `smartpricing-platform` wrapper).

## Prerequisites and pinned versions

- Java 21 (verified: Oracle JDK 21.0.11).
- Spring Boot 3.5.16; Maven wrapper downloads Maven 3.9.11. System Maven is not required.
- Node 24.22.1 and npm 11.19.1 verified; Angular framework and CLI 22.2.6, TypeScript 6.0.x. Use `npm ci` to reproduce the lockfile.
- Docker Desktop with Linux containers and Compose (verified: Desktop 4.92.0, client/engine 29.8.0).
- PostgreSQL image `postgres:17.7-alpine` is pinned in Compose and Testcontainers.

Version references: [Angular compatibility](https://angular.dev/reference/versions), [Spring Boot 3.5 requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html).

## Local startup (PowerShell)

From the repository root, start Docker Desktop, then:

```powershell
docker compose -f infra/compose.yaml up -d --wait
docker compose -f infra/compose.yaml ps
```

In a second terminal:

```powershell
cd backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.11'
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

In a third terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd start
```

Open [SmartPricing](http://localhost:4200). Check the backend directly:

```powershell
curl.exe -i http://localhost:8080/api/v1/health
curl.exe -i http://localhost:8080/actuator/health
```

The application endpoint returns `{"status":"UP"}` and confirms application responsiveness; Actuator also checks database health. The UI does not claim database or business-data readiness from the application endpoint.

The Angular development proxy forwards `/api/**` to `http://localhost:8080`, avoiding browser cross-origin requests. Backend CORS separately permits `http://localhost:4200`; override using `CORS_ALLOWED_ORIGINS` (comma-separated explicit origins). No wildcard is used.

## Configuration

The `local` profile defaults to `jdbc:postgresql://localhost:5433/smartpricing`, user `smartpricing`, password `smartpricing_local`. Host port 5433 avoids a collision with an existing PostgreSQL service on 5432; the container still listens on 5432. These credentials are for development only. Override backend settings using `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. Compose accepts `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`; keep the backend values consistent. The backend also reads `POSTGRES_PORT` when `DB_URL` is not set: export the same port in both terminals to change it. Environment files are ignored. No database defaults are enabled outside the local profile.

Flyway owns schema changes. Hibernate uses `validate`, never schema creation. The initial empty `app_metadata` table supports future application metadata; there are no business seed rows.

## Checks

```powershell
cd backend
.\mvnw.cmd test                 # controller and CORS tests; no Docker needed
.\mvnw.cmd verify               # also full context + PostgreSQL/Flyway integration; requires Docker
cd ../frontend
npm.cmd test -- --watch=false
npm.cmd run build
```

On macOS/Linux use `./mvnw` (make executable if necessary) and `npm` in place of `npm.cmd`.

See [verification](docs/verification.md) for actual outcomes, [architecture](docs/architecture.md) for boundaries, and [development](docs/development.md) for workflow and troubleshooting.
