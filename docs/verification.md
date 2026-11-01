# Milestone 01 verification

Executed on 2026-11-12 on Windows, branch `codex/milestone-01`.

## Environment

Java 21.0.11, Spring Boot 3.5.16, Maven wrapper 3.9.11, Node 24.22.1, npm 11.19.1, Angular CLI/framework 22.2.6. PostgreSQL 17.7 is verified through the running Compose container. Docker Desktop 4.92.0 and client/engine 29.8.0 are working. WSL 3.0.5.0 is current. No system Maven was available, so use the wrapper.

## Resolved startup problems

Docker's backend retained `checking preconditions: WSL update required` from an earlier failed startup. `wsl --update` confirmed the latest WSL was already installed. `docker desktop restart --timeout 50` cleared the stale failure and successfully started the Linux engine; no data reset or reinstall was needed. References: [Microsoft WSL update commands](https://learn.microsoft.com/en-us/windows/wsl/basic-commands), [Docker Desktop WSL backend](https://docs.docker.com/desktop/features/wsl/).

The Windows `postgresql-x64-18` service already occupied port 5432 and rejected SmartPricing's development credentials. Both Compose and the backend now default to dedicated host port 5433, leaving that service unchanged. The backend reads `POSTGRES_PORT` for its default JDBC URL so both configurations can share an override; `DB_URL` remains the explicit full-URL override.

## Executed checks

| Command | Actual outcome |
| --- | --- |
| `backend: .\mvnw.cmd test` | PASS: 3 controller/CORS tests, no failures or skips. |
| `backend: .\mvnw.cmd verify` | PASS after Docker recovery: 3 unit/controller tests and 1 real PostgreSQL context/integration test, no failures/errors/skips; executable JAR packaging passes. Testcontainers starts PostgreSQL 17.7 and Flyway applies V1. |
| `docker compose -f infra/compose.yaml config --quiet` | PASS. |
| `docker compose -f infra/compose.yaml up -d --wait` | PASS: PostgreSQL container healthy at `127.0.0.1:5433`. `psql SELECT version()` confirms PostgreSQL 17.7. |
| `backend: .\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'` | PASS: starts on port 8080 with local profile, connects to port 5433, and applies Flyway V1. Database queries confirm migration success and zero metadata rows. |
| `curl.exe -i http://localhost:8080/api/v1/health` | PASS: HTTP 200, `{"status":"UP"}`. |
| `curl.exe -i http://localhost:8080/actuator/health` | PASS: HTTP 200, `{"status":"UP"}` including the configured database health contributor. |
| `curl.exe -i http://localhost:4200/api/v1/health` | PASS: development proxy returns HTTP 200 and `{"status":"UP"}`. |
| `frontend: npm.cmd ci` | PASS: clean lockfile installation, audit reports zero vulnerabilities. npm emits install-script approval notices; generated build tooling works. |
| `frontend: npm.cmd test -- --watch=false` | PASS: 4 tests across 2 suites, including loading, success, failure/retry, and unexpected health status. An initial sandbox run encountered temporary-file ENOENT; the complete rerun outside that restriction passed. |
| `frontend: npm.cmd run build` | PASS: production bundle builds. |
| `frontend: npm.cmd start -- --host localhost` | PASS: development server starts at http://localhost:4200 using the API proxy. |

## Browser QA

The initial offline flow passed: overview loads → failed health request → unavailable status → Check again → a new request and unavailable status. After infrastructure recovery, the flow under test is: overview loads → live successful health response → Connected → Check again → new successful request → Connected.

Browser plugin not available; used Playwright CLI outside committed source. Checked 1280×900 desktop and 390×844 mobile.

| Check | Result |
| --- | --- |
| Page identity | PASS: `http://localhost:4200/`, title `Overview \| SmartPricing`. |
| Meaningful content / no framework overlay | PASS: shell, navigation, project description, real connection status. |
| Console | After recovery: zero browser errors or warnings. The initial offline run's health-request HTTP 502 errors are resolved. |
| Screenshot review | PASS: readable desktop/mobile layouts; mobile content width equals viewport width (390px). |
| Interaction proof | PASS: live backend reports Connected; retry creates a new GET `/api/v1/health` and returns to Connected with HTTP 200. |

Screenshots and browser traces stay outside the repository. Loading, error, retry, and unexpected response behavior are also covered by HttpClient tests. The successful backend-to-browser path uses the real running backend and PostgreSQL; no mock success responses were introduced in browser QA or application code.

## Deviations and next check

Used the existing `SmartPricing` workspace directly as repository root. Spring Initializr rejected Boot 3.5.16 because its current compatibility range starts at 4.0.0; created the idiomatic Maven project directly and retained Boot 3.x and Java 21 as required. Downloaded the official Apache Maven wrapper distribution. Created only useful feature files; no placeholder application/domain/persistence layers for a stateless health endpoint.

All previously blocked Milestone 01 infrastructure checks now pass. The foundation is ready for Prompt 02; no future milestone features were implemented. Non-blocking Mockito/Java dynamic-agent warnings remain in backend test output, and npm install-script notices are recorded above. No database or Docker data was deleted.
