# Milestone 11.6 — Product UX Foundation

## Summary

Implemented the authorized foundation scope, preserving the prior simplified insight workflows. Merchants now get a concise shell, real overview results with a visible pricing status, readable currency, product identity/fallback and explicit next actions. No backend/domain/dependency changes or full 11.7/11.8 rewrite. Work is local only.

## Baseline audit

Actual starting HEAD was f42470a on codex/milestone-01, clean; the supplied b9f74c5 reference was stale. The pre-code audit was committed as 9b2ad99 (docs(ux): record milestone 11.6 baseline audit before implementation). See [audit](ux/milestone-11-6-audit.md) for route inventory, priorities and workflow map.

Before evidence maps directly: before-overview-1440.png → /; before-products/orders/forecasting/optimization/onboarding/categories/settings/store-connection-1440.png → corresponding routes; before-overview/products-390.png → mobile; before-normal-overview/products/onboarding/store-connection.png → authenticated normal state. Files are real Chrome captures, not generated concepts.

The old shell repeated a generic subtitle, large mode notice, sidebar safety text and footer slogan. Body/nav/captions were small. Overview printed4 decimal money and gave the exploration checklist priority over the actual pricing status. Product rows lacked identity hierarchy, order fallback IDs were long, and category cards were oversized. Prior insight work already hid technical tables; it was preserved.

After IA: Overview / Products / Orders; Insights: Analytics, Forecasts, Pricing insights; Settings: Shopify, Data readiness, Business settings, Categories. All original URLs/contextual evaluation links remain. Overview now has period →4 real metrics → black chart/pricing result → stock next action → optional exact amounts/connection diagnostics. At smaller widths pricing precedes the chart; phone metrics use a full-width sales card and3 compact count cards. Product entries use actual name, neutral image fallback, text status and View variants.

## Zard/skills

Angular/CLI22.2.6, CDK 22.2.6, TypeScript 6.0.3, Node 24.22.1/npm 11.19.1, ng-icons 36.1.0, Tailwind 4.3.5, ngx-echarts 22.0.0/ECharts 6.1.0 unchanged. Existing registry source remains pinned/provenanced in shared/zard-provenance.json; no npm/CLI/registry operation was needed.

Used frontend-design, frontend-app-builder, frontend-testing-debugging and imagegen guidance, plus previously reviewed official Zard SKILL.md, CLI/customization and Angular/styling/composition/forms/icons rules accessible in the temporary smartpricing-zard-review download. No global skill installation, init, migration, project generation, baseUrl addition, blind overwrite or version upgrade. Existing native-host button/tooltip/chart compatibility repairs remain.

Reuse: Zard cards, buttons, input, badge, alert, skeleton and chart. New ExplainMore composes Zard buttons with existing native dialog/ModalFocus because dialog/sheet is not installed. It retains native Escape, labels, focus containment/restoration and refuses nested dialogs. Design tokens, component aliases and copy rules are documented in [design system](ux/design-system.md).

## Files changed

Exact manifest (foundation code, adaptations, tests and documentation):

- docs/merchant-workflow.md
- docs/milestone-11-6-verification.md
- docs/ux/design-system.md
- docs/ux/milestone-11-6-audit.md
- frontend/src/app/app.css
- frontend/src/app/app.html
- frontend/src/app/app.spec.ts
- frontend/src/app/app.ts
- frontend/src/app/core/environment-indicator.spec.ts
- frontend/src/app/core/environment-indicator.ts
- frontend/src/app/core/session-nav.ts
- frontend/src/app/features/catalog/pages/product-list.ts
- frontend/src/app/features/forecasting/forecasting.html
- frontend/src/app/features/forecasting/forecasting.spec.ts
- frontend/src/app/features/history/orders.ts
- frontend/src/app/features/home/home.css
- frontend/src/app/features/home/home.html
- frontend/src/app/features/home/home.spec.ts
- frontend/src/app/features/home/home.ts
- frontend/src/app/features/onboarding/onboarding.ts
- frontend/src/app/features/optimization/optimization.html
- frontend/src/app/shared/merchant/decision-summary.ts
- frontend/src/app/shared/merchant/foundation.spec.ts
- frontend/src/app/shared/merchant/foundation.ts
- frontend/src/app/shared/merchant/primitives.ts
- frontend/src/app/shared/merchant/sales-chart.ts
- frontend/src/styles.css

No backend, migrations, seeder, API DTOs, package manifests, lockfile, route URL or authorization policy changed. Alias exports adapt existing StatCard/InlineNotice/ResponsiveDataList behavior rather than creating parallel primitives.

## User flows verified

Evidence directory outside Git: C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone116. Scripts: baseline.cjs, verify.cjs, editors.cjs, insights-regression.cjs; result JSON files are retained beside screenshots. Browser plugin unavailable; used installed Chrome via cached Playwright, following the testing skill fallback.

Final viewport matrix:1440×900,768×1024,390×844. The main matrix covers 10 demo routes and 11 normal routes at each width (63 route views). The authenticated editor walkthrough covers 12 normal routes at each width (36 route views), including manual-order entry and safe callback handling. The insight regression adds 4 demo/4 normal routes at 3 widths (24 views) plus controlled actionable/evaluation fixtures. These are browser checks, not 123 independent user tasks.

Verified: demo identification and Products in 1 desktop / 2 mobile navigation actions; actual 2025 metrics and withheld status; catalog search coffee → actual Roasted Coffee 3 detail, Back/Forward; Why? opening/closing and trigger restoration; drawer Tab/Shift+Tab/Escape; exact chart-period select/table; actual normal empty screens; validation focus/descriptions, disabled pending controls, retained 503 save draft, deliberate cancel/discard; no permanent fixture save. Partial overview pricing failure retains counts, suppresses a false catalog-wide absence claim and retries the failed batch. Unexpected business writes are denied in browser fixtures. Actual anonymous normal 401 and demo POST 403 are independently checked against local backends.

Screenshot filenames are route/width based: `after-overview-1440.png`, `after-overview-768.png`, `after-overview-390.png`, `after-products-390.png`, `after-orders-390.png`, `after-optimization-390.png`, `after-mode-dialog-390.png`, `after-menu-768.png` and equivalent captures for all matrix routes. Normal captures use `after-normal-` prefixes. Representative actual captures: [desktop overview](C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone116/after-overview-1440.png), [phone overview](C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone116/after-overview-390.png), [phone products](C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone116/after-products-390.png).

Before/after captures and the generated concept were viewed directly. The concept `exec-0a0186f2-428e-4dbf-a97b-4ed023872d77.png` is inspiration only, not app/usability evidence.

Visual review found and fixed a squeezed phone product table (restore 660px local scroll width) and too-late mobile pricing status (count-card density and pricing-before-chart). An overview effect initially tracked catalog-check state; untracked loading/reset prevents repeated requests. Tests deliberately cover partial/error completion and exact amounts. Earlier assertion races and the searchbox role selector were corrected in QA. Automated passes were not accepted as a substitute for rendered review.

| Fidelity / task consideration | Final decision                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Shell                         | Short brand/mode/account header and 232px neutral rail; no repeated subtitles/slogans                           |
| Hierarchy                     | Real KPIs and explicit pricing status replace the demo exploration checklist                                    |
| Type                          | Readable16px body,14px tables, restrained weights; efficient spacing rather than smaller type                   |
| Palette/chart                 | Graphite/neutral and a real black line; the latest11.6 no-gradient brief supersedes prior area-gradient styling |
| Data                          | Actual MAD totals/date buckets, no opportunity count/readiness donut/photos; raw amounts remain inspectable     |
| Responsive                    | Dismissible keyboard drawer, readable locally scrolling tables; pricing precedes chart below 1200px             |
| Evidence                      | Optional explanations/details preserve all prior technical and evaluation workflows                             |

No independent tester was available. Developer heuristic walkthrough timings are automated interaction/navigation durations, not human comprehension times or an unguided user study. The developer already knew the application. Final automation durations: find product 943ms; locate pricing status 996ms; open explanation 78ms; return to overview 51ms. The path was obvious to the implementation-aware developer, so these are navigation/interaction measurements rather than comprehension evidence. Initial visual-review confusion was the squeezed phone table and late pricing status; both were corrected. Exact observations are retained in verification.json. Remaining comprehension risk requires merchant review/11.10.

## Verification

- backend: .\mvnw.cmd verify (backend working directory), exit0 BUILD SUCCESS;89 unit +55 integration tests,0 failures/errors/skips, disposable Testcontainers PostgreSQL. Report XML totals were counted directly. Runtime9m16s.
- frontend: npm.cmd test -- --watch=false (frontend), exit0;98 tests,27 files. Tests cover decimal precision/rounding/unknowns, explanation labels/nested-modal protection/focus, navigation/mode, complete vs partial pricing status/retry, exact disclosure, historical dates and all existing auth/editor/evaluation workflows. JSDOM emits the existing unimplemented canvas getContext warning; real Chrome verifies the chart.
- frontend: npm.cmd run build, exit0; initial bundle 538.87 kB (500 kB warning exceeded by 38.87 kB;1 MB error threshold untouched). Existing500 kB warning /1 MB error budgets were not raised. Root mode disclosure now eagerly uses existing Zard button/composition helpers; report the initial-size cost rather than hide it.
- Browser main matrix:63 route views,30 axe-core4.11.0 scans (WCAG2/2.1 A/AA), final0 violations/0 page errors. Separate editor/insight scripts monitor runtime/console warnings/errors, ignoring expected controlled401/403/503 resource failures. All three scripts exited 0. The insight regression independently adds 12 axe scans with 0 violations, giving 42 scans in total. It confirms real catalog completion/retry/cancel/filter reset, explicit 14-day link retention, separate illustrative example, actual forecast dates, missing-data fixes, demo save absence and a normal explicit 30-day CSRF save intercepted without persistence. No runtime/console issues or unexpected writes were reported.
- git diff --check and local formatting checks completed. No live-provider, full screen-reader, Safari/Firefox or independent human-usability certification is claimed.

The first sandboxed Vitest attempt could not read generated temporary files; an authorized unsandboxed run was used. A test run concurrent with build/browser work timed out one analytics case; the isolated final complete suite passes. A removed duplicate demo-date banner assertion was updated to the still-visible actual historical date window. No timeout thresholds were increased.

## Data/security

Direct read-only PostgreSQL checks after QA: normal 0 products/0 orders/1 account; demo 30 products/9,466 orders/0 accounts. Both 0 sync jobs, 0 source mappings, 0 model evaluations. All Flyway V1–V6 success flags/checksums unchanged:1:1436242292,2:581270318,3:-1414359703,4:56597636,5:147175724,6:-1432513541. No reset/reseed or persistent fixture writes.

GET demo/summary reports matchesSeed=true and original/current checksum 6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34. Three 10-row optimization GETs over Full 2025/horizon 30 confirm all 30 abstentions:21 DIAGNOSTIC_ONLY,3 INACTIVE_VARIANT,3 MISSING_PRICE,3 UNRELIABLE_ELASTICITY. Every recommendedPrice/comparison is null and sensitivity empty. No fabricated price, profit, score, model coefficient or photo is displayed.

Existing auth interceptor, CSRF, editor/dirty guards, session-loss clearing and role enforcement remain. Overview business reads wait for authorized mode and clear on loss; component destruction cancels the demo-only bounded catalog scan. Normal overview never automatically scans a merchant's potentially large catalog. Evaluation save remains an explicit authenticated CSRF-protected action; prices are not automatically applied. Credentials/cookies are never logged. LIVE_SHOPIFY_NOT_VERIFIED remains true.

## Limitations/deferred

No independent merchant test, full screen-reader certification or live Shopify verification. Readability and direct task paths are improved, but developer timings do not prove novice comprehension. Intentional horizontal tables remain; catalog gallery/images/detail are 11.7, full pricing workflows 11.8, subscriptions 11.9 and independent usability validation 11.10. Existing detailed monetary displays retain original precision; this milestone formats overview/order-list display with raw values still available. No locale preference exists, so display uses en plus the API currency. Normal database is empty; eligible UI/save behavior uses clearly disposable intercepted fixtures and backend integration tests.

The build's warning-level initial-size increase remains a documented optimization opportunity, not a raised budget or hidden failure. Milestone 11.7 has not started.

## Git

Branch codex/milestone-01; starting f42470a. Pre-code audit 9b2ad99. Implementation commit 64eac2f — feat(ux): establish readable merchant product foundation. This verification report follows in a separate local documentation commit; its final hash is reported at delivery. No push/deployment/history rewrite. Final HEAD/status are verified after committing.
