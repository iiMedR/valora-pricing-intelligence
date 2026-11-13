# Portfolio demo and legacy research fixture

SmartPricing is a junior full-stack portfolio project. The demo showcases Spring Boot, Angular, PostgreSQL, immutable financial history, analytics, guarded modeling and tests. It does **not** establish commercial causal optimization.11.13 unsafe synthetic approvals remain TEST 65/260 and CHALLENGE 41/156; conditional interval causal coverage0/20. No automatic price application or live provider integration is demonstrated.

## Recruiter launch — PowerShell

Prerequisites: JDK21, Node/npm and Docker Desktop (Linux containers); pinned versions and normal startup are in the root README. From the repository root:

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-21.0.11' # adapt to your JDK21
./scripts/portfolio-demo.ps1 init
./scripts/portfolio-demo.ps1 serve
# Separate terminal:
cd frontend
npm.cmd ci
npm.cmd run start:portfolio
```

Open http://localhost:4207/products. Init explicitly creates a new isolated volume and seeds it; ordinary serve never seeds. The first seed can take several minutes because the existing transactional business services validate every imported history/order. No default administrator or customer identity is created. Browsing is anonymous/read-only. Select a product, inspect sales, pricing insight and Pricing guidance. Entered units/costs in guidance are assumptions; contribution is sales less known variable costs, excluding other business expenses. A green engine result is a synthetic demonstration, not a validated causal recommendation. See portfolio-evaluation.md for every outcome, including errors.

|Installation|Database port|Backend|Frontend|Fixture|
|---|---:|---:|---:|---|
|Normal|5433|8080|4200|User records; unchanged|
|Legacy research demo|5434|8081|4201|Original demo-v1,2025,30 abstentions|
|SaaS|5435|8082|4202|Separate subscription installation; no new SaaS seed|
|Portfolio demo|5437|8087|4207|portfolio-v1, frozen seed 20251114,2025|

## Repeat, export and reset

```powershell
./scripts/portfolio-demo.ps1 seed       # idempotent; refuses altered/mismatched data
./scripts/portfolio-demo.ps1 summary    # checksum and counts
./scripts/portfolio-demo.ps1 export     # backend/target/demo-canonical.jsonl
./scripts/portfolio-demo.ps1 reset -ConfirmReset
```

Reset is destructive **only within the verified portfolio fixture** and requires the explicit flag. Before reset, run export and copy backend/target/demo-canonical.jsonl to a safe local backup path. This canonical export is an audit/reconciliation artifact, not a pg_restore backup. If you need recovery of IDs/metadata, also use PostgreSQL pg_dump for the portfolio container and keep the ignored credential file privately. Do not remove volumes or credentials casually. Never aim a demo command at a normal/live database. There is no automatic switch, migration or replacement of the legacy fixture.

Shared scripts/demo.ps1 defaults to legacy; scripts/portfolio-demo.ps1 is a small named wrapper selecting portfolio. The existing legacy commands remain:

```powershell
./scripts/demo.ps1 summary
./scripts/demo.ps1 serve
# frontend, separate terminal: npm.cmd run start:demo
```

Use separate terminals/browser tabs; switching means opening the other installation, not reseeding an existing database. Legacy reset remains explicitly destructive and is not required to launch portfolio. Original setup/checksum details remain in ../demo-data.md and historical research documents.

## Guards and environment

Portfolio uses infra/compose.portfolio.yaml, a dedicated smartpricing-portfolio project/volume and admin-owned SMARTPRICING_ISOLATED_PORTFOLIO_V1 marker. Legacy uses SMARTPRICING_ISOLATED_SYNTHETIC_V1. Both use restricted smartpricing_demo roles inside separate servers. Markers are not interchangeable; checks run before Flyway and every reset. Profile must include demo plus portfolio for the new fixture and exclude local/saas; ECOMMERCE mode is required. The frozen portfolio generator rejects any seed/date other than20251114/2025-01-01. All financial/history writes remain transactional with an advisory lock. Failed first attempts roll back rather than leave partial catalogs.

Init generates ignored infra/.env.portfolio.local with PORTFOLIO_ADMIN_PASSWORD and PORTFOLIO_DB_PASSWORD. Do not commit or print it. The wrapper loads/restores these process variables temporarily. Legacy retains its separate infra/.env.demo.local credentials. No provider keys, network integration or billing account is needed. No new migration or dependency was added. Optional SaaS seeding was deliberately deferred rather than mixing business modes.

## Reproduce verification

```powershell
cd backend
./mvnw.cmd verify
cd ..
npm.cmd test --prefix frontend -- --watch=false
npm.cmd run build --prefix frontend
```

PortfolioSeederIT creates two fresh disposable PostgreSQL containers, compares canonical bytes, tests repeat/reset and cross-marker refusal, and writes target/portfolio-verification results. Existing legacy tests assert the original golden checksum and all benchmark/oracle/security suites remain included. Random entity UUIDs and insertion timestamps are normalized out of canonical rows; SKU/logical keys, sales times and amounts are stable. Source parameters/truth are in portfolio-dataset-design.md and PortfolioGenerator.java; final evaluation and verification contain checksums, timings, limitations and real screenshots.
