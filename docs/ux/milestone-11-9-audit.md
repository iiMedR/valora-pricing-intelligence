# Milestone 11.9 pre-code audit

Baseline: branch codex/milestone-01, HEAD 5ef9b862b365a68eb44daa77a540e090d7b9fef8, clean tree. Existing Java services use JPA for catalog and JDBC for analytics/auth; singleton business_settings defines a single installation. SecurityConfiguration uses ADMIN session authorization, cookie CSRF and a separately verified anonymous read-only demo. Flyway V1–V6 must remain byte-identical. Existing frontend lazy routes, Zard buttons/inputs, native disclosures and ModalFocus will be reused.

## Architecture decision

Persist an installation business mode in a new V7 table. A startup setting requests ECOMMERCE (default) or SAAS_SUBSCRIPTION. A fresh installation can initialize SaaS; any existing catalog, category, sales or Shopify evidence blocks SaaS initialization. Once initialized, conflicting startup configuration fails closed. No runtime mode toggle or tenant/auth expansion. Existing installations initialize as e-commerce by default. Server request interception denies cross-mode business endpoints; existing security still authenticates and checks CSRF. Public environment metadata may expose mode, never subscription records. Shared business settings writes are blocked in SaaS to prevent currency reinterpretation.

Separate subscription tables: immutable plan price versions, append-only lifecycle events, positive paid charges and bounded linked refunds. Opaque subscription/source identifiers only, no customer names, emails or payment credentials. PostgreSQL constraints, indexes and transactional singleton locking serialize preview/commit validation and source replay. Explicit effective dates reconstruct state; recorded timestamps preserve ingestion trace. Versioned bounded manual operations are chosen instead of CSV: lower parser/privacy/rollback surface, one operation preview and explicit commit, source-ID replay returns unchanged only for identical content. No live provider. Bulk CSV deferred explicitly.

## Metrics and source coverage

Date-based UTC end-of-day as-of, bounded windows. Paid means an effective ACTIVE lifecycle event with a real paid charge at or before that date. A lifecycle event alone never establishes paid coverage. MONTHLY amount or YEARLY / 12 using BigDecimal; MRR is run rate, not recognized revenue/cash. Effective plan prices are explicit immutable references per lifecycle event, never retroactively changed. CANCEL schedules a future END; no early churn. Refunds affect collected cash, not automatic subscription state. No trials/pauses, discounts/tax/FX or customer/logo churn. ARPA is per paid subscription, explicitly named. Event evidence supports new/expansion/contraction/churn/reactivation movements with reconciliation and a beginning paid-subscription denominator. Historical trend bounded to 366 days; imported history is explicitly declared coverage, never assumed complete. Cohort/logo retention may remain unavailable rather than invent customers or reliable cohorts.

## Screens and design

Reuse existing compact neutral typography, gray borders, black charts and left alignment. SaaS navigation: Overview, Plans, Subscriptions, Revenue & retention, Pricing insights, Settings. One shared lazy workspace with route-specific sections and bounded server APIs. Overview four KPIs, black MRR trend and next action; plans searchable/sortable and historical versions; opaque subscriptions paginated; revenue date window and exact table; insights always Needs evidence, optional keyboard-accessible Why modal; Settings includes source coverage and preview/commit entry. All records API-grounded, honest loading/error/empty states. Existing e-commerce routes remain unchanged.

## Risk matrix and controls

- Cross-mode reinterpretation (high): durable mode, startup population gate, server interceptor, regression tests.
- Duplicate/history overwrite (high): immutable rows, unique source IDs, exact payload replay check, all writes transactional.
- Invalid transitions/refunds (high): chronological append validation, immutable version FK, effective cancellation, sum-of-refunds bounds, positive decimal amounts.
- Misleading metrics (high): paid evidence, explicit coverage/as-of/currency/denominators, no recommendations or causal claims.
- PII/auth (high): bounded opaque IDs, no personal fields, existing ADMIN/CSRF, demo denied.
- UI/performance (medium): bounded pagination/trends, no browser event-history reconstruction, lazy module, no dependency additions.

## Verification plan

Add hand-checkable deterministic SaaS integration fixture, annual normalization, upgrade/downgrade, scheduled/effective end, reactivation, duplicate/conflicting replay, rollback, missing history, refund limits and mode/auth/CSRF checks. Run actual Maven verify, frontend tests/build, browser desktop/tablet/mobile/320px, keyboard/modal/import preview/error recovery. Recheck permanent demo checksum and 30 abstentions, V1–V6, normal data, bundle against 508.62 kB. No production records inserted for UI fixtures. Record actual outcomes and partial scope honestly.

## Exclusions

No live Stripe/billing provider, checkout, billing writes, multi-tenancy, validated SaaS pricing, automatic price changes, CSV ingestion in this slice, permanent SaaS demo, modifications to permanent e-commerce seed, push/deploy, 11.10 or 12. LIVE_SHOPIFY_NOT_VERIFIED remains. Independent usability and full assistive-technology certification are not implied.
