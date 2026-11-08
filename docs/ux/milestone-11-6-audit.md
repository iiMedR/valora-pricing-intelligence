# Milestone 11.6 baseline UX audit

Recorded before application changes on 2026-11-13. Actual baseline: clean `codex/milestone-01` at `f42470a`, not the older commit in the brief. Angular22.2.6, Zard source/CLI provenance1.6.0, Tailwind/PostCSS4.3.5, existing compact insight-page refinement and96 frontend tests. No independent tester or new user study is available; observations below are developer inspection, supported by real Chrome captures.

## Evidence and states

Actual screenshots and baseline.json are outside Git: `C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone116`. `before-<route>-1440.png` covers overview, products, orders, forecasting, optimization, onboarding, categories, settings and store-connection. `before-overview-390.png` and `before-products-390.png` capture mobile. `before-normal-<route>.png` covers authenticated empty overview/products/onboarding/store connection. Existing screenshots supplied earlier in this chat are historical problem evidence, not approved layouts; screenshots from a separate conversation are unavailable and are not assumed.

Demo is anonymous/read-only,30 products and9,466 orders,2025 history. Normal has an existing owner account and empty business catalog. Baseline measured main font14px; utility/card captions frequently resolve to12–13px. Product list shows80 visible cells, orders120; the recently simplified insight pages already hide their initial technical tables. Do not repeat their full redesign.

## Route inventory

| Class | Routes | Representative states / scope |
| --- | --- | --- |
| Primary | `/`, `/products`, `/analytics`, `/forecasting`, `/optimization`, `/orders` | Demo populated/abstaining; normal authenticated empty; loading, unavailable API and retry |
| Secondary | `/products/:id`, `/products/:productId/variants/:variantId/history`, `/orders/:id`, `/onboarding`, `/onboarding/variants/:id` | Catalog identity, exact dated history, immutable transaction detail and evidence/readiness |
| Settings/integrations | `/settings`, `/categories`, `/store-connection` | Normal editable/connection-not-configured; demo read-only; existing explicit authorized actions |
| Administrative/entry | `/login`, `/orders/new`, `/store-connection/callback` | Sign-in and safe return, normal manual entry, sanitized OAuth result; demo manual entry guarded |
| Fallback | `**` → `/` | Preserve behavior and existing deep links |

Saved evaluations are contextual within variant pricing details; no separate index endpoint exists. Product list DTO has no image, SKU, price or currency; variants/detail provide prices. Do not fetch every detail or invent listing prices/photos. Server has currency code but no locale preference, so use en formatting with explicit returned currency and keep exact values inspectable.

## Priorities and observed friction

| Priority | Observation and discovered component | Foundation action / expected impact |
| --- | --- | --- |
| P0 | `app.html` repeats a generic subtitle, mode/account text, full-width environment prose, sidebar safety text and footer slogan on every route | One compact persistent mode control, accessible explanation, remove generic/safety repetition; reclaim first viewport |
| P0 | `features/home/home.html` has four metrics, large exploration checklist, recommendations and readiness panels below the fold; raw4-decimal money | Chart and pricing/next-step beside each other; readable currency, meaningful demo abstention from actual checked API results; move setup to actual normal needs |
| P0 | `app.css`, global styles and shared primitives use small12–14px text with generous empty gaps | Document15–16px body/table baseline, useful density and44px controls; keep restrained headings and neutral surfaces |
| P1 | Ten equal-looking navigation destinations in three verbose groups; Catalog versus Products and Orders & refunds versus Sales orders labels vary | Primary Overview/Products/Orders; concise Insights and Settings groups, contextual secondary routes; preserve all URLs |
| P1 | Product list is a long text-only table without identity hierarchy; no image field exists | Reusable truthful image fallback, stronger product link and status; no gallery or persistence until11.7 |
| P1 | Orders expose UUIDs when reference missing, raw monetary strings and date-time filters without concise timezone help | Readable short display reference with full identifier in details; exact-preserving display, explicit local-filter/UTC-display help |
| P1 | Recommendations still repeat period/safety explanations and use a large teaching disclosure; forecast cards repeat generic status | Shared status/insight summary and concise copy only; preserve the recent working workflow for11.8 |
| P1 | Readiness can list many lengthy tasks; categories use large variant-card styling | Show up to3 API-prioritized tasks with additional steps optional; denser category rows and secondary pages |
| P1 | Existing native modal already implements Escape, Tab wrapping and trigger restoration; no Zard dialog is installed | Reuse the proven focus primitive with Zard buttons for ExplainMore; no second overlay system or blind registry addition |
| P2 | No product image/remote media contract, no SaaS metrics and no actual live Shopify verification | Explicitly defer11.7/11.8/11.9; retain LIVE_SHOPIFY_NOT_VERIFIED; no fabricated imagery, scores or opportunities |

## Workflow and content hierarchy

Current: overview → sidebar Catalog → long product table → detail/variant → separate pricing page → search/evidence. Mode and safety copy consume space at every step; basic product identity and prices are split because list DTO lacks variants. Prior insight simplification improved this path, but shell and overview still obscure the next task.

After: compact shell → Overview real metrics/chart + Pricing insights → Review products → product identity/link → existing detail/variant and contextual evidence. Insights navigation remains directly available. Do not promise a new product-to-pricing deep-link contract not implemented in this foundation.

| Surface | Before | Target hierarchy |
| --- | --- | --- |
| Shell | Brand + repeated title/subtitle + account/mode + banner + ten links + slogans | Brand, compact mode/account; primary links and two concise groups; page owns its heading; no slogans |
| Overview | Welcome + metric precision noise + exploration checklist + lower evidence cards | Overview/period,3–4 real KPIs, chart, plain pricing status/Why and next action; setup only where relevant |
| Product/insight entry | Plain name link/raw uppercase status; repeated explanation | ProductIdentity safe fallback + name, subtle text status and direct action; detail remains optional and exact |

Use existing semantic Zard theme and reviewed local skill guidance. No initializer, migration, dependency upgrade or API/security changes are necessary. Baseline captures are real; generated design concepts, if used, are labeled inspiration and never usability evidence. Full backend verification has been started independently. Acceptance will include an explicitly labeled developer heuristic task walkthrough with recorded observations/timings, not a fabricated independent user test.
