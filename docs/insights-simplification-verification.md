# Insight-page simplification verification

## Accepted behavior and implementation

2026-11-13. Baseline `8ef6a11`, with a clean starting tree. Implemented the merchant-approved plan: retain four insight pages, lead with understandable questions and results, default comparisons to 30 days, check the matching catalog explicitly, and provide a separate labeled worked example. Existing URLs, compact system typography and black sales charts remain.

Implementation commit: `ad8e35a`. The merchant walkthrough and this verification are committed separately. Final delivery checks confirm a clean working tree; no push is performed.

- **Recommendations:** replaced the primary technical table/status grid with available-suggestion cards and products needing more evidence. Eligible cards use returned prices, expected units, contributions and uplift. A no-suggestion card shows current price, a plain reason and a dated readiness link. Supporting diagnostics, costs, assumptions, model scenarios and saved evaluations remain available through an explicit detail action. Opening the analysis moves focus to it; closing returns to the originating card.
- **Check catalog:** uses existing read-only overview GETs sequentially, 10 variants per batch. The query is frozen for the run. Progress is explicit, results appear incrementally, cancellation retains partial results, and failed-batch retry resumes at that batch. Filter changes and session loss cancel pending work and clear protected/old-selection results. Duplicate identities, changed totals or incomplete pagination stop the run with a recheck message. Only complete scans may claim no suggestions across the matching catalog.
- **Analytics:** three primary metrics—Net sales, Orders, Contribution from sales with known costs—plus visible cost coverage and the existing black chart. Other metrics, accounting details, product search/sort/drill-down and inventory tables are optional disclosures. Open state survives report refresh, avoiding collapsed results after search. Primary money formatting trims only insignificant trailing zeros; exact table values remain available.
- **Forecasting:** searchable product cards replace the initial table. Selected analysis shows expected sales, price assumption, actual forecast dates and 7/14/30-day controls. Observed-sales assumptions and the inability to recover lost stockout demand are stated plainly. Sensitivity explanations and optional statistical evidence/backtests remain. Opening/closing analysis manages focus.
- **Data readiness:** API-prioritized tasks lead, with plain titles, supported affected counts and working fix/review links. Current connection/import status stays visible. Raw counts, codes, variant diagnostics and import controls are behind Detailed data checks. Internal filtered links open the details they target; dates supplied in direct links are retained.

Shared frontend additions are `decision-summary.ts` (comparison cards, sensitivity summary, teaching example and exact-string display helpers), `insight-window.ts` (validated date/horizon defaults), and `catalog-check.ts` (bounded cancellable discovery). No backend endpoints, DTO wire contracts, model logic, migrations, price writers or dependencies were added.

Sensitivity is translated into a 1%-price relationship only for a finite negative READY coefficient with CONDITIONAL_ASSOCIATION_ONLY identification. Weak/unavailable evidence gets an explanation, not confident advice. Tiny coefficients are not rounded into a false zero. Contribution is consistently described as sales minus known variable costs, excluding other business expenses. No guaranteed profit or measured causal response is claimed.

The worked example is fixed, visibly illustrative and independent of API results: price100 →80, unit cost40, assumed 30-day units100 →156.25, contribution6,000 →6,250, difference250 (approximately4.17%). The displayed arithmetic is consistent with constant elasticity−2. The local 1% explanation is not multiplied linearly to predict larger changes. The example has no save action and never enters actual counts or catalog-check state.

## Commands and results

- `cd frontend; npm.cmd test -- --watch=false`: **96 tests, 26 files passed**. New coverage includes batch sequencing/completion, failed-page retry, cancellation/resume/reset, live-pagination changes/duplicates, filter and session invalidation, significant-digit preservation, reliable versus weak sensitivity, historical comparison dates, valid explicit horizons, default30 and preserved Analytics disclosure state. Existing guards, forms, refund/audit disabled states and diagnostics tests continue passing. jsdom's missing canvas font measurement is an environment diagnostic; chart geometry is checked in Chrome.
- `cd frontend; npm.cmd run build`: **passed**, approximately494.39KB initial raw /121.7KB estimated transfer, below the unchanged500KB warning threshold. The existing ECharts engine remains lazy; no chart dependency or color change was introduced.
- `cd backend; .\mvnw.cmd '-Dtest=ContributionOptimizerTest,OptimizationGateTest' '-Dit.test=OptimizationApiIT' verify`: **9 targeted unit tests and5 PostgreSQL integration tests passed**, zero failures/errors/skips. These preserve optimizer oracle80, independent constrained eligible fixture90, eligibility and evaluation audit behavior. This is a targeted rerun, not a new claim that the full backend suite was rerun. Backend source is unchanged; the prior full89-unit/55-integration run remains documented in the milestone report.
- `git diff --check`: passed. Production backend and V1–V6 source changes: none.

## Browser and accessibility evidence

Browser plugin unavailable; used installed Chrome through the existing Playwright1.65.0 runtime, with isolated normal/demo contexts. Temporary scripts, screenshots and axe results are outside Git at `C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2`.

`insights-simple-qa.cjs` / `insights-simple-qa.log` verify:

- All four real demo pages at1440/768/375, with no primary technical tables, no page overflow and no framework error overlay. Normal empty pages are also checked at all three widths.
- Actual30-variant catalog completion, failed second-batch retry, partial cancellation, changed-filter reset and an explicit14-day deep link. Incomplete checks never display the complete-catalog no-suggestion conclusion.
- The worked example opens separately while actual suggestion count remains0.
- Analytics has three primary figures; search/drill-down remains accessible in the opened product section after refresh.
- Actual forecast horizon requests and historical dates (2026-01-01 through2026-01-30 versus through2026-01-07); analysis focus behavior; readiness links open the relevant detailed checks.
- A separate **Disposable eligible UI fixture (not stored)** exercises current100 → suggested90, supplied unit/contribution comparisons, exact uplift1,209.8765 /2.8807%, and the supported−2 explanation. This is an intercepted response for UI verification, not a new permanent-demo or real-model recommendation.
- Demo has no save action. A normal authenticated **Save fresh evaluation** is explicitly clicked, sends CSRF and horizon30, and is intercepted with an identified disposable response; no audit row is written to the permanent database. Viewing details does not save. Actual persistence is covered by the targeted PostgreSQL tests.
- Real normal login/logout, no unexpected business writes and no unexpected console/runtime errors. Response-aware waits distinguish finished UI results from transient loading states.
- axe-core4.11.0 WCAG2/2.1 A/AA: **12 scans** (four real demo pages ×three widths), **zero violations**. This is automated coverage, not full assistive-technology certification.

`insights-simple-editors-qa.cjs` / `insights-simple-editors-qa.log` additionally verify12 normal routes at all three widths, safe dated deep-link return/callback, invalid-field focus/descriptions, disabled busy fields, retained failed-save drafts and deliberate cancel/discard. The controlled503 response is intercepted; no permanent business record is created.

Visual review directly inspected desktop Recommendations/Analytics, mobile readiness and the eligible comparison/example captures. Four main questions, simpler figure hierarchy and no initial technical tables are deliberate changes. Product cards retain the established neutral style and compact type. Details remain reachable without leading the interface. Black charts remain black.

Screenshot index: `insights-simple-optimization-1440.png`, `insights-simple-analytics-1440.png`, `insights-simple-forecasting-1440.png`, `insights-simple-onboarding-375.png`; corresponding768/375 images for each page; `insights-simple-catalog-complete.png`, `insights-simple-worked-example.png`, `insights-simple-eligible-fixture-desktop.png`, `insights-simple-eligible-fixture-mobile.png`, and `insights-simple-normal-<page>-<width>.png`. Eligible-fixture images must not be presented as actual store recommendations. Earlier milestone115 captures provide before evidence.

## Task walkthrough acceptance

1. Open Recommendations, choose30 days and Check catalog. Read exact progress. Eligible fixture cards expose price changes, expected units and estimated contribution without opening any technical table. Actual demo correctly concludes no reliable suggestions only after all30 are checked.
2. Read the supported fixture's1%-price explanation. The actual demo's weak identification does not get that confident interpretation. Open the separately labeled teaching example to understand the calculation without confusing it with your own data.
3. Follow Review what to fix or Data readiness →Fix/review. A readable task and working detailed/variant destination identify the next input to review.
4. Open Analytics for sales/orders/partial contribution; expand product performance only when investigating. Open a forecast card to read units, price assumption and actual dates. Additional statistical knowledge is optional.

## Preserved data and limits

The original checksum is still `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`, `matchesSeed=true`. Direct30-day GET checks confirm30 abstentions:21 DIAGNOSTIC_ONLY,3 INACTIVE_VARIANT,3 MISSING_PRICE,3 UNRELIABLE_ELASTICITY; every recommendedPrice/comparison remains null and sensitivity empty. Normal retains0 products/0 orders/1 account; demo retains30 products/9,466 orders/0 accounts. Both retain0 sync jobs,0 mappings and0 evaluation audit records. Flyway checksums remain1:1436242292,2:581270318,3:−1414359703,4:56597636,5:147175724,6:−1432513541.

Catalog discovery is a live sequence of bounded reads, not an atomic snapshot. Count/identity inconsistencies stop a check; edits that leave the catalog count unchanged may not be detected. Results reflect their evaluation inputs and must be reviewed; the explicit save endpoint always reevaluates. No automatic pricing is introduced. No production data reset/reseed, provider operation or permanent business write was performed. LIVE_SHOPIFY_NOT_VERIFIED remains unchanged. No Safari/Firefox run, full screen-reader certification, calibrated uncertainty or realized-profit outcome is claimed. Milestone12 is not started. Changes are committed locally without pushing.
