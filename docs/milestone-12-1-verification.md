# Milestone12.1 visual polish verification

2026-11-14. **PASS for the requested local visual/UX scope. MODEL NOT CAUSALLY VALIDATED.** No independent merchant usability, live integration or production-security certification is claimed. Follow the current [portfolio walkthrough](demo/README.md); [screenshot index](demo/screenshots/milestone-12-1/README.md) has matching before/after views.

## Baseline and actual skill use

Started clean on codex/milestone-01 at a9675ea, the separately committed baseline audit. Did not repeat that audit. Its missing-reference status was resolved by the user's original screenshot ZIP and explicit fallback instructions. All10 application images plus Skills image were inspected as CURRENT UI, not target mockups. ZIP SHA2568e6b1a49cec7864f1f55ded5e15ba4db47f2ce7e279c05bd474673e90ef05bde. Original files remain in the external visualization workspace; no screenshot was falsely claimed supplied/inspected.

|Skill / guidance|Actual use|
|---|---|
|Frontend Design — C:/Users/iimedr/.codex/skills/frontend-design/SKILL.md|Read; planned palette, system typography, hierarchy, restraint, page structure and critique before modifying UI. [Style guide](milestone-12-1-style-guide.md).|
|Playwright CLI — C:/Users/iimedr/.codex/skills/playwright/SKILL.md|Read plus CLI reference; npx.cmd present. Default npx offline invocation lacked cached registry metadata. Existing cached @playwright/cli0.1.24 was found and invoked directly through node; no download/new dependency. Named Chrome sessions polish/polish-controls, snapshots, ref-based list/search actions and run-code batches for screenshot/axe/interaction checks.|
|Zard skill unavailable|User-authorized fallback: inspected local card/button/badge/chart variants, product primitives, theme/styles, package manifest and zard-provenance.json. Source-owned Zard CLI1.6.0 provenance, Angular/CDK22.2.6, ng-icons36.1.0 and Tailwind4.3.5 retained. No second library.|
|Review Agent skill unavailable|User-authorized independent_review subagent inspected diff and final refinements read-only; findings below. Separate implementation subagent owned forecast/settings/readiness/connection/categories.|
|Optional ImageGen / OpenAI Docs / Skill Creator|Not used. Category illustrations reuse local Lucide icons, clearly labeled illustrations; no AI generation or external hotlinks.|

Browser plugin is unavailable; CLI is the requested route. The existing54-state Playwright/Chrome regression harness supplemented CLI rather than replacing its screenshot/axe work. Environment-only cached CLI entry: C:/Users/iimedr/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js. Invoke `node <entry> -s=polish open http://localhost:4217/products --browser=chrome`, then `snapshot`, observed-ref `click`/`fill`, or `run-code --filename <external QA script>`. Scripts/captures are local developer QA, not a newly installed hosted test service.

## Page-by-page changes

|Page|Implemented change / preserved behavior|
|---|---|
|Overview|Quiet priority net-sales accent, clearer figures, compact real story entry links on Overview only, amber stock-review action. Existing period, API metrics and expandable chooser remain.|
|Products|Shorter category-specific line illustrations replace large identical initials in grid mode; titles/category/status/action separated, blue hover/focus/selected view, grouped filters. List/unknown-category/image-error fallbacks remain. Scoped container queries handle narrow/magnified content without changing routes/filter semantics.|
|Orders|Human-readable portfolio scenario/variant/date label; other long refs shortened. Exact original remains in title, accessible name, keyboard/touch disclosure and detail route. Visible label included in accessible name. UTC dates/times separated, numeric columns right-aligned, filters grouped; labeled table scroll retained. No identifier/accounting edit.|
|Analytics|White KPI surfaces, quiet blue net-sales emphasis, teal only for non-null positive recorded known-cost contribution; missing/negative values are not colored positive. Coverage/excluded-expense caveat remains adjacent. Grouped report controls, clearer black chart labels/line and expandable details.|
|Forecasts|Compact single-list selection rows with concise usable-day figures and selected state, replacing repetitive large two-column cards. Search, actual dates, horizon selection, forecast assumptions/statistical evidence remain; observed chart stays black.|
|Pricing insights|Blue explicitly Experimental, amber withheld, neutral inactive. Compact result cards, redundant approved-result explanation under Estimate assumptions; ordinary synthetic story expandable. Known failures remain expanded, adjacent and red. Exact outputs/amounts, selection, cancellation/save protections unchanged.|
|Shopify|Balanced status/import panels, clear connection heading and demo-disabled state. Credential/provider/API flow unchanged; real connections/imports disabled in demo.|
|Data readiness|Numbered priority checklist with distinct review actions, compact connection/import summary and grouped detailed checks. Missing availability/stale inventory explanations retained; completion does not guarantee eligibility.|
|Business settings|Structured business name/currency profile, readable amber currency restriction and explicit demo read-only text. No editable demo controls.|
|Categories|Compact row list; page-level demo restriction replaces repeated unavailable edit/delete controls. Normal authorized edit/delete and in-use protections remain.|
|Navigation/shared states|Blue active location with inset rail/weight/icon, quiet canvas/white surfaces, compact type, shared semantic tokens and focus. No dark-mode project, gradients, decorative charts or added shadows. Reduced-motion handling retained.|

Scientific caveats remain: model approval is not correctness; hidden marketing/wrong-cost are known synthetic failures; no automatic price application; recorded contribution is not full profit; scenario volumes are assumptions; historical demo forecasts are not predictions for today.

## Browser, accessibility and screenshots

Before:40 actual screenshots,10pages×320/375/768/1440 at960px height, captured from unchanged Milestone12 production output before rebuilding frontend. After:40 matching views plus10 additional detail/filter/scaling views (90PNGs total including before). User-provided full screenshots were visual references; matching captures intentionally use initial viewport, not invented full-page coverage. [Index](demo/screenshots/milestone-12-1/README.md) links every pair. README now embeds current catalog and experimental-detail images; historical evidence retained.

|Final recorded evidence|Outcome|
|---|---|
|page-matrix.json:40page/width checks, final catalog/order rows refreshed after focused fixes|0axe violations,0document overflow. All ten routes have correct title/content.|
|regression-browser-results.json:54responsive/cross-mode checks|0axe violations,0overflow/page exceptions;2expected503console errors from deliberate error/retry injection. Portfolio stories/failures, what-if guidance, withheld states, keyboard dialog/Tab/Escape/focus return, reload/back, chart exact period inspection, normal/legacy isolation and separate SaaS monthly/yearly guidance pass. Real logout invalidates session and clears protected results.|
|cli-interactions.json:9additional scans and assertions|Search/category→3real Coffee variants, list/grid/detail navigation; cancelled-order empty result→completed-order recovery; keyboard full reference/detail traceability and label-in-name; selected14-day historical forecast; computed blue/amber/red status colors; scaling checks pass.|

Total103recorded scan checks in these final reports; the sets overlap, so this is not103distinct workflows. Final source changes after the broad harness were verified by focused catalog/order/interaction reruns. Normal and SaaS browser rehearsals use existing disposable QA databases, not real normal writes. Legacy and portfolio accessed read-only. Temporary production proxy4217 served current dist and forwarded to8087; QA4204/4205/4206 routed isolated APIs. Proxies strip Origin solely for local routing; deployed CORS/TLS not asserted from browser results.

Magnification:200%CSS zoom stress on Overview/Catalog/Analytics/Readiness, plus200%root-relative text scaling on catalog; all pass after scoped catalog container-width fix. This is a documented approximation, not a native browser zoom or all-text/assistive-tech certification. Native browser zoom, every screen reader and independent usability remain unverified. Axe tags WCAG2A/AA and2.1A/AA; color is accompanied by explicit text/state/shape. Focus and44px form/button targets retained; table scrolling is intentionally confined to labeled focusable regions.

Visually reviewed after catalog375/1440, pricing375, overview768, forecast768, orders1440, analytics1440, readiness1440 and current experimental detail, including comparison with provided originals and matching captures. The early mobile catalog story links pushed products too far down: moved starting links to Overview while keeping catalog chooser. Chart dates/axes remain honest; no fabricated growth/comparisons.

## Independent review and resolved issues

1. **P2 badge cascade:** components-layer tone CSS lost to Zard utilities. Moved tones into scoped unlayered StatusPill wrapper styles. CLI computed experimental rgb(29,78,216), withheld rgb(146,64,14), failure rgb(185,28,28); no blanket green model approval.
2. **Scientific label/test contract:** new starting link abbreviated Known synthetic failure and duplicated chooser anchors. Restored full label; test separately verifies10expanded stories/3starting links. Starting links subsequently limited to Overview to avoid catalog density regression.
3. **P2 label-in-name:** shortened order link initially exposed only raw reference as its accessible name. Accessible name now starts with visible human label and appends exact original. Regression test and real CLI checks verify both plus full disclosure/detail traceability.
4. **Browser-discovered zoom overflow:** fixed min-width filter layout through scoped catalog content-width queries, without changing viewport settings or suppressing overflow. Magnified and standard sizes rescanned.

No additional material security/financial/functional issue found by independent source review. Review is not a merchant study. Initial frontend failure, temporary CSS budget warnings and CLI timing/label-selector mistakes were not hidden: fixed label/test selectors, unused local forecast .preset/.badge styles removed after template reference checks, redundant shell declarations removed, and final build has no budget warnings. CLI interactions now wait for the real result/destination and use the actual accessible select name.

## Tests, bundle and data invariants

|Exact command / context|Final actual result|
|---|---|
|backend: JAVA_HOME=installed JDK21; ./mvnw.cmd verify|BUILD SUCCESS126unit+67PostgreSQL integration,0failures/errors/skips;11:07total, finished2026-11-14T18:12:29Z. No backend source changes.|
|root: npm.cmd test --prefix frontend -- --watch=false|36files/157tests pass, including new exact-reference/accessibility regression. Baseline156→157; no skipped test hidden. Last final run18:25:17. jsdomcanvas warning remains informational; real charts checked separately.|
|./frontend/node_modules/.bin/tsc.cmd --noEmit -p frontend/tsconfig.app.json|Exit0, no diagnostics.|
|npm.cmd run build --prefix frontend|Exit0, last final build18:25:38;455.93kB initial/116.30kB estimated transfer. No CSS/initial budget warning.|
|node research/pricing/verify-portfolio-ux.mjs docs/demo/artifacts/milestone-12-1/|Exit0; live checksums,60classifications/comparisons, normal counts, V1–V7 and fresh canonical/benchmark bytes unchanged. invariants.json.|
|PLAYWRIGHT_MODULE=existing cached module; node scripts/measure-catalog.cjs http://localhost:4217|3fresh production-preview runs,1category/2product requests each; performance.json records actual environment overriding helper's generic dev-server label. No speedup claimed.|
|git diff --check; relative Markdown link/manifest/PNG inventory checks|Pass after final normalization. Only intended source/docs/screenshots/evidence staged; .playwright-cli output ignored; no env/log/dist/target/node_modules tracked.|

Initial bundle451.87→455.93kB, +4.06kB/about0.9%, estimated transfer115.71→116.30kB. Added shared presentation styles, accessible states and tree-shaken existing Lucide icons explain growth; no new dependency/font/image bundle. Chart library remains lazy. Current initial catalog232–272ms/filter569–582ms includes networkidle; previous measurement used a dev server, so timings are not comparable and imply no optimization gain. Request counts unchanged1/2.

Portfolio canonical SHA2565c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6;30variants/9863orders/54refunds,15approved/15withheld unchanged. Legacy6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34;30variants/9466orders/114refunds/10044inventory observations/30withheld unchanged. Normal0products/0orders/0refunds/1account/0evaluations/0SaaSevents; demo accounts/evaluations/SaaSevents0. All V1–V7 checksums unchanged.

Fresh Testcontainers seed/reset tests confirm two canonical exports byte-identical, idempotency/guarded reset and legacy marker rejection. No live fixture reseed/reset or normal record write. Mathematical80 and independent actionable90 fixtures,11.12CSV byte identity (unsafe0/228 and0/380) and11.13CSV byte identity all pass. Broad unsafe TEST65/260 and CHALLENGE41/156, hidden causal interval coverage0/20 remain unresolved; [canonical evidence](pricing-research/milestone-11-13-results.md). No model/gate/accounting/seed/migration/API/dependency edits or new automatic writes.

Auth/session/CSRF and immutable finance/SaaS tests pass unchanged. LIVE_SHOPIFY_NOT_VERIFIED, live billing/independent usability/current vulnerability advisories/unsupported environments remain unverified as before. Root project license still requires owner choice; Zard/Lucide/dependency attribution retained. No causal/model validation claim.

## Handoff and Git

Exact normalized-text/raw-PNG SHA256 changed-file manifest: demo/artifacts/milestone-12-1/manifest.json, excluding itself. Baseline a9675ea; implementation195fc51; final evidence commit listed in final handoff/local history. Working tree clean checked after commit. No push, merge, deployment, remote action, dataset rewrite or Git timestamp change. Task-owned QA/browser processes closed and disposable QA container restored stopped; normal/demo/portfolio services left intact.

Recommended next step: review the current screenshot pairs and run the five-minute portfolio walkthrough; separately choose project license/public visibility. Native assistive-technology testing and independent merchant usability would add evidence without changing model thresholds or pretending causal validity.
