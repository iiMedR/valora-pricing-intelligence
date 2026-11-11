# SmartPricing product UX foundation — 11.6

This extends the existing Angular/Zard system. It does not introduce a second component library, regenerate the application, or change business logic. The merchant's 11.6 brief supersedes the earlier small-type/gradient treatment: readable type and a black line are the current direction.

## Tokens and density

Source of truth for color/radius/font tokens: frontend/src/zard-theme.css. Tailwind's existing @theme inline maps them to semantic utilities; legacy and foundation layout rules remain in frontend/src/styles.css inside the components layer. Feature-local CSS handles layout only.

| Purpose                     | Token / rule                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Surface/text                | --background, --card: white; --foreground: graphite; --sidebar: off-white                                                                                    |
| Secondary text / separators | --muted-foreground (neutral .5 OKLCH), --border; do not use color alone for meaning                                                                          |
| Interactive / selected      | --primary, --primary-foreground, --accent, --sidebar-accent                                                                                                  |
| Semantic states             | --warning-surface/foreground/border, --success-surface/foreground, --error-surface/border and --destructive; always include text                             |
| Focus                       | 2px foreground outline, 3px offset; existing Zard focus-ring utilities retained                                                                              |
| Spacing                     | --space-1/2/3/4/6/8 = 4/8/12/16/24/32px; corresponding Tailwind spacing utilities may be used                                                                |
| Radius                      | Existing --radius .625rem; 8px identity slots, 12px explanation dialogs, pill statuses                                                                       |
| Typography                  | Existing Apple/system sans stack; root/body 16px, tables/labels 14px, nav15px, captions14px, h1 28px, h2 20px, h3 16px; metric21–29px. Input16px, target44px |
| Layout                      | Rail232px; header minimum64px; main28px vertical and responsive20–36px horizontal. Drawer at1050px; metric grids at1200/440px; forms stack600px              |

The density is efficient through spacing and hierarchy, not tiny fonts. No new font network request, density preference, fake avatar, gradient KPI, readiness score or decorative chart is introduced. Money and tables use tabular numerals.

## Shared components

- **PageHeader** (shared/merchant/primitives.ts): one page-owned h1, optional short useful description and action slot. Root shell has no repeated subtitle.
- **StatCard / MetricCard**: the same existing Zard card/header/description/content composition, exported under both names. Supply only actual API values; loading/unknown must not become zero.
- **StatusPill** (foundation.ts): Zard secondary badge, explicit text, calm neutral surface. Used for catalog and pricing states.
- **SearchField**: visible native label around a projected search input. Consumer owns the existing form control, accessible name, validation and query. No competing value accessor.
- **ProductIdentity**: actual product name and RouterLink, optional subtitle, 40px initials fallback explicitly labeled No product image available. Catalog DTO has no image/price fields, so no photos or prices are invented and no extra variant-per-row requests are made. Variant prices stay in existing detail.
- **InlineNotice / StatusNotice**: reuse the existing Zard alert composition; no new variant hierarchy.
- **ExplainMore**: a Zard outline button and the existing native dialog/appModal focus directive. Installed Zard source has no dialog/sheet; this deliberate compatibility composition avoids a dependency/registry overwrite. Unique title IDs, autofocus Close, native Escape, explicit Tab containment, focus restoration and mobile scroll sizing are preserved. A second modal cannot open while a dialog is open. Do not hide absence of a suggestion in this control.
- **InsightSummary**: heading, short actual result/reason, explicit actions. Overview uses it within the existing chart-panel card.
- **ResponsiveDataList / ResponsiveDataTable**: aliases of the existing semantic scroll-region wrapper; both selectors work. Host width is constrained; horizontal table scroll is local, labeled and keyboard focusable. Catalog reuses it without changing pagination/filters.
- **ChartPanel, LoadingSkeleton, ErrorState, EmptyState, DataFreshness**: reuse existing primitives and retry patterns.

## Numbers, dates and copy

formatMoney uses Intl.NumberFormat locale separators and standard currency precision. Decimal rounding uses integer strings/BigInt rather than binary floating-point arithmetic. It is display-only: server values, frontend form inputs and contribution calculations are untouched. Unknown/malformed values say Unavailable. Overview offers How calculated? with exact transmitted net sales; chart inspection and order details retain original values. Default locale is en because no merchant locale preference exists; currency is the API currency. No currency conversion.

Order references use an external reference when present, otherwise a shortened display ID. Full identity remains in the existing order detail and URL. Date filters retain local-time entry and exclusive upper bounds; recorded dates remain explicitly UTC. Historical demo forecasts remain labeled with their actual dates.

Write result → plain reason → action → optional evidence. Say estimated contribution, never guaranteed/net profit. On an incomplete catalog check, report checked counts and errors; only complete results justify a catalog-wide absence claim. Do not turn tentative elasticity into advice. Readiness improvements do not guarantee a recommendation.

## Navigation and accessibility

Overview / Products / Orders; Insights: Analytics, Forecasts, Pricing insights; Settings: Shopify, Data readiness, Business settings, Categories. Existing URLs and contextual evaluation-history links remain. Active links expose aria-current. Destination main landmark receives focus; skip link remains.

Mobile navigation is a dismissible drawer with a backdrop, Close control, Escape, Tab/Shift+Tab containment, trigger focus and scroll restoration. Native explanation dialogs use existing modal protection rather than layering another focus manager. Disabled demo controls keep visible rationale near their task. Chart exact-value select/table is keyboard accessible. Automated WCAG scans supplement, and do not replace, screen-reader or independent merchant testing.

## Dependencies and scope

Angular 22.2.6 / CDK 22.2.6 / ng-icons 36.1.0 / Tailwind 4.3.5 / ngx-echarts 22.0.0 / ECharts 6.1.0 are unchanged. Existing reviewed Zard registry source/provenance and compatibility repairs remain. No init, migration, blind overwrite, dependency upgrade, backend endpoint or schema change.

Milestone 11.7 owns gallery/detail workflows;11.8 owns the full pricing-insight redesign;11.9 owns subscription domain;11.10 owns independent usability validation. This foundation improves their shared entry points only.

## Visual catalog and focused detail — 11.7

The catalog defaults to a grayscale grid with four desktop columns, three below 1300 px, two below 900 px, and one below 600 px. List mode uses the same ProductEntry data/links, becoming stacked rows on phones. Grid/List buttons expose aria-pressed. Search has a visible label and300ms debounce; Apply filters and Clear filters remain explicit. URL query parameters preserve search/category/status/page/view. Pagination stays20records per request; sorting is the backend's stable createdAt DESC, id order, not a misleading page-only sort.

- **ProductThumbnail**: shared/merchant/product-thumbnail.ts. Use a name and optionally a legitimate supported source. Missing, invalid and failed images render neutral initials with an accessible missing-image label. Images are dimensioned, lazy-loaded, asynchronously decoded, contain-fitted and referrer-free. Only credential/query/fragment-free image paths under same-origin /assets or /images, or HTTPS cdn.shopify.com, are accepted. No arbitrary host, data/blob/javascript URL or token-bearing URL. Current catalog/Shopify DTOs supply no image field, so real app entries use placeholders. This is future-safe presentation support, not an image-import feature.
- **ProductEntry**: features/catalog/components/product-entry.ts/.css. One valid anchor wraps a thumbnail, full product name, category, explicit status and View variants. No nested buttons, no tile-level analytics/forecast requests and no invented product price/count. Pass view and catalog context; both layouts use identical business fields.
- **VariantSummary**: features/catalog/components/variant-summary.ts. One selected variant only. Two bounded reads supply exact-ID-checked product-scoped sales totals and the existing recommendation response. Sales/pricing errors and retries are independent. It cancels superseded requests and clears protected evidence on session loss. Net-sales semantics and date window are explicit; no store trend is presented as a variant trend. Missing results remain unavailable.
- **ProductContext**: shared/merchant/product-context.ts. Vetted product/variant UUIDs link back to the selected product and its catalog filters. Analytics shows an exact-ID-checked selected-variant summary above the clearly separated store report. Forecast/pricing routes retain supported dates/horizon and open the selected variant where available, using existing endpoints.

Product detail uses a product identity, category/status and total variant count from its detail DTO, then a URL-persisted selector. Current price and current cost use formatMoney; price limits and exact transmitted decimals remain expandable. It does not claim live stock from a catalog record. Controls stack below identity below 900 px; essential names must retain at least 160 px of width at the tested320px viewport. A single selected variant replaces the former repeated long cards. Native forms, optimistic versions, CSRF and explicit archive confirmations are preserved.

Unknown requested variants show a not-found state instead of silently displaying another variant's price. Changing selection is disabled while editing/saving. Successful product creation closes its completed editor before guarded navigation, so stale busy input cannot prompt after a successful save. Failed saves retain the draft.

Workspace disclosure is now a deferred EnvironmentDetails component: the small native mode trigger stays eager, existing Zard close/modal controls load on demand. This safely reduces the root bundle without introducing another UI library or changing focus behavior. If the dialog chunk fails, an explicit reload instruction appears. The sales-chart wrapper also loads its existing engine before mounting ngx-echarts; its destroy guard prevents detached initialization during fast navigation. The engine remains lazy and the exact-value table is always available.

No backend, DTO, image storage, migrations or permanent demo data changed. No independent merchant-usability claim is made; see the 11.7 verification report for real evidence and remaining limits.

## Pricing workspace — Milestone 11.8

Keep /optimization and its existing variantId/date/horizon links. The explorer uses compact PricingResult articles, rather than large model-comparison cards. Desktop aligns thumbnail, identity, current effective variant reference price, human status and Review insight. Phone rows stack, preserving full names/SKUs and local scrolling only for wide evidence charts/tables. ProductThumbnail's optional --product-thumbnail-size token permits18px initials in48px rows; its other consumers retain the prior default. No image URLs are invented.

Search is300ms debounced and also submits explicitly. History/date controls and a secondary Filter status disclosure remain accessible. The × button beside search has a Clear filters accessible name; it resets search/local views/status while keeping the deliberately selected history/horizon. URL keys page, pricingView and pricingStatus preserve explorer state. Unsupported category/backend status/sort controls are not simulated. All/Actionable/Needs evidence and status narrow loaded rows only; counts always say this page only or loaded results only. totalElements remains all search matches across pages, never a global eligibility total.

**pricing-presentation.ts** centralizes human status labels, one-sentence reasons and a fail-closed complete-comparison guard. ACTIONABLE needs returned valid numeric price/current/candidate scenario fields. Diagnostic/unreliable → Confounded or uncertain; insufficient data → Insufficient history; missing cost/price/invalid limits → Needs evidence; missing forecast or malformed actionable comparison → Unavailable; inactive → Inactive. No backend gate/math changes. Primary UI hides enum dumps and tentative coefficients.

**PricingResult** emits a variant selection; no per-row recommendation fetch. **Optimization** reuses a matching already-loaded evaluation or makes one cancellable scoped GET. Focused identity/status/period/version and the existing **PriceComparison** show the result. showHeader/inspectLabel inputs adapt the existing comparison without a second financial calculator. Contribution difference amount/percentage are the API's contribution metrics, not a newly invented price-change percentage. Exact transmitted values remain available in evidence. A historical evaluationInstant is labeled as of, not current wall-clock time.

**PricingEvidence** composes SensitivitySummary, native details, exact-value tables, the existing monochrome scenario SVG and EvaluationHistory. It appears only in the Why this result? dialog. Its source is the typed Evaluation DTO: assumptions, cost/price/stock inputs, samples, identification, uncalibrated uncertainty, forecast, backtests, scenarios and versions. Missing-day coverage counts are not in this DTO; link to scoped readiness rather than invent them. A sensitivity chart requires a complete actionable comparison and at least two returned points. Coordinates are approximate; exact decimals remain in a table. On phones the chart scrolls inside a labeled focusable region with readable axes. No library/framework was added.

ModalFocus is reused with Zard buttons, centered within the viewport, an88dvh limit and internal scroll. Body overflow is restored on close/destroy. Escape, native disclosure headings and other controls participate in the focus trap. Include summary in the focusable set: otherwise closed evidence sections cannot be reached by keyboard. During an explicit pending save, Close is disabled and Escape announces that saving must finish; no nested confirmation is opened. Session loss still clears protected content. Same-page query navigation preserves control focus; page changes retain the main-landmark focus behavior.

EvaluationHistory remains explicit and append-only. Opening diagnostics never saves. Its existing Save fresh evaluation POST is authenticated/CSRF protected, re-evaluates on the server and preserves deduplication semantics. History rows say Historical saved snapshot and realized outcomes not measured. Existing30-day defaults and explicit valid7/14 selections remain. No Apply price control, arbitrary confidence/readiness score, calibrated interval, realized-profit claim or causal promise.

CatalogCheck now pauses after10batches (up to100 rows with the existing10-row endpoint); explicit Continue resets the action budget. Cancel/error retain valid partial rows and truthful counts. Never label a paused or failed check complete. Other existing consumers, including the30-variant demo overview, still complete within that bound.

## Milestone 11.10 — task state and progressive disclosure

Plan discovery now uses validated URL state (search, sort, page, applied dates and opaque selected plan). Review plan opens a focused view without refetching a loaded page. Back, forward and reload keep context; source references/exact prices and historical versions are optional. Current plan price is explicitly different from the price version assigned to a subscriber. Primary amounts are rounded presentation; inspection retains the exact returned decimal strings. The monochrome MRR chart states its scale and currency and has a keyboard-accessible daily table.

SaaS shows a distinct workspace badge and short partial-source line. Explanations/setup are disclosures rather than repeated paragraphs. Record types use human labels. Draft entry cancellation/clearing uses the existing confirmation pattern; expiry navigation always removes protected content. Editable filter controls are drafts until Update: report dates/prices and onward links use the last applied selection, with a visible changed-selection message. Unsubmitted search content is never copied into those links. Normal e-commerce preserves existing product/variant context and explicit evaluation saving; the demo has one optional explanation of why it may withhold price suggestions. Shopify status displays the API's unverified live-store state without claiming a verified connection.

The editor service/leave guard live in core/editor-session.ts, separately from reactive form directives. Compatibility exports preserve the original shared singleton and protections. Root routes/session navigation import the lightweight module; form code stays in lazy editor routes. No dependency, library migration, schema or financial-model change was needed. Existing neutral tokens, system typography, Zard inputs/buttons, native disclosure semantics and ModalFocus remain the design system.

Error feedback uses the separate --error-foreground token on --error-surface. The destructive button token remains unchanged; small error text no longer inherits a red that fails contrast on a tinted surface. The real refund-bound and timeout/retry error states passed axe at 320px after this correction.
