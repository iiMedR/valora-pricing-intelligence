# Milestone 10.5 verification

## Scope and baseline

Started with clean `codex/milestone-01` HEAD `1b72f35`, matching the supplied baseline. The implementation plan was written before substantial changes: [milestone-10-5-plan.md](milestone-10-5-plan.md). No preexisting changes were overwritten. Local commits only; no push, PR, deployment or identity/history changes. Stop at10.5.

Main paths:

- `forecasting/service/{ControlledElasticity,DemandModel}.java`, `forecasting/dto/ForecastDtos.java`: fixed 13-parameter reorthogonalized QR, six weekday indicators/two annual harmonics/centered linear trend/log-price; residualized price diagnostics, effective sample gate and additive identification/uncertainty metadata. Legacy calendar-risk gates retained. Forecast baseline unchanged.
- `optimization/service/EvaluationAudit.java`, `optimization/controller/EvaluationAuditController.java`: explicit authenticated save, deterministic canonical fingerprint, deduplication and bounded read-only history. Existing optimizer/objective/security rules reused.
- `db/migration/V6__model_evaluation_audit.sql`: metadata table, variant/time index and UPDATE/DELETE/TRUNCATE refusal trigger. V1–V5 unchanged; no business data backfill.
- `forecasting/{IdentificationBenchmarkTest,LegacyDemandModel}.java` under test: separate experimental-v1 equations/seeds, frozen old estimator, recovery/abstention/prefix checks and old/new permanent-scenario comparison. No production truth lookup.
- `optimization/{OptimizationApiIT,ModelAuditMigrationIT}.java`: actual PostgreSQL/session/CSRF audit tests, migration retention, retained actionable fixture. `shopify/sync/SyncMigrationIT.java` explicitly targets its original V4→V5 upgrade; the new migration test covers V5→V6. Existing auth/demo tests additionally deny wrong-role/demo audit operations; DemoNormalSafetyIT migration count now6.
- Angular `features/forecasting/{forecast-api.service.ts,forecasting.html,forecasting.spec.ts}`, `features/optimization/{optimization.ts,optimization.html,optimization.spec.ts,evaluation-history.ts,evaluation-history.spec.ts}`: additive model/identification/uncertainty explanation and explicit read-only bounded history loading. No framework/package/lockfile or broad redesign changes.
- README and forecasting/optimization docs link [recommendation-quality.md](recommendation-quality.md), the complete scientific contract/benchmarks/limitations, and machine-readable [benchmark.csv](recommendation-quality-benchmark.csv).

New API: POST and GET `/api/v1/optimization/variants/{id}/evaluations`; POST query dates/horizon, normal ADMIN session/XSRF only, demo403. GET paginated size1–10 and page0–100000; normal ADMIN/demo anonymous. Existing forecast/recommendation APIs gain additive nested `elasticity.identification`; scientific interval fields remain null. No automatic save or price write.

## Model evidence

Complete per-scenario truth/old/new/error/sample/identification/eligibility evidence is in recommendation-quality.md; all15 independent seed rows are in the CSV. Independent seasonal recovery improves on the old estimator for every seed: truth−1.1, old−1.042 to−.921, new−1.108 to−1.085, absolute error .0023–.0149. High/low recover within predeclared .12 tolerance across seeds41–45 as well. Independent seasonal-confounding, promotion-discrepancy, heavy-censoring, constant/sparse and zero-demand cases withhold recommendations; no candidate/comparison/sensitivity leaks through abstention.

Permanent seasonal recovery remains poor: old−.531116 → new−.567078, truth−1.1. It remains weakly identified and withheld. Complete quarterly-price scenarios have controlled calendar price R² .817493 and residual log-price SD .045881. Low/refund/cost-change/stockout permanent-demo coefficient errors are slightly worse, explicitly reported. This is not a universal improvement claim.

Per-variant evidence is in [permanent-demo-model-evaluations.csv](permanent-demo-model-evaluations.csv). All30 actual permanent-demo API outcomes after updating runtime:21 DIAGNOSTIC_ONLY,3 MISSING_PRICE,3 UNRELIABLE_ELASTICITY,3 INACTIVE_VARIANT,0 ACTIONABLE. Every candidate remains null. Original mathematical oracle c40/e−2→80 and independent PostgreSQL supported fixture constrained90 remain passing. The fixture and oracle answer different questions from observational identification.

Uncertainty: `UNCERTAINTY_UNAVAILABLE`, confidence fields null; no calibrated interval or empirical interval coverage is claimed. Five seeds test point-estimate stability, not calibration. Unobserved promotions/endogenous price changes/omitted calendar effects remain limitations. No latent stockout imputation, causal guarantee or realized uplift.

## Automated commands and results

- From backend: `.\mvnw.cmd test '-Dtest=IdentificationBenchmarkTest,DemandModelTest,ContributionOptimizerTest,OptimizationGateTest'`: initial17 tests passed at21:48:51 UTC, zero failures/errors/skips (before expanding benchmark reporting/abstention tests).
- `.\mvnw.cmd verify '-Dit.test=OptimizationApiIT'`:87 unit tests and5 PostgreSQL integration tests passed at21:52:09 UTC. Covers explicit audit save/read/deduplication, immutable UPDATE/DELETE refusal, unchanged365 sales, missing CSRF/anonymous denial, pagination and retained constrained90 recommendation. Later full/final scope results below supersede this interim run.
- First full backend run finished22:06:31 UTC:89 unit passed;55 integration tests with1 failure (the V4→latest migration test expected1 migration but now correctly saw2). Its target is pinned to5, preserving its original purpose; separate V5→V6 retention test passed. Full final `.\mvnw.cmd verify` rerun passed at2026-11-12 22:18:00 UTC in10:23: **89 unit +55 PostgreSQL integration tests, zero failures/errors/skips**. This run includes the corrected migration target and final controlled-sample reason.
- Final rerun includes the explicit TOO_FEW_CONTROLLED_SAMPLES reason for90–129 eligible days, tested with a100-day independent prefix.
- From frontend: `npm.cmd test -- --watch=false`: final68 tests in23 files passed, start21:59:39 UTC, zero failures. `npm.cmd run build`: final production build passed22:00:15 UTC. Existing dependencies reused, no npm ci necessary.
- `git diff --check`: passed. V1–V5 and permanent generator source diff against1b72f35 is empty.

Coverage includes scientific recovery, collinearity/independent variation, sample insufficiency, zero selection, censorship, promotion discrepancy, chronological prefix/no-future leakage, optimizer oracle/abstention, real audit HTTP/session/CSRF, role/demo restrictions, V5→V6 retention, source-ID sync and auth regressions, plus all previous tests. No required check is intentionally skipped.

## Browser QA

Browser plugin not available; installed Chrome through existing standalone Playwright used as the frontend-testing skill fallback. No browser dependency installed. URLs normal `http://localhost:4200/optimization`, demo `http://localhost:4201/optimization` and `/forecasting`; desktop1440×1000/mobile390×844.

Flow: protected normal route → actual owner login → useful empty state → deliberately aborted overview request → visible retry → recovered empty state; demo Full2025/search by keyboard → actual seasonal detail → weak identification/unavailable uncertainty/withheld recommendation → explicit load saved evaluations → genuine empty history → forecasting detail with same model diagnostics.

| Check                                      | Result                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Page identity/title and meaningful content | PASS                                                                                          |
| No blank page/framework overlay            | PASS                                                                                          |
| Console/runtime health                     | PASS; no unexplained demo console errors or page errors; expected normal request abort only   |
| Interaction proof                          | PASS; actual API data, login, search, withheld detail, history loading, request failure/retry |
| Desktop/mobile layout                      | PASS; no document overflow; diagnostics readable; existing table scroll regions retained      |
| Security/read-only                         | PASS; no implicit demo API write requests, no provider or merchant fixture import             |
| Screenshots                                | Captured and inspected desktop/mobile diagnostics; normal/forecast evidence saved outside Git |

External artifacts in this chat's visualization directory: `model-quality-qa.cjs`, `model-normal-desktop.png`, `model-normal-mobile.png`, `model-demo-diagnostics-desktop.png`, `model-demo-diagnostics-mobile.png`, `model-demo-forecast-mobile.png`. Initial automation used another screen's button names and timed out; corrected to actual Evaluate window/Retry evaluations labels. The final rerun also waits for Angular route-title updates before asserting page identity, rather than checking the initial document title. No application defect or fake provider response was used to manufacture success. Actionable and populated audit history rendering are covered by controlled unit/HTTP tests, not claimed as permanent-demo browser states.

## Runtime, migration and data safety

Both updated backends report UP on8080/8081. V6 successfully migrated both existing normal/demo databases. Both retain V1–V5 checksums respectively1436242292,581270318,-1414359703,56597636,147175724; V6 checksum−1432513541. No normal/demo reset, seed or fixture insertion was performed. Running copied JARs preserve existing ignored credentials and ports.

Normal retained0 products/0 orders/1 owner account; demo30 products/9,466 orders/0 accounts. Explicit evaluation records remain0 in both permanent databases after GET/browser checks. Existing source mapping/import writes are unchanged.

Original pre-change demo checksum read from actual summary: `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`, matchesSeed=true. Final summary after all browser/assessment checks reports the identical checksum and matchesSeed=true. Normal/demo runtime and final verification logs contain neither the protected owner password nor a generated default password. Final counts remain 0/0/1 normal products/orders/accounts and 30/9466/0 demo; jobs/mappings/evaluation records remain 0 in both.

Audits store model conclusions/config/data fingerprint and allowed output only. `NOT_MEASURED` outcomes never mean observed uplift. GET does not create audit rows; normal POST requires real session/CSRF, demo POST403. Append-only protection does not prevent a database administrator from changing schema. Retention/archival and realized-outcome linkage are not implemented; source retention plus versioned model/config is required for exact replay. Live Shopify remains **LIVE_SHOPIFY_NOT_VERIFIED**; OAuth/import credentials/public callback/provider-specific validation remain separate prerequisites.

## Delivery status and remaining risks

All required regression/integrity/browser checks passed; no unresolved execution blocker. Final local commits are recorded in the completion report. Calibrated uncertainty, promotion labels, causal/exogenous identification and outcome linkage remain unavailable; permanent seasonal misspecification is not fixed. The implementation improves controlled synthetic recovery and makes limitations explicit while retaining conservative abstention. Ready for Milestone11 review with the documented scientific limitations; this is not proof of real-world uplift. No Milestone11/12, experiment, deployment, remote push or automatic price application is implemented.
