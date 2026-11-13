# Milestone 11.15 cleanup and performance report

Reference searches used rg across actual Angular imports, route loaders, tests, docs and git ls-files. No AGENTS.md or extra repository policy was found. Cleanup is limited to touched frontend paths; backend controller→service→repository flows, seeders, data, model gates and dependencies are unchanged.

|Path/candidate|Usage evidence and risk|Action|
|---|---|---|
|core/environment-indicator.ts request/state block|The indicator and portfolio presentation need the same verified public environment. Duplicating HTTP calls would add requests and inconsistent failure states; medium UI risk.|Moved the existing request/validation/loading/error handling into core/environment.service.ts. The indicator delegates and preserves its output; consumers observe one signal without fetching again. Retry clears stale metadata.|
|ApplicationEnvironment type re-export in environment-indicator.ts|rg found only environment-details.ts using the component's type export; all other consumers now use the service model. Low risk.|Removed the unnecessary re-export and imported the type directly in environment-details.ts. No API DTO fields changed.|
|catalog/pages/product-list.ts repeated category request|Measured every initial+filter flow sent2 identical category requests. No category editor exists inside that page; component remount reloads categories. Medium request/cancellation risk.|Reuse successful categories for the page lifetime. Filter/pagination still request bounded product results. Failure/retry and session-loss cancellation/clear are tested. No global cache or backend query change.|
|pricing-presentation.ts and decision-summary/variant-summary/pricing-result|Active components/route references and tests; presentation wording was inconsistent. Medium terminology risk.|Shared experimental/withheld labels, adjacent caveat, same API status and monetary strings. Portfolio-only context mapping is typed presentation, contains no oracle prices/cost coefficients, and fails closed outside verified portfolio+demo session.|
|Historical migrations, research fixtures/CSV/JSON, screenshot sets and seed/export scripts|Referenced by milestone reports, manifests, reproducibility and regression checks. High deletion risk.|Retained unchanged. No benchmark case/expectation removed, no screenshot overwritten.|
|Generated binaries/logs/dumps|git ls-files found no tracked .log, dist/, target/, .jar or .dump candidates. .gitignore already excludes outputs, dependencies and credentials.|No speculative deletion. New QA scratch scripts/full captures stay outside the repo; only curated evidence is committed.|
|Maven/npm dependencies, Java layers and chart engine|Existing imports and lazy routes remain in use. No profiling evidence for removing a dependency or changing backend architecture.|No dependency removal/install, no Java abstraction/query/cache rewrite. ECharts remains lazy and black chart styling is untouched.|

Removed tracked files: none. Removed declaration: the unused compatibility type re-export after its consumer was migrated. Removed imports: component-local HttpClient/DestroyRef/takeUntilDestroyed/timeout after moving their active implementation into the shared environment service. This is reuse, not a claim that the whole application became smaller. New tests preserve behavior and mode boundaries.

## Comparable measurements

Windows, JDK21.0.11, Node24.22.1, Chrome headless, same running portfolio5437/8087/4207. Three fresh pages load the catalog and submit one explicit name filter. Networkidle wait is included; timing samples are noisy development-server observations.

|Metric|Before|After|Interpretation|
|---|---|---|---|
|Category GETs per catalog+filter|2,2,2|1,1,1|One demonstrably redundant request removed.|
|Product GETs|2,2,2|2,2,2|No data request or pagination omitted.|
|Catalog ms|504/371/390 (median390)|501/387/366 (median387)|No speedup established.|
|Filter ms|603/656/702 (median656)|582/686/689 (median686)|No speedup established.|
|Production initial bundle|451.51kB /115.61kB transfer|451.87kB /115.71kB transfer|About0.36kB additional initial code for shared metadata handling; not a bundle reduction. Final exact build in verification.|

Commands: npm.cmd run build --prefix frontend; npm.cmd test --prefix frontend -- --watch=false; existing cached Playwright runs the same performance script before/after. No consistent latency improvement, backend speedup or seeder optimization is claimed. Small UI additions are mostly lazy route code. No meaningful additional bottleneck justified architecture changes. Raw measurements are copied into new11.15 artifacts, not historical reports.

Risk/limitations: page-lifetime categories can change externally; navigating away/back reloads them. They are cleared on session loss, not persisted across accounts. Portfolio labels are tied to frozen portfolio-v1 names/SKUs and never determine eligibility or modify data. A new dataset version receives no labels until reviewed. Existing scientific unsafe approvals, unavailable intervals and provider/usability limitations remain explicit.

The new error-state scan exposed an existing color-contrast issue in .environment-warning. Scoped foreground/muted tokens and the existing44px workspace button style fix it. A trial eager Zard button import increased the initial bundle to486.02kB; measurements caught it and it was removed. Final451.87kB preserves deferred loading. This is the only shared stylesheet change; no chart/theme redesign.


Reproducer: scripts/measure-catalog.cjs accepts a base URL and uses installed Playwright or PLAYWRIGHT_MODULE pointing to the already cached module. It performs the same three-page method and emits JSON; no dependency install or data mutation. A separate repeat is retained in performance.json rather than selecting only the fastest timing samples.
