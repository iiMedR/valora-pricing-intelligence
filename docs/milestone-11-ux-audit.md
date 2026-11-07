# Milestone 11 UX audit and implementation plan

Baseline: clean codex/milestone-01 at f22c15b. Frontend-only UX integration; no API/model/schema change, no V7, reset, reseed, push or deployment.

## Actual routes and existing primitives

| Area           | Routes                                                   | Access / existing behavior                                                               |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Overview       | /                                                        | Public health-only foundation screen; no business data                                   |
| Session        | /login; /store-connection/callback                       | Session login, safe callback outcome; allowlisted return paths                           |
| Setup          | /store-connection; /onboarding; /onboarding/variants/:id | Normal ADMIN guard / anonymous demo inspection; existing SyncPanel and bounded readiness |
| Catalog        | /products; /products/:id; /categories                    | Existing catalog forms, optimistic versions, archive controls                            |
| Dated evidence | /products/:productId/variants/:variantId/history         | Immutable price/cost/stock observations, paginated tables                                |
| Transactions   | /orders; /orders/new; /orders/:id                        | Immutable sales/refund snapshots; new-order write guard                                  |
| Insights       | /analytics; /forecasting; /optimization                  | UTC filters, Full2025 preset, bounded tables, chart/table alternatives                   |
| Configuration  | /settings                                                | Currency lock and singleton business settings                                            |

Root shell has10 flat links across a wrapping top row; no mobile disclosure, route-change focus or useful workflow grouping. Shared global CSS already supplies forms, notices, tables and buttons. Per-feature styles support charts and scroll regions. Session cookie/CSRF interceptor, anonymous demo guard, exact decimal formatting and optimistic errors already exist. No heavy UI framework or new dependency is needed.

## Findings and minimal changes

1. Flat header consumes most of a narrow screen; create workflow-grouped desktop rail and keyboard/touch mobile disclosure, active links, route-change content focus and persistent environment distinction. Keep every existing route/deep link.
2. Overview still describes the foundation and planned features already delivered. Replace with task links and clear local normal/demo destinations; explain seed lives at4201 and full2025 dates. Never show invented business counters.
3. Demo Orders exposes Enter manual order (guard eventually redirects); order detail still exposes a refund editor even though backend403 blocks writes. Hide these with explicit read-only explanation and handler guards. Review all nested controls.
4. Several table-wrap regions lack keyboard focus/accessible names, shared status/disabled/focus styling is inconsistent, loading/empty guidance can refer to impossible demo writes. Add semantic table regions, text-only empty guidance and shared presentational patterns.
5. Native archive/category confirms lack app context; use one accessible native-dialog host with explicit consequences, default cancel, Escape/backdrop cancellation and focus restoration. Add editor navigation protection for genuinely dirty merchant forms; preserve inputs on failure and mark successful submissions pristine.
6. Onboarding repeats LIVE_SHOPIFY_NOT_VERIFIED as a runtime merchant concern. Keep this in developer verification documentation; merchant state continues to reflect actual connection/import/readiness independently.
7. Model/audit diagnostics expose raw codes and have no save affordance. Add plain-language explanations without hiding raw provenance; normal-only explicit fresh-evaluation save uses existing POST/CSRF, demo remains read-only. Save is metadata only and does not apply prices or measure outcomes.
8. Review error/session states, duplicate submissions, date/currency labels and long-table overflow. Preserve exact decimal strings and all conservative model gates; no estimate or dataset changes.

## Design direction, reviewed against the brief

Keep the existing merchant workspace palette: ink #182c29, forest #234e42, quiet green #eaf0eb, paper #f5f7f4, white #ffffff, warning amber #684710. Use native Segoe UI for readable forms and tabular numeric alignment; no network font or decorative imagery. Left-aligned task-oriented content, persistent narrow workflow rail on desktop, compact account/header plus disclosure at tablet/mobile. Strongest visual distinction is the workspace mode, not decoration or repeated cards.

Desktop: [workflow rail | workspace mode + account / focused page content]. Narrow: [brand + menu / persistent mode notice / page], with disclosure nav inserted before content and no modal focus trap. Dialogs alone use native modal focus containment. Keep existing feature structure rather than rebuilding screens; labels and spacing carry hierarchy.

This is a refinement of the existing green/white design, not a new template. Existing chart/table alternatives stay. Scope intentionally excludes model changes, new provider behavior, redesigning data semantics or creating empty screens.

## Verification plan

Run full backend verify (89 unit/55 IT baseline), Angular tests/build, actual normal/demo browser checks at1440/768/375 widths and keyboard navigation, session-expiry401/CSRF403, nested read-only controls, retries, dialogs/editor preservation, Full2025 analytics/model/audit views. No live provider claim. Use disposable/intercepted frontend fixtures only where permanent normal data cannot safely exercise a write flow, explicitly label those tests. Preserve all normal data, V1–V6 and original demo checksum. Save screenshots/scripts outside Git; record actual outcomes in milestone-11-verification.md. Stop before12.

## Verified implementation adjustments

Screenshot/browser review found Products table overflow from absolute screen-reader text at375px; positioned scroll containers now clip it correctly. Native dialogs now explicitly wrap Tab/Shift+Tab. A mobile disclosure opened from a scrolled page is brought into view and returns to the prior scroll position on close. Demo insights default to the actual2025 seed window. Removed the stale manual-order notice claiming authentication was unimplemented; current guarded sessions/CSRF remain authoritative. Existing health details moved behind a disclosure so merchant tasks lead the overview. Final evidence and remaining scientific/assistive-technology limits are in milestone-11-verification.md.
