# Milestone 03 verification

Verdict: **Milestone 03 passed**. Executed 2026-11-12 on Windows, branch `codex/milestone-01`, starting at clean commit `e194547`. Scope stops at Milestone 03.

## Environment and database

Java 21.0.11, Spring Boot 3.5.16, Maven wrapper 3.9.11, PostgreSQL 17.7, Angular/CLI 22.2.6, Node 24.22.1, npm 11.19.1, Docker Desktop 4.92.0 / engine 29.8.0. No new dependencies were added. PostgreSQL stays on host port 5433; the other PostgreSQL service on 5432 is unchanged.

The baseline was confirmed clean with V1/V2 applied. V3 then applied successfully to the existing local database during local-profile startup; Flyway reports versions 1, 2 and 3 successful. V1 and V2 are unchanged. No local volumes were reset and no existing data was deleted. V3 enables btree_gist for exclusion constraints and adds orders, lines, refunds, listed-price periods, cost periods and inventory snapshots without backfilling observations.

## Commands and results

| Command / check | Actual result |
| --- | --- |
| `docker compose -f infra/compose.yaml config --quiet` | PASS. |
| `docker compose -f infra/compose.yaml ps` | PASS: PostgreSQL healthy on 127.0.0.1:5433. |
| Backend `.\mvnw.cmd verify` | PASS: final strict-quantity run, 36 unit + 13 integration tests, no failures/errors/skips. BUILD SUCCESS in 1:55, completed 12:38:23 UTC. |
| Frontend `npm.cmd test -- --watch=false` | PASS: final formatted source, 22 tests / 12 suites, zero failures. |
| Frontend `npm.cmd run build` | PASS: production bundle with lazy history screens, strict TypeScript/templates. |
| Local-profile startup | PASS: V3 applied to the existing local V1/V2 database. |
| `/api/v1/health`, `/actuator/health`, Angular `/api/v1/sales/orders` proxy | PASS: UP and actual paginated empty normal order list. |

The first verification attempt compiled and passed the existing 24 unit tests but Windows prevented JAR repackaging because the running application held target/smartpricing-0.0.1-SNAPSHOT.jar open. Only that SmartPricing process was stopped; subsequent full builds passed. Normal development uses Maven spring-boot:run so packaging is not blocked. No tests were skipped or assertions weakened to hide the limitation. Non-blocking Java/Mockito dynamic-agent warnings remain.

## Automated coverage

Unit coverage includes exact money arithmetic, rejection rather than rounding, overflow, quantity/status semantics, unknown/explicit/effective cost precedence, [from,to) overlap/date checks, zero versus uncertain inventory, canonical payload fingerprints/conflicts, partial return limits, financial-only adjustments, and separate shipping/tax caps. All previous catalog/business/health tests remain in the suite.

PostgreSQL integration coverage includes:

- Fresh V1/V2/V3 migration and dedicated V2-to-V3 upgrade retaining a real catalog row without inventing historical rows. The old V1-to-V2 test remains explicitly pinned to target 2.
- Orders and immutable line snapshots; exact subtotal/discount/net arithmetic; unknown cost instead of today's catalog cost; refunds/replays and net-sales semantics; unpaid exclusion; currency/date/status/source filtering and pagination.
- Same-key concurrent order requests (one 201, other identical requests 200); conflicting payload 409; repeated inventory keys, known-zero/inferred-zero states; no duplicate rows.
- Failed multi-line orders leave no order/line rows; invalid refunds leave no refund rows; an out-of-bounds current-price change rolls back closing the previous authoritative period.
- Authoritative price/cost intervals, replay, SQL exclusion constraints, boundary-time cost lookup, point snapshots that do not change current catalog values, catalog price/cost synchronization, immutable financial DB triggers, restrictive variant deletion, and historical snapshot retention after catalog edits/archive.
- Final strict-quantity test rejects a JSON quantity of 1.5 rather than allowing Jackson to truncate it to 1.

Frontend tests cover API filters/precision/conflicts, list loading/empty/error/retry states, invalid date ranges, manual-order quantity/decimal checks, no duplicate submission, unknown cost/shipping, refund errors and retained input, unknown inventory versus known-zero stock, period-date validation, stale version/retry-key transmission, and the existing catalog/settings/health tests.

## Browser QA

Browser plugin not available; used Playwright CLI with real Angular + Spring Boot + PostgreSQL, without mocked success responses. Normal app is on 4200/8080 with PostgreSQL 5433. A separate disposable test container on 5434 and separate app instances on 8081/4201 kept all synthetic QA fixtures out of normal data. The test container and its app processes were removed after verification.

The primary flow was: variant history → verified listed price/cost → inventory observation → manual order → partial refund → catalog edit/archive → inspect unchanged historical order → order filters.

| Browser check | Evidence / outcome |
| --- | --- |
| Identity / nonblank / framework overlay | PASS: Sales orders, Enter order, Order detail, Variant history and Product detail render at their expected routes/titles without framework overlays. |
| Empty versus known inventory | PASS: initially Inventory unknown; negative quantity blocked; quantity zero saved as a trusted snapshot and shown as `0 · KNOWN_STOCKOUT` after refresh. No continuous stockout period inferred. |
| Price/cost workflow | PASS: recorded verified listed price 12.0000 and effective cost 3.0000 from 2026-10-01; product detail reflects those current values. |
| Manual order | PASS: zero quantity blocked; order qa-order-1 saved with 2 × 10.1234 and 1.0000 allocated discount. Subtotal 20.2468, net 19.2468. Refresh retains the record. |
| Unknown/provenance display | PASS: listed transaction unit price remains Unknown, blank cost resolves from verified effective history to 3.0000/EFFECTIVE_HISTORY, and omitted shipping/tax leave totalCharged unknown. |
| Refund workflow | PASS: quantity 3 rejected against purchased 2, with explicit 409 feedback and form input retained. Quantity 1 / amount 5.0000 succeeds; recognized net becomes 14.2468 and remains after refresh. |
| Catalog/history retention | PASS: later current price 13.0000, cost 5.0000 and name edit append new verified price/cost events. Archive confirmation retains the variant; original order still shows Standard, unit price 10.1234, historical cost 3.0000 and recognized net 14.2468. |
| Filters | PASS: CANCELLED yields empty state; COMPLETED + MANUAL + October date range returns qa-order-1. Multi-page behavior is covered by API tests; one-page controls disable correctly in UI. |
| Console/network | Deliberate over-refund produces expected HTTP 409. Successful workflows have no unexpected runtime/CORS errors or warnings. All observed writes use real 201/200 responses. |
| Responsive layout | PASS: 1280×900 desktop and 390×844 mobile. Form controls/nav/actions wrap; mobile document width equals viewport width (390px). Screenshots reviewed outside Git. |

Screenshots, IDs and CLI logs are stored outside the repository in the session visualization directory. No QA fixtures or browser artifacts are committed.

Final normal-instance checks passed after restart with the verified build: health/Actuator UP, Sales orders route/title and real empty page, zero normal product/order/refund/price/cost/inventory rows, and successful V1/V2/V3 Flyway history. The normal health/retry and catalog navigation were rechecked separately; no unexpected console errors or warnings remain. The application remains running on 4200/8080 with PostgreSQL on 5433.

## Design choices, deviations and deferred work

- Existing module/routing/error/page patterns are reused. The new immutable records use explicit SQL repositories rather than adding mutable JPA entities for historical financial data. The existing JDBC dependency suffices.
- Current catalog monetary edits now append verified change events; they do not backfill older values or modify past order snapshots. Parent/variant activation and archive business rules otherwise remain unchanged and their tests pass.
- Orders/statuses and refunds are immutable; no silent provider reconciliation, arbitrary correction API, or destructive history deletion exists. Source-key conflicts are explicit 409s. A future audited correction/status-transition workflow is required for real-store updates.
- Source labels are provenance, not a completed demo/real-data isolation boundary. Prompt 04 must supply stable source keys and timestamps, reuse stable variant mappings, preserve unknown values, and implement a deliberate demo isolation strategy. Internal IDs/audit timestamps currently reflect first ingestion; no deterministic seeder is implemented.
- No authentication exists yet; all current ingestion APIs are local-development endpoints. Future adapters need authorization plus store-connection key scoping. No fake Shopify connection ID was added.
- Price/cost snapshots are points unless VERIFIED_CHANGE; only verified covering cost periods can populate a missing transaction cost. Listed prices never stand in for realized transaction prices. Inventory is observation-only, without interpolation, sales deduction or restocking.
- Shipping/tax/refunds are separate from merchandise sales; financial-only adjustments have zero returned quantity. No aggregate analytics/profit forecast, optimization, CSV import, webhook, connector, deployment, CI/CD or Prompt 04 functionality was added.

See history.md for every endpoint, payload example, field convention, and future seeder/adapter contracts. See milestone-03-design.md for the implementation plan and actual module boundaries.
