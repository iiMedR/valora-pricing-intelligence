# Milestone 11.11 verification

## A. Executive verdict

**PASS — research milestone.** Full backend/PostgreSQL/frontend regressions and deterministic reproduction passed. Research-only delivery; no new production recommendations. Quantitative failures are findings, not hidden acceptance failures. Independent usability remains NOT VERIFIED.

## B. Pre-code audit and chronology

Baseline clean branch `codex/milestone-01`, HEAD `0ef18015e67ff91b0779c43e3d5c80f318e61617`. Audit and preregistered methodology committed **before implementation**, `4ef67be`. Research fixture/comparator tests committed `6a4ba02`. Real timestamps, no rewritten history. [Audit](pricing-research/milestone-11-11-baseline-audit.md) records source/contracts/settings/migrations/earlier validation/oracles/frontend/subscription inspection and actual baseline commands. Installed skills were assessed; none was applicable or invoked. No dependencies installed.

## C. Permanent demo root causes

[All 30 rows](pricing-research/demo-abstention-diagnosis.md) and [machine-readable full trace](pricing-research/artifacts/demo-diagnosis.json) capture quantities, price levels/transitions, eligible days, exclusions, estimates/RMSE, fitted controls, promotion-label absence, identification metrics, inputs/freshness, backtests and all returned optimizer reasons. Final statuses:21 diagnostic-only,3 inactive,3 unreliable elasticity,3 missing price. All30 prices/comparisons null and sensitivity arrays empty. Overlapping reasons:21 calendar confounding,9 untrustworthy elasticity,9 selection,9 insufficient backtests,6 coverage,6 stock coverage,6 forecast; other exact counts/codes in the trace. A conditional gate not reported is not called scientifically passed. Autocorrelation-adjusted ESS, internal subwindow coefficient and calibrated intervals are unavailable, explicitly labeled rather than invented.

## D–F. Fixtures, comparators and uncertainty

[Methodology](pricing-research/benchmark-methodology.md), [measured results](pricing-research/benchmark-results.md), [trials](pricing-research/artifacts/trials.csv), [summaries](pricing-research/artifacts/summary.json), [fixture hashes](pricing-research/artifacts/fixture-hashes.csv).

29 scenarios ×15 seeds =435 cases,1,770 method rows; DEV11/17/23, held-out1001–1012.406 unique histories: identical empty cases and deliberately paired sparse/pooling controls explain duplicates. Seeds, not pooled method/scenario rows, are independent replicates. Truth is evaluator-only; no demo training/tuning or oracle elasticity supplied to baseline. Sparse count process, confounding/marketing/censoring/cost unknown, nonlinear/structural/noise/outliers, known optimum, comparable/bad donors included. Mature3000 is component-only, not an eligible HTTP request.

A unmodified production; B decimal known-input arithmetic; C12 assumption scenarios; D3 explicit slope priors with conditional approximate intervals; E donor-only minimal empirical pooling; F144 offline bounded-randomization simulations; G independent subscription accounting. Full multilevel causal estimation/calibration and live experiments are excluded with reasons, not superficially declared solved.

Held-out A estimates156/348, MAE .280;25 actions,6 unsafe (2 hidden marketing,4 structural). Unsafe-case false actionability6/228=2.63%; correct abstention222/228. Known-optimum response estimated12/12 but policy actions0/12, all blocked by backtest evidence. Existing independent actionable90 and mathematical80 controls remain unchanged. D weak/optimistic/elastic interval target hits279/348,170/348,184/348, far from a blanket95% calibrated guarantee. Comparable pooling MAE .028164 versus heterogeneous2.270280 (exact values in summary), hits12/12 versus0/12. Zero D/E actions is an authority rule, not successful statistical detection. No scientific upgrade is proposed from these results.

## G. SaaS

`SubscriptionResearchIT` tests actual SubscriptionService against independent expected arithmetic in its own disposable PostgreSQL container. n0/1/5/20, three identity-role permutation seeds, monthly/annual, unpaid, new cohort, future effective cancellation, expansion/contraction, linked refund and zero/small denominators. No merchandise estimator, production/demo ledger mutation or subscription optimizer. Integration test passed1/1 in9.462s, asserting all12 independently hand-checkable cases; exported12 rows are committed in subscription-research.csv.

## H. Safe 11.12 proposal

[Progressive intelligence design](pricing-research/progressive-intelligence-design.md): observed facts, explicit known-cost arithmetic and merchant-assumed scenarios first; source/window/cost coverage/null definitions; backend decimal calculation; no best-price or guaranteed-profit label. DTO/route/feature flag are proposals only. Preserve session/CSRF/read-only/cross-mode protections and explicit evaluation saving. Prior-based estimates, pooling and live experiments deferred pending independent identification/calibration/design review.

## I. Exact changed paths and reproduction

No tracked production, frontend, migration, existing test, permanent generator or security/accounting source changes from baseline. Added files:

- `backend/src/test/java/com/smartpricing/research/DecisionSupportResearchTest.java`
- `backend/src/test/java/com/smartpricing/research/LowDataBenchmarkTest.java`
- `backend/src/test/java/com/smartpricing/research/ResearchEstimators.java`
- `backend/src/test/java/com/smartpricing/research/ResearchFixtures.java`
- `backend/src/test/java/com/smartpricing/research/SubscriptionResearchIT.java`
- `research/pricing/export-demo.mjs`, `summarize.mjs`, `report.mjs`
- `docs/pricing-research/milestone-11-11-baseline-audit.md`
- `docs/pricing-research/benchmark-methodology.md`
- `docs/pricing-research/demo-abstention-diagnosis.md`
- `docs/pricing-research/benchmark-results.md`
- `docs/pricing-research/progressive-intelligence-design.md`
- `docs/milestone-11-11-verification.md`
- `docs/pricing-research/artifacts/assumed-scenarios.csv`
- `docs/pricing-research/artifacts/database-invariants.txt`
- `docs/pricing-research/artifacts/demo-diagnosis.csv`, `demo-diagnosis.json`
- `docs/pricing-research/artifacts/deterministic-calculators.csv`
- `docs/pricing-research/artifacts/experiment-simulation.csv`, `experiment-summary.json`
- `docs/pricing-research/artifacts/fixture-hashes.csv`
- `docs/pricing-research/artifacts/production-candidates.json`
- `docs/pricing-research/artifacts/reproducibility.json`
- `docs/pricing-research/artifacts/run-metadata.txt`
- `docs/pricing-research/artifacts/summary.json`
- `docs/pricing-research/artifacts/timing.csv`, `timing-summary.json`
- `docs/pricing-research/artifacts/trials.csv`
- `docs/pricing-research/artifacts/verification-commands.txt`
- `docs/pricing-research/artifacts/subscription-research.csv`

Commands (PowerShell; Maven from backend, Node/npm from repository root):

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-21.0.11'
./mvnw.cmd '-Dtest=ContributionOptimizerTest,OptimizationGateTest,IdentificationBenchmarkTest' test
./mvnw.cmd '-Dtest=LowDataBenchmarkTest,DecisionSupportResearchTest' '-Dpricing.research.output=../docs/pricing-research/artifacts' test
./mvnw.cmd verify
node research/pricing/summarize.mjs
node research/pricing/report.mjs
node research/pricing/export-demo.mjs http://localhost:8084
npm.cmd test --prefix frontend -- --watch=false
npm.cmd run build --prefix frontend
git diff --check
git diff 0ef1801 -- backend/src/main frontend
```

Anonymous demo GETs only, no seed/reset. Task-owned demo runtime is a copy of existing backend on8084; existing8080/8081/4200/4201 left untouched. Temporary8084 stopped after final checksum verification. Real local logs are ignored by Git: `milestone1111-baseline-model.log`, `milestone1111-research.log`, `milestone1111-verify-full.log`, `milestone1111-frontend.log`, `milestone1111-build.log`, `milestone1111-demo-export.log`. No PII/tokens/passwords are exported. Original attempted sandbox full run stalled on Mockito attachment; only its identified JVM tree was stopped and full verification restarted with Docker/JVM attachment access. Initial read-only SQL used unverified table aliases and failed; corrected queries use actual migration table names and completed without writes. No blocked permission action remains.

## J. Test, build and invariants

Existing oracle/identification checks14 passed. Targeted new research7 passed,0 failures/errors/skips,33.502s Maven; runner8.273s. Five deterministic CSV outputs, including all trials and all fixture hashes, reproduced byte-for-byte during full verification; `reproducibility.json` records SHA256. Timing differs by design; no production latency claim. Full backend verify passed100 unit +62 PostgreSQL integration tests,0 failures/errors/skips,10:54min. Final research rerun after freezing HTTP audit-date classification passed7 tests in25.988s (runner6.323s), all five deterministic outputs unchanged. No model/gate results changed. See verification-commands.txt for exact captured summaries. Frontend133 tests/32 files passed; production build completed17.004s, initial451.51kB (115.58kB estimated transfer), no budget warning. No frontend source changes or new browser/a11y scans;11.10's77 scans are prior evidence only.

Read-only normal/demo SQL [evidence](pricing-research/artifacts/database-invariants.txt): normal0 products/0 orders/0 refunds/1 account/0 evaluations/0 subscription events; demo30 products/9466 orders/114 refunds/0 accounts/0 evaluations/0 subscription events; bothECOMMERCE. V1–V7 checksums identical on both databases:1436242292,581270318,−1414359703,56597636,147175724,−1432513541,−319300667. No migrations added/edited.

Permanent checksum, before and after diagnostic reads: `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`, matchesSeed=true. Original30 abstentions retained. Production source diff empty.

## K. Limitations

No independent merchant usability validation, no live Shopify (`LIVE_SHOPIFY_NOT_VERIFIED`), no live billing, no live experiment. Small synthetic seed count and fixed DGP families do not establish real-store performance. Conditional empirical intervals omit nuisance/noise/hyperparameter uncertainty, are not causal and are not SBC. Constant-price and sparse data remain unidentified; bad donors transfer false certainty. Current policy has the reported synthetic false actions; it is preserved, not described as fully scientifically validated. Research acceptance does not claim 11.10's independent usability is complete.

## L. Local Git delivery

Branch `codex/milestone-01`. Audit `4ef67be`; research tests `6a4ba02`; artifacts/exporters/results/design `da9fe47`. The final verification commit contains this report and whitespace cleanup only. The final response records its exact HEAD and post-commit clean status; use `git log -4 --oneline` to inspect the complete sequence. No push, deployment, rewritten/backdated history, live price or ledger changes.
