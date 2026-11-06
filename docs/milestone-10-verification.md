# Milestone 10 verification

Implemented onboarding and read-only data-readiness diagnostics only. No recommendation-quality work, model/gate changes, V6, provider API upgrade, webhook/bulk import, deployment or automatic price application. **LIVE_SHOPIFY_NOT_VERIFIED**: no actual permitted store/app credentials or public HTTPS callback were supplied.

## Baseline, schema and changed files

Started from clean `codex/milestone-01`, HEAD `68f4223`. V1–V5 remain unchanged. No V6 is needed: connection/jobs/checkpoints, source mappings, catalog versions, immutable sales and dated observations already support derived assessments. No readiness flags or certificates are persisted.

Versions/dependencies remain Java21.0.11, Boot3.5.16/Security6.5.11, Angular22.2.6/TypeScript6.0.x, PostgreSQL17.7, GraphQL2026-10 and the existing four read scopes. No Maven/npm dependency or lockfile changes. Normal ports remain5433/8080/4200; demo5434/8081/4201.

- New `backend/src/main/java/com/smartpricing/onboarding/`: `ReadinessDtos.java`, `ReadinessRules.java`, `ReadinessRepository.java`, `ReadinessService.java`, `OnboardingController.java`.
- `auth/SecurityConfiguration.java`: enumerated normal ADMIN/demo read-only GET access; no new writes.
- New `backend/src/test/java/com/smartpricing/onboarding/{ReadinessRulesTest,OnboardingIT}.java`; updated `auth/SecurityFlowIT.java`, `demo/DemoReadOnlyIT.java`, `optimization/OptimizationApiIT.java`, `shopify/sync/SyncIT.java`.
- New `frontend/src/app/features/onboarding/{onboarding-api,onboarding,variant-readiness,onboarding.spec}.ts`; guarded routes/navigation/safe return paths in `app.routes.ts`, `app.html`, `core/session.service.ts` and future-scope text in `features/home/home.html`.
- `features/catalog/pages/{product-list,product-detail,categories}.ts`, `features/settings/business-settings.ts`, `features/history/variant-history.ts`: disabled/hidden demo merchant controls and guarded handlers. Settings spec verifies no editable demo form/request.
- README, architecture/development/import guides, `docs/onboarding.md` and this report document state transitions, API, precedence, limitations and deferred roadmap.

Endpoints: GET `/api/v1/onboarding/summary`, GET `/api/v1/onboarding/readiness/variants`, GET `/api/v1/onboarding/readiness/variants/{variantId}`. Optional UTC startDate/endDate; page/size1–10/search≤100 and persisted-data review filters. Invalid parameters400; anonymous normal401; wrong role/unsafe demo403; missing/out-of-scope UUID404. No write endpoint, implicit sync or provider call.

## Assessment and preservation

Workflow progress is separate from variant analytics, forecast and optimizer eligibility. States include NOT_CONNECTED, CONNECTED_NOT_SYNCED, SYNC_RUNNING, SYNC_FAILED, SYNC_COMPLETED_NEEDS_REVIEW, READY_FOR_ANALYTICS and SYNTHETIC_DEMO. There is no global model-ready promise. Existing batched series/market repositories and optimizer evaluation provide actual statuses/reasons; readiness returns no recommended price and never promotes DIAGNOSTIC_ONLY.

Shop/product/variant mappings define scope, with manual records distinct. Other-shop mapped variants and their unmapped children are excluded; out-of-scope detail returns404. Parent/variant catalog edits surface conflicts. Current input findings use now; model diagnostics use the selected retrospective end instant. Both are explicit. Demo defaults to its2025 history, labeled synthetic.

Independent sale/refund aggregation prevents multiplication. Refund-only windows can be observable for analytics while demand remains insufficient. Missing days are not zero demand; unknown cost/stock remains null. Inferred stock is untrusted, old observations stale, and known zero is not a reconstructed history. Current cost/history disagreements are exposed; inferred cost entries do not certify freshness. Provider quotes/costs remain snapshots.

Merchant completion reuses existing catalog/history APIs, unchanged precision/currency/optimistic version/archive validation and immutable snapshot semantics. Tests prove merchant edits append MANUAL cost history, leave old sale cost null and cause later sync to stop with LOCAL_EDIT_CONFLICT while retaining merchant values. No automatic merge/overwrite or conflict bypass exists.

Summary queries aggregate scoped records; pages select≤10 variants before batch series/current/historical inputs/coverage. No per-variant database service call loop or full-catalog model scan is introduced. Read-only repeatable-read GETs persist neither assessment nor jobs.

## Automated verification

Focused verification passed **84 unit tests and28 PostgreSQL integration tests** at2026-11-12 20:31:49 UTC:

```powershell
cd backend
.\mvnw.cmd verify '-Dit.test=OnboardingIT,OptimizationApiIT,SyncIT,DemoReadOnlyIT,SecurityFlowIT'
```

Coverage includes empty/disconnected, pending/partial/failed/succeeded workflow, missing cost, stale/zero/inferred stock, sparse prices/history, archived variants, exact agreement with the independent optimizer fixture, filters/paging/scope, permissions, read-only GETs, refund-only analytics and merchant-edit preservation. Initial focused verification caught a summary SQL text-block separator issue; it was fixed before the passing run. Full `./mvnw.cmd verify` passed 84 unit tests and 52 PostgreSQL integration tests at 2026-11-12 20:43:17 UTC, with zero failures, errors or skips. After strengthening parent-product mapping scope, final `./mvnw.cmd verify '-Dit.test=OnboardingIT,OptimizationApiIT'` passed 84 unit tests and 10 integration tests at 20:47:41 UTC. The final running package includes that scope check. No model or migration source changed.

Frontend final `npm.cmd test -- --watch=false` passed **66 tests in22 files**; `npm.cmd run build` passed at2026-11-12 20:31:19 UTC after formatting. Tests cover disconnected guidance, zero implicit writes, filters/paging, retry, synthetic restrictions, unknown-cost/model detail and dated-input links. Existing tests remain passing; no new packages.

## Browser QA

Flow: sign in → checklist → filters/pagination → variant reasons → existing product/history/settings surfaces → refresh/retry. Browser plugin not available; installed Chrome via standalone Playwright is the frontend-testing fallback. Desktop1440×1000/mobile390×844. Scripts/screenshots are outside Git. Existing Windows-protected local credentials enter only process memory/environment, never source/output/screenshots/storage.

Final browser QA passed against the running normal and demo applications. Normal login/empty guidance, deliberately interrupted request/error/retry, keyboard filter submission, accurate pagination, variant detail, demo catalog/settings restrictions, focused horizontally scrollable tables, desktop/mobile layout without page overflow, existing analytics/forecasting/optimization, and authorization denials all passed. No unexpected console/runtime errors or implicit sync writes occurred. Screenshots: `onboarding-normal-desktop.png`, `onboarding-normal-mobile.png`, `onboarding-demo-detail-desktop.png`, `onboarding-demo-detail-mobile.png` and `onboarding-demo-table-mobile.png` in the external visualization directory for this chat. Tests use actual normal/demo APIs and permanent synthetic data, with one deliberately aborted summary request for retry. No provider-success interception, fixture import or merchant write is used. Automation waits for enabled assessment controls before keyboard submission and uses native select labels.

Checks include page identity/nonblank content/no overlay, console health, screenshot evidence, normal401/login/empty guidance, query/paging/detail, demo input controls disabled/absent, keyboard-accessible horizontal table region, existing analytics/forecasting/optimization and unsafe403. Pass/fail is recorded from actual outcomes, not assumed from unit tests.

## Persistent data, live status and limits

Final runtime checks: normal 8080 and demo 8081 health both UP. Counts match the baselines below. Both databases retain successful Flyway V1–V5 checksums respectively 1436242292, 581270318, -1414359703, 56597636 and 147175724. Migration source diff against baseline is empty. Demo summary reports `matchesSeed=true` and the exact original checksum below. Demo onboarding reports synthetic scope with SYNTHETIC_DEMO workflow and DEMO_DISABLED connection; no real identity or sync jobs. Normal/demo runtime and verification logs contain neither the protected owner password nor a generated default password. No persistent seed/reset has run. Normal baseline products0/orders0/accounts1/jobs0/mappings0; demo products30/orders9,466/accounts0/jobs0/mappings0. Original checksum: `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`. Only verified SmartPricing processes are restarted using copied JARs, retaining credentials and ports.

Startup/provisioning/configuration commands and full state/API/precedence contracts are in [onboarding.md](onboarding.md). Existing owner account is preserved. Session/CSRF/CORS, encrypted credentials and demo identity guards remain authoritative. Responses contain safe metadata/diagnostics, never tokens/client secrets.

**LIVE_SHOPIFY_NOT_VERIFIED**. Prerequisites: authorized app/shop credentials, separate encryption key, public HTTPS callback, real OAuth/scopes/currency validation, bounded import/incremental repeat, actual GraphQL schema/cost/permissions and refund/expiry/rotation/uninstall checks. Fixtures and synthetic UI are not live validation.

Review filters use persisted data rather than global model outcomes. Coverage inherits M09 access/reconciliation limits. Current edits may require operator reconciliation before sync resumes. Historical eligibility is not present-day or causal assurance. No destructive history deletion, automatic source merge or model readiness certificate is supplied.

Stop after Milestone10. Preserve the later Recommendation Quality Improvement workstream: seasonality/weekday/trend/promotion controls; identification/calibrated uncertainty; merchant-approved bounded experiments; stockout-censored demand; model/recommendation versioning and outcome audit; independent reproducible fixtures and mathematical recovery benchmarks. None is implemented here, nor Milestones11/12, deployment, webhook/bulk sync or automatic price writes.

Final local commits, HEAD/branch and clean-tree status are recorded in the completion report. Nothing is pushed, backdated or rewritten.
