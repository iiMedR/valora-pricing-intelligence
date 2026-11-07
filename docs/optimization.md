# Read-only contribution recommendations

Milestone 10.5 adds an explicit authenticated evaluation-save POST and bounded history GET, backed by append-only V6 metadata. Existing recommendation GETs still never save or apply prices. The objective/grid and safety thresholds below remain unchanged; elasticity now uses controlled model v2 while preserving legacy calendar-risk gates. See [recommendation-quality.md](recommendation-quality.md) for versioning, APIs, uncertainty and reproducible validation.

Recommendation GETs compute on demand and never apply a price or save a snapshot. Existing immutable domain price/cost/order history provides input lineage. Re-evaluation can change after later imports. Only the explicit Milestone 10.5 evaluation POST saves an immutable audit snapshot; its bounded history GET is separate from current recommendation evaluation. Neither measures realized business uplift.

## Objective and grid

For a stated 7/14/30-day horizon, reference price p0, availability-conditional observed-sales baseline q0 and negative observational elasticity e:

`q(p) = q0 × (p/p0)^e`, `sales(p) = min(q(p), fresh observed stock)`, `contribution(p) = (p−c) × sales(p)`.

This is estimated contribution, not net profit or realized uplift. Returns, taxes, shipping, payment/marketing fees, overhead, restocking and changes in future availability are excluded. A single fresh inventory observation caps **the whole horizon**, conservatively assuming no replenishment; it does not prove future availability. Unknown/stale/inferred inventory produces abstention, never unlimited supply. This is not recovered latent demand or causal elasticity.

The actual project price grid is **0.0001** (NUMERIC(19,4)/existing DTOs), including MAD; there is no existing two-decimal ISO minor-unit rule. We preserve that contract instead of silently switching precision. Feasible bounds intersect catalog min/max, price ≥ known effective cost, historical fitted price support, and a configurable ±10% reference-price change limit. Prices must be positive and representable. Empty or break-even-only intervals abstain.

Monetary inputs/comparisons/grid rounding are BigDecimal. Only log/pow and analytic search positions cross a documented double statistical boundary. Reject nonfinite/overflow demand/contribution. For e<−1, candidate stationary price is e*c/(e+1); also evaluate endpoints and the stock-cap kink p0*(stock/q0)^(1/e), each with neighboring grid points. This covers smooth extrema and the cap discontinuity in slope without enumerating enormous grids. For e≥−1 there is no positive interior maximum; endpoints/kink suffice. Compare unrounded model contributions and deterministically prefer lower price on an exact tie; display money and expected units with four-place HALF_UP rounding. Uplift percent is null if reference contribution ≤0. No improvement is promised.

The statistical response retains floating-point approximation; exact BigDecimal inputs do not make inferred demand scientifically exact. Outputs beyond 1e30 expected units or absolute contribution are rejected. Representative grid optima, cap kinks and small exhaustive intervals are tested; this is not a claim of arbitrary-precision transcendental optimization for extreme price/demand scales.

## Evidence gate

M06 READY is necessary but not sufficient. Default typed `app.optimization` settings require ≥180 eligible days, ≥80% eligible coverage, ≤10% unknown days, ≤5% censored days, no zero-selection/discrepancy/outlier candidates, and a finite negative M06 estimate with three fitted prices and ≥15% spread (M06 gate). **Any PRICE_CALENDAR_CONFOUNDING_RISK or PRICE_CALENDAR_COLLINEARITY blocks actionability**. This generic rule blocks the known weak seasonal case without SKU/truth logic. It also conservatively blocks the permanent demo's high/low quarterly-price cases despite their good test-only recovery.

Require two EVALUATED chronological M06 backtest folds, WAPE ≤30%, model MAE no worse than 1.10×naive MAE (zero/zero passes), no censored/unknown held-out dates. Refit M06 after removing the last 28 days: elasticity must remain available and differ by at most the configurable 0.25 absolute coefficient threshold. Forecast accuracy alone never certifies price response. Require the exact M06 eligible baseline-training prices (respecting its configured lookback) all within 2% of p0, a matching forecast assumed price, positive q0, and current ACTIVE parent/variant. Inputs must be finite, current and mutually consistent. Reasons retain all detected blockers, with one deterministic primary status.

Effective price/cost are VERIFIED_CHANGE periods covering the evaluation instant, **exclusive endDate minus one PostgreSQL microsecond**; never mutable catalog cost or stale prior closed periods. Maximum authoritative event ages are 120 days for price and 210 days for cost, configurable; latest stock must be trusted, positive and ≤24 hours old at that instant. Prices/costs carry event timestamps and provenance. Historical evaluation is explicitly retrospective using event time (not late import arrival); current catalog bounds/statuses are current labels, not reconstructed historical policies.

Statuses: ACTIONABLE (all gates pass; still conditional observational scenario), DIAGNOSTIC_ONLY (calendar confounding, inventory/price-alignment or other caution), INSUFFICIENT_DATA (M06 insufficient), UNRELIABLE_ELASTICITY (baseline-only, missing/unstable/nonnegative estimate), MISSING_COST (missing/stale applicable authoritative cost), MISSING_PRICE (missing/stale authoritative price), INACTIVE_VARIANT (either current catalog status inactive), INVALID_CONSTRAINTS (empty/invalid/break-even-only feasible interval), UNAVAILABLE_FORECAST (no positive usable baseline). For all abstentions recommendation/comparison/uplift/sensitivity fields are null/empty, not an unsafe candidate dressed as advice. Primary status precedence is inactive → missing price → missing cost → insufficient → unreliable → invalid constraints → forecast → diagnostic blockers. Every reason is shown. Scientific uncertainty is not a calibrated interval; none is invented.

Stable reason codes explain missing/stale events, calendar confounding (`SEASONAL_OR_CALENDAR_CONFOUNDING`), poor coverage/censoring, unsupported price reference, backtest quality, unavailable baseline, missing/stale stock, constraints and numeric failures. Assumptions explicitly list the observed-sales target, no future restocking, expense exclusions, event-time scope, no causal proof and no calibrated interval.

| Reason code | Meaning |
| --- | --- |
| CURRENT_CATALOG_INACTIVE | Parent or variant currently archived/inactive |
| MISSING_OR_STALE_EFFECTIVE_PRICE / MISSING_OR_STALE_EFFECTIVE_COST | No qualifying authoritative current period or event too old |
| INSUFFICIENT_DEMAND_EVIDENCE / ELASTICITY_NOT_TRUSTWORTHY | M06 insufficient/baseline-only or invalid association |
| NO_PROFITABLE_FEASIBLE_GRID / PRICE_SUPPORT_OR_CONSTRAINTS_UNAVAILABLE | Constraints/cost/support leave no safe profitable grid |
| NO_POSITIVE_SUPPORTED_FORECAST | No positive forecast for the exact horizon |
| SEASONAL_OR_CALENDAR_CONFOUNDING | Existing model flags price/calendar dependence; no causal separation |
| LOW_ELIGIBLE_COVERAGE / CRITICAL_STOCK_COVERAGE | Insufficient eligible samples or too much missing/censored stock |
| ZERO_DISCREPANCY_OR_OUTLIER_SELECTION | Problematic zero, price-discrepancy or outlier selection |
| ELASTICITY_SUBWINDOW_UNSTABLE | Earlier-prefix estimate missing or changes by more than .25 |
| BACKTEST_EVIDENCE_INSUFFICIENT | Missing/poor folds, censored evaluation or worse-than-allowed baseline error |
| NO_FRESH_TRUSTED_POSITIVE_STOCK | Unknown, stale, inferred or zero latest stock |
| FORECAST_REFERENCE_PRICE_MISMATCH / RECENT_PRICE_MIX_NOT_REFERENCE_DEMAND | q0 cannot be safely identified as demand at p0 |
| NO_SUPPORTED_CONTRIBUTION_IMPROVEMENT | Candidate cannot support the reference comparison |
| INVALID_OR_NONFINITE_MODEL_OUTPUT | Numeric/model output invalid or exceeds supported limits |

## APIs

All read-only GETs under `/api/v1/optimization`; optional ISO startDate/endDate default to [today UTC−365 days,today UTC), 28–731 days with M06 date validation; horizonDays default 7, allowed 7/14/30. Unknown IDs 404; invalid dates/horizons/page/filter 400, currency conflicts reuse existing safe conventions.

- `/overview?page=0&size=10&search=`: literal case-insensitive variant/product/SKU search, stable product/SKU/UUID order; max size10/page100000/search100. Returns window, horizon, results page and **page-scoped** status counts. No misleading global count: all statuses require bounded model computation, so scope is labeled. No status sort/filter is offered because that would require evaluating unbounded catalogs before pagination.
- `/variants/{id}/recommendation`: full evaluation, historical/current policy metadata, input provenance/ages, all reasons, M06 association/readiness/backtest diagnostics, reference and candidate modeled sales/contribution, bounds, uplift and 21-point capped sensitivity only when ACTIONABLE.
- `/variants/{id}/sensitivity`: same evaluation shape, including the capped sensitivity. No separate model or looser gate.

Decimal money/demand/percent are strings, statistical elasticity is a finite nullable number; absent values stay null. ACTIONABLE example: an independent-price test fixture has current p0=100, c=40, e≈−2, support80–120 and ±10% bound90–110: recommended90, not the unconstrained oracle80. Abstained seasonal example: status DIAGNOSTIC_ONLY, recommendedPrice null, comparison null, uplift null, sensitivity [], reason SEASONAL_OR_CALENDAR_CONFOUNDING. Empty normal overview content=[] and page status counts all zero.

Example request: `GET /api/v1/optimization/variants/<id>/recommendation?startDate=2025-01-01&endDate=2026-01-01&horizonDays=7`. Selected response fields for the ephemeral supported fixture (other diagnostics omitted here):

```json
{"status":"ACTIONABLE","recommendedPrice":"90.0000","inputs":{"currentPrice":"100.0000","unitCost":"40.0000","lowerBound":"90.0000","upperBound":"110.0000"}}
```

Selected fields for the actual seasonal demo evaluation:

```json
{"status":"DIAGNOSTIC_ONLY","reasons":["SEASONAL_OR_CALENDAR_CONFOUNDING"],"recommendedPrice":null,"comparison":null,"sensitivity":[]}
```

One shared M06 batch input load (≤7,310 daily rows/page), one batched effective-input query (≤10 IDs), constant settings/currency/count queries; no per-row SQL history requests. M06 pure estimation/forecast/backtest routines are reused, not duplicated. On-demand CPU bounded by 10 variants×731 days; sensitivity ≤21 points. Local response-time measurements are recorded in verification; no production SLA is claimed. Read-only repeatable-read keeps each evaluation response internally consistent. No credentials/internal SQL are exposed.

## Running and verification

Existing normal ports5433/8080/4200 and isolated demo5434/8081/4201 remain. Use README startup, or `scripts/demo.ps1 serve` and `npm.cmd run start:demo` in frontend; navigate `/optimization`, Full 2025 for the existing historical demo. No reseed/reset is needed. Run backend `mvnw.cmd verify`, frontend tests/build and read-only browser checks. Demo checksum must remain unchanged. Numerical test oracle c40/e−2→80 on the four-place grid is tested independently of conservative real-data abstention. Test-only independently varying prices demonstrate a gated actionable API result; no persistent demo data is modified to manufacture one.
