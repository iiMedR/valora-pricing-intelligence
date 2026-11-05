# SmartPricing

A single-business pricing optimization platform. Milestones 01–08 provide the local foundation, catalog, immutable sales/refund and price/cost/inventory history, isolated synthetic demo, analytics, guarded forecasting, constrained recommendations, administrator sessions and a Shopify OAuth connection lifecycle. Shopify synchronization and automatic price changes remain future work.

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

Normal business pages/APIs now require sign-in. Provision your own administrator once with `.\scripts\admin.ps1 -Username owner` (secure password prompt), then sign in at `/login`. No default account or HTTP setup exists; existing accounts are never replaced. See [authentication and local credential recovery](docs/authentication.md). The demo remains anonymous and read-only. [Shopify connection setup](docs/shopify-connection.md) is optional and requires a separately configured app and public HTTPS callback; connection does not import data. The [Milestone 08 verification report](docs/milestone-08-verification.md) records tested scope and limitations.

The Angular development proxy forwards `/api/**` to `http://localhost:8080`, avoiding browser cross-origin requests. Backend CORS separately permits `http://localhost:4200`; override using `CORS_ALLOWED_ORIGINS` (comma-separated explicit origins). No wildcard is used.

## Isolated synthetic demo

From the repository root, initialize once, then run the demo backend and frontend in separate terminals:

```powershell
.\scripts\demo.ps1 init
.\scripts\demo.ps1 serve
# Separate terminal:
cd frontend
npm.cmd run start:demo
```

Open [the synthetic demo](http://localhost:4201). It uses backend 8081 and a separate PostgreSQL database on 5434; normal development remains on 4200/8080/5433. Ordinary startup never seeds. Initialization creates ignored local credentials and explicitly seeds 30 products, 9,466 orders and 114 refunds for January–December 2025. Repeat with `.\scripts\demo.ps1 seed`; destructive reseeding requires `.\scripts\demo.ps1 reset -ConfirmReset` and validates the dedicated database identity before changing anything. See [demo setup, scenarios and limitations](docs/demo-data.md) and [Milestone 04 verification](docs/milestone-04-verification.md).

## Normal database configuration

The `local` profile defaults to `jdbc:postgresql://localhost:5433/smartpricing`, user `smartpricing`, password `smartpricing_local`. Host port 5433 avoids a collision with an existing PostgreSQL service on 5432; the container still listens on 5432. These credentials are for development only. Override backend settings using `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. Compose accepts `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`; keep the backend values consistent. The backend also reads `POSTGRES_PORT` when `DB_URL` is not set: export the same port in both terminals to change it. Environment files are ignored. No database defaults are enabled outside the local profile.

Flyway owns schema changes. Hibernate uses `validate`, never schema creation. V1 supplies the empty metadata table. V2 creates the catalog and initializes exactly one settings row (`My Business`, `MAD`), without catalog/demo records. V3 adds business history; V4 adds accounts, encrypted Shopify credentials and hashed one-time OAuth states without changing business data. Products start archived; add an active variant before activating a product. Currency cannot change once any variant exists, including archived variants.

## Catalog management

Open Products, Categories, or Business settings in the navigation. Monetary values are decimal strings with at most four decimal places; below-cost prices are allowed and flagged. Archive retains catalog records. See the [catalog API and domain guide](docs/catalog.md) for endpoint examples, validation, concurrent edits, and archive rules.

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

Milestone 02 results are recorded separately in [catalog verification](docs/milestone-02-verification.md).

## Sales and variant history

Open Sales orders to enter/inspect manual transactions and refunds. Each variant's product-detail card links to listed-price, unit-cost, and inventory history. Unknown historical cost or inventory is displayed explicitly rather than replaced with current catalog data. Verified current price/cost changes synchronize with the catalog atomically; snapshots remain point observations.

V3 adds history without backfilling data or modifying V1/V2. It uses PostgreSQL's `btree_gist` extension for authoritative period-overlap constraints; the migration role needs permission to create this trusted extension. The supplied local PostgreSQL image supports it. APIs retain the current unauthenticated local-development posture; provider authorization is future work.

See [history contracts and API examples](docs/history.md), [implementation design](docs/milestone-03-design.md), and [Milestone 03 verification](docs/milestone-03-verification.md). No new setup commands or package installations are needed.

## Business analytics

Open Analytics in the navigation: [normal dashboard](http://localhost:4200/analytics) or [synthetic demo dashboard](http://localhost:4201/analytics). Use Full 2025 to inspect the existing demo's historical period. UTC date ranges, sale/refund timing, exact monetary strings, partial known-cost contribution, trends, product/variant drill-downs and inventory freshness all use persisted data. No initialization/reset runs from the dashboard. See [metric definitions and API contract](docs/analytics.md) and [Milestone 05 verification](docs/milestone-05-verification.md). Existing startup commands and dependencies are unchanged.

## Demand Forecasting

Open [demo forecasting](http://localhost:4201/forecasting) or [normal forecasting](http://localhost:4200/forecasting). Select Full 2025 to inspect existing demo history, search a variant, and inspect 7/14/30-day observed-sales baselines, guarded association-based elasticity and chronological backtests. Sparse, missing-stock and zero-sales histories produce explicit limitations rather than fabricated elasticity. Historical forecasts state their as-of date and latest known price assumption. No calibrated uncertainty/causal claim, model tables, new dependency, data reset or price recommendation is introduced. See [model/data contract](docs/forecasting.md) and [Milestone 06 verification](docs/milestone-06-verification.md). Existing normal/demo startup commands and isolated ports remain unchanged.

## Pricing Recommendations

Open [demo evaluations](http://localhost:4201/optimization) or [normal evaluations](http://localhost:4200/optimization). Full 2025 evaluates the existing historical demo. A stricter gate than forecasting readiness withholds suggestions for calendar-confounded, sparse, baseline-only, missing-cost and inactive cases. The seasonal weak-elasticity case is explicitly non-actionable; good forecasting alone never authorizes a price change. Supported cases optimize estimated contribution on the existing 0.0001 grid with effective known cost, constraints and a conservative horizon stock cap. No price is applied, no GET writes occur, and evaluation history is not persisted. See [objective, gates and APIs](docs/optimization.md) and [Milestone 07 verification](docs/milestone-07-verification.md). No migration, dependency installation or reseed is needed.
