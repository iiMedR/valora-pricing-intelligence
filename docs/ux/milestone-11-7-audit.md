# Milestone 11.7 pre-code audit

Recorded 2026-11-13 before application changes. Clean branch codex/milestone-01 at a9654e7706e552fbc2f92583eb3f0f0b8a650a58. Baseline source/config/docs and actual Chrome were inspected. No AGENTS.md found. Frontend package scripts: npm.cmd test -- --watch=false; npm.cmd run build. Backend full .\mvnw.cmd verify started using existing Testcontainers prerequisites; results pending, not claimed passed.

## Routes and actual sources

| Route | Component / scope |
| --- | --- |
| /products | frontend/src/app/features/catalog/pages/product-list.ts; filters,20/page, create form |
| /products/:id | frontend/src/app/features/catalog/pages/product-detail.ts; catalog product/variants, product/variant editing and archive |
| /products/:productId/variants/:variantId/history | frontend/src/app/features/history/variant-history.ts; dated price/cost/inventory |
| /analytics | frontend/src/app/features/analytics/analytics.ts; store chart, product and variant sales tables |
| /forecasting | frontend/src/app/features/forecasting/forecasting.ts; searched readiness, selected variant forecast |
| /optimization | frontend/src/app/features/optimization/optimization.ts; selected variant recommendation/evaluation history |
| /onboarding/variants/:id | frontend/src/app/features/onboarding/variant-readiness.ts; diagnostics |

Guards and editor-leave protection are in app.routes.ts/core/auth-integration.ts/core/editor-state.ts. Catalog API/model sources: features/catalog/services/catalog-api.service.ts and models/catalog.models.ts. Existing Zard source/provenance, components.json, styles.css, zard-theme.css, strict tsconfig paths and Angular22.2.6 are retained. No initializer/migration/dependency upgrade is needed. Reviewed the 11.6 audit/design-system/merchant guide/report; source HEAD matches reported completion.

## API/data matrix

| Data | Existing availability | Decision |
| --- | --- | --- |
| Product identity/category/status | GET /api/v1/products paginated; categories endpoint | Grid/list use these fields directly |
| Product images | Absent from Product, Variant, DB migrations and Shopify importer; no image mapping | Neutral initials placeholders in actual catalog; no invented URL/photos/schema change |
| Product price/count | List DTO has no variants or aggregates | Say View variants; no N+1 detail/forecast calls |
| Variant prices/cost/limits | GET /api/v1/products/:id → variants; business-settings currency | Selected-variant display via exact-string currency formatter; raw values retained in details |
| Units/net sales | GET /analytics/products/:productId/variants with dates/search/pagination | Bounded selected-SKU lookup, verify returned variantId before showing totals; missing match is unavailable, never zero |
| Variant sales trend | No scoped trend endpoint; trends is store-wide | Honest unavailable explanation; contextual sales link, no misleading store chart on product detail |
| Inventory | Catalog DTO absent; global paginated analytics inventory and dated history exist | Link to selected variant inventory history; do not claim live stock from catalog |
| Pricing | GET /optimization/variants/:id/recommendation with dates/horizon | One cancellable request per selected variant, actual status/reason; progressive evidence shell |
| Forecast | Existing variant demand/backtest endpoints; current page uses query window only | Contextual link with selected variant/date window; small deep-link adaptation, no workflow rewrite |
| Sorting | Backend products sort createdAt DESC then id; no exposed sort parameter | Label stable newest-added order; do not implement misleading page-only sort |

Product-scoped performance pages remain bounded. No requests for thousands of rows, no unbounded aggregate calculations. Normal current window and permanent demo Full2025 stay distinct; forecast/optimization require28–731 historical days, default comparison30days.

## Observed friction and accessibility

P0: catalog has only a horizontally scrolling table and no discovery/view state in URLs; Back loses filters/page. Detail is a long list of every variant with raw4decimal money; no focused selected-variant summary or pricing status. Existing detail captures snapshot id once, so reused product route can display stale identity. Variant edit actions can replace another active editor; selection transitions must respect guards.

P1: phone catalog requires table scroll to see actions. Detail repeats read-only/archived/general explanations, and its category/variant distinction is weak. No image source exists, so fabricated visual products would violate integrity. API cancellation/session loss must clear newly added business evidence. Keep native labels, focus, modal Escape/return and predictable keyboard links.

P2: initial bundle is reported538.87kB; inspect a fresh stats build before changing lazy boundaries. Root ExplainMore eagerly imports Zard helpers; investigate safe lazy disclosure or module separation, avoid budget increases. No heavyweight library or global style rewrite.

## Proposed hierarchy and plan

1. Commit this audit before code. Fresh actual baseline screenshots from baseline.cjs: before-catalog-1440/768/390/320.png and before-detail-1440/768/390/320.png, saved outside Git in C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone117. Chrome/Playwright fallback: Browser plugin not available. These are observed app states, not generated concepts or an independent user test.
2. Reuse semantic tokens, Zard card/button/input/badge, existing ExplainMore and formatting. Shared ProductThumbnail accepts only vetted supported image locations, lazy/dimensioned/alt/failure fallback; actual production DTO supplies none. One reusable ProductEntry supports grid/list without duplicated data logic. Existing form components/dirty guards remain.
3. Catalog: title/action, one demo rationale, search/filter/reset, explicit grid/list pressed state, paginated20results, URL query state and correct Back/Forward. Default grid; list becomes readable stacked rows on phone. No unsupported prices/counts.
4. Detail: back-to-results context, product identity/category/status; visible variant selector stored in URL; current price/cost/SKU/status; bounded scoped units/net-sales totals; pricing status and optional Why; real sales/forecast/pricing/history links. Existing edit/archive controls/forms remain, protected from selection loss and stale responses. No fake trend or stock.
5. Small contextual deep-link support in existing evidence pages only; preserve dates/horizon and safe return paths. Do not rebuild11.8.
6. Test grid/list, URL/back-forward, reset/page/large/unknown, thumbnail valid/missing/broken/unsafe, multivariant switching, exact scope, async cancellation, auth/demo/editor/CSRF, real browser at1440/768/390/320, axe, full backend/frontend/build and data/checksum. Document real outcomes and limits.

## Scope and image strategy

Zero DB migrations or backend DTO changes planned. No changes to V1–V6, original demo fixture/checksum, optimization math/gates/audit semantics or Shopify live status. Placeholder-only actual demo/normal catalogs are correct given current API. Image success/failure coverage uses identified local intercepted fixtures; it is not evidence that Shopify imports images. Do not persist or source arbitrary external images.11.8/11.9/11.10/12 remain deferred. No independent merchant tester is available; label developer-led QA honestly.
