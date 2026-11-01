# Milestone 01 verification

Executed on 2026-11-12 on Windows, branch `codex/milestone-01`.

## Environment

Java 21.0.11, Spring Boot 3.5.16, Maven wrapper 3.9.11, Node 24.22.1, npm 11.19.1, Angular CLI/framework 22.2.6. PostgreSQL 17.7 is configured, not runtime-verified. Docker client 29.8.0 is installed; its Linux engine reports `Docker Desktop is unable to start`. No system Maven was available, so use the wrapper.

## Executed checks

| Command | Actual outcome |
| --- | --- |
| `backend: .\mvnw.cmd test` | PASS: 3 controller/CORS tests, no failures or skips. |
| `backend: .\mvnw.cmd verify` | Unit tests and executable JAR packaging pass; the one PostgreSQL context/integration test errors because Testcontainers cannot find a working Docker environment. No tests silently skipped. |
| `docker compose -f infra/compose.yaml config --quiet` | PASS. |
| `docker compose -f infra/compose.yaml up -d` | BLOCKED: Docker Desktop cannot start. No PostgreSQL container or healthcheck verified. |
| `backend: .\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'` | FAIL: an existing PostgreSQL server at localhost:5432 rejects user smartpricing (SQLSTATE 28P01). The local profile is selected correctly; no Flyway runtime success is claimed. |
| `frontend: npm.cmd ci` | PASS: clean lockfile installation, audit reports zero vulnerabilities. npm emits install-script approval notices; generated build tooling works. |
| `frontend: npm.cmd test -- --watch=false` | PASS: 4 tests across 2 suites, including loading, success, failure/retry, and unexpected health status. An initial sandbox run encountered temporary-file ENOENT; the complete rerun outside that restriction passed. |
| `frontend: npm.cmd run build` | PASS: production bundle builds. |
| `frontend: npm.cmd start -- --host localhost` | PASS: development server starts at http://localhost:4200 using the API proxy. |

## Browser QA

The flow under test is: overview loads → actual failed health request → unavailable status → Check again → a new request and unavailable status.

Browser plugin not available; used Playwright CLI outside committed source. Checked 1280×900 desktop and 390×844 mobile.

| Check | Result |
| --- | --- |
| Page identity | PASS: `http://localhost:4200/`, title `Overview \| SmartPricing`. |
| Meaningful content / no framework overlay | PASS: shell, navigation, project description, real connection status. |
| Console | Expected health-request HTTP 502 errors from offline backend; no other app errors or warnings observed. |
| Screenshot review | PASS: readable desktop/mobile layouts; mobile content width equals viewport width (390px). |
| Interaction proof | PASS: retry creates a new GET `/api/v1/health`; status remains unavailable without falsely reporting success. |

Screenshots and browser traces stay outside the repository. Connected/loading behavior is covered by HttpClient tests; a live successful backend-to-browser path remains unverified. No mock success responses were introduced in browser QA or application code.

## Deviations and next check

Used the existing `SmartPricing` workspace directly as repository root. Spring Initializr rejected Boot 3.5.16 because its current compatibility range starts at 4.0.0; created the idiomatic Maven project directly and retained Boot 3.x and Java 21 as required. Downloaded the official Apache Maven wrapper distribution. Created only useful feature files; no placeholder application/domain/persistence layers for a stateless health endpoint.

Restore Docker Desktop, select an unused PostgreSQL port as documented in development.md, run Compose with `--wait`, rerun `.\mvnw.cmd verify`, start the backend with local profile, and verify direct health plus connected browser status. This infrastructure verification is the remaining gate before treating Milestone 01 as fully verified and moving to Prompt 02. No future milestone features were implemented.
