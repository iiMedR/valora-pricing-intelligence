# Recommendation quality and model validation

Milestone 10.5 adds controlled observational elasticity diagnostics and explicit evaluation snapshots. It does not prove causal price response or business uplift. Permanent demo data and V1–V5 are unchanged. The preimplementation plan is [milestone-10-5-plan.md](milestone-10-5-plan.md).

## Observation and baseline audit

`DemandRepository` aggregates completed immutable order lines by variant/UTC placement day, with unit-weighted realized net price; refunds are separate returned units, never negative demand. No-sale dates need an effective VERIFIED_CHANGE listed price. The latest trusted stock observation at/before UTC day start must be <=24 hours old. Unknown/inferred/stale stock and possible sell-through/stockout dates are excluded from elasticity. Zero eligible sales blocks log fitting rather than silently selecting positive outcomes. Current catalog price/cost never fills historical gaps. Transaction/listed discrepancies >2% remain excluded; this is not an authoritative promotion flag. Outliers above four times the positive eligible median remain excluded. The database currently has no validated dated promotion labels; no latent promotion variable is invented.

The old `calendar-log-ols-v1` fit used intercept, weekend, two annual sine/cosine harmonics and log relative price. Its test-only frozen implementation is `LegacyDemandModel`; production retains the old calendar-risk calculation to preserve every existing confounding gate. Normalized input observations do not contain demo scenario truth.

`weekday-mean-v1` is unchanged: recent 56-day availability-conditional observed-sales weekday means, 28 eligible days minimum, weekday fallback to trailing overall mean. Predictions do not use the elasticity coefficient. Chronological backtests recompute selection/medians from each prefix, never supply future prices, and disclose constrained/unknown held-out sales. MAE/WAPE/bias measure forecasting of observed sales, not recovery of latent demand or identification of price response.

## Controlled specification and eligibility

New model version: `weekday-season-trend-qr-v2`:

`log(units_t) = intercept + beta*log(price_t / first_eligible_price) + six_weekday_indicators + a1*sin(phase) + b1*cos(phase) + a2*sin(2*phase) + b2*cos(2*phase) + gamma*(days_since_first_eligible/365.2425 - .5) + error_t`.

Sunday is the weekday reference; phase is `2*pi*(dayOfYear-1)/365.2425`. There are 13 coefficients. The fixed specification has no feature search, regularization, random initialization or future observations. Two-pass modified Gram–Schmidt QR avoids normal-equation inversion. Rank tolerance retains the configured 1e-8*sqrt(n) absolute pivot threshold. A minimum 130 eligible positive observations (10 per coefficient) strengthens the prior 90-day floor; limited/rank-deficient data falls back rather than dropping controls until a result appears.

The final QR price column is price residualized on all controls. Report its log SD and `R² = 1 - residual_price_sum_squares / centered_price_sum_squares`, plus residual degrees of freedom. Residual SD <.03 (roughly 3% independent price movement) blocks coefficient authority, even when raw spread passes. Calendar R² >.95 blocks the estimate; >.70 adds risk and blocks optimization. For these risk decisions use the maximum of legacy and new controlled calendar R², preserving existing abstentions. R² thresholds are conservative engineering gates, not statistical significance tests or universal identification guarantees. See [NIST regression diagnostics](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/regrdiag.htm) on coefficient instability under dependent predictors. Residual variation is necessary, not proof of exogeneity.

All prior gates remain: >=3 prices/15% spread; unknown/censored share limits; zero/discrepancy/outlier selection; finite negative beta with abs<=5; log RMSE<=.35. Optimization still requires >=180 eligible days/80% coverage, <=10% unknown/5% censored, no problematic selections, two acceptable chronological backtests, <=.25 prefix coefficient drift, matching recent reference prices, authoritative dated price/cost, fresh trusted positive stock, active catalog and profitable supported constrained price grid. Forecast accuracy cannot override these tests. Numerical optimizer/objective/grid remain unchanged.

Identification statuses: `NOT_ESTIMABLE`, `WEAK_PRICE_IDENTIFICATION`, `CONDITIONAL_ASSOCIATION_ONLY`. The last is not a causal certificate. Partial controls, endogenous pricing, omitted marketing/product/competitor factors and nonstationarity remain threats. Current data cannot distinguish every seasonal monthly shock. Known promotion controls are unavailable; discrepancy exclusion remains the safe baseline. Stronger claims need defensible exogenous variation or a separately approved experimental design; no merchant experiment is implemented.

## Uncertainty

All scientific interval fields remain null, with `UNCERTAINTY_UNAVAILABLE` and `NO_CALIBRATED_INTERVAL`. No IID regression interval is constructed from autocorrelated daily aggregates. No blocked-bootstrap coverage calibration has been completed, so coverage is **not measured**. The five synthetic seeds below assess point-estimate recovery/stability only; they do not validate interval coverage. RMSE, residual price SD and prefix drift are diagnostics, not uncertainty bounds. Calibrated uncertainty and unobserved-promotion identification remain follow-up research, not delivered guarantees.

## Independent experimental-v1 benchmark

Test fixture is separate from the permanent demo. Seeds 41–45, 365 dates from 2025-01-01, prices randomly selected from 80/100/120 independently of season, Gaussian log-noise SD .03, rounded positive units. Generating log-demand has base log(200), known beta, annual sine amplitude .3, linear trend .15/year, Monday effect .3. Seasonal fixture also has a Monday price policy (x1.12), allowing the richer weekday controls to be challenged without correlating randomized prices with seasonal demand. Truth is used only in tests. No fixture is inserted into a permanent database.

Absolute coefficient error <=.12 across all five seeds was declared in the written plan before evaluation, allowing rounding/noise and finite-sample error, not fitted after outcomes. Seasonal error must also beat the frozen baseline for each seed. Full seed rows are in [recommendation-quality-benchmark.csv](recommendation-quality-benchmark.csv). Bounds below are observed ranges, **not confidence intervals**.

| Independent scenario     | Truth | Old estimates, seeds41–45 | New estimates    | New absolute error range | Identification / recommendation                                                                                   |
| ------------------------ | ----: | ------------------------- | ---------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| High                     |  -2.6 | -2.682 to -2.547          | -2.607 to -2.583 | .0021–.0167              | Conditional association; no automatic eligibility, full optimizer gates still required                            |
| Low                      |  -.25 | -.332 to -.197            | -.258 to -.235   | .0027–.0151              | Same                                                                                                              |
| Seasonal independent     |  -1.1 | -1.042 to -.921           | -1.108 to -1.085 | .0023–.0149              | Same; beats old error on every seed                                                                               |
| Seasonal confounded      |  -1.1 | null                      | null             | unavailable              | Calendar price R²~1, residual SD~0; withheld                                                                      |
| Promotion discrepancy    |  -1.1 | -1.070459                 | -1.101615        | .001615                  | Association fits retained dates, but DIAGNOSTIC_ONLY from excluded promotion/coverage/backtest/reference evidence |
| Heavy stockout censoring |  -1.1 | null                      | null             | unavailable              | Half observations censored; withheld, no imputation                                                               |
| Constant price           |  -1.1 | null                      | null             | unavailable              | No variation; withheld                                                                                            |
| Sparse 40-day prefix     |  -1.1 | null                      | null             | unavailable              | Insufficient sample; withheld                                                                                     |
| Zero demand              |  -1.1 | null                      | null             | unavailable              | Zero-selection/no positive forecast; withheld                                                                     |

Independent random-price fixtures need not pass optimizer reference-price/backtest gates. The existing separate PostgreSQL supported fixture still demonstrates ACTIONABLE constrained price90 with p0=100, historical cost40, e approximately -2; its recent reference period supports the baseline. The analytical oracle remains80 for c40/e-2 with wide bounds. These are distinct numerical/eligibility checks, not permanent-demo recommendations.

## Permanent demo comparison (replica1, full2025)

| Scenario            | Truth |       Old |       New | New absolute error | Eligible samples | Identification / reason                               |
| ------------------- | ----: | --------: | --------: | -----------------: | ---------------: | ----------------------------------------------------- |
| High                |  -2.6 | -2.692563 | -2.690379 |            .090379 |              365 | Weak/calendar risk; withheld                          |
| Low                 |  -.25 |  -.199629 |  -.185952 |            .064048 |              365 | Weak/calendar risk; slightly worse recovery, withheld |
| Seasonal            |  -1.1 |  -.531116 |  -.567078 |            .532922 |              365 | Weak/calendar risk; remains poor, withheld            |
| Promotion           |  -1.2 | -1.244189 | -1.244575 |            .044575 |              281 | Weak/calendar and discrepancy selection; withheld     |
| Stockout            |  -1.4 | -1.250901 | -1.244600 |            .155400 |              330 | Weak/calendar and censoring; slightly worse, withheld |
| Sparse              |   -.9 |      null |      null |                  — |                3 | Insufficient history/unknown inventory                |
| Refund              |   -.8 |  -.744336 |  -.741523 |            .058477 |              365 | Weak/calendar risk; slightly worse, withheld          |
| Cost-change/unknown |    -1 |  -.921772 |  -.917493 |            .082507 |              365 | Weak/calendar risk; gaps retain missing-cost gate     |
| Archive             |   -.7 |      null |      null |                  — |              304 | Current inactivity/zero selection; withheld           |
| Zero-sales          |  -1.2 |      null |      null |                  — |              312 | Zero selection; withheld                              |

Quarterly demo prices have controlled calendar R² .817493, residual log-price SD .045881, df352 for complete scenarios. Promotion/censored subsets have R² .811369/.818154. Independent fixture R² ranges .009830–.118953, residual SD .162655–.168906. Thus extra controls do not cure the demo's calendar price policy or monthly seasonal misspecification. All 30 actual API evaluations still abstain:21 DIAGNOSTIC_ONLY,3 MISSING_PRICE,3 UNRELIABLE_ELASTICITY,3 INACTIVE_VARIANT. Per-variant actual API evidence is recorded in [permanent-demo-model-evaluations.csv](permanent-demo-model-evaluations.csv). No claim of universal improvement: several permanent-demo estimates are slightly worse. Actual seasonal 7-day backtests remain EVALUATED: Dec18–25 model MAE1.910714 versus naive2.058673, WAPE19.962687%; Dec25–Jan1 model MAE1.196429 versus naive1.548469, WAPE12.5%. Both held-out folds have0 censored/unknown dates. These useful observed-sales forecasts still do not identify price response.

## Explicit evaluation audits

V6 adds only `model_evaluation_audit` plus an index and append-only trigger (UPDATE/DELETE/TRUNCATE refused). No business data backfill or FK cascade; variant UUID is retained as identity even if domain retention changes. Every row stores first evaluation timestamp, model version, canonical typed forecast/optimization configuration, SHA-256 fingerprint, sanitized complete evaluation JSON (window, inputs/provenance, eligibility/reasons, diagnostics, estimates, nullable uncertainty and allowed candidate) and outcome status `NOT_MEASURED`. Credentials/provider payloads are absent. This is application/database append-only protection, not tamper-proof storage against a database administrator.

- `POST /api/v1/optimization/variants/{id}/evaluations?startDate=2025-01-01&endDate=2026-01-01&horizonDays=7`: explicit save, normal ADMIN session + existing XSRF cookie/header required. Empty body. Demo403. Returns saved snapshot200, including deduplicated first timestamp/UUID.
- `GET /api/v1/optimization/variants/{id}/evaluations?page=0&size=5`: bounded history (size1–10/page0–100000), stable descending timestamp/UUID. Normal ADMIN; demo anonymous read-only and empty. Unknown UUID404, malformed parameters400.

Fingerprint covers canonical serialized daily inputs/identity/window, market inputs, horizon and config/version. Same fingerprint deduplicates; changed window/data/policy/config creates a separate record. All data reads and insert share repeatable-read. Concurrent conflicting saves may return the existing safe409/retry contract; retry deduplicates. GET never writes. The Angular history button explicitly requests a bounded page, with empty/loading/error/retry and previous/next controls; no save button or automatic save is added. Existing recommendation GETs retain their contract plus additive elasticity identification metadata.

History is evaluation evidence, not realized sales/profit/outcome linkage. No uplift attribution is measured. Retention/archival is not automated; exact duplicates are bounded by uniqueness, growth requires explicit distinct authenticated saves. Operational archival needs a separately reviewed policy. Fingerprints detect changed inputs; replay still requires retaining source event history and the referenced model/config version. Late-arriving historical events can change later evaluations; saved snapshots are not overwritten.

## Reproduce and run

From backend: `.\mvnw.cmd test '-Dtest=IdentificationBenchmarkTest,DemandModelTest,ContributionOptimizerTest,OptimizationGateTest'` prints BENCHMARK/PERMANENT_BENCHMARK/BENCHMARK_BLOCKED rows. Full `.\mvnw.cmd verify` includes PostgreSQL migrations, actual HTTP sessions/CSRF and independent supported fixture. From frontend: `npm.cmd test -- --watch=false`, `npm.cmd run build`. No new dependencies or npm ci needed.

Existing local startup commands and ports remain: normal5433/8080/4200, demo5434/8081/4201. Normal startup automatically applies forward V6; demo startup does likewise using existing isolated credentials. Do not reseed/reset. On Forecasting/Pricing Recommendations select Full2025 to inspect permanent historical demo. Loading diagnostics/history is read-only. Live Shopify remains LIVE_SHOPIFY_NOT_VERIFIED; credentials are not required for this milestone.

See [milestone-10-5-verification.md](milestone-10-5-verification.md) for executed evidence and remaining limitations. Stop before Milestone11/12, deployment, experiments and price writes.
