# Milestone 05 — business analytics verification

Implemented 2026-11-12 on `codex/milestone-01`, from clean Milestone 04 commit `0c65e51`. Scope is read-only observed business reporting. No forecasting, recommendations, authentication, Shopify, tenancy, deployment or pushes.

## Changed paths and contracts

- `backend/src/main/java/com/smartpricing/analytics/controller/AnalyticsController.java`: five GET endpoints: overview, trends, products, product variants and inventory under `/api/v1/analytics`.
- `analytics/dto/AnalyticsDtos.java`: typed metadata, decimal-string metrics, paginated performance and inventory observations.
- `analytics/service/{AnalyticsService,AnalyticsRules}.java`: bounded UTC date ranges, repeatable-read/read-only orchestration, exact decimal arithmetic, undefined ratios and cost-coverage semantics.
- `analytics/repository/AnalyticsRepository.java`: independent sale/refund aggregate branches; stable-ID performance grouping and indexed latest-observation lookups, with bounded outputs and no domain mutations or generator metadata reads.
- `backend/src/test/java/com/smartpricing/analytics/{AnalyticsRulesTest,AnalyticsApiIT}.java`: metric and real PostgreSQL fixtures. `demo/DemoSeederIT.java` additionally queries demo analytics, reconciles monthly net sales and verifies the unchanged seed checksum.
- `frontend/src/app/features/analytics/{analytics.ts,analytics.html,analytics.css,analytics-api.service.ts,analytics.spec.ts}`: UTC filters/presets, exact money display, eight KPI cards, accessible net-sales SVG and exact table, searchable/sortable/paginated products, variant/history drill-down and inventory freshness. Existing shell/routes/home add navigation/copy. No chart library or dependency changes.
- README, architecture/development documentation and [analytics.md](analytics.md) contain startup and complete accounting/API contracts.

## Accounting decisions and limitations

Completed orders count once at placement, gross sales use post-discount immutable line_net, and shipping/tax are excluded. Merchandise refunds count once in their own refund period even for earlier sales; net periods may be negative. AOV is explicitly gross AOV. Cost coverage is sales-line based, with separate known-refund event coverage. Contribution and margin use the same immutable cost-known event population, never current cost or zero-substituted unknowns.

The model does not establish recovered resale value for returned units, so contribution is deliberately labeled **before return cost recovery**. No returned-unit cost credit is invented. It excludes unknown-cost transactions and overhead/fees and is not full-business profit. Null means undefined/unavailable; known zero remains zero. Inventory is observed strictly before selected reporting end, independently marked stale after 24 hours, and does not prove continuous stockouts or lost demand. Single configured currency is enforced. Browser Number is used only for approximate chart coordinates; visible monetary strings preserve four-place precision.

No V4 is needed. V1–V3 are unchanged byte-for-byte against baseline. No durable analytics table or cache is added. Endpoint requests are individually consistent snapshots; ingestion between separate dashboard requests can change their respective snapshots. Current catalog labels/statuses are identified as current; transaction snapshots remain available in order/history detail.

## Executed automated checks

Final full backend verification finished at **14:10:57 UTC**, BUILD SUCCESS in **8:44**: **48 unit + 18 PostgreSQL integration tests**, zero failures/errors/skips. All acceptance criteria passed within the explicitly documented accounting limitations below.

| Command | Observed result |
| --- | --- |
| `backend/mvnw.cmd verify` | BUILD SUCCESS; 48 unit + 18 integration tests, zero failures/errors/skips; actual PostgreSQL 17.7, all fresh/upgrade/retention and demo safety checks passed |
| `backend/mvnw.cmd verify -Dit.test=AnalyticsApiIT` | BUILD SUCCESS; 48 unit tests and 3 focused PostgreSQL tests, no failures/errors/skips |
| `npm.cmd test -- --watch=false` | 32 tests / 14 suites passed, including 7 analytics tests; rerun after formatting/copy changes |
| `npm.cmd run build` | Angular production build passed; final run finished 14:08:27 UTC |
| `scripts/demo.ps1 summary` | BUILD SUCCESS; matchesSeed true and original checksum, 14:11:47 UTC |
| `scripts/demo.ps1 seed` | BUILD SUCCESS; idempotent existing dataset returned unchanged, 14:12:02 UTC |
| `scripts/demo.ps1 reset` without confirmation | Expected refusal before database access; no destructive reset performed |
| `git diff --check` | Passed |
| Migration diff against `0c65e51` | Empty |

Backend fixtures cover multiple lines in one completed order, canceled/unpaid exclusion, exact discounted amounts without shipping/tax, January sale/February partial return and financial adjustment, shipping refund exclusion, original cost winning after later cost-history changes, archived historical inclusion, literal search/pagination, malformed/reversed/overlong ranges, unknown product IDs, currency refusal, zero/unknown/uncertain/stale inventory and an observation exactly at the excluded end boundary. Daily and monthly financial totals reconcile with overview. Existing migration/ingestion/demo tests remain part of full verification.

Frontend tests cover loading, errors/retry, empty/null metrics, unknown stock and cost, archived rows, precise large monetary display, UTC presets across offsets, date validation, shared API range filters, pagination/search/sort, variant history links, SVG titles/text-equivalent table, and canceling superseded requests.

## Live demo and isolation evidence

The existing demo on 5434 was queried through the real 8081 API and Angular proxy on 4201. Full 2025 actual overview:

| Metric | Actual value |
| --- | ---: |
| Gross sales (MAD) | 18,472,476.5400 |
| Merchandise refunds (MAD) | 7,730.7000 |
| Net sales (MAD) | 18,464,745.8400 |
| Orders | 9,466 |
| Units sold / returned | 136,995 / 78 |
| Gross AOV (MAD) | 1,951.4554 |
| Known contribution before return recovery (MAD) | 10,068,364.3250 |
| Known contribution margin | 56.3245% |
| Sales-line cost coverage | 9,180 / 9,466 = 96.9787% (PARTIAL) |

The demo summary before/after analytics still reports `matchesSeed: true`, SHA-256 `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`. All original products/orders/refunds/observations and generator definitions remain untouched. Normal 5433 returns zero sales/orders with null AOV/contribution/margin and NO_ACTIVITY; normal mode remains separately configured. No normal/demo reset or initialization was performed for analytics.

Final direct normal PostgreSQL checks confirmed 0 products / 0 orders (unchanged baseline) and Flyway versions 1, 2 and 3 all successful. Actual summary and seed commands returned the same original checksum; reset without its confirmation switch refused immediately. Credentials remain ignored; generated logs/runtime artifacts are untracked/ignored.

## Browser QA

Browser plugin not available; used the existing Playwright CLI workflow and installed browser, with artifacts outside the repository. Flow: `/analytics` → Full 2025 / interval / product search / pagination / archived variant → actual stored financials and historical detail. Target demo URL `http://localhost:4201/analytics`; normal `http://localhost:4200/analytics`.

| Check | Result |
| --- | --- |
| Identity / meaningful content / no framework overlay | Passed; Analytics title, actual metrics, chart and tables |
| Desktop 1440×1050 | Passed; eight KPI cards, readable reporting controls, synthetic banner retained |
| Mobile 390×844 | Passed; no document horizontal overflow, readable cards/filters, dense tables scroll inside labeled keyboard-focusable regions |
| Console before failure injection | Zero errors/warnings; only Angular development notices |
| Presets / trends | Full 2025 actual report; monthly and 365 daily periods rendered with exact-data disclosure |
| Product interactions | Next/previous pages, Classic Notebook search, name sort, all three archived products, variant SKU/history drill-down |
| Inventory | Historical asOf, quantities/observations and three stale sparse variants displayed; zero/unknown/uncertain semantics verified in PostgreSQL/frontend fixtures |
| Empty normal workspace | Zero activity, unavailable ratios, no synthetic badge; mobile overflow check passed |
| Backend error/retry | Deliberately aborted overview request produced error/retry; retry restored real empty normal report |
| Existing health/retry | Connected → deliberately aborted health request → Backend unavailable → Check again → Connected |
| Catalog/orders/history regression | Demo product detail → four-period price history → Sales orders → immutable DEMO order detail passed |

Expected console network errors were produced only by deliberate aborted-request checks; no unexplained application errors. Screenshots were captured and inspected for desktop, mobile cards/chart and drill-down. Browser testing did not mutate business data.

## Issues resolved and deviations

The first focused inventory integration run caught ambiguous PostgreSQL parameter type inference in timestamp-minus-interval subtraction (HTTP 500). Explicit timestamptz casting fixed it; focused regression passed. An initial unit-test compile used a nonexistent unused DTO import; removed it. A frontend fixture tried to flush all forkJoin requests after the first error canceled the others; corrected the fixture to assert the intended cancellation. Browser sort initially used getByLabel where the observed combobox role was reliable; corrected the locator and verified the interaction. These are resolved, not skipped checks.

Suggested package names were adapted to existing controller/service/repository/dto conventions. Inventory uses the same required range parameters and exclusive end asOf instead of introducing a separate timestamp convention. Gross AOV and contribution before return recovery are narrower explicitly labeled metrics permitted by the prompt. Accessible SVG/text tables avoid an unnecessary chart dependency. No npm ci was needed because dependencies/lockfile did not change.

## Local startup and Git

Existing normal startup remains unchanged: PostgreSQL 5433, backend 8080, Angular 4200. Existing demo uses PostgreSQL 5434, `scripts/demo.ps1 serve` (8081), and `npm.cmd run start:demo` from frontend (4201). Open `/analytics`; no seed/reset is required for the already initialized demo. For an intentionally new installation only, follow existing safe `scripts/demo.ps1 init` documentation.

Local commits: `dd75a55` analytics module/contract, `ac7ad56` analytics tests, `da018e3` Angular dashboard; final documentation commit is recorded in Git log/completion report. Nothing pushed; no remote, history or identity changes. No later milestone implemented.
