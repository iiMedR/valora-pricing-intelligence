# Milestone 11.5 merchant redesign plan

## Baseline and visual direction

Starting point: clean `b9f74c5`, Angular 22.2.6 and TypeScript 6.0.3. The supplied SmartPricing dashboard image is the visual reference: white surfaces, neutral sidebar, compact navigation, dark type, quiet borders, four metrics and a revenue chart beside next actions. The generated adaptation is a layout guide, not an application asset. Its illustrative chart and any claim about applying prices must be replaced by actual API data and review-only language.

The current home emphasizes system health and long explanations. Navigation and repeated status blocks dominate small screens; model diagnostics compete with merchant decisions. Preserve existing URLs, forms, authentication, exact decimal strings, historical semantics and accessible navigation behavior.

## Prioritized journeys and information architecture

1. Empty normal workspace: sign in, connect Shopify, synchronize, inspect catalog/costs, review readiness, explore insights.
2. Synthetic demo: explore Full 2025 sales, inspect catalog and readiness, understand withheld recommendations. Demo stays anonymous and read-only.
3. Returning merchant: see observed business metrics, freshness and missing inputs; inspect forecasting and pricing evidence; explicitly save evaluations in normal mode.

Overview `/`; Catalog `/products`; Categories `/categories`; Orders & refunds `/orders`; Analytics `/analytics`; Forecasting `/forecasting`; Recommendations `/optimization`; Data readiness `/onboarding`; Shopify `/store-connection`; Business settings `/settings`. Retain detail/history routes and safe return URL validation. Avoid a decorative Evaluations destination: saved evaluations remain within their existing per-variant workflow unless a fully functional index is implemented.

## Design system

Use a neutral Zard theme, foreground near black, white cards and subtle neutral background, restrained semantic error/warning/success tokens. Use 4/8px rhythm, 12–16px card radii, 44px interaction targets, visible focus rings, tabular numeric values, responsive grids, local system sans typography. Desktop rail approximately 250px; mobile disclosure retains Escape, focus and scroll restoration. No invented notifications, support links, owner identity, readiness score or growth percentages.

## Non-destructive Zard integration

Official docs and registry reviewed at zardui.com and github.com/zard-ui/zardui. CLI 1.6.0 help and source confirm init writes configuration, installs dependencies, changes providers, replaces global CSS, adds aliases and downloads core/utilities. Run init only in a disposable staging copy after this checkpoint. Review generated files, then copy new source directories and merge configuration explicitly. No init in the real app, no overwrite flag, no framework upgrade, no global install. Official Zard skill guidance is read from a temporary download; migration skill does not apply because there are no existing Zard components.

File plan: add `components.json`, `.postcssrc.json`, new `src/app/shared` registry components and wrappers; merge package/lock dependencies and TS paths without TS `baseUrl`; preserve app providers and existing custom global rules while replacing legacy raw colors with theme tokens. Add a separate theme stylesheet before legacy CSS. Review bundle and runtime compatibility with Angular 22 CDK; ng-icons 33 accepts Angular >=21. Keep original form and confirmation safety contracts.

## Component migration matrix

| Surface | Preferred primitive / shared composition | Behavior to preserve |
| --- | --- | --- |
| Overview | PageHeader, Zard card-based MetricCard, ReadinessChecklist | Real APIs, sign-in gate, empty/error/loading states |
| Feedback | StatusNotice, ErrorState, EmptyState, Zard skeleton | Announced errors, retry, unknown stays unavailable |
| Charts | ChartPanel and accessible SVG + exact table | Zero baseline, currency/date labels, keyboard/touch details |
| Forms | Zard input/button/field where compatible | ReactiveForms, touched invalid, busy lock, optimistic version |
| Navigation | Lucide icons, active links, mobile disclosure | Existing URLs, keyboard and landmark focus |
| Tables | ResponsiveDataTable wrapper | Scroll region, keyboard access, captions and headers |
| Help/freshness | HelpTooltip, DataFreshness | Visible explanations, no inferred readiness completion |
| Confirmation | Existing ConfirmAction service wrapper | Cancel-first focus, Escape, focus restore, explicit mutation |
| Forecast / pricing | Progressive disclosure and existing audit component | Observed vs latent demand, model limitations, explicit CSRF POST |

## Chart strategy

The initial plan retained SVG. The merchant subsequently supplied the official Zard gradient-area example and explicitly requested it, together with smaller Apple-style typography. Overview and Analytics therefore use the source-owned Zard chart component with ngx-echarts 22.0.0 / ECharts 6.1.0. The engine is dynamically imported and limited to the rendered line/area, axes, legend, tooltip, accessibility and SVG modules. Forecast and sensitivity plots retain their distinct scientific semantics.

Financial calculations remain on the server; only chart coordinates use Number. Exact transmitted decimals remain accessible in an HTML table and the chart tooltip resolves the original decimal by data index. Use actual monthly net sales, bounded API windows, labeled axes including zero and negative refunds, readable tooltips and responsive dimensions. Show empty charts as empty states. Forecast historical observations and future estimates are visually and verbally distinct. Sensitivity charts remain model scenarios and appear only where permitted by returned eligibility; they now mark the current reference price when inside the feasible range.

The compact typography revision uses a local Apple/system sans stack, 14px body, 13px navigation, 24px metrics and 25–30px main headings. Preserve 44px controls and 16px mobile inputs. No proprietary font download or remote font dependency is introduced.

## Risks and verification

Tailwind reset can change native form/table layout; isolate layers and inspect every workflow. Zard registry is source-owned and moves independently from CLI: record provenance and hashes. No backend changes, V1–V6 edits or data reseeding. All 30 demo variants must continue abstaining. Preserve LIVE_SHOPIFY_NOT_VERIFIED.

Run frontend unit/build and full backend verify, browser QA at 375/768/1440, keyboard/focus/dialog/form/retry/auth/CSRF/demo read-only checks. Compare reference and screenshots for sidebar, hierarchy, spacing, palette, chart/card layout and responsive behavior. Verify original demo checksum, normal retention, audit counts and oracle 80 / constrained 90. Record actual results and any remaining limitations in milestone verification, update merchant guide, commit locally without pushing or starting Milestone 12.
