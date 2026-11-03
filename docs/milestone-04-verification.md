# Milestone 04 verification — 2026-11-12

Implemented on existing branch `codex/milestone-01`, starting from clean `36bc1f8`. Scope ends at reproducible isolated synthetic data and its environment label. No analytics, forecasting, optimization, authentication, Shopify, tenancy, hosting or deployment changes.

## Changed modules

- `backend/src/main/java/com/smartpricing/demo/`: pure generator, scenario/config records, guarded explicit command runner, atomic seed/reset, private metadata/checksum repositories and demo-only read-only summary controller.
- `backend/src/main/java/com/smartpricing/config/EnvironmentController.java`: actual mode/dataset identity for the UI. `SmartPricingApplication.java` exits explicit CLI actions cleanly.
- `backend/src/main/java/com/smartpricing/history/service/HistorySupport.java`: normal-mode DEMO rejection and bounded advisory-lock stripes, retaining exact key/fingerprint semantics.
- `backend/src/main/resources/application-demo.yml`, `infra/compose.demo.yaml`, `infra/demo/10-isolated-demo.sh`, `scripts/demo.ps1`: dedicated database/role/volume, guarded initialization and commands. Normal Compose and migrations unchanged.
- `backend/src/test/java/com/smartpricing/demo/`: deterministic/scenario, safety and actual PostgreSQL tests. Existing history tests cover source rejection/bounded locks. Spring integration fixtures explicitly name the application configuration and close contexts before their containers stop.
- `frontend/src/app/core/environment-indicator{,.spec}.ts`, shell/styles/tests, `frontend/proxy.demo.conf.json`, `frontend/package.json`: minimal synthetic environment banner, fail-closed identity warning/retry and separate demo development server.
- README, development/history/architecture documentation and [demo-data.md](demo-data.md).

## Executed commands and results

| Command/check | Actual result |
| --- | --- |
| `backend/mvnw.cmd verify` (JDK 21.0.11) | BUILD SUCCESS, 9:01; 43 unit + 15 integration tests, zero failures/errors/skips |
| `npm.cmd test -- --watch=false` in frontend | 25 tests / 13 suites passed |
| `npm.cmd run build` in frontend | Angular production build passed |
| `scripts/demo.ps1 init` | Dedicated PostgreSQL 17.7 initialized; Flyway V1–V3; complete explicit seed succeeded |
| `scripts/demo.ps1 seed` | Identical summary/checksum; no duplicated records |
| `scripts/demo.ps1 reset` without confirmation | Refused before any database operation |
| Demo `/api/v1/environment` and `/api/v1/demo/summary` | DEMO, synthetic, READY; actual checksum matches stored seed |
| Normal `/api/v1/environment`, `/actuator/health` | NORMAL, synthetic false; UP |
| Normal POST order with DEMO source | HTTP 409 `DEMO_SAFETY_REFUSAL` |
| Normal database read-only counts after checks | Existing baseline retained: 0 products, 0 orders |
| Git diff of V1–V3 against baseline | Empty; no V4 needed |
| `git diff --check` | Passed |

The final complete backend verification finished at 13:39 UTC. Testcontainers used actual PostgreSQL 17.7, not an in-memory substitute. Tests include fresh migration, prior V1/V2 upgrades and V3 catalog/history retention. Normal startup against the existing V3 local database also succeeded without resetting its volume.

## Reproducibility and protection evidence

`DemoSeederIT` seeded two independently bootstrapped databases and compared the complete normalized `DemoSummary`, including SHA-256. Same seed/date/version matched despite independent UUIDs and audit times. Repeated seed retained counts and original completion timestamp. A confirmed reset with another seed changed the checksum while retaining stock, money, refund and history invariants.

Injected first-seed failure rolled back all catalog/history/control records; rerun succeeded. Injected reset failure restored the previous complete dataset and checksum. Changed configuration or edited records caused refusal without overwrite. Tests verify non-overlapping periods, deliberate unknown-cost gaps, inventory caps, archived-history retention and directional elasticity/seasonality/promotion differences.

`DemoNormalSafetyIT` retained preexisting normal catalog and metadata while testing misdirected demo seed/reset startup. Guards validate exclusive profile/mode, actual database/role, non-superuser status, administrator-owned read-only marker and explicit reset token. The marker update permission was rejected by PostgreSQL itself. Startup in demo mode without an explicit command left business tables empty. These safeguards protect ordinary normal configuration; a database administrator can intentionally alter provisioning, so this is not an authorization boundary against hostile administrators.

Normal data stays on port 5433; demo has separate Compose project, volume, role and database on 5434. No normal volume was removed or reset. Local demo passwords are ignored and were not committed. No destructive HTTP endpoint exists.

## Observed default output

Version `demo-v1`, seed `20250101`, dates **2025-01-01 through 2025-12-31**, currency MAD:

| Records | Count |
| --- | ---: |
| Categories / products / variants | 5 / 30 / 30 |
| Orders / order lines | 9,466 / 9,466 |
| Refunds | 114 |
| Listed-price / cost / inventory observations | 117 / 57 / 9,870 |
| Unknown-cost lines | 286 |
| Observed variant/dates without sales | 404 |

SHA-256: `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`.

See [exact commands, all ten scenarios, latent formula and assumptions](demo-data.md). One order aggregates a variant/day, with one variant per product. Sparse variants deliberately lack complete observations. Latent demand is private generator truth; observed units are rounded and inventory-capped. This dataset is a bounded test fixture, not evidence of actual business elasticity or recommendation quality.

## Browser checks

The Browser plugin was unavailable; Playwright CLI fallback exercised the running real Angular/API applications. Desktop 1280×900 and mobile 390×844 were checked. The synthetic badge and dataset state appeared, actual 30-product pages navigated, product detail opened and price history showed four DEMO verified periods. Inventory pagination reached observed zero-stock rows (`KNOWN_STOCKOUT`). Sales orders showed 9,466 records and immutable order detail exposed DEMO provenance, monetary snapshots and historical cost provenance. Mobile badge wrapped visibly, with no document horizontal overflow on history/order detail. Existing narrow history table columns still wrap densely on mobile; this milestone preserves those existing screens.

Environment request failure was deliberately injected: an unverified warning/retry appeared, and retry restored the real demo indicator. The normal workspace showed no synthetic badge and its actual empty product list. Its health request was deliberately aborted: Backend unavailable appeared, and Check again restored Connected. Console inspection before injection showed only Angular development notices; the injected network aborts produced expected errors. No seeded business records were edited during browser QA. Screenshots and browser artifacts are outside the repository.

## Resolved failures and deviations

An initial full atomic seed exceeded PostgreSQL shared lock memory with one transaction-scoped advisory lock per source key. Replaced this with 1,024 deterministic lock stripes, preserving exact unique-key/fingerprint checks. The final integration run proves the full dataset seeds without PostgreSQL memory configuration changes.

An earlier suite run completed the demo test but failed Spring test configuration discovery in a subsequent fixture. Explicit application classes and context cleanup resolved it; the final full suite passed sequentially. Browser assertions initially used incorrect text (`Order snapshot` and `No products yet`); snapshots confirmed the actual immutable order title and `No products found`/zero count. These were locator corrections, not application failures. Frontend tests and production build were rerun successfully after correcting stale overview copy that listed demo seeding as future work.

No V4 was added because business schema V1–V3 already fits the data; isolated control metadata is provisioned only by the demo container bootstrap. Atomic service reuse intentionally favors domain correctness over raw bulk-import speed: the large integration fixture took approximately seven minutes, and full verification nine minutes. No required automated tests were skipped and no known functional blocker remains. Local conventional commits only; nothing pushed. Commit IDs are recorded in the completion report and Git log.
