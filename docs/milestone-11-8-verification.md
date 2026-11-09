# Milestone 11.8 — Pricing insights and recommendations UX

## A. Executive summary / before and after

Implemented this milestone only. Before: large repeated comparison cards, submit-only discovery and a long inline diagnostics section. After: compact searchable variant rows → focused price/status/comparison → optional Why this result? modal with expandable scientific evidence and explicit audit actions. Views/counts are honestly scoped. No fabricated opportunity, price, confidence, image or realized outcome. Milestone 11.9/12 have not started.

## B. Pre-code audit

Verified clean codex/milestone-01 at 39d06dc4cb13c6c5776bbd0741a3ae42a14663fc. Read actual catalog/detail, optimization/forecast/analytics/readiness/shared components/routes, DTO/controller/service, evaluation history, existing tests, Zard source/config/guidance, design-system, merchant guide,11.7 verification and optimization/model-quality docs. The mandatory pre-code audit was committed as 9a3fbcf — docs(pricing): audit Milestone 11.8 before implementation. Exact path: docs/ux/milestone-11-8-audit.md.

Actual pre-code screenshots were captured by baseline.cjs, before-pricing-1440/768/375/320.png and before-evidence-1440/768/375/320.png. They are observed demo states, not generated concepts. The audit records API gaps, status mapping, interaction design and priorities.

## C. Implemented routes, fields and exact file manifest

Existing /optimization URL retained. Optional search/startDate/endDate/horizonDays/page/pricingView/pricingStatus/variantId query state supports discovery, pagination, browser history and selected-variant links. Catalog's existing View pricing evidence target opens the focused view; catalog/sales/forecast/readiness links retain supported IDs/date/context. Only same-page query navigation stops resetting the main landmark focus; actual page changes still focus main.

Reuse: Zard button/input/badge and existing PriceComparison, SensitivitySummary, ProductThumbnail, ProductContext, ModalFocus and EvaluationHistory. New PricingResult article/row, PricingEvidence component and typed pricing-presentation helpers stay within the existing system. No initializer/migration/overwrite, dependency upgrade, chart library or separate design system. Existing frontend-design/testing skills and reviewed official Zard source/rules guided the work. Native modal composition is deliberate because a Zard sheet/dialog was not installed.

Actual API fields used: Evaluation.variant identity; window, horizonDays, evaluationInstant and modelVersion; effective reference price/unit cost and their dates; catalog/feasible price bounds; stock cap/date/quality and reference units; recommendation status/reasons/assumptions; current/candidate scenarios and returned estimated contribution uplift/percentage; elasticity method/estimate/samples/logRMSE/identification diagnostics; forecast method/status/assumed price/units/reasons; chronological backtest folds; returned sensitivity points. History uses existing bounded GET and explicit POST. Missing-day/readiness counts are not in Evaluation: link to scoped readiness instead of inventing counts. evaluationInstant is the historical analytical cutoff (service end-date anchor), labeled as of rather than current wall-clock time.

Search is product/variant name or SKU, 300 ms debounced with explicit submit; × clears search/local view/status and keeps the deliberate history/horizon. Unsupported backend category/status/sort controls are not invented. Backend order and 10-record pages remain. Page results reuse their matching DTO on selection; a direct/unloaded variant gets one scoped cancellable GET. Date/search/horizon changes cancel/clear old results; session loss clears protected results. Optional catalog checks pause after 10 batches (up to 100 variants) per user action; Continue is explicit. Cancel/error retain valid partial results and Retry resumes the failed batch.

Exact repository-relative manifest:

- docs/merchant-workflow.md
- docs/milestone-11-8-verification.md
- docs/ux/design-system.md
- docs/ux/milestone-11-8-audit.md
- frontend/src/app/app.spec.ts
- frontend/src/app/app.ts
- frontend/src/app/core/confirmation.ts
- frontend/src/app/core/session.service.ts
- frontend/src/app/features/optimization/catalog-check.spec.ts
- frontend/src/app/features/optimization/catalog-check.ts
- frontend/src/app/features/optimization/evaluation-history.spec.ts
- frontend/src/app/features/optimization/evaluation-history.ts
- frontend/src/app/features/optimization/optimization.css
- frontend/src/app/features/optimization/optimization.html
- frontend/src/app/features/optimization/optimization.spec.ts
- frontend/src/app/features/optimization/optimization.ts
- frontend/src/app/features/optimization/pricing-evidence.css
- frontend/src/app/features/optimization/pricing-evidence.html
- frontend/src/app/features/optimization/pricing-evidence.ts
- frontend/src/app/features/optimization/pricing-result.ts
- frontend/src/app/shared/merchant/decision-summary.ts
- frontend/src/app/shared/merchant/pricing-presentation.spec.ts
- frontend/src/app/shared/merchant/pricing-presentation.ts
- frontend/src/app/shared/merchant/product-thumbnail.ts

No backend endpoints, DTOs, migrations, seeder, model math/gates, package manifests or lockfiles changed.

## D. Status mapping and scientific safeguards

| API / presentation condition                                       | Merchant status / behavior                                                       |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| ACTIONABLE plus complete numeric returned price and both scenarios | Actionable; supported current → proposed price, units and estimated contribution |
| DIAGNOSTIC_ONLY / UNRELIABLE_ELASTICITY                            | Confounded or uncertain; no proposed price/comparison/chart leaked               |
| INSUFFICIENT_DATA                                                  | Insufficient history                                                             |
| MISSING_COST / MISSING_PRICE / INVALID_CONSTRAINTS                 | Needs evidence                                                                   |
| UNAVAILABLE_FORECAST / incomplete actionable payload               | Unavailable                                                                      |
| INACTIVE_VARIANT                                                   | Inactive; review catalog                                                         |
| HTTP/identity failure                                              | Explicit error/retry; not zero or a catalog-wide absence claim                   |

Primary abstention says No reliable price suggestion yet. One sentence summarizes actual reason codes. Tentative coefficients remain in evidence; the existing gated1%-association explanation is only shown for supported READY/conditional identification. UNCERTAINTY_UNAVAILABLE is explicit in advanced diagnostics. Forecast availability alone never establishes a price opportunity. Permanent seasonal truth−1.1 versus estimated−0.567 remains a documented confounded result; no estimator/scientific threshold was changed.

Contribution means sales minus known variable costs, with other expenses excluded. API-returned absolute/percentage contribution differences are shown directly; no second frontend pricing/profit calculator or separate price-change percentage was invented. Exact decimals remain in evidence. Only chart coordinates use approximate Number conversion. The existing monochrome SVG connects actual returned model scenarios, not observations or confidence bands; absent/unreliable data yields no sensitivity chart. Phones get a labeled local scroll region and readable axes.

All30demo variants still abstain. Independent actionable UI fixture is copied unchanged numerically from the existing90-price test response into an external JSON artifact; identity labels explicitly say UI fixture. Returned price100→90, units700→864.1975, contribution42,000→43,209.8765, difference1,209.8765/2.8807% are verified without frontend recalculation. Fixture views/saves are intercepted and are not permanent/demo data. Backend optimum80 oracle and independent supported90 integration fixture still pass.

## E. Screenshots, walkthroughs and accessibility

Browser plugin not available; used existing cached Playwright1.65.0 and actual Chrome157.0.8103.78. No browser/dependency installation. Local demo4201→8081 and normal4200→8080 remained isolated. Evidence root outside Git: C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/Milestone 118.

verify-demo.cjs covers1440×900,768×1024,375×844,320×844: actual explorer, focused abstention, evidence dialog and helpful empty actionable view at each width, plus a complete30-row check (17scans). Search/SKU/debounce, loaded-only filters with no server-status request, pagination/back/forward, preserved results and catalog variant links, cached selection without a duplicate scoped GET, no-match/read error/retry, modal viewport bounds, body scroll restoration, Escape/Tab focus, row focus return and no writes all pass. The native evidence section is reached with Tab and opened with Enter, not merely clicked by automation.

verify-normal.cjs first checks the actual authenticated empty workspace, then identified intercepted fixtures at the same four widths. Explorer, actionable focus and evidence (12scans), plus expanded sensitivity/evidence at375/320 (2more), pass. It verifies exact price/currency/units/contribution/uplift, supported−2 local interpretation, unreliable/missing-price withholding, no automatic GET history/POST save, explicit failed/successful/forbidden saves, duplicate-click suppression, busy modal feedback, historical saved snapshot labels and actual CSRF403/session-expiry login return context. A7-day explicit selection is retained; frontend default remains30. Close waits only while an explicit save is pending, with live feedback; timeout/result releases it, without a nested modal. Browser unload still warns that a pending server save may finish.

Final axe-core4.11.0 WCAG2/2.1 A/AA:31scans (17demo+14normal),0violations. No final relevant runtime/console errors or unexpected business writes. Expected controlled401/403/503/aborted resource failures are distinguished. No full screen-reader, Safari/Firefox or independent-merchant usability study is claimed. Walkthrough is developer-led automated/visual QA, not human comprehension timing.

Screenshot names: after-explorer-1440/768/375/320.png, after-focused-abstention-_.png, after-evidence-dialog-_.png, after-actionable-empty-_.png, after-complete-demo-check-1440.png; fixture-explorer-_.png, fixture-actionable-focus-_.png, fixture-evidence-_.png and fixture-expanded-model-evidence-375/320.png. Actual before/after and fixture screenshots were viewed with view_image. Fixture names intentionally distinguish them from store data.

Fixes found during QA: canonical query keys removed duplicate reads; a pending focus timer no longer steals focus from Why; the shell preserves focus on query-only navigation; ModalFocus includes native summary headings; dialog centering/body scroll were corrected; phone toolbar/captions were compacted; sensitivity axes scroll locally instead of shrinking unreadably. Tests use completed-render state checks rather than immediate post-click counts. No failure was hidden by raising a global timeout/budget.

## F. Exact commands and actual results

- npm.cmd test --prefix frontend -- --watch=false: exit 0,117tests in30files (baseline109). Added status/incomplete comparison, local scope/empty state, loaded-result reuse, modal focus, selected-response mismatch, explicit catalog cap and query-focus coverage. Existing auth/editor/evaluation/model-facing UI regressions retained. JSDOM's known canvas getContext warning remains; browser verifies rendered interaction.
- Backend directory: .\mvnw.cmd verify: exit 0 BUILD SUCCESS;89unit+55PostgreSQL/Testcontainers integration tests,0failures/errors;8m49s. XML totals counted. No backend files changed afterward.
- npm.cmd run build --prefix frontend -- --stats-json: exit 0. See bundle comparison below; no budgets changed.
- External QA working directory: node baseline.cjs; node verify-demo.cjs; node verify-normal.cjs. Final runs exit 0. Results in demo-browser.json/normal-browser.json and Milestone 118-*.log. All 31 scans pass.
- git diff --check; repository Prettier --check for all changed/new frontend files: final pass recorded at commit finalization. No npm install or CLI overwrite.

## G. Bundle comparison

Initial production bundle 508.62 kB versus 508.37 kB: +0.25 kB (~0.05%). The root's bounded query-key validation and same-page focus state account for a small shared-code increase. Pricing components stay lazy; no heavyweight package added. Existing 500 kB warning exceeded by 8.62 kB; 1 MB error budget unchanged. Warning remains, not falsely claimed resolved. There is no new component-style budget warning.

## H. Data, migrations, security and saves

GET demo/summary: matchesSeed=true, original/current checksum6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34. Three10-row Full2025/horizon30 reads independently verify21DIAGNOSTIC_ONLY,3INACTIVE_VARIANT,3MISSING_PRICE,3UNRELIABLE_ELASTICITY; total 30, every recommendedPrice/comparison null, sensitivity empty. Actual normal anonymous business GET401; demo mutation403.

Direct PostgreSQL: normal 0 products / 0 orders / 1 account; demo 30 products / 9,466 orders / 0 accounts. Both retain 0 sync jobs, 0 source mappings, 0 model evaluation records. V1–V6 success/checksums unchanged:1436242292,581270318,-1414359703,56597636,147175724,-1432513541. No reset/reseed or append-only history alteration. All three fixture save attempts were intercepted (503/success/403); no fixture snapshot persisted.

Existing sessions/auth/role enforcement, CSRF and 401 versus403 handling remain. Safe local return URLs accept only bounded supported pricing keys; duplicate/unknown/external values stay rejected. Demo sends no writes. Saving is an explicit authenticated CSRF-protected server re-evaluation; open/navigation do not save. Native escape/unload behavior and session clearing are verified. No credentials/tokens in logs/storage/screenshots. No automatic price application.

## I. Limitations / deferred

Backend has no global status/category filter or recommendation sort; views/status/counts are explicitly local to the page/loaded scan. Checked 100 of N is partial until complete, not a global eligibility result. A paused scan requires explicit continuation, retaining previous loaded rows. No calibrated uncertainty, realized uplift, causal price guarantee, recovered stockout demand or product-level price is introduced. The existing catalog has no image source, so placeholders remain. Historical timestamps are analytical as-of cutoffs, not wall-clock calculation times.

No independent merchant study or full assistive-technology certification. LIVE_SHOPIFY_NOT_VERIFIED remains true. Actual normal data is empty; supported/actionable UI behavior uses identified intercepted fixtures and independently passing PostgreSQL integration tests. Remaining initial warning is documented. Milestone 11.9,11.10 and12 were not started.

## J. Local Git

Branch codex/milestone-01; baseline 39d06dc. Pre-code audit 9a3fbcf. Implementation commit: 8dfca1b (feat(pricing): add compact insights and progressive evidence). Test commit: 843e740 (test(pricing): cover scope caching keyboard and bounded checks). This report is included in the following documentation commit; its exact HEAD and clean status are checked at delivery. No push, deployment, reset, rebase or fabricated history.11.8 is ready for product-owner review with the stated provider/scientific/independent-usability limits.
