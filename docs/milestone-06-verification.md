# Milestone 06 — demand estimation and forecasting verification

Implemented on 2026-11-12 in existing `codex/milestone-01`, starting clean at `bccc300`. No data reset, generator change, price change, schema migration, model persistence, optimization, authentication, Shopify, tenancy, deployment or remote push.

## Implementation paths

- `backend/src/main/java/com/smartpricing/forecasting/dto/ForecastDtos.java`: typed windows, identities, daily exclusions, readiness, nullable association/forecast and chronological fold DTOs.
- `forecasting/repository/DemandRepository.java`: bounded batched daily SQL using completed order/line and separately aggregated return quantities, effective listed prices and as-of inventory; stable current catalog identity/page lookup. No current cost predictor, generator parameters or truth tables.
- `forecasting/service/ForecastSettings.java`: validated typed thresholds; `DemandModel.java`: pure guarded calendar log-OLS, recent weekday baseline, prefix-only backtesting; `ForecastService.java`: read-only repeatable-read orchestration and validation.
- `forecasting/controller/ForecastController.java`: GET overview plus variant readiness, elasticity, demand and backtest under `/api/v1/forecasting`.
- `backend/src/test/java/com/smartpricing/forecasting/{DemandModelTest,ForecastApiIT}.java` and extended `demo/DemoSeederIT.java`: synthetic truth, stock/price/refund semantics, leakage, actual PostgreSQL and checksum-preserving runtime queries.
- `frontend/src/app/features/forecasting/{forecast-api.service.ts,forecasting.ts,forecasting.html,forecasting.css,forecasting.spec.ts}`: searchable/paginated variants, window/horizon controls, ready/baseline/insufficient diagnostics, observed/forecast chart with censored markers, exact tables, backtests and existing history link. Shell/routes/home add navigation/copy.
- README, development/architecture, [forecasting.md](forecasting.md) and this report.

Stack unchanged: JDK 21.0.11, Spring Boot 3.5.16, Angular 22.2.6, Node 24.22.1/npm 11.19.1, PostgreSQL 17.7. No dependency/lockfile change, so no npm ci was necessary.

## Semantics and methods

See [complete model/API contract](forecasting.md). Gross units use completed order placement, not refunds or net merchandise accounting. Refund quantities retain refund-date lineage separately. Realized price is unit-weighted after discounts; zero-sale days require authoritative listed history. Inventory must be recent and observed at/before day start, with no future fill. Unknown/censored days are excluded, not called zero demand. Missing dates remain explicit calendar rows. A trusted beginning-of-day snapshot does not prove all-day availability.

Default baseline: 56-day weekday mean with at least 28 eligible recent days and three samples per weekday before falling back to overall mean. Includes genuine in-stock zeros. Forecasts are observed-sales baselines conditional on availability, not latent demand. Latest authoritative listed price is an explicitly constant assumption, with no price-response adjustment. Archived history remains queryable; current archival suppresses future forecast. No calibrated intervals are claimed.

Elasticity: log units on log price ratio, weekend indicator and two annual Fourier harmonics; reorthogonalized QR, minimum 90 fit days, 3 prices, 15% spread, maximum 20% unknown/censored days, no otherwise-eligible zero days, 2% discrepancy exclusion, outlier factor 4, maximum log RMSE .35, maximum absolute beta 5, rank tolerance 1e-8. Positive/invalid/unstable fits are unavailable rather than clamped. Daily observations are aggregates, not independent customers; no IID confidence interval or causal claim. Guard thresholds are typed settings, not generator-informed runtime rules.

## Demo evaluation — actual replica 1 results

Ground truth was read only by tests from existing generator definitions/docs. Runtime estimates came from persisted domain APIs; test-generated series independently gave the same estimates. Absolute tolerances **0.35** high and **0.20** low were used for identifiable cases: bounded 10% multiplicative noise plus integer rounding, limited price regimes and calendar correlation justify modest absolute error tolerance, not a formal confidence interval. Both passed; no tolerance was weakened to obtain a pass.

| Existing scenario | Truth | Estimated association | State / limitation |
| --- | ---: | ---: | --- |
| ELASTIC_HIGH | -2.6 | -2.692563 | READY, calendar confounding risk |
| ELASTIC_LOW | -0.25 | -0.199629 | READY, low signal, same risk |
| SEASONAL | -1.1 | -0.531116 | READY observational association with confounding warning; **poor truth recovery** |
| PROMOTION | -1.2 | -1.244189 | READY; discrepant-price days excluded, no invented promotion label |
| STOCKOUT | -1.4 | -1.250901 | READY; censored days excluded, not latent-demand validation |
| SPARSE | -0.9 | unavailable | INSUFFICIENT_DATA; unknown inventory, few eligible days/prices |
| REFUND | -0.8 | -0.744336 | READY; returns do not subtract demand |
| COST_CHANGE_UNKNOWN | -1.0 | -0.921772 | READY; costs not used |
| ARCHIVE | -0.7 | unavailable | BASELINE_ONLY historical diagnostics; current archival prevents forecast |
| ZERO_SALES | -1.2 | unavailable | BASELINE_ONLY forecast; ZERO_SALES_SELECTION |

Seasonal recovery misses truth by ~0.569: smooth calendar controls cannot disentangle every monthly shift from quarterly prices. We disclose this limitation rather than claim causal recovery. Every estimate carries OBSERVATIONAL_ASSOCIATION, NO_CALIBRATED_INTERVAL and continuity/confounding caveats. Additional pure fixtures deliberately reject constant/low-variation prices, excessive stock censoring/unknown stock and a positive association. Nonpositive prices do not enter log fitting. All outputs are finite nullable JSON values.

Example live seven-day totals: ELASTIC_HIGH 140.6250 units, ELASTIC_LOW 97.8750, ZERO_SALES 67.2500. Sparse/archived variants return no fabricated total. Roasted Coffee 1's 30-day forecast is 600.3750 units at assumed 83.0000 MAD, not a recommended price or recovered latent-demand prediction.

## Backtest evidence

Two nonoverlapping origins per horizon, end−2h/end−h, prefix-only model preparation including medians/exclusions. Evaluation is gross held-out observed sales including zero/censored/unknown dates, with counts disclosed. No future realized price is passed to the predictor. Event-time retrospective evaluation does not simulate late import arrival.

Actual Roasted Coffee 1, h=7, training end 2026-01-01:

| Held-out UTC range | Observed units | Weekday MAE | Naive MAE | Weekday WAPE | Naive WAPE | Bias |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Dec 18 ≤ date < Dec 25 | 140 | .714286 | 1.775510 | 3.571429% | 8.877551% | .142857 |
| Dec 25 ≤ date < Jan 1 | 144 | .589286 | 2.038265 | 2.864583% | 9.908234% | -.482143 |

These two recent folds do not establish year-round superiority, latent-demand accuracy or future coverage. WAPE is null for all-zero actuals. Tests verify two h=14 folds and zero-denominator behavior. A pure fixture changes all future prices/units/stock while earlier-cutoff predictions stay identical. A PostgreSQL fixture appends future authoritative price, stock and sales events: the earlier as-of forecast, assumption and daily outputs remain exactly equal.

## Automated checks

Final full verification finished **14:41:15 UTC**, BUILD SUCCESS in **9:21**: **53 unit + 21 PostgreSQL integration tests**, zero failures/errors/skips. All prior catalog/history/analytics/migration/demo checks passed, including independent reproducible demo databases and forecasting checksum preservation.

| Executed command/check | Actual result |
| --- | --- |
| `backend/mvnw.cmd verify` | BUILD SUCCESS; 53 unit + 21 integration tests, zero failures/errors/skips |
| `backend/mvnw.cmd test` | 53 tests passed |
| `backend/mvnw.cmd verify -Dit.test=ForecastApiIT` | BUILD SUCCESS; 53 unit + 3 focused PostgreSQL tests |
| `npm.cmd test -- --watch=false` | 38 tests / 15 suites passed, including 6 forecasting tests |
| `npm.cmd run build` | Angular production build passed; rerun after final as-of/caveat copy |
| `git diff --check` | Passed |
| Runtime forecasting source search for demo imports/truth reads | None |
| `scripts/demo.ps1 summary` | BUILD SUCCESS at 14:42:56 UTC; matchesSeed true, original checksum |

PostgreSQL fixtures cover actual V1–V3, multiple lines/orders per UTC date, post-discount weighted price, refund in later period, unpaid exclusion, zero/missing/uncertain stock and sell-through censoring, historical price boundaries, future-event leakage, archived retention, empty normal catalog, invalid horizons/windows/pagination and unknown IDs. Extended permanent-demo integration queries overview/detail/backtest, requires eligible high/low and unavailable sparse/zero elasticity, then verifies original checksum. Existing analytics/catalog/history/migration/demo safety regressions remain in full verify.

Frontend tests cover loading, ready association, baseline-only/unavailable elasticity, insufficient forecast without fake values, empty normal data, horizon switching/shared UTC filters, pagination/search, stale-response cancellation, backend error/retry, invalid date windows and accessible chart/text table. Existing global synthetic indicator and health tests remain passing.

## Browser QA and isolation

Browser plugin unavailable; used established Playwright CLI fallback, screenshots outside repository. Demo `http://localhost:4201/forecasting` and normal `http://localhost:4200/forecasting`, desktop 1440×1050 and mobile 390×844. Identity/content/no framework overlay passed. Real demo search/selection, 14/30-day switching and exact forecast totals worked. Sparse INSUFFICIENT_DATA and ZERO_SALES BASELINE_ONLY were observed. Mobile tables are labeled/focusable scroll regions; no page overflow. Date window/forecast start and no calibrated interval are visible. Synthetic banner retained; normal has no synthetic badge, no variants and no fabricated chart.

Normal overview request was deliberately aborted: error/retry restored the actual empty response. Existing health Connected → injected unavailable → Check again → Connected passed. Analytics Full 2025, product detail, four-period price history, Sales orders and immutable order detail regressions were exercised read-only. Console checks before injection showed zero errors/warnings; deliberate network aborts are expected errors only. One UI assertion initially expected baseline availability after a hot reload restored the last-365-days window; selecting Full 2025 restored the intended historical test window. This was corrected test setup, not fabricated data or a model change.

Normal PostgreSQL remains 5433/API8080/UI4200; isolated demo remains 5434/8081/4201. No reset/reseed/init was used for model evaluation. No V4; V1–V3 unchanged. Runtime copy restarts preserve stored data. Checksum and final normal counts are recorded below after final checks.

Final live checks after restarting the current build: both Actuator health endpoints UP. Normal data remains **0 products / 0 orders**, matching baseline, and Flyway 1/2/3 all successful. Demo summary confirms `matchesSeed: true`, unchanged SHA-256 **6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34**. Migrations have no diff against baseline. Local credentials/logs/runtime artifacts remain Git-ignored.

Status examples from actual APIs: Roasted Coffee 1 elasticity READY with estimate −2.692563 and seven-day total `"140.6250"`; Desk Pen Set 1 BASELINE_ONLY with null elasticity and `"67.2500"` units; Travel Organizer 1 INSUFFICIENT_DATA with null estimate/total and empty forecast daily list; empty normal overview results content `[]`, no fabricated values. Exact endpoint shapes/parameters are documented in forecasting.md.

## Resolved issues, limitations and delivery

The initial PostgreSQL test fixture reused stale variant version 0 for a second open price event; existing optimistic protection correctly refused it. The fixture now obtains the current version. No domain rule was weakened. The first focused rerun passed. No required test was skipped. Historical event-time backtesting, simple short-horizon baseline, absent calibrated intervals, snapshot availability assumptions and poor seasonal truth recovery remain documented scientific/data limitations. Runtime does not classify scenario SKUs or consume generator truth to hide these limitations.

Existing startup commands remain: `scripts/demo.ps1 serve`, then `npm.cmd run start:demo` in frontend, open `/forecasting`, select Full 2025 for existing historical demo data. Normal startup remains in README. No additional package or infrastructure setup needed. Suggested package names adapted to existing controller/service/repository/dto conventions. Optional hypothetical pricing is intentionally omitted. Milestone 06 meets the requested acceptance criteria with the stated scientific/data limitations, and is ready for user review before Prompt 07. No claim of scientifically validated causal elasticity. No later milestone implemented.

Local conventional commit hashes/messages are reported in the completion report/Git log. No push, remote creation, history rewrite or Git identity change occurred. Final working tree clean after documentation commit.
