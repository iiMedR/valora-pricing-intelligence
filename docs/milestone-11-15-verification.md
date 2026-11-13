# Milestone 11.15 verification

**PASS — portfolio UX, scoped simplification and measured request reduction.** Scientific model readiness is not established. No backend/model/gate change, seed tuning, data reset, migration/dependency change, automatic price application, provider write, push or deployment. Milestone12 has not started.

Baseline actual HEAD1e8df6fae9075282abb95887b28a22c89391e282, clean codex/milestone-01. Mandatory audit committed before implementation at7e55af0. Tested implementation/evidence commit1d5816e. This final verification/manifest is a separate local documentation commit; final hash and clean status are reported in the handoff. No AGENTS.md found. Available11.14 verification, portfolio guide/evaluation and11.13 results were read; actual routes and frontend/API code inspected as listed in the baseline audit.

## UX and terminology

Existing routes retained: /, /products, /products/:id, /optimization, /forecasting, /analytics and separate /saas/plans. Compact Explore the portfolio section on Overview/Products uses existing catalog name filters, not new lookup endpoints or a tour framework. Ten typed stories cover elastic/inelastic behavior, seasonality, hidden marketing, promotions, stock, missing cost, refunds, incorrect costs and near-optimal limitations. Relevant catalog cards have concise labels; detail/result views show context beside the result. Search, grid/list, selected variant, back context and hard reload remain.

Portfolio context requires verified DEMO+synthetic+portfolio-v1+READY+ECOMMERCE metadata and an anonymous read-only DEMO session. Unknown metadata, legacy, normal, SaaS and session loss suppress it. No oracle price, true-cost coefficient, predicted outcome, approval quota or eligibility rule is embedded in presentation mapping. Ordinary modes receive no synthetic failure disclosure. Global statistical wording now says Experimental suggestion / Withheld and places “Not causally validated or a proven optimal price” adjacent to approved comparisons. Original API status/amounts remain untouched. Financial guidance states financial calculations and what-if merchant assumptions; missing costs and exclusions remain explicit. Synthetic historical dates stay identified as historical.

Core changes are EnvironmentService reuse, presentation components/mapping, page-lifetime category reuse and small copy changes. Environment warning contrast was repaired using existing foreground/muted tokens and44px workspace button style. Black charts, existing fonts/palette and Zard/Tailwind visual language retained. No new UI library, animation, persistent state or feature flag framework.

## Tests and commands

JDK21.0.11, Node24.22.1, Windows/PowerShell; PostgreSQL17.7 Testcontainers. Commands from backend unless marked root. Actual logs remain ignored milestone1115-*.log.

|Command/check|Observed outcome|
|---|---|
|./mvnw.cmd -Dtest=ContributionOptimizerTest,OptimizerSafetyRegressionTest,PortfolioGeneratorTest,DemoSafetyGuardTest test|Baseline20 tests passed; zero failures/errors/skips;32.539s.|
|Root npm.cmd run build --prefix frontend|Baseline451.51kB initial /115.61kB estimated transfer; no build warning.|
|Root npm.cmd test --prefix frontend -- --watch=false|Baseline145 tests/35 files passed.|
|./mvnw.cmd verify|Full BUILD SUCCESS10m53s:126 unit +67 PostgreSQL integration tests; zero failures/errors/skips. Includes security/session/CSRF, immutable accounting, normal/demo/SaaS isolation, Shopify read-only imports, financial edge cases, original/research/oracle tests and two-fresh-seed/reset checks. Backend code unchanged.|
|Root npm.cmd test --prefix frontend -- --watch=false|Final156 tests/36 files passed; zero failed/skipped. Existing jsdom canvas getContext warning is informational.|
|Root npm.cmd run build --prefix frontend|Final passed, strictTemplates enabled.451.87kB initial /115.71kB estimated transfer, no build warning.|
|Root ./frontend/node_modules/.bin/tsc.cmd --noEmit -p frontend/tsconfig.app.json|Passed, no diagnostics. strictTemplates, strictInjectionParameters and strictInputAccessModifiers confirmed in configuration.|
|Existing Prettier on touched frontend and measurement script|Formatting completed; no dependency installed.|
|Root node research/pricing/verify-portfolio-ux.mjs|All portfolio statuses/prices/comparisons unchanged, legacy30 abstentions, hashes/counts/migrations preserved, benchmark CSVs byte-identical, fresh seed export matches. Writes only new11.15 evidence.|
|Root node scripts/measure-catalog.cjs http://localhost:4207|Repeated three fresh pages, same method as baseline;1 category and2 product requests per initial+filter. Uses existing Playwright or PLAYWRIGHT_MODULE; no dependency install.|
|node --check on verifier, manifest and measurement script|Passed; verifier/measurement also executed.|
|git diff --cached --check|Passed before implementation commit and checked again before final documentation commit.|

Added ten portfolio tests cover six excluded environment variants, session loss/unknown metadata, real catalog-name links, wrong-cost disclosure with unchanged API amounts and metadata retry failure. Added category retry/session cancellation test; existing filter/pagination tests now assert no duplicate category GET. Copy-only expected labels were updated without changing API eligibility/unsafe-field suppression assertions. No test, seed, benchmark expectation or security check removed/skipped.

Initial frontend failures exposed stale duplicate-request/copy expectations; one unmatched HTTP request caused cascading TestBed failures. Expectations were updated to the intended request count and copy, then all156 passed. Browser QA caught a missed nested heading replacement and an existing error-state contrast issue; both repaired. Harness issues (delayed route teardown race and over-exact chart label selector) were corrected without fabricating app outcomes. A temporary eager Zard retry-button import raised the initial bundle to486.02kB; measurements caught it and existing workspace styling replaced it before final verification.

## Measured performance

Same Chrome headless/local Angular dev server4207, three fresh pages, initial catalog then one explicit name filter; networkidle wait included. Raw before/intermediate/final/additional repeat data: docs/demo/artifacts/milestone-11-15/performance.json.

|Metric|Baseline|Final|
|---|---|---|
|Categories GET per catalog+filter|2/2/2|1/1/1|
|Products GET|2/2/2|2/2/2|
|Catalog ms|504/371/390; median390|501/387/366; median387|
|Filter ms|603/656/702; median656|582/686/689; median686|
|Initial bundle / estimated transfer|451.51 /115.61kB|451.87 /115.71kB|

One redundant category request was removed. No consistent latency improvement, bundle reduction, backend or seeder speedup is claimed. Initial bundle increased0.36kB (about0.08%); heavy chart code remains lazy. Categories are reused only for one page instance and cleared on session loss; remount fetches current categories. No global financial-data cache or backend architecture optimization was justified.

Reproducer: set PLAYWRIGHT_MODULE to the already installed/cached Playwright module if not locally resolvable, then run scripts/measure-catalog.cjs against4207. In this environment it was C:/Users/iimedr/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright. Actual browser/performance scripts ran from the writable visualization directory before the measurement helper was extracted; the same method was rerun using the committed helper. Timing samples are development diagnostics, not a controlled production benchmark.

## Browser and accessibility matrix

Browser plugin not available; installed frontend-design and frontend-testing-debugging skills used with existing Playwright1.65.0 and Chrome. No browser dependency installed. Real portfolio5437/8087/4207 confirmed before testing. Existing stopped disposable QA container on5436 reused with separate commerce/SaaS databases; QA servers8085/8086 and temporary built-frontend proxy4204/4205/4206. Only QA login/logout writes; no business entries, provider actions or normal/demo data mutations. Proxy removes Origin for local QA, so no deployment CORS/live-provider claim. Temporary QA PIDs were checked before stopping, and the container restored to its prior stopped state. Portfolio and existing installations remain running/untouched.

Final54 states and54 axe WCAG2A/AA/2.1A/AA scans at320/375/768/1440; zero final violations, global overflows or page exceptions. Two expected console resource errors are the deliberately injected catalog503 and metadata503. No other console errors. These are controlled fault tests, not claims of real backend outages.

|Flow|Widths / evidence|
|---|---|
|Catalog → scenario chooser → hidden-marketing product → insight|All four widths; known-failure disclosure adjacent to still-approved price.|
|Wrong-cost approved insight|All four; no implied correctness from approval.|
|Elastic product → explicit what-if guidance → experimental detail|All four; exact price81 still from API, assumed calculator values separate.|
|Missing cost → withheld detail|All four; no invented zero contribution.|
|Inelastic, seasonality, promotion, stock, refunds, near-optimum|Desktop real-backend views.|
|Overview orientation|375/1440.|
|Keyboard summary/link/search, modal focus/Tab/Escape|Chooser all widths; dialog375/1440; focused control visually inspected.|
|Hard reload and Back to product|All four; selected context restored.|
|Empty/loading, controlled API failure/retry|Desktop; real no-match query, delayed genuine request, injected503 then real recovery.|
|Unverified metadata/retry|Desktop; stories disappear until verification; contrast fix rescanned.|
|Chart exact-period inspection|Desktop; keyboard opens exact values and selects native period control.|
|Normal/legacy isolation|Desktop real installations; no portfolio stories. Normal/SaaS opposite APIs reject409.|
|SaaS Plans → Review plan → annual guidance|All four, existing synthetic QA plans; explicit subscriber/cost assumptions.|
|Monthly SaaS guidance|375, correct monthly input labels.|
|Actual logout / expired protected session|Desktop SaaS; redirects to sign-in and clears guidance.|

Eight curated actual screenshots: docs/demo/screenshots/milestone-11-15/{chooser-expanded-1440.png,examples-320.png,hidden-failure-375.png,wrong-cost-1440.png,experimental-1440.png,missing-cost-375.png,saas-yearly-guidance-375.png,unverified-environment-1440.png}. They were visually inspected; historical screenshots untouched. Full54-state report in artifacts/milestone-11-15/browser-results.json; full temporary captures/scripts retained outside repo in the visualization directory. Developer QA is not independent merchant usability or exhaustive accessibility certification.

## Immutable data, model and security

Portfolio checksum:5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6.30 variants,9863 orders,54 refunds,853 price/107 cost/9930 stock observations; all30 result statuses/prices/comparisons match11.14,15 approved/15 withheld. Approval is still not scientific correctness. Full integration creates two safe fresh containers and compares canonical exports, idempotency and guarded reset; final canonical4878054 bytes matches the fixed checksum. No live fixture reset.

Original checksum:6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34.30 variants,9466 orders,114 refunds,10044 observations and30 abstentions unchanged. Normal counts remain0 products/0 orders/0 refunds/1 account/0 evaluations/0 SaaS events. Legacy and portfolio accounts/evaluations/SaaS events remain0.

All three V1–V7 sequences unchanged:1436242292,581270318,-1414359703,56597636,147175724,-1432513541,-319300667. No backend, infra, seeder, dependency or migration file changed. Original80 and constrained90 tests pass. Fresh11.12 safety CSV matches committed bytes (unsafe0/228 and0/380);11.13 cases match committed bytes. Broad research unsafe TEST65/260, CHALLENGE41/156 and hidden causal interval coverage0/20 remain unsolved and documented. All safeguards, read-only demo rules, authentication/CSRF, financial arithmetic and SaaS accounting tests passed unchanged. LIVE_SHOPIFY_NOT_VERIFIED and live billing NOT_VERIFIED; no new live experiments or automatic price writes.

## Cleanup, manifest, Git and next step

No tracked file or dependency deletion was justified. Removed/moved redundant component request handling and unused type re-export; scoped category request reuse, typed portfolio mapping and accessible warning styling are documented in docs/milestone-11-15-cleanup-report.md. Historical research/methodology/truth/screenshots, canonical seed artifacts and migrations retained. New screenshots/artifacts are under a versioned11.15 directory. No full dump, secret, ignored credential, generated binary or scratch log committed.

Exact changed-file manifest and normalized text/raw PNG hashes: docs/demo/artifacts/milestone-11-15/manifest.json. Baseline audit7e55af0; implementation1d5816e; final local verification commit in handoff. Source-only frontend changes and read-only verification tools; no push/deployment/history rewriting. Clean Git checked after final commit.

Recommended next: separately requested Milestone12 final end-to-end portfolio verification, including a complete recruiter walkthrough and remaining environment/provider limitations. No automatic start and no claim that model readiness or independent usability has been established.
