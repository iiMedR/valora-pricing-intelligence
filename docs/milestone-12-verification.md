# Milestone 12 final verification

2026-11-14. **Portfolio readiness: PARTIAL; supported local verification PASS. MODEL NOT CAUSALLY VALIDATED.** The requested CV-project work is complete locally; independent usability, live integrations and unsupported environments remain unverified. Public publication additionally needs an owner license/visibility decision and current dependency advisory review. No push or deployment.

## Baseline, scope and deliverables

Starting clean branch codex/milestone-01, HEAD0657cd5fefdc27e873a831ab35dece34d957acbb. Baseline audit committed before implementation as c781eac. No AGENTS.md/SECURITY.md or CI workflow found. [Baseline](milestone-12-baseline-audit.md), [architecture and quality](milestone-12-architecture-and-quality-audit.md), [end-to-end matrix](milestone-12-end-to-end-verification.md), [cleanup/performance](milestone-12-cleanup-and-performance.md) and [interview notes](portfolio-interview-notes.md) contain the scoped evidence and decisions. README now leads with purpose, real screenshots, Windows startup, walkthrough, design tradeoffs and limitations. Normal setup is preserved in local-setup.md; demo guide links final verification.

Only code change: research/pricing/verify-portfolio-ux.mjs accepts an optional report-directory argument; existing default behavior unchanged. No application runtime, dependency, infrastructure, migration, fixture, seeder, cost, threshold or model edit. No tracked file deleted. Historical reports and benchmark evidence retained.

## Exact checks and actual outcomes

Commands were run in Windows PowerShell with JDK21.0.11, Node24.22.1/npm11.19.1 and Docker Linux containers. Full logs stay ignored locally; compact fresh suite/scan/invariant evidence is committed in docs/demo/artifacts/milestone-12.

|Command / setup|Actual outcome|
|---|---|
|backend: ./mvnw.cmd verify|BUILD SUCCESS,126 unit +67 PostgreSQL integration tests,0 failures/errors/skips;10:56 total, finished2026-11-14T16:24:37Z. Fresh suite inventory: tests.json.|
|root: npm.cmd test --prefix frontend -- --watch=false|36files/156tests passed. jsdom canvas getContext warning does not prevent chart-host/spec checks; real chart inspection separately browser-tested.|
|./frontend/node_modules/.bin/tsc.cmd --noEmit -p frontend/tsconfig.app.json|Exit0, no diagnostics.|
|npm.cmd run build --prefix frontend|Exit0;451.87kB initial /115.71kB estimated transfer; configured budgets pass. No emitted .map files;3rdpartylicenses.txt present.|
|git archive HEAD into ignored backend/target/milestone12-clean-source; npm.cmd ci --offline --prefix that/frontend; npm.cmd run build --prefix that/frontend|Exit0 install and production build from tracked source with cached lockfile packages; no dependency/lockfile changes. Fresh online package/image download and unsupported OS not verified. npm allowScripts warnings were visible; cached build still passed.|
|backend: ./mvnw.cmd -o dependency:tree -DoutputFile=target/milestone12-dependencies.txt|FAILED: required dependency/plugin metadata unavailable offline. Not a build/test failure; report unavailable, no clean dependency-health claim.|
|npm.cmd audit --offline --json --prefix frontend|Exit0, zero reported entries. Cache-only result does not establish current advisory coverage: fresh vulnerability status NOT VERIFIED. No dedicated secret/vulnerability scanner installed.|
|node research/pricing/verify-portfolio-ux.mjs docs/demo/artifacts/milestone-12/|Exit0; live data/migrations,60 variant results, fresh canonical export and frozen benchmark CSV bytes match. invariants.json.|
|Cached Playwright/Chrome: milestone12-qa.cjs plus milestone12-isolation.cjs in local visualization workspace|54+8 states and62 axe scans passed; zero overflow/page exceptions/axe violations. Two expected503console errors from deliberately injected failures. Reports browser-results.json/isolation-widths.json.|
|PLAYWRIGHT_MODULE=<installed cached playwright>; node scripts/measure-catalog.cjs http://localhost:4207|3fresh runs,1category+2product requests each; performance.json. No speedup claim.|
|git diff --check; tracked-file/signature/config/output inventory; Markdown link check|Whitespace and relative link checks pass after final cleanup. No real env/key files tracked; zero matches for five common credential signatures; no tracked file over1MB. Heuristic/source review is not an exhaustive security or historical-secret scan.|

No required test was skipped or failed. One old unrelated integration XML existed in surefire-reports from an earlier invocation; it was excluded from the current unit evidence by actual Test suite names. The current Maven run itself reports126/67, with all67 integration tests in failsafe-reports. Auxiliary offline dependency-report failure is disclosed above, not counted as a passed test.

## Data integrity and science

|Fixture|Unchanged canonical SHA256|Actual preserved state|
|---|---|---|
|Portfolio|5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6|30variants,9863orders,54refunds,853price/107cost/9930inventory observations,166unknown-cost lines;15approved/15withheld. All statuses/prices/comparisons match frozen11.14.|
|Original legacy|6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34|30variants,9466orders,114refunds,10044inventory observations,10groups,30withheld; no suggestions fabricated.|

Fresh PortfolioSeederIT proves two independent canonical exports byte-identical,4878054bytes, idempotency, guarded reset reproducibility and wrong-profile rejection; first fresh seed92356ms. DemoSeederIT independently verifies the legacy golden seed/repeat. Fresh containers replay V1–V7. All live normal/legacy/portfolio migration checksum sequences remain1436242292,581270318,-1414359703,56597636,147175724,-1432513541,-319300667.

Normal actual counts remain0products/0orders/0refunds/1account/0evaluations/0SaaSevents; legacy/portfolio accounts/evaluations/SaaSevents remain0. No live fixture reset or normal business mutation occurred. Synthetic records contain no customer identities. Demo startup is explicitly separate from seeding and guarded reset.

Controlled optimum80 and independent actionable reference90 pass.11.12 safety CSV is byte-identical (unsafe0/228 and0/380).11.13 cases CSV is byte-identical, SHA2568f44c4bc5cd759862799c743a2e3f926bddf703a9f6e39c3d13858bcfd0bc010. Broad unsafe TEST65/260 and CHALLENGE41/156, hidden causal interval coverage0/20 are unchanged unresolved results. [Canonical research](pricing-research/milestone-11-13-results.md) explains the limits; [actual portfolio evaluation](demo/portfolio-evaluation.md) records known failures. Approval is not correctness. Historical comparisons remain1–30January2026, not future predictions today.

## Security, finance, UX and performance

Targeted reviewed source and existing full tests cover BCrypt/session rotation, protected routes/CSRF, CORS allowlists, one-time provisioning, demo identity/write guards, prepared SQL/allowlisted ordering, encrypted purpose-bound OAuth tokens, read-only connector scopes, transaction checkpoints and immutable replay/conflict/refund accounting. BigDecimal and period/currency validation preserve missing-data abstentions and known-cost coverage. SaaS normalizes annual recurring revenue separately from cash; no live billing integration or causal subscription model was claimed. This is not an exhaustive security scan, deployed CORS/TLS audit or penetration test.

All four widths320/375/768/1440 cover portfolio and SaaS guidance plus normal/legacy catalog isolation. Keyboard navigation, focus-trapped dialog/Escape/return focus, chart exact values, hard reload/back, loading/empty/error/retry, public metadata failure and actual protected-session invalidation passed. Visually reviewed current desktop chooser, mobile hidden-failure and annual guidance. Existing real [curated screenshots](demo/screenshots/milestone-11-15/) remain accurate; no runtime UI change required. Automated accessibility/developer rehearsal does not equal assistive-tech certification or independent merchant usability. Timer-based30-minute idle expiry was not waited end-to-end.

No new performance optimization. Three local catalog runs: initial548–663ms (median660), filter636–725ms (median666); each1category/2product requests. Dev-server timing includes networkidle and local variance; no production latency or speedup claim. Same451.87kB initial bundle as11.15, charts remain lazy. See cleanup report for reference-based retain/simplify/defer decisions.

## Release limits and local handoff

- LIVE_SHOPIFY_NOT_VERIFIED; mock/read-only integration contracts pass, not live provider OAuth/import compatibility. Live billing NOT VERIFIED.
- Independent merchant usability, other OS/browsers/screen readers, fresh online bootstrap/advisories and hosted CI NOT VERIFIED.
- No root project LICENSE; owner must choose rights/license/public visibility before publication. Zard MIT/provenance retained; production third-party license bundle generated. No remote repository created.
- Local development credentials and insecure-cookie default are loopback conveniences, not deployment configuration. No real token/private credential was printed or committed.
- QA servers were stopped by verified task-owned PID and disposable QA container restored stopped; real normal/demo/portfolio services left intact.

Changed-file normalized-text SHA256 manifest: demo/artifacts/milestone-12/manifest.json (excludes itself). Baseline c781eac; documentation/tooling commit3f73b50; final evidence commit is listed in local Git history / final handoff. Branch codex/milestone-01, clean status checked after final commit. No push, deployment, remote creation, history rewrite or timestamp manipulation.
