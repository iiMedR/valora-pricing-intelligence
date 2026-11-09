# Milestone 11.8 pre-code audit and design

Recorded before application changes, 2026-11-13. Clean codex/milestone-01 at39d06dc4cb13c6c5776bbd0741a3ae42a14663fc. Inspected current source/config, 11.7 verification, design-system/merchant guide, API DTOs and backend optimization controller/service. Backend full verify is running; no new results claimed yet. Baseline109frontend/89unit+55integration and508.37kB are the preceding verified milestone, not a fresh run here.

## Actual map and behavior

| Route | Actual source / behavior |
| --- | --- |
| /optimization | frontend/src/app/features/optimization/optimization.ts/.html/.css;10evaluations/page, explicit catalog checker, large comparison cards, long inline diagnostics |
| /products and /products/:id | features/catalog/pages/product-list.ts and product-detail.ts; shared product-entry, ProductThumbnail, VariantSummary, query selection |
| /forecasting | features/forecasting/forecasting.ts; existing scoped demand/backtest and context |
| /analytics | features/analytics/analytics.ts; exact-ID-selected summary and separate store chart |
| /onboarding/variants/:id | features/onboarding/variant-readiness.ts; actual data fixes/diagnostics |
| audit workflow | features/optimization/evaluation-history.ts; explicit GET history and authenticated CSRF POST fresh evaluation, no auto save |
| shared | shared/merchant/decision-summary.ts, foundation.ts, product-context.ts, product-thumbnail.ts; core/confirmation.ts ModalFocus, core/session.service.ts safe URL validation |

Actual pre-code Chrome screenshots: before-pricing-1440/768/375/320.png and before-evidence-1440/768/375/320.png, captured by baseline.cjs under C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone118. Browser plugin not available; cached Playwright with installed Chrome. Screens are actual demo states; no generated assets or independent-user study is claimed.

Friction: search is submit-only and state mostly ephemeral; repeated multi-paragraph cards expose only three withheld results initially; actionable empty state is mixed with abstention; selecting a result scrolls into a long technical section. No focused compact summary/accessible evidence modal. Primary counts need clear page scope. Current selection repeats a recommendation GET even though overview already includes the complete evaluation. A full catalog check can continue without a per-action bound. Existing numeric scientific safeguards and explicit saves are sound and must remain.

## Available and missing API fields

GET /api/v1/optimization/overview supports search (product/variant/SKU), dates, horizon, page/size. DTO countScope=CURRENT_PAGE; totalElements is all matching variants, not a filtered eligibility count. No category/status filter or recommendation sort exists. Use explicit local loaded-result views and counts, retain backend order, and never infer catalog-wide eligible totals from a page.

Evaluation includes variant identity/status, current effective reference price/cost/bounds/stock assumptions, status/reasons, conditional recommendation/comparison, model version/time, elasticity/identification/uncertainty, forecast, backtests and sensitivity points. Missing price/cost stays unavailable. No product photos, readiness percentage, calibrated interval or realized uplift. No new backend endpoint/schema is needed. The independent90fixture and80mathematical oracle stay unchanged; all30permanent-demo abstentions remain required.

## Status presentation

- ACTIONABLE with actual price+comparison: Actionable; review estimated suggestion.
- DIAGNOSTIC_ONLY / UNRELIABLE_ELASTICITY: Confounded or uncertain; plain reason, review evidence.
- INSUFFICIENT_DATA: Insufficient history; review dated evidence.
- MISSING_COST / MISSING_PRICE / INVALID_CONSTRAINTS: Needs evidence; correct scoped inputs/limits.
- UNAVAILABLE_FORECAST: Forecast unavailable; review forecasting/readiness.
- INACTIVE_VARIANT: Inactive; inspect catalog, never invent a suggestion.
- transport/identity failures: Unavailable/error, never zero/absence of opportunities.

The top-level absence label remains No reliable price suggestion yet. Reasons summarize actual DTO codes; tentative coefficients stay in advanced evidence. A1% translation uses the existing supported-association gate only. UNCERTAINTY_UNAVAILABLE remains explicit in the evidence disclosure.

## Design and interaction map

White/graphite, existing system font/semantic tokens and quiet separators. Reuse installed Zard button/input/badge/card, ProductThumbnail, formatMoney, PriceComparison, SensitivitySummary and native ModalFocus; no initializer, migration, new library or dependency upgrade. Official Zard skill/rules already available in reviewed temporary downloads; migration is not relevant to current source layout. Frontend design/testing skills apply; existing11.6/11.7 language remains.

Explorer: heading → search/horizon + optional history → All/Actionable/Needs evidence and human status filter → explicitly scoped counts → compact identity/current-price/status/reason/action rows → pagination. Phone rows stack, with no horizontal page overflow. Category/sort controls are omitted because unsupported. Optional catalog checking is capped at10batches/100variants per user action; explicit Continue is needed beyond the cap, with partial counts/cancel/retry preserved.

Focus: selected variant identity/price/status, evaluated dates/horizon/version → supported API comparison or one abstention reason → catalog/sales/forecast/readiness links. Existing query variantId deep links work; explorer query state returns predictably. Use already-loaded valid DTOs, otherwise one cancellable scoped evaluation GET. Do not fetch per-row details.

Why this result?: labeled native modal using existing appModal/Zard controls → reason and interpretation → optional inputs/observations/identification/forecast/backtests/sensitivity → model metadata and explicit saved evaluation workflow. Escape, Tab containment, focus restoration, mobile scroll and busy-save feedback. No nested dialogs, automatic save or Apply price action. Technical tables stay optional; no raw JSON.

## Ordered implementation / risk controls

1. Commit this audit before code.
2. Shared typed status/reason/row presentation; compact explorer and scoped views/counts.
3. URL/debounce/page/selection state, cancellation, loaded-result reuse, bounded explicit catalog check.
4. Focused summary and on-demand evidence modal; preserve comparisons/scientific caveats and protected audit saving/history.
5. Focused unit and real-browser tests at1440/768/375/320, actual demo plus intercepted independent actionable/normal fixtures. Verify placeholders, unknowns, all30abstentions, auth/CSRF/history, keyboard/axe/console and source integrity.
6. Full frontend/backend/build, bundle comparison to508.37kB, demo checksum/migrations/normal retention, merchant/design docs and local conventional implementation/tests/report commits. No push/deploy or11.9/12.

Risks: backend cannot filter status globally; label local scope rather than silently scanning the full catalog. Save is a fresh server evaluation, not a historical snapshot or realized gain; no writes on opening views. Input changes/session loss must clear protected stale data. Long evidence must scroll within the modal, not trap inaccessible off-screen controls. Preserve existing lazy chart lifecycle repairs. Independent merchant and live Shopify validation remain unavailable and must be labeled honestly.
