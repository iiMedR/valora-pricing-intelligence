# Milestone 11.7 — Visual catalog and focused product detail

## A. Executive summary

Implemented this milestone only. Products now has grid/list discovery, compact identity placeholders, search/reset, supported filters, bounded pagination and URL-preserved results. Detail focuses on one selected variant with readable current price/cost, scoped sales totals, pricing status and optional evidence. Existing edits/archive/CSRF protections remain. No image/financial data, model output or product aggregate is invented.

## B. Baseline audit

Starting branch codex/milestone-01 was clean at a9654e7706e552fbc2f92583eb3f0f0b8a650a58. Inspected actual configs, source, DTOs, backend catalog sorting, analytics scope, Shopify import/migrations, prior audit/design/merchant/report and existing tests. Mandatory pre-code audit was committed as 807474c (docs(ux): audit visual catalog before milestone 11.7), before application changes. See [audit](ux/milestone-11-7-audit.md).

Observed friction: table-only catalog; loss of result context; long repeated variant cards, raw4decimal money, absent focused pricing status; reused route snapshot could retain an old product ID. No image or product-level price/count fields exist in list DTOs. Product order is fixed server-side createdAt DESC then id; no supported sort parameter. Kept this stable order and labeled it instead of inventing page-only sorting.

Actual baseline screenshots from baseline.cjs: before-catalog-1440/768/390/320.png and before-detail-1440/768/390/320.png. They are actual anonymous demo states, not generated visual concepts or independent-user observations.

## C. Implementation and exact paths

### Catalog and focused detail

- features/catalog/pages/product-list.ts/.css:20 records/page;300 ms search debounce; explicit Apply/Clear filters; grid/list aria-pressed; stable server ordering; search/category/status/page/view in query params; canceled superseded requests; no per-tile detail/analytics/forecast requests. The same full anchor opens a tile/row without nested interactive controls.
- features/catalog/pages/product-detail.ts/.css: live route ID/variant selection; product category/status/count from detail DTO; selected variant's own price/cost; explicit invalid selection; raw price/limits in details; unavailable live-stock statement and real dated-history link. Editing/saving disables selection. Stacked controls prevent narrow-name columns at phone widths.
- features/catalog/components/product-entry.ts/.css and variant-summary.ts: reusable entry and bounded, independent sales/pricing reads. Returned IDs are checked; partial/mismatched/missing results do not become zero or another SKU. Price suggestions require the returned actionable status, price and comparison. Why opens actual reasons/assumptions/model metadata, not a second optimization workflow.
- shared/merchant/product-thumbnail.ts: safe dimensioned/lazy image support and resilient initials fallback. Current production DTOs provide no source, so actual products use placeholders.
- shared/merchant/product-context.ts and small analytics/forecasting/optimization adaptations: selected-variant sales context, supported date/horizon deep links, automatic selected forecast/pricing opening and return-to-product/result context. Existing evidence pages remain intact. Store-wide charts are never passed off as variant trends.

### Safety and performance repairs

A successful create could leave the old busy form visible to the navigation guard before Angular rendered the success state. The completed form is now removed before navigating; failed drafts remain untouched. Added regression coverage. Same-component product-ID changes reload data and cancel stale reads. Existing optimistic versions and confirmations are retained.

Workspace explanation loads on demand through EnvironmentDetails, keeping its native trigger small and its existing Zard/native-modal focus behavior. Safe return-URL validation whitelists only the new bounded catalog/evidence keys and UUIDs; duplicates/unknown keys/external returns remain rejected. Labels on select controls are explicit.

Fast navigation exposed ngx-echarts initializing after its async engine had resolved on a destroyed page, causing zero-size and destroyed-output warnings. The app-owned SalesChart wrapper now loads the existing engine before mounting the directive and ignores completion after destruction. Chart loading/failure still leaves the exact-value table available. No node_modules/vendor source or chart dependency was changed.

### Exact changed-file manifest

All paths below are repository-relative; shorthand descriptions above refer to frontend/src/app.

- docs/merchant-workflow.md
- docs/milestone-11-7-verification.md
- docs/ux/design-system.md
- docs/ux/milestone-11-7-audit.md
- frontend/src/app/app.spec.ts
- frontend/src/app/core/auth-integration.spec.ts
- frontend/src/app/core/environment-details.ts
- frontend/src/app/core/environment-indicator.spec.ts
- frontend/src/app/core/environment-indicator.ts
- frontend/src/app/core/session.service.ts
- frontend/src/app/features/analytics/analytics.html
- frontend/src/app/features/analytics/analytics.spec.ts
- frontend/src/app/features/analytics/analytics.ts
- frontend/src/app/features/catalog/components/product-entry.css
- frontend/src/app/features/catalog/components/product-entry.ts
- frontend/src/app/features/catalog/components/product-form.ts
- frontend/src/app/features/catalog/components/variant-form.ts
- frontend/src/app/features/catalog/components/variant-summary.spec.ts
- frontend/src/app/features/catalog/components/variant-summary.ts
- frontend/src/app/features/catalog/pages/product-detail.css
- frontend/src/app/features/catalog/pages/product-detail.ts
- frontend/src/app/features/catalog/pages/product-list.css
- frontend/src/app/features/catalog/pages/product-list.spec.ts
- frontend/src/app/features/catalog/pages/product-list.ts
- frontend/src/app/features/forecasting/forecasting.html
- frontend/src/app/features/forecasting/forecasting.ts
- frontend/src/app/features/optimization/optimization.html
- frontend/src/app/features/optimization/optimization.spec.ts
- frontend/src/app/features/optimization/optimization.ts
- frontend/src/app/shared/merchant/product-context.ts
- frontend/src/app/shared/merchant/product-thumbnail.spec.ts
- frontend/src/app/shared/merchant/product-thumbnail.ts
- frontend/src/app/shared/merchant/sales-chart.ts
- frontend/src/styles.css

No backend endpoints/DTOs, package/lockfile, migrations, seeder or optimizer were changed. Existing URLs/guards remain; only optional query context was added.

## D. Data and image strategy

Product list has identity/category/status only: no trustworthy price range, image or variant count. Cards say View variants, with no N+1 fetches. Detail reads actual variants/settings and uses the existing exact-string/Intl currency formatter, retaining stored/transmitted precision in expandable details. No compare-at price is supported. Unknown cost stays unavailable; catalog price is not substituted for a missing dated optimizer price.

A product-scoped analytics variants endpoint supplies totals, with a bounded SKU search and exact variant-ID check. If that selected row is not in the returned bounded page, totals are unavailable; no unbounded scan occurs. There is no variant-scoped sales-trend endpoint or live-stock field in catalog, so detail clearly links to existing evidence rather than inventing a chart or availability.

ProductThumbnail accepts only credential/query/fragment-free image URLs under same-origin /assets or /images, or HTTPS cdn.shopify.com; it rejects arbitrary hosts and unsafe schemes. Loading is lazy, dimensions/aspect are stable, alt is explicit, referrer is suppressed and broken sources fall back. Unit tests cover successful/missing/broken/unsafe sources and replacement. No source is manufactured or persisted. **Real imported image success: NOT RUN — neither current Shopify importer nor DTO/DB carries images.** Provider-image end-to-end behavior remains unverified; placeholders are the intentional supported current state. No migration was necessary.

## E. UX, browser and accessibility evidence

Browser plugin not available; used cached Playwright 1.65.0 with installed Chrome 157.0.8103.78 (version from actual runtime; Playwright version checked at finalization). Dev UI localhost4201→8081 demo; localhost4200→8080 normal. Screenshots/scripts/results stay outside Git at C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone117.

verify.cjs:1440×900,768×1024,390×844,320×844. Grid, list, focused detail and pricing explanation at every width plus three contextual evidence destinations =19 captured/scanned states. Verified actual demo search/debounce, category/status/reset/no-match, two-page navigation/Back, restored list/results context, loading/error/retry, exact selected links/dates/return, invalid variant/product states, disabled demo controls, native lazy workspace dialog, Escape/focus restoration, reduced motion and no framework overlay or page overflow. Added a minimum160px product-heading geometry check after visual review caught a squeezed identity that overflow/axe did not detect.

normal-fixture.cjs: actual authenticated empty catalog first; then explicitly intercepted, never-persisted multi-variant fixtures at all four widths. Checked different prices, unavailable cost, archived variant, dirty guard/selection lock, create product/variant, update product/variant, explicit archive confirmation, original4decimal payloads and CSRF headers. A real missing-CSRF request returns 403; a real logout204 causes subsequent protected navigation to return to login with supported variant context. Five fixture mutations were intercepted; no fixture record was stored. Four additional axe scans pass.

insights-regression.cjs: reran four actual demo and four normal insight routes at 1440/768/390, with 12 additional demo axe scans. Real catalog completion/failed-batch retry/cancel/filter reset, preserved14-day deep link, illustrative example isolation, real forecast dates/horizon/readiness links, separate eligible UI fixture and explicit authenticated30-day CSRF save remain intact. Evaluation save was intercepted without audit persistence. This regression is not a11.8 redesign.

chart-check.cjs additionally waits for a real SVG, selects April2025 in the exact-value inspector and captures after-sales-chart-inspection-1440.png, with no warnings/errors. Chart DOM-only unit tests verify loading/error/ready presentation plus the always-available exact table; they do not pretend JSDOM paints ECharts.

Final automated accessibility: axe-core 4.11.0, WCAG 2/2.1 A/AA,35 scans (19+4+12),0 violations. Final browser scripts report no relevant runtime/console errors; expected controlled401/403/404/503 resource failures are distinguished. No full screen-reader or independent-merchant study is claimed. Developer-led discovery walkthrough is functional/visual QA, not novice comprehension evidence.

Representative actual screenshots: after-catalog-grid-1440.png, after-catalog-list-390.png, after-product-detail-1440.png, after-product-detail-390.png, after-pricing-explanation-320.png, after-context-analytics-1440.png, after-context-forecasting-1440.png and after-context-optimization-1440.png. fixture-multi-variant-390.png is explicitly a fixture, not normal business data. They were viewed with view_image, including the corrected phone identity. Before/after mismatch ledger: compact thumbnail density replaces tall blank tiles; filter actions align; duplicate demo explanations collapse; phone actions stack; variant scope/price/status remain explicit; optional details retain precision/scientific caveats.

## F. Exact tests and build size

Commands executed from repository root unless noted:

- npm.cmd test --prefix frontend -- --watch=false: final exit0,109 tests in29files (baseline 98). Added URL restoration/cancellation/bounds/10,000-result fixture, saved-editor navigation, thumbnail safety/failure, scoped evidence/race/session/retry and selected pricing deep-link coverage. Existing numerical/security/editor tests retained. Expected JSDOM canvas getContext warning remains; no graphics-engine claim follows from DOM tests.
- npm.cmd run build --prefix frontend -- --stats-json: exit0. Initial 508.37 kB versus 538.87 kB baseline:30.50 kB reduction (~5.7%). Existing500kB warning remains exceeded by 8.37 kB;1 MB error budget unchanged. Workspace disclosure is deferred; ECharts registry remains a separate lazy chunk. No dependencies added/upgraded, no budget hidden/raised.
- backend working directory: .\mvnw.cmd verify, exit0 BUILD SUCCESS,89 unit+55 PostgreSQL/Testcontainers integration tests,0 failures/errors, runtime 10m02s. No backend source changed afterward. XML totals counted directly. Analytical optimum80 and independent actionable90 fixtures/audit semantics still pass.
- node verify.cjs; node normal-fixture.cjs; node insights-regression.cjs; node chart-check.cjs: final exit0 as recorded in milestone117-*.log and external JSON. git diff --check and local formatting checks pass.

The automatic approval reviewer temporarily failed due to a usage limit, so final commands were not executed at that point. Work resumed after the user's continue; commands were rerun, without bypassing approval. Earlier genuine UI failures (select labels, create guard, deep-link opening, squeezed mobile heading and chart race) were repaired and checked again. A premature chart-host unit assertion was adapted to the intentional asynchronous/loading contract; real chart rendering is separately checked in Chrome. No global timeout/budget was increased to hide a failure.

## G. Demo, security and integrity

Direct summary API: matchesSeed=true, original/current checksum6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34. Three10-row Full 2025/horizon 30 checks confirm 30 abstentions:21 DIAGNOSTIC_ONLY,3 INACTIVE_VARIANT,3 MISSING_PRICE,3 UNRELIABLE_ELASTICITY. Every recommendedPrice/comparison null; sensitivity empty. Actual anonymous normal business GET returns 401; demo POST returns 403.

PostgreSQL counts remain normal 0 products/0 orders/1 account/0 model evaluations; demo 30 products/9,466 orders/0 accounts/0 model evaluations. Flyway V1–V6successful checksums unchanged:1436242292,581270318,-1414359703,56597636,147175724,-1432513541. Both databases also retain 0 sync jobs and 0 source mappings. No reseed/reset, fixture promotion or audit-history change. Existing role/auth/CSRF/dirty/session protections remain. Protected new evidence cancels/clears on selection/session loss; no automatic price writes. Credentials/cookies/tokens are not logged or captured. LIVE_SHOPIFY_NOT_VERIFIED remains true.

## H. Limitations

No real image import/source exists; no live Shopify OAuth/import validation, Firefox/Safari coverage, full screen-reader certification or independent merchant study. Large-catalog pagination is covered by a bounded10,000-result UI/unit fixture; the real demo has30products. Selected sales may be unavailable if a SKU-prefix search still yields more matches than its bounded page. No variant trend/live-stock endpoint or product-level price aggregate was added. Detail's initial history is Full 2025 demo /365 days normal and comparison30days; existing evidence pages offer their own controls. Newly created products retain the established default-catalog return; opened products preserve supplied results context. Remaining bundle warning is documented. Milestones 11.8/11.9/11.10/12 have not started.

## I. Local Git

Branch codex/milestone-01. Starting a9654e7; pre-code audit807474c. Implementation commit 0e1f319 — feat(catalog): add visual discovery and focused variant detail. This report follows in a separate local documentation commit; its exact hash is reported at delivery. No push, deployment, rebase, reset or history fabrication. Final HEAD and clean status are checked after committing.

## J. Review recommendation

Ready for product-owner review of 11.7; implementation verification is complete and local commits are being finalized. Current acceptance paths work with actual demo data and identified normal fixtures; remaining data/provider/independent-usability limits are explicit. Do not start 11.8 automatically.
