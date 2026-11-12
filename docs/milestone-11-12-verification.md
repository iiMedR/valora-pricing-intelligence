# Milestone 11.12 — progressive pricing support and optimizer safety

## A. Verdict and acceptance gates

**PASS within the implemented engineering scope.** Separate e-commerce/SaaS read-only arithmetic guidance, explicit assumptions, targeted optimizer safety repair, merchant-first Angular journeys, regression evidence and local application updates are delivered. No validated causal optimizer, independent usability study or live integration is claimed.

| Gate | Result and evidence |
|---|---|
| Six known unsafe approvals, independent controls and genuine actionable fixtures | PASS:6/228→0/228; prospective17/380→0/380; safe approvals retained; exact80 and genuine constrained90 preserved. |
| Sparse-data e-commerce guidance | PASS: current known-cost facts and separate explicit-unit scenarios; unknowns stay unavailable; no optimized-price claim. |
| Period-aware SaaS scenarios and accounting | PASS: actual price versions, explicit counts/costs, monthly/yearly separation; original ledger/accounting tests retained. |
| Concise accessible responsive UI | PASS engineering checks:3modes×4widths, keyboard-only core path,26axe scans with0violations, missing-data/error/expiry/Back/reload. Independent usability NOT VERIFIED. |
| Security, mode/demo isolation, data and migrations | PASS: real session/CSRF/membership/mode/no-write tests; source V1–V7 unchanged; actual SQL/checksum/counts retained. |
| Required test/build/browser execution | PASS: full backend120unit/66IT; final affected-contract34unit/10IT; final frontend145/35files and build451.51kB. Failed interim attempts and corrections are disclosed below. |
| Scientific definitions and limitations | PASS documentation: assumptions versus observations, adequacy guardrails versus causal proof/calibration, excluded expenses and live integrations. |
| Local Git only | PASS local conventional commits; no push, deployment or rewritten/backdated history. Final response records delivery HEAD/clean status. |

## B. Pre-code audit

Started clean `codex/milestone-01` at `1e4b25bdacbb87f4b69aa1acf867bc74675d3238`. [Baseline audit/plan](pricing-research/milestone-11-12-baseline-audit.md) was committed first, **e2a3e9a**, before functional code. Read11.11 diagnosis/results/verification, recommendation-quality,10.5 verification, design system and merchant/SaaS guides; inspected modules/contracts/tests/security/mode/audit/migrations and actual runtime/data. No AGENTS.md found. Installed frontend-testing skill applied; Browser plugin/browser skill unavailable, existing standalone Playwright/installed Chrome used. No dependency install/upgrade or redesign.

Fresh pre-code backend21tests passed26.719s; unrestricted frontend baseline133/32files passed. The sandbox frontend attempt failed temporary-file ENOENT, not an application assertion; unrestricted rerun succeeded. Previous11.11 full-suite counts are historical baseline evidence, not substituted for this run.

## C. Six unsafe approvals, root causes and before/after

| Frozen11.11 fixture | Before price/status | After | Root cause/new blocker |
|---|---|---|---|
| HIDDEN_MARKETING/1001 |90.0000 ACTIONABLE | withheld | Price-linked omitted marketing creates response-shape residuals; PRICE_RESPONSE_SHAPE_MISMATCH. |
| HIDDEN_MARKETING/1012 |90.0000 ACTIONABLE | withheld | Same mechanism; PRICE_RESPONSE_SHAPE_MISMATCH. |
| STRUCTURAL/1001 |90.5117 ACTIONABLE | withheld | Earlier/later regimes differ, missed by overlapping prefix comparison; DISJOINT_PRICE_RESPONSE_UNSTABLE. |
| STRUCTURAL/1003 |110.0000 ACTIONABLE | withheld | Same mechanism; disjoint stability blocker. |
| STRUCTURAL/1007 |105.8327 ACTIONABLE | withheld | Same mechanism; disjoint stability blocker. |
| STRUCTURAL/1008 |102.8283 ACTIONABLE | withheld | Same mechanism; disjoint stability blocker. |

Every named regression checks original ACTIONABLE status using the frozen old policy, exact new blocker and null price/comparison/empty sensitivity. [Full safety report](pricing-research/milestone-11-12-optimizer-safety.md) includes every hash, all prospective classes and confusion denominators. [CSV](pricing-research/milestone-11-12-artifacts/optimizer-safety.csv) contains1015component cases;945HTTP-supported,70excluded3000-day component-only cases.

DEV11/17/23 unsafe approvals2/57→0/57; reused known1001–1012:6/228→0/228; prospective2001–2020:17/380→0/380. Known failures are now regressions, **not still held out after repair**. Prospective seeds were fixed before implementation and not used to tune thresholds; they are new seeds of the same families, not an independent merchant population. Broader coverage includes sparse/constant, season/marketing, selection/outliers, temporal shifts, missing costs, censored stock, backtest/reference failures and known response curves.

Changes are optimizer-only adequacy policy: replicated price-tier mean absolute log residual>log(1.10),≥15days/tier/3replicated tiers; supported disjoint halves (≥130eligible observations each, price residual SD≥.03/calendar R²≤.70) with existing .25 coefficient-difference tolerance. Unsupported diagnostics withhold. Existing estimator coefficients/objective/gates remain; new policy implies≥260eligible observations and can be restrictive for sparsely repeated/continuous prices. This is an engineering guardrail, not calibrated inference or causal identification. Version `constrained-contribution-v2` / `response-adequacy-v1` enters audit configuration/fingerprint so old-policy snapshots cannot alias new conclusions. No old audit row is rewritten.

## D. Preserved actionable controls and false abstentions

Exact cost40/elasticity−2 optimum80 unchanged. Independent genuine cyclic-price fixture remains ACTIONABLE at constrained90, both through the real model and PostgreSQL/HTTP/saved-evaluation tests. Mock-only gate tests additionally isolate arithmetic and are not presented as scientific identification proof.

Safe approvals remain6/24DEV,19/96known and33/160prospective HTTP-supported cases. Safe-case abstentions18/77/127 are reported as potential opportunity/false-abstention proxies, not automatically incorrect policy decisions: known response truth alone does not satisfy every forecast/reference/coverage/business gate. No previously allowed safe case is newly withheld in these finite fixtures. The known-optimum30-day research cases still fail the original backtest-evidence gate; that opportunity limitation is not hidden. Remaining real-world unsafe rate is unknown; perfectly price-aligned omitted effects may escape these diagnostics.

## E. E-commerce guidance

`GuidanceCalculator` is pure bounded BigDecimal arithmetic, separated from demand/optimization. Current facts=P−recordedC and margin/P, with unknowns null. Scenario operands are explicit merchant assumptions; units at each price are separate. Until the visible cost-exclusion confirmation, no scenarios calculate. Unknown fixed costs do not become zero; no-volume totals are unavailable. An assumed cost override never changes recorded facts.

Tax/discount/fees/extra unit costs/refunds have explicit bases and exclusions; fixed costs are only used for ceil break-even. Required-margin threshold rounds upward to4decimals and is displayed at its exact returned precision so currency display rounding cannot move it below the threshold. All other money is server decimal strings with normal currency formatting. No second frontend calculator. [Definitions/equations/examples](pricing-research/progressive-pricing-guidance.md).

Known100/cost40, assumed80candidate and100/156.25units over30days: contribution6000→6250. Explicit fixed1000: break-even17→25;40% target margin gives66.6667. This is neither a predicted volume change nor a supported optimized price. Zero/negative/missing/precision/extreme inputs, nonpositive contributions and invalid target denominators are tested.

## F. SaaS guidance and period semantics

Actual immutable plan/price/effective-date membership is checked. Starting (`retainedSubscribers` request field), new and cancelled subscribers are explicit whole-count assumptions; starting−cancelled+new, no inferred response to price. Servicing cost is per subscriber per actual billing period and must be supplied explicitly. Shared discount/fee/refund assumptions are visible; no proration, tax accounting, recognized-revenue engine or live collections are invented.

Annual1200→assumed1440, starting10/new2/cancel1, servicing240/year,10%discount/2%fee/refunds120: billings14256, normalized monthly recurring1188, normalized annual recurring14256, assumed paid full-period cash after fees/refunds13850.88, contribution11210.88. These are distinct scenario values, not ledger outcomes. Actual MRR/cash/subscriptions are unchanged. Original200+50−100=150MRR,1800ARR,50% subscription churn and25% net revenue churn pass existing tests. No validated SaaS price optimization model exists.

## G. APIs, persistence, security and exact manifest

GET `/api/v1/guidance/products/{productId}/variants/{variantId}`: ADMIN in normal mode, safe anonymous demo GET only; actual pair membership and server e-commerce mode. GET `/api/v1/saas/plans/{planId}/guidance?priceId=...&asOf=...`: ADMIN/SaaS-only and actual effective price in plan. Read-only repeatable-read; unsupported/repeated query parameters, wrong currency/period/resource/mode, invalid numerical bounds and ambiguous inputs fail closed. No scenario persistence/table/migration/provider call, price update or optimization audit insertion.

Evidence discriminants explicitly separate KNOWN_INPUT/OBSERVED, MERCHANT_ASSUMPTION and CALCULATED_SCENARIO from MODEL_ESTIMATE/ACTIONABLE_OPTIMIZATION. Existing single-business installation authorization is preserved, not relabeled as a new tenant model. Existing session expiry, CSRF on mutations, token encryption, demo denial, catalog editing/versioning and explicit immutable evaluation saving remain. Protected scenarios clear on session/selection change; no scenario URL/local-storage persistence.

Exact changed-file manifest is generated below and in [changed-files.txt](pricing-research/milestone-11-12-artifacts/changed-files.txt). No migrations; source V1–V7/permanent generator diff is empty.

- `backend/src/main/java/com/smartpricing/auth/SecurityConfiguration.java`
- `backend/src/main/java/com/smartpricing/forecasting/service/ControlledElasticity.java`
- `backend/src/main/java/com/smartpricing/forecasting/service/DemandModel.java`
- `backend/src/main/java/com/smartpricing/forecasting/service/ResponseDiagnostics.java`
- `backend/src/main/java/com/smartpricing/guidance/GuidanceCalculator.java`
- `backend/src/main/java/com/smartpricing/guidance/GuidanceController.java`
- `backend/src/main/java/com/smartpricing/guidance/GuidanceParameters.java`
- `backend/src/main/java/com/smartpricing/optimization/service/EvaluationAudit.java`
- `backend/src/main/java/com/smartpricing/optimization/service/OptimizationService.java`
- `backend/src/main/java/com/smartpricing/subscription/BusinessMode.java`
- `backend/src/main/java/com/smartpricing/subscription/SubscriptionGuidanceController.java`
- `backend/src/test/java/com/smartpricing/demo/DemoReadOnlyIT.java`
- `backend/src/test/java/com/smartpricing/guidance/GuidanceCalculatorTest.java`
- `backend/src/test/java/com/smartpricing/guidance/GuidanceIT.java`
- `backend/src/test/java/com/smartpricing/research/FrozenOptimizationService.java`
- `backend/src/test/java/com/smartpricing/research/LowDataBenchmarkTest.java`
- `backend/src/test/java/com/smartpricing/research/OptimizerSafetyRegressionTest.java`
- `backend/src/test/java/com/smartpricing/subscription/SubscriptionGuidanceIT.java`
- `docs/merchant-workflow.md`
- `docs/milestone-11-12-verification.md`
- `docs/pricing-research/milestone-11-12-artifacts/browser-report.json`
- `docs/pricing-research/milestone-11-12-artifacts/changed-files.txt`
- `docs/pricing-research/milestone-11-12-artifacts/database-invariants.txt`
- `docs/pricing-research/milestone-11-12-artifacts/keyboard-report.json`
- `docs/pricing-research/milestone-11-12-artifacts/optimizer-safety-summary.json`
- `docs/pricing-research/milestone-11-12-artifacts/optimizer-safety.csv`
- `docs/pricing-research/milestone-11-12-artifacts/permanent-demo.json`
- `docs/pricing-research/milestone-11-12-artifacts/verification-commands.txt`
- `docs/pricing-research/milestone-11-12-baseline-audit.md`
- `docs/pricing-research/milestone-11-12-optimizer-safety.md`
- `docs/pricing-research/progressive-pricing-guidance.md`
- `docs/subscription-setup.md`
- `docs/ux/screenshots/milestone-11-12/missing-cost.png`
- `docs/ux/screenshots/milestone-11-12/normal-guidance-1440.png`
- `docs/ux/screenshots/milestone-11-12/normal-guidance-375.png`
- `docs/ux/screenshots/milestone-11-12/README.md`
- `docs/ux/screenshots/milestone-11-12/saas-guidance-1440.png`
- `docs/ux/screenshots/milestone-11-12/saas-guidance-375.png`
- `frontend/src/app/core/presentation.spec.ts`
- `frontend/src/app/core/presentation.ts`
- `frontend/src/app/features/catalog/pages/product-detail.spec.ts`
- `frontend/src/app/features/catalog/pages/product-detail.ts`
- `frontend/src/app/features/subscription/workspace.html`
- `frontend/src/app/features/subscription/workspace.spec.ts`
- `frontend/src/app/features/subscription/workspace.ts`
- `frontend/src/app/shared/merchant/pricing-guidance.css`
- `frontend/src/app/shared/merchant/pricing-guidance.html`
- `frontend/src/app/shared/merchant/pricing-guidance.spec.ts`
- `frontend/src/app/shared/merchant/pricing-guidance.ts`
- `research/pricing/optimizer-safety-summary.mjs`
- `research/pricing/verify-progressive-demo.mjs`

## H. UX/browser/accessibility evidence

E-commerce: catalog → product/variant → separate pricing status → Pricing guidance link → known inputs → explicit scenario → optional formula. SaaS: Plans → Review plan → actual price/paid metrics first → separate annual/monthly assumptions/calculated comparisons. Missing cost states the missing operand and links to actual scoped Unit costs history; current authoritative edits retain existing version/CSRF protections. Demo-only edit wording is conditional. Model diagnostics remain under existing explanations and new blocker copy is plain language.

Browser plugin not available; cached Playwright1.65.0/installed Chrome and existing axe used, no new dependency. Production Angular build served on task-only proxies4204/4205/4206: final demo proxy targets verified actual8081; commerce/SaaS QA target verified8085/8086 with separate QA databases on5436. The final matrix explicitly checks rejection of unsupported parameters to establish it used the final strict-contract backend. Ordinary normal/demo backends8080/8081 were updated to the verified runtime and remain healthy; original4200/4201 dev servers unchanged. Actual usual-port Chrome smoke confirmed new guidance renders at4201 from updated8081 and4200 still requires sign-in, with no page errors.

| Mode |320|375|768|1440|
|---|---|---|---|---|
| Normal e-commerce QA |PASS|PASS|PASS|PASS|
| Read-only permanent demo |PASS|PASS|PASS|PASS|
| SaaS separate QA installation |PASS|PASS|PASS|PASS|

| Check | Result |
|---|---|
| URL/title/meaningful content, no blank/framework overlay | PASS; SaaS uses its existing generic Subscriptions document title at the Plans route. |
| Console/page health |0unexpected errors; induced GET abort and actual401 expiry are intentional/reported. |
| Actual interactions | API-backed Current/Scenario values, explicit inputs/consent, monthly/yearly math, missing cost, network retry, real server logout/expiry. |
| Keyboard/focus | Catalog Enter → guidance Enter/focus → native Tab/type controls → Enter cost disclosure → Space consent → Tab/Enter formula.17/25break-even and66.6667 exact threshold verified. |
| Back/reload | Actual cost-history link and native Back/reload retain the requested secondary variant; late dropdown defect corrected and regression-tested. |
| Accessibility |25matrix/state axe scans +1keyboard/open-costs scan;0violations for WCAG2A/AA/2.1A/AA tags. No manual screen-reader or independent participant certification. |
| Layout | No document overflow at all four widths; grids stack on phones;44px input targets and visible focus/disclosures. |
| Writes |0unexpected writes;0demo writes. Only explicit test fixture/login/logout operations, no scenario/evaluation/price/billing writes. |

[Browser JSON](pricing-research/milestone-11-12-artifacts/browser-report.json), [keyboard JSON](pricing-research/milestone-11-12-artifacts/keyboard-report.json), [screenshots/readme](ux/screenshots/milestone-11-12/README.md). Guides include actual screenshot-backed examples, explicitly labeled isolated synthetic QA, not merchant/permanent-demo recommendations. External temporary scripts/full captures: `C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/` (`guidance-qa.cjs`, `guidance-keyboard.cjs`, `guidance-missing-final.cjs`, `guidance-proxy.cjs`).

## I. Actual commands, counts and failed attempts

Captured summaries: [verification-commands.txt](pricing-research/milestone-11-12-artifacts/verification-commands.txt). PowerShell Java21: `$env:JAVA_HOME='C:/Program Files/Java/jdk-21.0.11'`. Maven commands from backend; npm/Node from root:

```powershell
./mvnw.cmd '-Dtest=ContributionOptimizerTest,OptimizationGateTest,IdentificationBenchmarkTest,LowDataBenchmarkTest,DecisionSupportResearchTest' test
./mvnw.cmd '-Dtest=OptimizerSafetyRegressionTest,ContributionOptimizerTest,OptimizationGateTest' test
./mvnw.cmd '-Dtest=GuidanceCalculatorTest' test
./mvnw.cmd verify '-Dit.test=GuidanceIT,SubscriptionGuidanceIT,OptimizationApiIT,DemoReadOnlyIT'
./mvnw.cmd verify
./mvnw.cmd verify '-Dtest=GuidanceCalculatorTest,LowDataBenchmarkTest,OptimizerSafetyRegressionTest,ContributionOptimizerTest,OptimizationGateTest' '-Dit.test=GuidanceIT,SubscriptionGuidanceIT,OptimizationApiIT,DemoReadOnlyIT'
npm.cmd test --prefix frontend -- --watch=false
npm.cmd test --prefix frontend -- --watch=false --include=src/app/features/catalog/pages/product-detail.spec.ts
npm.cmd run build --prefix frontend
node research/pricing/optimizer-safety-summary.mjs
node research/pricing/verify-progressive-demo.mjs http://localhost:8081
git diff --check
git diff --name-only 1e4b25b -- backend/src/main/resources/db/migration backend/src/main/java/com/smartpricing/demo
```

Full backend:120unit +66PostgreSQL integration,0failures/errors/skips,14:26min, finished2026-11-13T23:19:12Z. Final affected contract/oracle/research/demo rerun after strict parameter validation/metadata clarification:34unit +10IT,0failures/errors/skips,2:44min. Guidance calculator11pure tests; six named safety regressions plus development/real positive/confusion tests9; all previous security/accounting/oracle tests pass. No changed statistical thresholds after prospective results. Later changes are frontend copy/selection/display precision and docs, not backend algorithm changes.

Final frontend:145tests/35files passed with original timeout limits; production build451.51kB initial (115.60kB estimated transfer),15.980s, no budget warning or threshold change. Existing jsdom canvas getContext diagnostic remains, not a browser error or reason to install canvas. Earlier142/143/145runs and the final precision test are superseded by the final145run. Formatter-only changes do not alter API semantics.

Interim failures/corrections, not hidden: initial calculator compile used package-private SaaS prices from another package; controller moved into existing subscription bounded context. Initial parent UI test selected first outline button; made it select Why by purpose. One unchanged analytics test timed out under concurrent load; full reruns passed without raising limits. Temporary QA Windows path normalization and generic SaaS title assertions were corrected. A late browser check exposed asynchronously created variant options defaulting visually to the first entry despite correct URL/detail data: the new component regression reproduced1failure/1pass before fix; explicit selected-option binding then passed full145 and real Back/reload checks. Temporary QA PID-file parsing initially left old QA processes occupying ports; identified/stopped only those task JARs, restarted final verified services and reran the matrix with strict-contract probes. A temporary PowerShell/JS quoting error was corrected before the final successful run. Stitched panel-only sticky-header screenshots were replaced with actual viewport/full-page captures. Local ignored logs retain each attempt; no failed result is called a pass.

## J. Data, checksum, migrations and runtime

[Read-only SQL](pricing-research/milestone-11-12-artifacts/database-invariants.txt): normal0products/0orders/0refunds/1account/0evaluations/0subscription events; demo30products/9466orders/114refunds/0accounts/0evaluations/0subscription events; bothECOMMERCE. No business/demo reset or reseed. Synthetic browser fixtures live only in explicitly separate `smartpricing_guidance_commerce_qa` and `smartpricing_guidance_saas_qa` databases; no permanent SaaS demo fabricated.

Both databases retain V1–V7 checksums1436242292,581270318,−1414359703,56597636,147175724,−1432513541,−319300667. Source migrations and permanent demo generator unchanged. Original permanent checksum **6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34**, matchesSeed=true before/after actual updated-runtime reads.30variants,9466orders,114refunds,10044historical observations; all30withhold price/comparison/sensitivity. [All30current outcomes](pricing-research/milestone-11-12-artifacts/permanent-demo.json). Their current catalog facts can support labeled arithmetic without filling missing historical inputs or relaxing optimization.

Local normal/demo are served from `backend/target/smartpricing-1112-verified.jar` (ignored runtime copy), ports8080/8081 healthy. No provisioning/seed/reset for existing installations. Their session protections/cookie names remain; restart naturally requires a fresh login. Temporary QA processes/proxies/container are stopped after final checks, retaining optional isolated QA data for reproduction. No deployment or remote push.

## K. Explicit limitations

No calibrated intervals/causal proof/realized uplift/guaranteed net profit. The shape/stability diagnostics cannot identify every omitted marketing effect, endogenous price choice, carryover, substitution, repeated regime pattern or stockout selection. New minimum support/repeated-tier requirements can withhold valid continuous/sparsely repeated prices; broader false-abstention cost remains unmeasured beyond this finite benchmark. No unvalidated priors/pooling/experiments, competitors or merchant data generation. Guidance relies on recorded current catalog values (read date is not a freshness guarantee) and explicit assumptions/exclusions, not recovered latent demand. No new scenario persistence or period-aware revenue-recognition model.

Independent merchant/founder usability **NOT VERIFIED**; no participant session or manual screen-reader certification. `LIVE_SHOPIFY_NOT_VERIFIED`; live billing unavailable. Automated engineering checks do not change those labels or mark11.10independently complete.

## L. Local Git delivery

Branch `codex/milestone-01`; audit e2a3e9a, optimizer repair d50aca2, decimal services/contracts cdbf9a0, Angular guidance b92201c. Final UI regression/display commit aa4e6be; evidence commit is the commit containing this report. Final response and `git log -6 --oneline` identify its exact HEAD. No push, deployment, rewritten history or backdated timestamps. Final response records exact delivery HEAD and post-commit clean status.

## M. Evidence-based 11.13 and final12 backlog

1. Independent merchant/founder comprehension sessions on assumptions, missing costs, fixed-cost break-even and annual cash versus normalized recurring revenue; record actual outcomes, not engineering guesses.
2. Independently designed continuous-price/smooth-confounding/carryover/substitution/regime-shift families and held-out groups; quantify false-abstention costs, especially the replicated-tier/minimum-half-history rules. Do not relax gates merely to activate permanent demo products.
3. Exogeneity/provenance and calibrated uncertainty research before stronger statistical authority; priors/pooling/live experiments require separately reviewed protocols/approval and remain deferred.
4. Evaluate extended fee/refund recovery, proration/tax and recognition semantics only with explicit source definitions; no silent accounting expansion or live billing claims.
5. Final Milestone12 release review: security/regression/integrity and merchant-task evidence, operational rollback/audit retention, clear live-integration scope and explicit unresolved limitations. No automatic price/provider writes authorized here.
