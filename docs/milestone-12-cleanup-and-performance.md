# Milestone 12 cleanup and performance

2026-11-14. No speculative runtime optimization, dependency upgrade, schema change, fixture change or tracked-file deletion.

|Candidate|Reference / decision|
|---|---|
|Root README milestone history / stale V1–V6 and absent-evaluation wording|Simplify to current portfolio entry, screenshots, truthful scope and commands; preserve normal startup in docs/local-setup.md and link canonical domain/research guides.|
|Hard-coded historical verifier output|Simplify research/pricing/verify-portfolio-ux.mjs with optional output-directory argument, preserving default11.15 behavior. Prevent new evidence overwriting historical reports.|
|Research helpers, frozen models, benchmark CSVs and screenshots|Retain: tests and historical verification reference them; they establish reproducibility rather than dead production code.|
|Zard source-owned components / shared guidance / chart libraries|Retain: active imports/routes, provenance and lazy production chunks; no proven unused runtime dependency.|
|Target/dist/log/cache and local credential outputs|Already ignored; not tracked cleanup candidates. Clean-source reproduction uses ignored backend/target, without changing running node_modules.|
|Compact domain/research methods and dual JPA/JDBC|Retain this milestone; broad reformatting or repository replacement has no demonstrated correctness/performance benefit.|
|CI, deeper query profiling and dependency updates|Defer: no confirmed N+1 or slow query found in the measured flow; offline advisories unavailable, no arbitrary dependency churn.|

## Measurements

Method: scripts/measure-catalog.cjs, cached Playwright1.65.0 with installed Chrome headless, localhost4207 Angular dev server; three fresh pages, initial catalog then one explicit category filter. Date2026-11-14. Includes networkidle wait, local cache/server variation and simultaneous local test activity; not a production latency benchmark.

|Run|Initial catalog ms|Filter ms|Category requests|Product requests|
|---|---:|---:|---:|---:|
|1|660|666|1|2|
|2|663|725|1|2|
|3|548|636|1|2|

Raw evidence: docs/demo/artifacts/milestone-12/performance.json. Median initial660ms, range548–663; filter666ms, range636–725. Prior11.15 already removed duplicate category fetching. Current request counts retain that behavior. No runtime optimization was made in12, so there is no before/after speedup claim. Documentation and an evidence destination option do not justify a timing comparison.

Production build remains451.87kB initial /115.71kB estimated transfer, same as11.15; large ECharts module remains lazy. Build completes within configured500kB warning/1MB error initial budgets. No emitted production source maps; third-party license bundle present. Fresh tracked-source npm ci --offline plus production build passed using cached packages; online from-scratch availability is unverified. No new regression test is needed for documentation or the optional evidence directory; actual invariant execution verifies that path.
