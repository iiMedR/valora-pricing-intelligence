# Milestone 11.5 — merchant redesign verification

The subsequent merchant-requested simplification of Analytics, Forecasting, Recommendations and Data readiness is documented in [insights simplification verification](insights-simplification-verification.md). That follow-up replaces these four pages' presentation, adds a cancellable catalog check and a clearly separated teaching example, and retains the model/security/data boundaries below. Earlier test totals in this document describe the original milestone run; the follow-up report records current results.

## Scope and baseline

Date: 2026-11-13. Starting branch `codex/milestone-01`, clean baseline `b9f74c5`. Checkpoint `b002118` records the plan before dependency integration. Work is local only; no push, deployment or Milestone 12 implementation.

The supplied overview image guided the neutral shell, icon rail, compact header, KPI cards, chart/setup arrangement and lower evidence/readiness panels. The merchant subsequently requested Zard's gradient area chart and smaller Apple-style typography. Overview and Analytics now use that chart composition with actual API data, not the example's visitors or growth figures. Normal mode has sign-in/setup/empty states; demo remains anonymous, synthetic and read-only.

## Integration and compatibility

Verified Angular/CLI 22.2.6, TypeScript 6.0.3, Node 24.22.1 and npm 11.19.1. Angular and backend versions were not upgraded. Added pinned CDK 22.2.6, ng-icons core/lucide 36.1.0, CVA 0.7.1, clsx 2.1.1, tailwind-merge 3.7.0, Tailwind and its PostCSS adapter 4.3.5, PostCSS 8.5.32, tailwindcss-animate 1.0.7, ngx-echarts 22.0.0 and ECharts 6.1.0. ng-icons and ngx-echarts peer requirements accept Angular 22.

Reviewed official [Zard installation](https://zardui.com/docs/installation/angular), [CLI](https://zardui.com/docs/cli), [source](https://github.com/zard-ui/zardui), [skills](https://zardui.com/docs/skills), and [Tailwind Angular/PostCSS setup](https://tailwindcss.com/docs/installation/framework-guides/angular). Read the official Zard skill, CLI/customization and Angular/styling/composition/forms/icons rules from temporary downloads. No pre-existing Zard components existed, so the migration skill was not applicable. Installed frontend design, builder and testing skill guidance informed implementation and visual QA.

Inspected CLI 1.6.0 source and `--help` / `init --help`. Init replaces CSS and changes dependencies/providers/aliases. It was run only in a disposable staging copy, followed by component `add` without overwrite. New source directories were reviewed and copied; the real app's providers, routes and legacy styles were merged explicitly. TypeScript uses `paths` with relative values and no `baseUrl`. The original app was not regenerated. No skill/global installation was performed. New actual-project dependency installs disabled scripts.

Registry source is owned locally, rather than a runtime Zard package. `frontend/src/app/shared/zard-provenance.json` records upstream file hashes, retrieval date, CLI and local adaptations; `ZARD-LICENSE` preserves MIT terms. Added button, card, input/input-group, badge, alert, skeleton, empty, tooltip, field, table, pagination, native-select, tabs, chart and its dark-mode service dependency. Some primitives are available for later composition; the redesign uses card, button, input, alert, skeleton, empty, tooltip and chart directly. Existing native selects, semantic tables and the proven native confirmation dialog remain deliberate compatibility compositions, rather than competing UI libraries.

Compatibility repairs found by tests/browser review:

- Zard button's native-host `disabled` attribute binding cleared consumer disabled states. The source copy preserves native disabled/role/tabindex semantics; SmartPricing's native button consumers keep their existing `[disabled]` bindings. Refund and audit pagination regression checks pass.
- Tooltips support Escape dismissal; help opens by click/Enter and retains trigger focus.
- Async chart engine loading could initialize twice when resize/theme effects changed initial options. The initial options stay stable until chartInit; subsequent live updates continue normally. Fresh Chrome checks report no chart warnings.
- Chart theme is explicitly light through a local adapter; mounting it does not alter document theme or theme storage. The registry contains only the ECharts modules actually rendered. No full-engine eager import.

Shared merchant components: PageHeader, MetricCard, StatusNotice, EmptyState, ErrorState, LoadingSkeleton, HelpTooltip, DataFreshness, ReadinessChecklist, ChartPanel, ResponsiveDataTable and SalesChart. Existing Confirmation/ConfirmDialog fulfills ConfirmAction with cancel-first focus, Escape, Tab wrapping and restored trigger focus.

## Behavior and financial/model preservation

Overview business GETs wait for a verified authorized session; requests are cancelled and displayed records cleared when access is lost. Demo selects Full 2025; normal retains current UTC windows. Figures and readiness counts come from Analytics/Onboarding. No composite readiness score, fake growth, fake connection, owner identity, fabricated notification or automatic price action was added.

Gradient charts show the actual net-sales buckets with currency/date axes, zero included and negative ranges supported. Coordinates use Number; original decimal strings remain in exact-value tables and are resolved by data index in escaped tooltips. Keyboard period inspection is an alternative to pointer/touch tooltips. Empty normal records render setup/empty guidance, not fabricated charts. Existing Analytics date filters, granularity and bounded tables remain.

Forecast primary estimates and 7/14/30-day control remain visible. Model fit, identification and validation move into progressive disclosures. Observed sales and future estimates remain distinct; forecasts are conditional on availability, not recovered latent demand. Recommendations retain withheld reasons and a working readiness link. Model-only sensitivity includes price/contribution units, zero and the current reference line where feasible. Saved evaluations remain explicit normal CSRF POSTs; viewing a chart/history never saves one. Precision, immutable history, archive retention, optimistic versions, dirty editors and authentication/CSRF contracts are unchanged.

All 30 permanent demo variants continue to abstain: 21 DIAGNOSTIC_ONLY, 3 MISSING_PRICE, 3 UNRELIABLE_ELASTICITY, 3 INACTIVE_VARIANT; no recommended price/comparison/sensitivity. Seasonal association remains weakly identified (approximately −0.567), with no calibrated interval and no realized uplift claim. Full backend tests retain the cost-40/elasticity−2 oracle optimum 80 and independent constrained PostgreSQL fixture optimum 90.

## Verification evidence

- Full backend `mvnw verify`: 89 unit tests and 55 integration tests passed, zero failures/errors/skips. Log: `milestone115-backend-verify.log`. No backend source or V1–V6 change.
- Frontend `npm test -- --watch=false`: 83 tests in 24 files passed. Two new overview regressions cover authorized access/cancellation and exact transmitted values/counts. Existing refund/audit disabled-state tests caught and verify the Zard compatibility repair. jsdom uses a test-only ResizeObserver; its missing canvas font-measurement diagnostics are not browser layout verification.
- Production `npm run build` passed under the unchanged 500KB warning/1MB error initial budget. The chart engine is a separate lazy chunk, approximately 542KB raw / 158KB estimated transfer. Initial output is approximately 492KB raw / 121KB transfer; final exact output is in `milestone115-build.log`.
- Browser plugin was unavailable; used cached Playwright 1.65.0 with installed Chrome, isolated QA contexts and real running normal/demo backends. `milestone115-workflow-qa.log` covers 14 demo routes at 1440/768/375, real search/pagination, mobile navigation/focus/scroll, horizontal table keyboard scrolling, all 30 abstentions, audit GETs, actual demo 403, normal authentication, empty routes, retry, actual missing-CSRF403 and revoked-session401.
- `milestone115-normal-extra-qa.log` covers 12 normal routes at all three widths, safe dated deep-link return/callback, invalid-input focus/descriptions, busy-field lock, retained failed-save drafts and explicit cancel/discard.
- `milestone115-design-qa.log` covers actual gradient SVGs, exact decimal tooltip, 14px body typography, four screenshot widths (1672/1440/768/375), keyboard period selection/table, Enter/Escape help focus, actual 7/14/30-day forecast responses and normal empty overview. A separate, visibly named disposable ACTIONABLE UI fixture exercises 21 sensitivity points, reference line at current price 100 and exact table. It is not a permanent seed result or model validation.
- Browser write-path fixtures intercept archive/stale settings/save failure/evaluation requests and deny unexpected writes. They exercise the UI without changing real business/audit data. Actual persistence and numerical/security behavior are covered by backend PostgreSQL integration tests. No live-provider claim follows from these fixtures.
- axe-core 4.11.0, WCAG 2/2.1 A/AA: six real demo screens at three widths (18 scans). Initial catalog/forecast badge contrast failures were repaired through the shared muted-text token; final scans report zero violations. This is automated coverage, not full screen-reader certification.

## Visual comparison and fidelity ledger

Viewed the supplied image, generated adaptation, latest 1440 desktop and 375 mobile renders directly with view_image. Evidence lives outside Git at `C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2`.

| Comparison | Result / intentional adjustment |
| --- | --- |
| Structure | Retained neutral icon rail, compact header, welcome heading, four metrics, chart beside exploration/setup, recommendations/readiness beneath. Existing deep links remain functional. |
| Palette | White/neutral reference retained; blue gradient area follows the merchant's later chart request. Semantic warnings/errors remain distinguishable. |
| Type | Smaller system stack, 14px body, 13px navigation, 24px metric values and restrained headings follows the merchant's later Apple-style request. Mobile inputs remain 16px and controls 44px. |
| Metrics/copy | Actual MAD amounts and full decimal precision replace sample USD/growth. No fake readiness donut/85%, completed Shopify connection or owner avatar. Generated copy about applying prices was deliberately excluded. |
| Chart | Replaced illustrative monthly/cumulative shape and inactive sample range controls with actual API buckets, gradient fill, exact tooltip, zero baseline and accessible period/table inspection. Date ranges remain in Analytics. |
| Navigation | Catalog/Orders/Analytics/Forecasting/Recommendations/Data readiness/Shopify/settings/categories all resolve. Evaluation history remains within the functioning per-variant workflow. No inert Support/notification controls. |
| Responsive behavior | Rail becomes a keyboard-operable disclosure; metric and content grids stack; chart resizes and tables scroll inside labeled regions. No page overflow at the tested widths. Lower panels naturally continue below the fold at smaller dimensions. |
| Fixes from render review | Corrected Zard title/description inputs, chart flex sizing (avoiding clipped axes/overlaid controls), initial chart double-mount warning and low-contrast badges. |

Before evidence: `milestone11-overview-desktop.png`, `milestone11-analytics-tablet.png`, `milestone11-navigation-mobile.png`. Final examples: `milestone115-overview-1672.png`, `milestone115-overview-1440.png`, `milestone115-overview-768.png`, `milestone115-overview-375.png`, `milestone115-gradient-tooltip.png`, `milestone115-chart-inspector-mobile.png`, `milestone115-analytics-desktop.png`, `milestone115-forecast-desktop.png`, `milestone115-diagnostics-desktop.png`, `milestone115-diagnostics-mobile.png`, `milestone115-normal-overview-1440.png`, `milestone115-actionable-ui-fixture.png`. Fixture screenshots are explicitly distinguished from actual data. QA scripts and screenshot artifacts stay outside the repository.

## Data integrity and limits

Original checksum remains `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`, `matchesSeed=true`. Normal retains 0 products/0 orders/1 account; demo retains 30 products/9,466 orders/0 accounts. Both retain 0 sync jobs, 0 mappings and 0 model evaluation audit records. Successful Flyway V1–V6 checksums in both remain 1436242292, 581270318, −1414359703, 56597636, 147175724, −1432513541. No reseed/reset/migration or permanent business-data write was performed.

**LIVE_SHOPIFY_NOT_VERIFIED** remains truthful. No real OAuth/public HTTPS/provider import, Safari/Firefox coverage, full screen-reader certification, calibrated uncertainty or realized uplift is claimed. The native confirmation and numeric-input compatibility choices preserve previously verified behavior. Frontend implementation commit: `a6333d5`; plan checkpoint: `b002118`. Verification documentation is committed separately and final clean status is checked at delivery. Ready for Milestone 12 review; Milestone 12 has not been started.
