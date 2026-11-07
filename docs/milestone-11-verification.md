# Milestone 11 verification

## Baseline and delivered scope

Started from clean `codex/milestone-01` at `f22c15b`, matching the assignment. The route inventory, findings and design/implementation plan were recorded before substantial edits in [milestone-11-ux-audit.md](milestone-11-ux-audit.md). This is frontend-only workflow integration. No backend source, API contract, model/eligibility setting, provider feature, dependency/lockfile, migration or permanent seed change. No V7, reset, reseed, deployment or remote operations.

### Changed paths and merchant behavior

- `frontend/src/app/{app.ts,app.html,app.css,app.config.ts,app.routes.ts}`: grouped workflow rail; tablet/mobile disclosure with expanded state, keyboard Escape and focus restoration; nested active routes; route-change content focus; scroll restoration; existing protected routes plus editor-leave checks.
- `core/{environment-indicator,session-nav,session.service,auth-integration}.ts`: unmistakable mode/account state, deliberate normal/demo links, session-expiry notice/redirect, safe allowlisted dated deep links, logout/editor safety and unchanged cookie/CSRF semantics. No tokens in browser storage.
- New `core/{confirmation,editor-state,presentation}.ts`: accessible native dialogs with explicit Tab wrapping/Escape/return focus, opt-in dirty editor/unload protection, pending-save caution, invalid-control semantics/first-invalid focus, busy-field protection and shared plain-language model reasons.
- `features/home/{home.ts,home.html}`: task-first overview and workspace guidance; existing technical health detail remains available under a disclosure rather than dominating the merchant journey. No invented business counters.
- `features/catalog/{pages/product-list,pages/product-detail,pages/categories,components/product-form,components/variant-form,services/catalog-api.service}.ts`: contextual archive/delete confirmations, mutually exclusive editors, duplicate-submit guards, retained input on errors, guarded reload, accessible validation/table regions and useful read-only/empty wording. Existing precision/version/activation/archive rules preserved.
- `features/history/{orders,order-detail,order-form,variant-history}.ts`, `features/settings/business-settings.ts`: demo manual-order/refund affordances removed/disabled and handlers guarded; dirty form protection, successful-save pristine state, explicit history-type discard, accessible scrolling, preserved immutable snapshots and currency-lock explanation.
- `features/analytics/{analytics-api.service.ts,analytics.ts,analytics.html}`, forecasting/optimization components/templates: verified-demo defaults to actual Full2025 history; normal retains real UTC defaults. Shared readable identification/abstention wording; no candidate/comparison on withheld results; existing exact monetary strings and charts/data-table alternatives retained.
- `features/optimization/evaluation-history.ts`: normal-only **Save fresh evaluation** uses existing authenticated POST/CSRF, prevents duplicates, explains re-evaluation/deduplication and measured-outcome absence. Demo has read-only history loading. Loading/empty/error/retry/pagination remain bounded.
- `features/store-connection/{store-connection,sync-panel}.ts`, `features/onboarding/onboarding.ts`: proper native disconnect modal focus, separate authorization/import/readiness and removal of development-only live-verification warnings from merchant runtime copy. Real status and limitations remain visible.
- `frontend/src/styles.css`: coherent spacing/controls/focus/state vocabulary, narrower viewport behavior, contrast/target refinements, reduced motion and positioned table scroll containers that also clip absolute accessible labels correctly.
- Corresponding Angular specs, new editor/dialog tests; README, authentication guide, [merchant-workflow.md](merchant-workflow.md), audit and this report.

No route was replaced by a placeholder. Reviewed routes: `/`, `/login`, `/store-connection`, `/store-connection/callback`, `/onboarding`, `/onboarding/variants/:id`, `/products`, `/products/:id`, `/products/:productId/variants/:variantId/history`, `/categories`, `/orders`, `/orders/new`, `/orders/:id`, `/analytics`, `/forecasting`, `/optimization`, `/settings`. Wildcards retain the existing overview redirect.

## Automated verification

| Command / check                                    | Actual outcome                                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `cd backend; .\mvnw.cmd verify`                    | **89 unit +55 PostgreSQL integration tests**, zero failures/errors/skips; BUILD SUCCESS22:42:36 UTC,10:18 elapsed |
| `cd frontend; npm.cmd test -- --watch=false`       | **81 tests in24 files**, all passed; release run started23:36:57 UTC                                              |
| `cd frontend; npm.cmd run build`                   | Production build passed23:31:34 UTC                                                                               |
| Dependencies                                       | Existing package scripts/tools reused; no npm ci needed, no lockfile/package/framework upgrade                    |
| Backend/model/migration source diff againstf22c15b | Empty                                                                                                             |
| Final whitespace/Git check                         | Passed                                                                                                            |

The13 added frontend tests cover workflow navigation/active state/focus intent, modal/editor safety and busy controls, invalid semantics, forced session-expiry navigation, supported query allowlist/forbidden writes, nested demo refund/manual-order guards, explicit normal-only audit save and duplicate suppression, and actual demo date-window defaults. Existing loading/error/empty/retry, auth/CSRF, catalog monetary validation, immutable-order UI, chart/table, optimization abstention and history tests remain passing. No required automated test was skipped.

Initial expanded unit run had one menu-focus assertion failure: JSDOM does not simulate the mobile media layout, so the unit now asserts the focus request; real375px keyboard QA verifies actual focus. An unused EditForm warning exposed a wide-order form that had not received the directive; fixed before release. Final unit/platform scrolling is mocked where JSDOM lacks layout APIs; actual Chrome checks verify scrolling and focus. Completion production build has no compiler warnings.

## Browser QA environment and flow

Browser plugin not available. Installed Chrome through existing Playwright1.65.0 is the documented fallback; no new browser dependencies installed. Real normal4200/API8080 and demo4201/API8081. Desktop1440×1000, tablet768×844, narrow mobile375×844; reduced-motion context. Scripts, browser logs and screenshots stay outside Git in this chat's visualization directory.

Flow: workspace identity → workflow navigation → actual guarded normal sign-in / anonymous demo → setup and records → dated insights / withholding explanations → read-only audit history → keyboard tables/menu → actual session denial/retry → explicitly isolated write-path UI fixtures.

Final complete three-viewport browser sweep: **PASS**. All42 actual demo route/viewport combinations passed, followed by keyboard/menu/table/model/history and normal session/write-fixture checks. A separate actual normal sweep passed36 primary/empty-form/callback combinations at the same three widths, plus dated login return and invalid/busy/failed editor behavior. Total78 route/viewport checks; no unexpected runtime or console errors/warnings.

### Actual API/data checks

- Demo primary and nested routes were exercised at1440,768,375. Synthetic anonymous/read-only indicators are present on nested routes. Products/variants/categories/settings/history/refund controls are disabled/hidden with explanation; `/orders/new` redirects to Orders. Actual unsafe demo POSTs return403.
- Demo insights start at2025-01-01 and end2026-01-01, with editable UTC inputs and retained Full2025 preset. Actual product search and pagination work, historical financial/model values come from the API, and long tables scroll within keyboard-focusable labeled regions.
- Actual seasonal detail remains approximately−.567, displays weak identification, no uncertainty interval and a plain-language calendar explanation; no suggested-price/comparison/sensitivity content is rendered. All30 actual evaluations retain21 DIAGNOSTIC_ONLY,3 MISSING_PRICE,3 UNRELIABLE_ELASTICITY,3 INACTIVE_VARIANT. Original optimizer oracle80 and independent constrained90 fixture remain covered by the full passing backend suite.
- Normal signed-out business API returns401; guard shows login before business content. Existing protected sign-in returns to requested Onboarding. Normal empty routes show useful guidance, not seeded/fabricated records. Deliberately aborted overview request exposes retry and recovers to actual empty data.
- Actual normal POST without CSRF returns403 (empty invalid body, no business write). Revoking only the QA session through existing logout makes the next actual business GET return401; protected content is removed, a session-expiry notice appears and sign-in returns to the page. Unsafe requests are never automatically retried. Only the QA session is revoked; the owner's account/password are unchanged.

### Isolated UI write-path checks (not live business/provider validation)

Normal has no catalog records. To avoid inserting disposable data into permanent immutable history, the browser uses clearly named **Disposable UX fixture (not stored)** responses only for the write-path checks. Writes are intercepted before reaching the server; a deny-by-default browser route aborts unexpected non-auth writes. There is no fake connected-provider claim or real provider call.

These UI fixtures exercise stale-settings409 with retained input and guarded reload, cancel/confirm dirty navigation, archive confirmation and success wording, native dialog initial Cancel/Tab loop/Escape/return focus, and explicit audit saving with real client CSRF header/date/horizon parameters followed by returned history. An additional controlled503 save verifies disabled busy fields, first-invalid focus/descriptions and retention of an unsaved product draft; no create request reaches the permanent server. Actual PostgreSQL audit persistence and security are separately tested by the full backend suite. No permanent audit/fixture/business record is created, so no destructive cleanup is needed. These fixtures are not reported as live normal-business or Shopify success.

## Accessibility and responsive evidence

| Check                                         | Evidence / result                                                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Page identity and meaningful nonblank content | Actual routes/headings and active navigation; no framework overlay                                                                     |
| Keyboard navigation                           | Shift+Tab/Tab/Enter opens disclosure, navigates links and focuses destination; Escape returns to toggle                                |
| Table accessibility                           | Named focusable regions, real ArrowRight scrolling, semantic header/caption/data-table alternatives                                    |
| Dialogs                                       | Native modal, explicit default Cancel, Tab/Shift+Tab containment, Escape and trigger restoration                                       |
| Forms                                         | Labels, aria-invalid/required, descriptive catalog errors, first-invalid focus, busy-field/duplicate protection, retained failed edits |
| State vocabulary                              | Text accompanies status colors; no unknown→zero conversion or unsupported price/uplift display                                         |
| Layout                                        | 42 demo plus36 normal route/viewport combinations; no final page-level horizontal overflow; table overflow stays local                 |
| Console/runtime                               | No unexpected errors/warnings; intentional network abort and401/403/409/503 test responses are classified separately                   |
| Reduced motion                                | Shared prefers-reduced-motion rule; reduced-motion QA context                                                                          |

Measured sRGB palette ratios: body/paper13.62:1, active-nav white/forest9.38:1, muted/paper5.84:1, demo indicator7.42:1, error text7.90:1, control boundary/white3.84:1, focus-ring/white5.41:1. Primary text pairs exceed4.5:1; chosen boundary/focus pairs exceed3:1, using [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) guidance. This is a measured palette/interaction review, not blanket WCAG certification. Full assistive-technology and cross-browser audits were not performed.

Browser QA found and fixed actual Products overflow at375px: absolutely positioned screen-reader text escaped an overflowing table's clipping ancestor. Positioning table regions establishes the correct containing block. The final mobile sweep passed after the fix. Screenshot review also caught a menu opened above a scrolled viewport; opening now brings navigation into view and closing restores the prior scroll position, with unit/browser regression checks. Browser also exposed the native Tab boundary reaching outside dialog controls; explicit wrapping and a regression test now cover that boundary. Automation waits for Angular disclosure state/title updates rather than assuming synchronous DOM rendering.

Screenshots: `milestone11-overview-desktop.png`, `milestone11-analytics-tablet.png`, `milestone11-navigation-mobile.png`, `milestone11-table-keyboard-mobile.png`, `milestone11-diagnostics-desktop.png`, `milestone11-diagnostics-mobile.png`, `milestone11-normal-desktop.png`, `milestone11-login-mobile.png`, `milestone11-confirmation-fixture-desktop.png`. The last is explicitly a UI fixture; others show actual running workspace/data. Before-fix evidence: `milestone11-products-overflow-before.png`. Final images are inspected before delivery.

## Data integrity, limits and stop condition

Before browser write-path QA: normal0 products/0 orders/1 account/0 evaluation records; demo30 products/9,466 orders/0 accounts/0 evaluation records. V1–V6 successful checksums in both:1436242292,581270318,−1414359703,56597636,147175724,−1432513541. Original demo checksum matches `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`. Final post-QA checks passed: both backends UP; normal retains0 products/0 orders/1 account; demo retains30 products/9,466 orders/0 accounts. Jobs/mappings/evaluation records remain0 in both. The original checksum matches exactly with matchesSeed=true. Backend/dependencies and V1–V6 source diff againstf22c15b are empty. No original data, fixture or audit record was written by browser QA.

Scientific behavior is deliberately unchanged: observational association, weak permanent seasonal recovery, all30 abstentions, unavailable/uncalibrated intervals, unknown stock/cost preservation and unmeasured realized uplift. **LIVE_SHOPIFY_NOT_VERIFIED** remains a developer verification limitation; real authorized OAuth/import/public HTTPS/provider schema validation remain outstanding, not merchant runtime error states. No automatic price writes or new scopes/import behavior.

No full screen-reader certification, Safari/Firefox run, live provider connection or actual permanent merchant write is claimed. Normal and demo were both checked at all three viewport widths. Populated route coverage uses real synthetic records; normal empty screens, actual session/denial behavior and safe UI-only write fixtures are clearly distinguished. Final local commits/HEAD/clean status are recorded in the completion report. No push, rewrite, deployment or Milestone12 work. All required checks passed; no unresolved execution blocker. Ready for Milestone12 review; it has not been started.
