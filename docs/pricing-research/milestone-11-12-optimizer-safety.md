# Optimizer safety repair — Milestone 11.12

The pre-code audit committed in e2a3e9a fixes the design and prospective seeds before implementation. Six known TEST failures are reused regressions, not independent validation after repair. Frozen pre-repair policy is copied from1e4b25b in test sources only; estimators receive observations, not fixture truth.

## Six named regressions

| Fixture ID | SHA256 | Before | After | Exact new blockers |
|---|---|---|---|---|
| HIDDEN_MARKETING/1001 | 48aa8c3698973a3db6d8e0e0664cb892ccda6eeb63811d4020249f3a5042308d | ACTIONABLE, price90.0000 | DIAGNOSTIC_ONLY, no price | PRICE_RESPONSE_SHAPE_MISMATCH |
| STRUCTURAL/1001 | 1899f5b32fcffa1ce938760005c056965b55b129e431941d395e12de315a5b15 | ACTIONABLE, price90.5117 | DIAGNOSTIC_ONLY, no price | DISJOINT_PRICE_RESPONSE_UNSTABLE |
| STRUCTURAL/1003 | 7c74bd863a84eb680b491ac08fe8afe4949f50c254ebbd9e12ab931c8b9756e0 | ACTIONABLE, price110.0000 | DIAGNOSTIC_ONLY, no price | DISJOINT_PRICE_RESPONSE_UNSTABLE |
| STRUCTURAL/1007 | d1275aaab8d60181d548ea09a544e0ae920d95b4efb4c07e0f5cac8e7fee12a1 | ACTIONABLE, price105.8327 | DIAGNOSTIC_ONLY, no price | DISJOINT_PRICE_RESPONSE_UNSTABLE |
| STRUCTURAL/1008 | 52a3d245e04fdcf3e9502a603ffcb777989cdbb83fbff86850b82103c18a484d | ACTIONABLE, price102.8283 | DIAGNOSTIC_ONLY, no price | DISJOINT_PRICE_RESPONSE_UNSTABLE |
| HIDDEN_MARKETING/1012 | e8760e2b12b9a9db54ac8f2cb0e3d6c7ded1bd1621c05d909d32217e77eb72ba | ACTIONABLE, price90.0000 | DIAGNOSTIC_ONLY, no price | PRICE_RESPONSE_SHAPE_MISMATCH |

Hidden marketing applies a1.5 multiplier below100 while true own-price response is−1.2. A single log-linear slope absorbs the omitted intervention; good recent reference forecasts do not identify it. Replicated price-level mean residuals expose response-shape mismatch in these cases. Structural fixtures switch−2.6 to−.3 halfway through: full versus prefix-minus28 estimates overlap almost entirely, masking the earlier shift. Disjoint supported half-period estimates expose it. These are diagnostic/policy deficiencies, not an arithmetic optimum bug or proof that every hidden intervention is detectable.

## Exact policy changes

Optimizer version constrained-contribution-v2 adds response-adequacy-v1 diagnostics. The point-estimator coefficients/objective/original thresholds are unchanged. Price-tier mean log residual above log(1.10) with15observations/tier blocks response shape; at least3replicated tiers are required to check it. Disjoint chronological halves each require the existing130-observation controlled fit, independent price SD≥.03/calendar R²≤.70, and coefficient difference≤existing .25 tolerance. Missing/unsupported checks also withhold. This implies at least260 eligible observations with supported variation across halves for this optimization policy; low-data arithmetic remains available separately.

The10% shape tolerance is an engineering adequacy guardrail, not a calibrated significance test, causal detector or confidence interval. No threshold tuning to the prospective result occurred. Existing current-minus28 stability, coverage/selection, market freshness/reference and backtest gates remain. Fingerprint configuration now includes optimizerPolicy/responseDiagnostics versions, so new safety conclusions do not deduplicate against old-policy snapshots. Existing append-only rows and explicit CSRF-protected save semantics remain unchanged.

## HTTP-supported confusion counts

| Split | Unsafe cases | Unsafe approvals before → after | Safe cases | Safe approvals before → after | Unsafe abstentions after | Safe-case abstentions after |
|---|---:|---:|---:|---:|---:|---:|
| DEV | 57 | 2 → 0 | 24 | 6 → 6 | 57 | 18 |
| KNOWN_REGRESSION | 228 | 6 → 0 | 96 | 19 → 19 | 228 | 77 |
| PROSPECTIVE | 380 | 17 → 0 | 160 | 33 → 33 | 380 | 127 |

DEV11/17/23; known1001–1012; prospective2001–2020. All component cases1015; HTTP-supported945;70mature/constant3000-day cases are excluded from this table because of existing731-day/date limits. All component outcomes remain in CSV. Safe-case abstentions are potential opportunity/false-abstention proxies under synthetic truth, not established policy mistakes: safe response truth alone does not establish supported reference sales, costs, forecast skill and all eligibility inputs. No previously allowed safe case was newly withheld in these fixtures. Known-optimum30-day cases still abstain for backtest evidence; this unchanged false-abstention opportunity is not disguised as perfect recall.

## Prospective fixture-class counts

Each class has20new seeds. Unsafe truth designation is evaluator-only. No new family is silently called a held-out population.

| Class | Designated unsafe | Unsafe approvals before / after | Safe approvals before / after | Unsafe abstentions | Safe-case abstentions |
|---|---|---:|---:|---:|---:|
| EMPTY | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| ZERO_SALES | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| N5_CONSTANT | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| N5_THREE | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| N20_TWO | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| N20_FIVE | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| N50_CONSTANT | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| N50_FIVE | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| SPARSE_LOW_DEMAND | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| GROWING100 | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| GROWING250 | no | 0 / 0 | 0 / 0 | 0 | 20 |
| GROWING500 | no | 0 / 0 | 1 / 1 | 0 | 19 |
| SEASONAL_CONFOUNDED | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| PROMO_DISCREPANCY | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| HIDDEN_MARKETING | yes | 3 / 0 | 0 / 0 | 20 | 0 |
| WEEKDAY_TREND | no | 0 / 0 | 20 / 20 | 0 | 0 |
| STOCKOUT | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| REFUNDS_MISSING_COST | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| WEAK | no | 0 / 0 | 8 / 8 | 0 | 12 |
| STRONG | no | 0 / 0 | 2 / 2 | 0 | 18 |
| HIGH_NOISE | no | 0 / 0 | 0 / 0 | 0 | 20 |
| NONLINEAR | no | 0 / 0 | 1 / 1 | 0 | 19 |
| STRUCTURAL | yes | 14 / 0 | 0 / 0 | 20 | 0 |
| OUTLIERS | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| KNOWN_OPTIMUM | no | 0 / 0 | 1 / 1 | 0 | 19 |
| COMPARABLE_POOL | yes | 0 / 0 | 0 / 0 | 20 | 0 |
| HETEROGENEOUS_POOL | yes | 0 / 0 | 0 / 0 | 20 | 0 |

## Preserved controls and limits

The exact cost40/elasticity−2 mathematical oracle remains80. The independent cyclic-price genuine real-pipeline fixture remains ACTIONABLE at constrained90, including actual PostgreSQL/HTTP/evaluation-saving tests. Mock gate tests additionally isolate arithmetic; they are not substituted for the real fixture. Other previously valid safe approvals remain6/19/33 in DEV/known/prospective HTTP-supported cases. Original permanent demo remains30abstentions, no price/comparison/sensitivity leakage.

Zero observed unsafe approvals on these finite synthetic families is not universal safety, calibration or a production incident rate. Smooth omitted marketing perfectly aligned with price, endogenous merchant decisions, carryover, substitution and unmeasured availability can remain indistinguishable from price response. These guardrails do not establish exogeneity. No causal proof, statistical confidence, live result, guaranteed earnings or automatic price application is claimed. Broader independently designed families and calibrated uncertainty remain11.13 work.

Reproduce from backend: `mvnw.cmd -Dtest=OptimizerSafetyRegressionTest,ContributionOptimizerTest,OptimizationGateTest test`; then from root `node research/pricing/optimizer-safety-summary.mjs`. Sources and full case IDs/hashes/statuses/prices/reasons are in [optimizer-safety.csv](milestone-11-12-artifacts/optimizer-safety.csv) and [summary](milestone-11-12-artifacts/optimizer-safety-summary.json).
