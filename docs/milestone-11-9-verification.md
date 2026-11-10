# Milestone 11.9 — SaaS subscription workspace verification

## A. Executive summary

Delivered a bounded subscription vertical slice: an authenticated administrator in a fresh SaaS installation can preview and explicitly record plans/immutable prices, subscription lifecycle events, paid charges and refunds; inspect recurring run rate, paid-subscription counts, cash, movements and beginning-population retention; and understand why no SaaS price recommendation is available. Existing e-commerce is preserved. This is a manual-source foundation, not a billing provider integration, accounting system, customer database or validated SaaS pricing model.

The existing normal installation stays e-commerce. Follow [SaaS setup](subscription-setup.md) to create a distinct fresh installation. Temporary QA services have been stopped; normal 4200/8080 and permanent demo 4201/8081 were left running. No 11.10 or 12 work, push or deployment.

## B. Audit and architecture

Baseline actually inspected: branch `codex/milestone-01`, clean HEAD `5ef9b862b365a68eb44daa77a540e090d7b9fef8`. Mandatory [pre-code audit](ux/milestone-11-9-audit.md) was committed as `4e24c32` before application changes.

One business per installation; no tenant/auth replacement. V7 adds durable installation mode. Default ECOMMERCE; fresh SAAS_SUBSCRIPTION selection is blocked by existing catalog/categories/orders or Shopify connection evidence. Once initialized it cannot switch through configuration/API. The permanent demo cannot become SaaS. Initial currency is ISO-validated and never retroactively changed. Server matched-route checks enforce domain separation after existing session/ADMIN/CSRF authorization. Separate `saas` profile has its own database and SP_SAAS_SESSION cookie; logout deletes the configured cookie rather than a hardcoded normal cookie.

Manual version-1 entry was chosen over CSV for a reliable bounded slice: shared preview/commit validation, 2,000-operation cap, source-ID replay/conflict checks, explicit immutable references, serialized transaction and rollback. No fabricated provider/source coverage. [Domain reference](subscription-domain.md) records exact invariants and exclusions.

## C. Files and migrations

Only new forward migration: `V7__subscription_workspace.sql`, actual applied checksum `-319300667`. It adds installation mode, plans, immutable price versions, lifecycle events, paid/refund records and ingestion audit with indexes, constraints and source identities. No data fixture is inserted by migration. V1–V6 SQL bytes were not edited. Actual normal/demo Flyway histories retain successful V1–V6 checksums:

| Version |    Checksum |
| ------- | ----------: |
| V1      |  1436242292 |
| V2      |   581270318 |
| V3      | -1414359703 |
| V4      |    56597636 |
| V5      |   147175724 |
| V6      | -1432513541 |

SubscriptionMigrationIT independently upgrades V6→V7 with a preexisting catalog record and verifies prior checksums/data retention. The older V6-specific test now targets V6 explicitly; normal safety test expects seven applied migrations. The isolated health MVC slice mocks its new mode configuration dependency; actual mode enforcement remains covered by real HTTP integration tests.

Exact repository-relative manifest from the 11.8 baseline:

- `backend/src/main/java/com/smartpricing/auth/SecurityConfiguration.java`
- `backend/src/main/java/com/smartpricing/config/EnvironmentController.java`
- `backend/src/main/java/com/smartpricing/subscription/BusinessMode.java`
- `backend/src/main/java/com/smartpricing/subscription/SubscriptionController.java`
- `backend/src/main/java/com/smartpricing/subscription/SubscriptionService.java`
- `backend/src/main/resources/application-saas.yml`
- `backend/src/main/resources/db/migration/V7__subscription_workspace.sql`
- `backend/src/test/java/com/smartpricing/auth/SecurityHttpIT.java`
- `backend/src/test/java/com/smartpricing/demo/DemoNormalSafetyIT.java`
- `backend/src/test/java/com/smartpricing/demo/DemoReadOnlyIT.java`
- `backend/src/test/java/com/smartpricing/health/HealthControllerTest.java`
- `backend/src/test/java/com/smartpricing/optimization/ModelAuditMigrationIT.java`
- `backend/src/test/java/com/smartpricing/subscription/BusinessModeTest.java`
- `backend/src/test/java/com/smartpricing/subscription/SubscriptionIT.java`
- `backend/src/test/java/com/smartpricing/subscription/SubscriptionMigrationIT.java`
- `docs/examples/subscription-entry-v1.json`
- `docs/merchant-workflow.md`
- `docs/milestone-11-9-verification.md`
- `docs/subscription-domain.md`
- `docs/subscription-metrics.md`
- `docs/subscription-setup.md`
- `docs/ux/milestone-11-9-audit.md`
- `frontend/package.json`
- `frontend/proxy.saas.conf.json`
- `frontend/src/app/app.html`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/app.spec.ts`
- `frontend/src/app/app.ts`
- `frontend/src/app/core/environment-indicator.ts`
- `frontend/src/app/core/session.service.ts`
- `frontend/src/app/features/subscription/workspace.css`
- `frontend/src/app/features/subscription/workspace.html`
- `frontend/src/app/features/subscription/workspace.spec.ts`
- `frontend/src/app/features/subscription/workspace.ts`
- `infra/compose.saas.yaml`

## D. Metric evidence

See [precise formulas and worked examples](subscription-metrics.md). UTC effective-date reconstruction, inclusive bounded windows, explicitly partial history. Paid population requires active lifecycle plus recorded paid evidence. Monthly price or yearly price/12 produces MRR; ARR = MRR×12. Decimal money/rates are API strings backed by BigDecimal, not browser money arithmetic. Cash is independent PAID−REFUND flow. Existing price versions never retroactively migrate subscriptions.

Hand-verified integration/real QA fixture: A monthly 100, B yearly 1,200 → MRR 200. A upgrades to 150 on Jan 10 → 250. B's effective Jan 20 end → 150; it remains active through Jan 19. A Jan 21 refund of 100 affects cash, not lifecycle/run rate. Jan 2–31: beginning 200 + expansion 50 − churned 100 = ending 150; ARR 1,800; active paid count 1; cash −100. Beginning paid denominator is 2, lost IDs 1 → subscription churn 50%; gross revenue churn 100/200=50%; net revenue churn (100−50)/200=25%. Reconciliation difference is exactly zero. Downgrade/reactivation boundary also reconciles to 200. Empty denominators yield unavailable/null, never invented percentages. A price-less/invalid reference is rejected; an unpaid active ID does not enter paid counts.

Daily plan subscriber/MRR history is server-aggregated and inspected on demand. Historical plan inspection uses the 30 days ending at its actual selected as-of date, not today's month. Cohort/logo retention and customer ARPA are unavailable because no customer identity/completeness claim is made. Rates are explicitly per beginning paid-subscription population.

## E. Ingestion, privacy and partial data

Settings & data → enter one supported record → Validate & preview → review exact source/date/identity/amount/interval/version → Record entry. Preview writes nothing. Commit revalidates atomically. Source replay returns UNCHANGED only for the same canonical payload; changed content returns 409. No silent price/invoice overwrite. Linked refunds cannot exceed original paid amount. Strict chronological lifecycle append, one transition/day; unsupported intervals, zero/negative amounts, currency mismatch, missing price and invalid transitions fail closed. Errors retain editable input; replay is the documented recovery for ambiguous network outcomes.

An integration test forces a constraint failure _after_ plan/price insertion and verifies full rollback. Real browser tests cover invalid preview correction, controlled failed commit and explicit successful retry, CSRF headers, duplicate/conflicting source and refund errors. Browser fixture writes went only to `smartpricing_saas_qa` in separately named QA PostgreSQL on 5435. No SaaS records were inserted into the normal/permanent demo. One extra empty QA plan was recorded solely for failure/retry verification.

All reports say partial manual history. No personal customer fields, provider tokens, emails or payment details are collected. Opaque IDs and necessary plan/billing facts only; unrelated payload fields are rejected. Source dates, recorded timestamps and ingestion payload retain traceability. CSV/live sync, trials, pauses, delinquency/renewal entitlement, discounts, tax recognition, one-time fees, FX, customer/logo churn and complete cohort analysis remain unsupported. ARCHIVE is current plan metadata, not a future lifecycle schedule. There is no correction/rescheduling interface for immutable historical entries.

## F. Frontend and browser QA

Lazy routes: `/saas`, `/saas/plans`, `/saas/subscriptions`, `/saas/revenue`, `/saas/insights`, `/saas/settings`. SaaS navigation hides Shopify. E-commerce URLs/navigation remain. Overview has four KPIs, black MRR line, movement summary and next action; plans have search/sort, versions and subscriber trend; subscriptions are privacy-safe/paginated; revenue defines units/denominators and exact tables; pricing explains Needs evidence in an optional native focus-contained dialog; Settings provides source/setup and explicit entry workflow. No actionable SaaS prices or decorative generated metrics.

Browser plugin not available; used existing cached Playwright 1.65.0 with installed Chrome 157.0.8103.78 and axe 4.11.0. No browser dependency installation. Actual 1440×900, 768×900, 375×900 and 320×900 SaaS testing; established e-commerce regression scripts retain their desktop/tablet/phone viewports. Total **66 axe WCAG 2 A/AA and 2.1 AA scans, zero violations**: SaaS 33, expanded mobile plan-history tables 2, actual e-commerce demo 17, normal authenticated/intercepted-fixture regression 14. No relevant uncaught browser errors in final result files. No horizontal document overflow in checked states.

Actual interactions: direct route/login, correct mode navigation, explicit preview/commit and source replay, historical filters, no-results search, loading/read failure/retry, invalid entry recovery, failed commit/retry, native dialog Tab/Shift+Tab/Escape, trigger focus return, scroll containment/restoration, cookie isolation and actual logout→401. Fixed an initial metadata redirect that overwrote deep links, and asynchronous preview focus loss caused by a disabled submit trigger. A regression test also checks preserved SaaS deep links. The final full browser run uses the documented `saas` profile and confirms SP_SAAS_SESSION.

Evidence root outside Git: `C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone119`. Results: `browser-results.json`, `extra-results.json`, `demo-browser.json`, `normal-browser.json`, `data-results.json`; scripts/logs beside them. Observed screenshot examples: `overview-1440.png`, `overview-375.png`, `entry-preview-375.png`, `pricing-evidence-320.png`, `plan-history-320.png`. Desktop/phone/preview/evidence images were visually inspected. These are real rendered QA data, not generated concepts. No independent merchant study, full screen-reader certification or Safari/Firefox coverage is claimed.

## G. Actual commands, counts and bundle

- Backend `mvnw.cmd verify`: **BUILD SUCCESS**, 93 unit tests and 61 PostgreSQL/Testcontainers integration tests, zero failures/errors/skips, 11m40s. Log `milestone119-backend-final.log`.
- Subsequent final targeted backend verification: `mvnw.cmd "-Dtest=BusinessModeTest,HealthControllerTest" "-Dit.test=SubscriptionIT,SecurityHttpIT,DemoReadOnlyIT" verify`: **BUILD SUCCESS**, 7 selected unit and 7 selected integration tests; this covers the final currency-bearing subscriber DTO, real rollback assertion, configured SaaS cookie deletion/logout, normal cross-mode 409 and demo denial. Log `milestone119-security-final.log`. These selected tests are included in the unique 93/61 inventory, not added to inflate totals.
- Frontend `npm.cmd test --prefix frontend -- --watch=false`: **123 tests / 31 files passed**, zero failures in final standard run. Log `milestone119-frontend-standard.log`.
- Frontend `npm.cmd run build --prefix frontend`: exit 0. Initial **510.58 kB** vs 508.62 kB baseline: **+1.96 kB (~0.39%)**. Lazy workspace 36.56 kB. No dependencies added. Existing 500 kB warning remains, exceeded by 10.58 kB; 1 MB error budget unchanged. Log `milestone119-build-final.log`.
- Playwright `node verify-saas.cjs`, `node extra.cjs`, `node verify-demo.cjs`, `node verify-normal.cjs`, `node check-data.cjs`: final assertions pass, actual browser results above.
- `git diff --check` and repository Prettier check on changed/new frontend sources pass at finalization.

Earlier verification issues were resolved and are not counted as passes: initial Java launcher/sandbox limitations, a Windows running-JAR lock, MVC slice dependency, obsolete latest-migration assumption and browser-test locator/regex mistakes. Under concurrent load two earlier standard frontend runs hit the same existing analytics 5s timeout; isolated analytics (8/8), a two-worker full run (122/122 at that stage), and final standard 123/123 passed without increasing timeouts or weakening assertions. The inherited JSDOM canvas warning remains; real Chrome had no relevant runtime errors. Runtime JAR copies prevent rebuilding a running archive.

## H. E-commerce, demo and security integrity

Latest backend was also run read-only against actual normal/demo databases on temporary 8083/8084, applying only additive V7. Both persisted ECOMMERCE. Before/after normal: 0 products, 0 orders, 1 existing account; 0 saved evaluations and 0 SaaS events after testing. Demo: 30 products, 9,466 orders, 114 refunds, 0 accounts, 0 saved evaluations, 0 SaaS events. No reset/reseed. Actual V1–V6 checksums above unchanged.

Original/current demo checksum: `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`; `matchesSeed=true`. Three actual 10-row Full-2025/horizon-30 reads confirm **all 30 abstain**: 21 DIAGNOSTIC_ONLY, 3 INACTIVE_VARIANT, 3 MISSING_PRICE, 3 UNRELIABLE_ELASTICITY. Every candidate/comparison is null; sensitivity empty. Original scientific gates, optimizer oracle and independent actionable-90 fixtures passed the full suite. No fabricated SaaS optimization or changes to those fixtures.

Actual current-backend anonymous normal SaaS GET=401, demo SaaS GET=403, demo write=403. Authenticated normal cross-mode=409; SaaS e-commerce access=409. Real CSRF-missing writes=403. Existing authenticated evaluation save remains explicit with success/failure/forbidden and duplicate/busy behavior tested using intercepted normal-store fixtures, no persisted synthetic evaluations. No provider price writes, billing changes or automatic price application. Temporary QA backends/UI/database were stopped by exact task-owned identifiers; existing normal/demo listeners were confirmed still running. QA data was retained only in its stopped separate database.

## I. Honest limits

`LIVE_SHOPIFY_NOT_VERIFIED`. No live billing provider, payment processing, CSV/bulk pipeline, permanent SaaS demo, tenant isolation or validated SaaS recommendation model. Active paid is historical paid evidence plus explicit lifecycle, not validated current renewal collection; missing source history can bias all metrics. No customer/logo/cohort inference, accounting recognition, causal pricing effect or realized uplift. Archive metadata is immediate; dated corrections/rescheduling and same-day multi-transition support require a separately designed workflow. Manual scale intentionally capped. Known initial bundle warning and independent usability/assistive-technology breadth remain open.

## J. Local Git

Branch `codex/milestone-01`; baseline `5ef9b86`. Local commits: audit `4e24c32`, domain/API/metrics `01e7835`, frontend `d6810a9`, tests `c209603`. This report and merchant/domain/metrics/setup/template references are in the subsequent documentation commit; its exact ending HEAD/clean status is checked and reported at delivery. Real timestamps retained; no push, deploy, reset, rebase or fabricated history.

## K. Acceptance matrix and prerequisites

| Acceptance area                                             | Result                  | Evidence / limit                                                                        |
| ----------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Fresh durable single-business mode and server separation    | Pass                    | Startup gate/unit tests, real normal/SaaS/demo HTTP checks                              |
| Plans/prices/lifecycle/paid/refund domain                   | Pass                    | Immutable references, effective-end tests, V7 constraints and trace                     |
| Safe manual preview/commit and idempotency                  | Pass                    | Real UI/API, replay/conflict, forced late-write rollback                                |
| MRR/ARR/cash/movements/churn definitions                    | Pass                    | Hand-checkable fixture, exact reconciliation, null denominators                         |
| Historical run rate and plan paid-subscriber trend          | Pass                    | Server reconstruction, bounded historical UI request and mobile exact table             |
| Customer/logo/cohort retention                              | Partial                 | Explicit unavailable state; customer identity and complete coverage are not established |
| Responsive/keyboard/automated accessibility                 | Pass                    | 66 scans, four widths, dialog/focus and recovery walkthroughs                           |
| Complete assistive-technology / independent usability study | Partial                 | Not conducted, no certification claimed                                                 |
| E-commerce/demo/migration/security regressions              | Pass                    | Actual checksum/counts, V1–V6, oracle/independent fixtures, 93/61 full suite            |
| Provider/CSV/large-scale source completeness                | Partial                 | Outside chosen manual slice; no fake integration                                        |
| Build                                                       | Pass with known warning | 510.58 kB, unchanged budgets                                                            |

The bounded vertical slice is demonstrated. No failing technical gate remains for it. Before depending on broader ingestion or customer/cohort conclusions, design provider/source completeness, corrections and customer-population semantics separately. Before any SaaS recommended price, a separately validated and explicitly approved model is required. 11.10/12 were not started.
