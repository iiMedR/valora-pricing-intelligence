# Milestone 11.10 — usability polish and release-readiness evidence

## A. Executive summary

Implemented targeted workflow changes, not a redesign or new financial model. A SaaS founder can search for a plan, review its price/history, return to the same selection, and distinguish source references from useful primary information. Editable controls are drafts until Update; displayed prices/report dates, retries and onward links retain their applied meaning. Manual entry has clearer types, explicit draft clearing/discard, expiry handling and readable financial errors. E-commerce retains working catalog/variant/pricing context and gains a concise optional demo explanation plus honest live-sync status.

Initial production bundle fell from **510.58 kB to 451.51 kB** (−59.07 kB, about 11.57%). The unchanged 500 kB warning is now resolved. No dependencies, APIs, backend logic, migrations or statistical gates changed. Engineering checks pass; independent merchant/founder usability remains **NOT VERIFIED**, so the overall acceptance verdict is **PARTIAL**.

## B. Baseline audit and ranked findings

Actual clean baseline: `codex/milestone-01`, HEAD `b4dfafd21e6b7205b9014f7ffb848265f492cc1f`. The [pre-code audit](ux/milestone-11-10-audit.md) was committed **before implementation** as `ebeffba`. It records route/dependency/domain inspection, actual before screenshots, novice-simulation paths, build analysis and P0–P3 priorities. No user changes were discarded.

| Finding                                              | Result                                                                                                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1 pending/expired-session leave decision            | Resolved defensively; corrected real-session test reaches login and removes protected content                                                                    |
| U2 lost SaaS search/date/sort/page/selection context | Resolved with bounded URL state, back/forward/reload and same-page cache reuse                                                                                   |
| U3 raw source IDs and repetitive introductions       | Resolved in plan discovery: concise rows, focused review and optional references/history                                                                         |
| U4 unsafe/unexplained dirty-entry navigation         | Resolved with explicit clear/discard confirmation, retained cancelled input and pending status                                                                   |
| U5 rounded “exact” inspection / unclear chart scale  | Resolved with original decimal strings, units/scale and accessible tables                                                                                        |
| U6 repeated demo abstention explanations             | One optional teaching disclosure; actual per-item reasons and eligibility unchanged                                                                              |
| U7 generic SaaS workspace identification             | Distinct SaaS badge and mode-specific workspace explanation                                                                                                      |
| U8 initial forms-library loading                     | Lightweight editor service/guard separated from lazy form directives; compatibility exports retained                                                             |
| Additional bounded findings                          | Historical plan-only date controls, unapplied filter/report mixing, hidden live-sync validation, error contrast and zero-ending MRR trend presentation corrected |

The audit includes a post-test clarification: the first mocked-401 reproduction left a valid backend session and could trigger an automatic login return. That was not proof of a genuine expiry blocker or data leak. The original evidence is retained; the refined test actually invalidates the server session before the pending response and verifies login with no draft. No confirmed unresolved P0/P1 remains in the exercised scope. This is not a claim that all possible workflows are defect-free.

## C. Changes, routes and exact file manifest

- `/saas/plans` and `/saas/insights`: search → Update → Review plan → focused price/status → optional history/references/Why. Back restores the matching button and selection. A loaded plan is reused without another page GET; missing selected IDs get an honest not-in-results state, not fabricated details.
- SaaS URLs retain validated `start`, `asOf`, `search`, `sort`, `page`, `planId`. Invalid/unbounded IDs, dates, duplicated return parameters, external returns and personal-looking email searches are rejected/normalized appropriately. Unsubmitted controls never leak into onward links or change current displayed prices. Plan-only historical as-of selection safely derives its otherwise hidden start.
- `/saas/revenue` and overview: API-grounded currency/period, visible monochrome scale, unrounded daily values and bounded 365-row inspection. Recorded positive history remains visible even if ending MRR is zero; that display boundary is DOM-unit-tested. No run-rate, cash, churn or pricing math was changed.
- `/saas/settings`: short source context, collapsed setup, human record labels, explicit clear action, dirty-leave confirmation, validation-specific recovery and protected expiry removal. Required source IDs remain necessary and discoverable; no CSV/provider workflow was invented.
- `/optimization`: optional “How to read this demo” explains the kinds of abstention and links to readiness. Counts remain page/loaded-scope based; all 30 permanent variants still abstain.
- `/store-connection`: uses returned live-validation status to display that real-store sync has not been verified. Unknown status is not translated into a verified claim.
- Shared editor safety: new `core/editor-session.ts` contains the same singleton service/guard, importing the form directive only as a type. Existing exports in `editor-state.ts` preserve feature imports. Root routes/session navigation no longer pull reactive forms into first paint. Actual dirty-editor cancellation and all prior safety tests pass.
- Small-text error feedback now uses `--error-foreground` on `--error-surface`; destructive button styles are unchanged. Real refund and timeout error states passed contrast scans after the correction.

Exact repository-relative manifest from the 11.9 baseline:

- `docs/merchant-workflow.md`
- `docs/milestone-11-10-verification.md`
- `docs/ux/design-system.md`
- `docs/ux/milestone-11-10-audit.md`
- `docs/ux/milestone-11-10-usability-script.md`
- `docs/ux/screenshots/milestone-11-10/README.md`
- `docs/ux/screenshots/milestone-11-10/after-demo-optimization-375.png`
- `docs/ux/screenshots/milestone-11-10/after-refund-error-320.png`
- `docs/ux/screenshots/milestone-11-10/after-saas-plans-1440.png`
- `docs/ux/screenshots/milestone-11-10/after-saas-plans-375.png`
- `docs/ux/screenshots/milestone-11-10/after-saas-settings-375.png`
- `docs/ux/screenshots/milestone-11-10/before-demo-optimization-375.png`
- `docs/ux/screenshots/milestone-11-10/before-saas-plans-1440.png`
- `docs/ux/screenshots/milestone-11-10/before-saas-plans-375.png`
- `docs/ux/screenshots/milestone-11-10/before-saas-settings-375.png`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/core/editor-session.ts`
- `frontend/src/app/core/editor-state.ts`
- `frontend/src/app/core/environment-details.ts`
- `frontend/src/app/core/environment-indicator.spec.ts`
- `frontend/src/app/core/environment-indicator.ts`
- `frontend/src/app/core/session-nav.ts`
- `frontend/src/app/core/session.service.ts`
- `frontend/src/app/features/optimization/optimization.html`
- `frontend/src/app/features/store-connection/sync-panel.spec.ts`
- `frontend/src/app/features/store-connection/sync-panel.ts`
- `frontend/src/app/features/subscription/subscription-state.spec.ts`
- `frontend/src/app/features/subscription/subscription-state.ts`
- `frontend/src/app/features/subscription/workspace.css`
- `frontend/src/app/features/subscription/workspace.html`
- `frontend/src/app/features/subscription/workspace.spec.ts`
- `frontend/src/app/features/subscription/workspace.ts`
- `frontend/src/styles.css`
- `frontend/src/zard-theme.css`

## D. Zard, skills and dependencies

Applied the existing frontend-design and frontend-testing-debugging skills. Browser plugin not available; the requested Chrome/Playwright fallback was used. The session catalog has no installed zard/zard-migration skill. The previous local upstream Zard review cache was available: read its `skills/SKILL.md`, Angular/composition/styling rules, actual `frontend/components.json`, provenance and installed component APIs. No `npx skills` installation, Zard initializer, migration, overwrite or dependency update was necessary.

Retained standalone Angular, signal state, OnPush for the changed SaaS workspace, existing Zard buttons/inputs, native disclosures and ModalFocus. Existing system fonts, compact neutral semantic tokens and application-scoped CSS stay intact. No generated registry components or images were replaced. Package/lock files and backend source/migrations are byte-unchanged from 11.9.

## E. E-commerce journeys

Actual anonymous demo walkthrough covers search/SKU, pagination/back, catalog variant → pricing context, optional Why dialog, scoped actionable/abstention views, complete catalog check, error/retry and no write requests. Missing images remain neutral placeholders. The demo teaching disclosure leads to prioritized readiness; its actual review target `/onboarding?status=STALE_INVENTORY` works without writing.

Actual authenticated normal empty-state flow remains truthful. Existing clearly identified intercepted actionable/abstention/missing-price fixtures verify exact API comparisons, explicit evaluation save success/failure/403, CSRF headers, pending/double-click behavior, historical snapshot labels and session removal. They are UI fixtures, not real store recommendations or saved production results.

A separate intercepted **archived product only** fixture (no revenue or recommendation data) verifies invalid-name feedback, dirty navigation cancelled via Escape with the draft retained, explicit discard, and zero business writes. This exercises the shared editor singleton after the lazy split. Real normal Shopify status remains unverified; mobile keyboard navigation opens, contains focus and returns to its trigger. No provider connection/import was attempted.

## F. SaaS journeys and accounting honesty

Separate retained QA installation on 5435/8082/4202, using the documented SaaS profile and SP_SAAS_SESSION cookie. It never shares normal/demo business tables. Real API-backed plan search/date/update → review → exact references → subscriber history → Back/forward/reload passed at all four widths. Selecting/closing a loaded plan issued no additional page GET. The full manual fixture was replayed idempotently; no new subscription history was appended.

Manual preview → cancel → explicit commit/replay, duplicate/conflicting sources, refunds, CSRF denial and mode denial pass. Real UI refund-bound rejection retains the amount and presents a plain error without a commit. Dirty clear/leave cancellation retains inputs; explicit discard clears them. Real session invalidation during pending preview reaches login with no protected draft. A held read reaches the existing client timeout (observed 15,642 ms including navigation), then Retry restores the applied search. This is a request measurement, not participant timing.

Existing accounting fixture remains: beginning MRR 200 + expansion 50 − effective-end MRR 100 = ending 150, ARR 1,800, subscription churn 50%, gross revenue churn 50%, net revenue churn 25%, cash −100 for Jan 2–31 and zero reconciliation difference. These come from actual events/API tests, not UI constants. Source coverage stays partial; active paid means explicit active lifecycle with recorded paid evidence, not verified renewal collection. Current plan price is not an automatic subscriber price change. SaaS pricing evidence still explains the absence of a validated optimizer; no optimal price/elasticity/uplift was introduced.

Only available subscription state/effective dates and scheduled ends are shown. A complete billing-event/customer timeline is not exposed by the current contracts; no new domain API was added to simulate one.

## G. Browser, accessibility and screenshots

Existing cached Playwright 1.65.0, installed Chrome 157.0.8103.78, axe 4.11.0. Real 320, 375, 768, 1440px checks; representative before/after captures use height 900. Established e-commerce scripts retain their original desktop/tablet/phone heights. Routes render meaningful headings, no framework overlay and no relevant unexplained browser runtime errors in final logs. Expected controlled HTTP failures are identified as such.

**77 final automated accessibility scans, zero violations** (WCAG 2 A/AA and 2.1 AA): SaaS route/preview/evidence matrix 33; e-commerce demo 17; authenticated normal regression 14; focused plan/history/back and 365-row table 5; normal editor/Shopify/menu 2; real refund error 1; demo explanation/readiness/review 4; client timeout error/retry 1. The initial refund state did fail color contrast; its semantic foreground was corrected and the final error scans pass. Zero scans alone is not accessibility certification.

Manual automation verifies native modal Tab/Shift+Tab/Escape, trigger focus return, dirty-dialog cancellation, mobile keyboard menu, table focus/intentional local scrolling, no horizontal document overflow in scanned states, and context through browser history. The large table uses actual server-reconstructed 365 daily rows. Existing reduced-motion CSS remains; no decorative motion was added.

Nine representative committed PNGs total **342,363 bytes**, with exact routes/viewports in [the screenshot manifest](ux/screenshots/milestone-11-10/README.md). Examples: [before plans, 375px](ux/screenshots/milestone-11-10/before-saas-plans-375.png), [after plans, 375px](ux/screenshots/milestone-11-10/after-saas-plans-375.png), [after settings, 375px](ux/screenshots/milestone-11-10/after-saas-settings-375.png), [refund error, 320px](ux/screenshots/milestone-11-10/after-refund-error-320.png). Real desktop/mobile plan, settings and refund captures were visually inspected. No generated mockups, real customer PII or secret-bearing captures.

Complete external evidence: `C:/Users/iimedr/.codex/visualizations/2026/11/12/01a1cf55-e065-78f3-be1f-d2531dcd55c2/milestone1110`. Scripts/results include baseline/capture-after, verify-demo, verify-normal, verify-saas, extra, editor, refund, readiness, after-expiry, draft, timeout and check-data. Before/after finding files prove restored search; refined expiry and draft-result files distinguish applied/private input. The [participant task script and blank sheet](ux/milestone-11-10-usability-script.md) have no fabricated results. **Independent merchant/founder validation: NOT VERIFIED.**

## H. Automated tests, build and performance

Actual commands:

- `mvnw.cmd verify` in backend with direct Java 21 JAVA_HOME and PostgreSQL/Testcontainers: **BUILD SUCCESS**, **93 unit + 61 integration**, zero failures/errors/skips, 12m22s. Log `milestone1110-backend.log`. Backend source did not change afterward.
- `npm.cmd test --prefix frontend -- --watch=false`: **133 passed / 32 files**, zero failures in final standard run, versus baseline 123/31. Existing suites retained; tests added for URL bounds/back/selection, historical as-of control, applied/draft separation, session-safe guard behavior, dirty draft clearing, full decimal inspection, zero-ending chart history, mode label and honest live status. Log `milestone1110-frontend-final.log`.
- `npm.cmd run build --prefix frontend -- --stats-json`: exit 0, **451.51 kB initial**, versus actual pre-code **510.58 kB**. Reduction **59.07 kB (~11.57%)**. The existing 500 kB warning no longer fires; 1 MB error/style budgets unchanged. No new warning/dependency. Log `milestone1110-build-final.log`.
- `git diff --check` and repository Prettier check pass at finalization. No test timeouts/assertions were weakened. Inherited JSDOM canvas warnings remain; real Chrome checks are the graphics proof.

esbuild input evidence identified **73,357 output bytes from @angular/forms** in the original initial JavaScript graph, pulled by shared guard/session imports from the form-directive module. After separation, `bundle-analysis.json` shows **zero @angular/forms inputs in the initial JavaScript graph**. Forms remain available in lazy editor/auth routes; shared chunk partitioning explains why total initial reduction differs from that single input size. No broad performance rewrite, dependency upgrade or raised threshold. A Lighthouse/CWV study is not claimed.

During implementation, compile/test adjustments included the router test harness and real input events for OnPush forms. The initial 401 harness and refund contrast failure were investigated and corrected, not counted as passes. Earlier intermediate bundle 451.46 kB preceded the final semantic error token; final output is 451.51 kB. All reported final counts come from actual executions.

## I. Data, science and security invariants

No backend/API/schema/package changes. Actual normal/demo V1–V7 histories remain successful with checksums: V1 `1436242292`, V2 `581270318`, V3 `-1414359703`, V4 `56597636`, V5 `147175724`, V6 `-1432513541`, V7 `-319300667`. No migration edited, fixture regenerated or normal store converted.

Normal before/after: 0 products, 0 orders, 1 existing account; 0 saved model evaluations and 0 SaaS events. Permanent demo: 30 products, 9,466 orders, 114 refunds, 0 accounts/evaluations/SaaS events. Both installations remain ECOMMERCE. Separate QA remains SAAS_SUBSCRIPTION with 3 plans, 4 price versions, 4 lifecycle events, 3 payments/refunds and 11 ingestion records; **zero ingestion rows after the pre-code audit timestamp**. No immutable price/event modification was attempted.

Original/current permanent checksum: `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`, `matchesSeed=true`. Current-backend Full-2025/horizon-30 reads confirm all 30 abstain: 21 DIAGNOSTIC_ONLY, 3 INACTIVE_VARIANT, 3 MISSING_PRICE, 3 UNRELIABLE_ELASTICITY. Every candidate/comparison null and sensitivity empty. Oracle/independent e-commerce optimizer and accounting fixtures passed the unchanged backend suite; no eligibility, coefficient, confidence or recommendation precision was invented.

Current-backend anonymous normal SaaS GET=401; demo SaaS GET/write=403. Real authenticated cross-mode 409, CSRF-missing 403, explicit saves/imports and configured session cookies are covered by integration/browser tests. Extended local return URLs are bounded and reject unknown/duplicate/external/private-looking inputs. No PII/customer fields, secrets in URLs/storage/screenshots, provider price writes or automatic application. Temporary QA services/database were stopped and their data retained; original normal/demo 4200/4201/8080/8081 listeners were confirmed running.

## J. Limitations and remaining follow-up

`LIVE_SHOPIFY_NOT_VERIFIED`; no live billing provider. Independent usability, full screen-reader certification, Safari/Firefox, OS dark-theme matrix and CWV measurements were not performed. This milestone's evidence is developer-run structured novice simulation plus automated engineering checks, not proof of merchant confidence.

Manual source-reference entry, partial coverage, full customer/cohort/billing-event exploration and correction/rescheduling limitations from 11.9 remain. They are not hidden behind fictitious metrics. No new source APIs were introduced to fill those scope gaps. P2 follow-up remains for participant-informed discoverability and the manual source-entry burden; complete event exploration requires an appropriate future contract. No confirmed unresolved P0/P1 in tested flows. No 11.11–11.13 or 12 work, CSV, image ingestion, tenant conversion or statistical model expansion.

## K. Git

Branch `codex/milestone-01`, baseline `b4dfafd`. Local commits: audit `ebeffba` — docs(ux): audit milestone 11.10 before implementation; implementation `58a4d40` — feat(ux): preserve workflow context and reduce initial loading; tests `7ff82e4` — test(ux): cover navigation drafts precision and mode feedback. Chart-boundary fix `06a3a4b` — fix(ux): retain recorded trends in zero-ending MRR windows. This documentation/screenshot commit is recorded at finalization; exact hashes, ending HEAD and clean status are reported at delivery. Real timestamps, no push, deployment, reset, rebase or discarded user edits.

## L. Acceptance verdict

**PARTIAL overall; automated engineering gates PASS.** Tested product/plan discovery, applied context, financial evidence, import/saves/cancellation, narrow layouts, keyboard/focus, current data/security invariants and build threshold pass. No confirmed unapproved P0/P1 blocker remains. Independent participant validation required to substantiate the first-time confidence/product success claim is **NOT VERIFIED**. Run and record the supplied protocol before declaring independently validated release readiness. This is an explicit external-validation limit, not an invented participant result or a request to weaken the scientific gates.
