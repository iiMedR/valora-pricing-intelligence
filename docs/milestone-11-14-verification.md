# Milestone 11.14 verification

**PASS — portfolio demo engineering and transparent evaluation. Model readiness remains NOT VALIDATED.** No quota filling, generator parameter search, optimizer/gate changes, automatic price application, provider writes, push or deployment. Milestone11.15 was not started.

Baseline:6ae3e090fb832eace8cd489996de2ce8508a3ff3, clean codex/milestone-01. Baseline audit and frozen design committed first at274cd26. Implementation/evidence commit47d0ec8. Tests ran against this working implementation before commit; final source formatting only normalized whitespace/line endings. This verification/manifest is a separate final documentation commit, reported in the handoff. Final clean status is checked after committing it.

## Scope and inspected paths

Baseline audit: docs/milestone-11-14-baseline-audit.md. Further inspected GuidanceCalculator/GuidanceController, AnalyticsController/AnalyticsDtos, catalog ProductVariant/CatalogRules/product-list/product-detail/ProductEntry, subscription/BusinessMode, application.yml, V2/V5/V7 schemas and existing frontend testing tooling. Exact changed-file inventory and normalized text/raw PNG SHA256 hashes are in docs/demo/artifacts/manifest.json. No AGENTS.md found. No new dependencies installed. Existing Maven/JUnit/Testcontainers/Angular tools used; frontend-testing-debugging skill applied with cached Playwright1.65.0/Chrome because Browser plugin unavailable.

## Dataset and launch

Entry points: scripts/portfolio-demo.ps1 init/seed/summary/export/serve; reset requires -ConfirmReset. Wrapper selects portfolio in the shared scripts/demo.ps1. Legacy defaults are unchanged. Infra: compose.portfolio.yaml, independent project/volume,5437; backend demo+portfolio profiles8087; frontend npm.cmd run start:portfolio on4207. Normal5433/8080/4200, legacy5434/8081/4201 and SaaS5435/8082/4202 remain separate. No normal/legacy reset was run. Portfolio reset was exercised in disposable integration containers; local repeat seeding was idempotent.

The restricted DB/user name is smartpricing_demo in separate servers; distinct admin-owned immutable markers prevent portfolio/legacy cross-targeting. Profile/mode/database/role/marker/marker-privilege checks occur before Flyway and resets. Portfolio requires frozen seed20251114 and2025-01-01; incompatible local/saas profiles, missing reset confirmation and changed portfolio seed fail closed. Existing advisory lock and one outer transaction remain. Missing catalog costs use a narrow portfolio import path with genuine null; user editor validation was not weakened.

Portfolio:30 products/variants,5 categories,9863 synthetic daily bulk orders,54 refunds,853 price periods,107 cost periods,9930 stock snapshots,166 unknown-cost lines. Version portfolio-v1. Canonical checksum:

`5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6`

Two fresh disposable seeds, idempotent repeat, guarded reset and local installation export all match byte-for-byte canonical data (4,878,054 bytes). Stable logical keys/timestamps/order/precision are used; generated ORM UUIDs and insertion timestamps are normalized out. Full dumps stay in ignored backend/target and can be reproduced; only manifests, truth/evaluations and real screenshots are tracked.

## Actual commands and results

JDK21.0.11; commands from backend unless noted. PowerShell local logs milestone1114-*.log are ignored; no secrets exported.

|Command/check|Observed result|
|---|---|
|./mvnw.cmd -Dtest=DemoGeneratorTest,DemoSafetyGuardTest,ContributionOptimizerTest,OptimizerSafetyRegressionTest,EvidenceQualityBenchmarkTest test|Baseline22 tests passed, zero failures/errors/skips;64s.|
|npm.cmd test --prefix frontend -- --watch=false; npm.cmd run build --prefix frontend|Baseline145 tests/35 files passed and build passed.|
|./mvnw.cmd verify|Final BUILD SUCCESS,11m30s:126 unit +67 PostgreSQL integration tests, zero failures/errors/skips. Includes old11.11/11.12/11.13 research, oracle80, genuine constrained90, auth/session/CSRF, read-only Shopify sync, immutable financial history, legacy and portfolio seeding, commerce/SaaS accounting/guidance.|
|npm.cmd test --prefix frontend -- --watch=false|Final145 tests/35 files passed, no skips/failures. Existing jsdom canvas getContext warning is informational.|
|npm.cmd run build --prefix frontend|Passed;451.51kB initial,115.61kB estimated transfer;8.138s.|
|./scripts/portfolio-demo.ps1 init|First attempt failed on catalog null-cost validation and rolled back; corrected importer without changing generator parameters/API rules.|
|./scripts/portfolio-demo.ps1 seed|Successful first local seed3m15s including Maven/boot and concurrent tests; repeat16.983s with matching metadata/checksum.|
|./scripts/demo.ps1 export; ./scripts/portfolio-demo.ps1 export|Guarded read-only exports passed; legacy hash remains original, portfolio matches fresh IT and local bytes.|
|./scripts/portfolio-demo.ps1 reset (without flag); ./scripts/demo.ps1 seed -Dataset portfolio -Seed 1|Both refused before database access. No local reset performed.|
|node research/pricing/evaluate-portfolio.mjs|All30 evaluated through existing APIs, ground truth joined by SKU; guidance default/assumption/missing-cost arithmetic verified.|
|node research/pricing/verify-portfolio.mjs|Canonical, financial, migration, mode, no-account/evaluation/SaaS-event checks passed; actual empty POST product/evaluation attempts refused403.|
|node research/pricing/verify-legacy-demo.mjs http://localhost:8081|All30 legacy variants abstain, null suggestions/comparison, empty sensitivity; original checksum and counts unchanged.|
|node research/pricing/verify-demo-isolation.mjs|Read-only normal/legacy counts and V1–V7 checksums preserved.|
|node research/pricing/report-portfolio.mjs; node research/pricing/portfolio-manifest.mjs|Generated scenario-by-scenario report and complete manifest.|
|node --check on new evaluation/report/verifier/manifest scripts|Passed; substantive scripts also executed successfully.|
|git diff --cached --check|Passed before implementation commit; final documentation checked again before commit.|

Initial sandbox Mockito attachment stalled and was interrupted; escalated execution passed. A preliminary full run was interrupted after discovering the import mismatch; only the final complete run above is claimed. Evaluation-harness input formatting initially produced400 for a binary-float decimal; four-decimal request formatting repaired it. A null-versus-undefined harness assertion was corrected to honor the existing explicit-null DTO. The initial browser probe incorrectly assumed coffee appeared on page1 and timed out; final smoke uses actual search/navigation. These were not hidden data/optimizer changes or fabricated passes.

## Independent truth and honest outcomes

Actual engine outcomes:15 ACTIONABLE,9 DIAGNOSTIC_ONLY,3 MISSING_COST,2 UNRELIABLE_ELASTICITY,1 INACTIVE_VARIANT. These are code outcomes, not causal-validation labels. All30 cases, intended stories, truth/recorded costs, beta estimates, full reasons, actual forecast dates, API contribution comparisons, bounded independent oracles and regret are in docs/demo/portfolio-evaluation.md and artifacts/portfolio-evaluations.json.

Known failures preserved prominently: hidden-marketing PORT-PROMOTION-1 is approved111→99.9 although controlled own-effect oracle122.1 (reference regret23,313.40 MAD); wrong-cost PORT-COST_CHANGE_UNKNOWN-2 approved149→134.1 versus true oracle163.9 (8,668.63 MAD). Near-optimal ARCHIVE-2 and flat-gain ZERO_SALES-2 also incur small true losses. Planned clean ELASTIC_HIGH-3 and floor/stock examples withhold on actual backtests. No case was removed/reclassified to improve the picture. All production intervals unavailable. Weekly assignment epochs are not365 randomized independent interventions; no guarantee/realized-profit claim.

Old unsafe regressions remain0/228 and0/380. Fresh11.12 safety CSV and11.13 case CSV are byte-identical to their committed snapshots. Unsolved broader11.13 unsafe TEST65/260, CHALLENGE41/156 and hidden causal interval coverage0/20 remain explicit. Mathematical80 and independent constrained90 tests pass. No production forecasting/optimization source or historical research artifacts changed.

Financial reconciliation: gross59,950,686.4400 MAD minus refunds4,283.4000 equals SQL/API net59,946,403.0400. Orders9863; invalid lines/orders/refunds0. Known-cost contribution33,465,177.0400, cost coverage98.3169% partial, excludes other expenses/return-cost recovery. Guidance uses explicitly entered units/zero-extras consent; missing cost/fixed costs do not become0. No saved evaluation or actual price application occurred.

## Browser evidence

Real Chrome/Playwright smoke at320/375/768/1440: catalog search → detail → assumption-based guidance → actionable insight; missing-cost product → withheld insight; synthetic workspace disclosure.25 states recorded, no page/console errors, global overflow or axe WCAG A/AA violations in tested states. Keyboard search submission, modal focus containment and Escape exercised. Ten selected genuine screenshots under docs/demo/screenshots, raw result under artifacts/browser-results.json. Screenshots were visually inspected. This is developer QA, not independent merchant usability or exhaustive a11y certification. No SaaS browser claim because no SaaS seed added. Browser plugin unavailable; cached Playwright fallback used, no new browser dependency.

## Preservation and cleanup

Legacy checksum remains:

`6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`

30 variants,9466 orders,114 refunds,10044 observations,10 scenarios,30 abstentions. Both live legacy read-only export and fresh integration seed match. Normal counts retained products0/orders0/refunds0/accounts1/evaluations0/subscriptionEvents0; legacy30/9466/114/0/0/0. New portfolio accounts/evaluations/subscriptionEvents0; ECOMMERCE mode only.

All three databases have unchanged V1–V7 checksum sequence1436242292,581270318,-1414359703,56597636,147175724,-1432513541,-319300667. No migration added/edited. Authentication/session/CSRF, Shopify write restrictions and separate SaaS accounting passed original tests. LIVE_SHOPIFY_NOT_VERIFIED and live billing NOT_VERIFIED; no customer/provider credentials needed. Existing main services were not restarted; only local portfolio services were launched for QA and remain available on8087/4207. This is not a deployment.

Removed tracked files/dependencies:none; dependency searches justified retaining migrations, research truth/artifacts and active assets. Shared CLI mechanics and canonical digest/export query definitions replace duplication; no speculative bulk rewrite. Legacy canonical4,146,763 bytes versus portfolio4,878,054 are different datasets, not a cleanup performance benchmark. First fresh portfolio seed78.448s; legacy/portfolio integration cases245.9s/239.3s have different assertions. No unmeasured speedup claim. Full rationale: docs/milestone-11-14-cleanup-audit.md.

## Remaining scope and final inventory

Optional SaaS demo seed deferred because no existing safe demo seeder supports that separate installation; existing SaaS tests/code remain. Further visual redesign/readability/product polishing belongs to separately reviewed11.15; no work started. Model causal/cost-provenance/uncertainty weaknesses, independent merchant study and live providers remain unverified. Portfolio success means reproducible, transparent engineering demonstration.

Required docs: baseline audit, docs/demo/portfolio-dataset-design.md, docs/demo/README.md, docs/demo/portfolio-evaluation.md, cleanup audit, this report. Exact full changed-source/scripts/tests/JSON/screenshots inventory with hashes: docs/demo/artifacts/manifest.json. No generated full dump, PII, ignored credential or debug log committed. Baseline/design commit274cd26, implementation47d0ec8; final verification commit in handoff. Working tree checked clean after final local conventional commit; no push/deployment.
