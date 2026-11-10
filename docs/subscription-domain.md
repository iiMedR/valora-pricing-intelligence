# Subscription domain (11.9)

This is a bounded manual subscription workspace for one business per installation. It is not multi-tenant and does not process payments. E-commerce records retain their existing domain and routes.

## Installation mode

V7 creates installation_mode without choosing a mode during migration. BusinessMode initializes it on application startup, using app.business-mode (default ECOMMERCE). Choosing SAAS_SUBSCRIPTION requires no products, categories, orders, or prior Shopify connection generation/status evidence. Accounts may be provisioned independently. A persisted mode cannot change through a restart setting or API. The permanent smartpricing_demo database cannot initialize SaaS. Currency is initialized once for a fresh SaaS installation from app.saas-currency (default MAD), validated as an ISO currency. Existing mode/currency are never reinterpreted on restart.

The server interceptor uses Spring's matched endpoint pattern, not raw encoded URLs, to reject cross-mode APIs with 409 for an authenticated normal user. Existing session ADMIN authorization and cookie CSRF still run first. SaaS endpoints are never anonymous demo endpoints. E-commerce business-settings writes are blocked in SaaS; reads remain shared. The public environment response exposes only businessMode metadata. There is no runtime mode toggle.

## Relationships and invariants

- subscription_plans: opaque ID, business plan name, current archived flag. Archive stops new lifecycle starts/changes to a plan; existing subscribers continue. Archival is current metadata, not a reconstructed historical subscriber event. Its supplied source date is retained in the ingestion audit; it does not defer archival.
- subscription_prices: immutable source price ID, plan FK, positive NUMERIC(19,4) amount, reporting currency, MONTHLY/YEARLY interval, effective date, recorded timestamp. Unique plan/effective date. New prices never automatically migrate existing subscriptions.
- subscription_events: append-only source ID, opaque subscription ID, START/CHANGE/CANCEL/END/REACTIVATE, explicit price FK and effective date. One transition per subscription/day, strictly append after the last effective date. START only once, CHANGE/END/CANCEL only after active lifecycle, REACTIVATE only after an end. Ending retains the previous price. A future CANCEL/END is a scheduled effective end, not present churn. It cannot be silently rescheduled or backfilled around; corrections require a future reviewed ingestion workflow.
- subscription_payments: positive PAID charge or linked REFUND, subscription ID, currency, effective date, recorded timestamp. Paid charges require an active lifecycle on their date; no future cash. Refunds match their original charge/subscription and cannot precede it or exceed its remaining amount. They do not automatically end service or reduce run rate.
- subscription_ingestion: global source ID, versioned canonical operation, recorded timestamp. Identical canonical replay returns UNCHANGED; changed content gives 409. Decimal scale is part of the canonical value: replay exactly as entered. The canonical payload contains only relevant supported fields; no arbitrary metadata or personal fields.

Every entry locks the singleton settings row and revalidates in one transaction. Preview takes the same validation path without writes. Commit appends domain rows plus ingestion audit atomically. No history update/delete endpoints exist. Constraints/FKs protect amount, interval, identity and refund link shape; service validation handles cross-row lifecycle/refund bounds under serialization. DB administrators remain responsible for database access controls; this is not a tamper-proof ledger.

The price/event/payment model is separate from product variants, orders and stock. V1–V6 SQL files are unchanged. V7 is additive and contains no fixture data. No JPA schema generation is used.

## Bounded source contract

Version 1 manual entry is the supported ingestion path, one operation per preview/commit. At most 2,000 distinct operations per installation, 2,048 canonical characters per record, source IDs 1–64 ASCII letters/digits/underscore/hyphen, plan names 2–120 characters without an email address. Amounts are positive, at most four fractional/fifteen integer digits. Effective dates start in 2000 and are bounded to five years ahead for plans/lifecycle; cash cannot be future-dated. Only one reporting currency, no FX. Charts/queries cover at most 366 inclusive UTC dates; pages contain at most 50 results, UI 10. Search up to 80 characters; deterministic order. Aggregations reconstruct bounded server-side history; the browser receives summaries, daily aggregates and paginated rows, not full invoice/event histories.

All imports remain PARTIAL_MANUAL_HISTORY. Zero is a sum of recorded evidence, not proof that no unrecorded activity occurred. No PII/customer dimension means no distinct-customer/logo metric. Trials, pauses, discounts, tax, one-time fees, accounting recognition and delinquency are unsupported; do not encode them as paid subscriptions. No CSV, bulk provider integration or permanent SaaS demo is supplied. The independent test fixture exists only in SubscriptionIT and the dedicated QA database, never the 2025 demo or normal store.

## API

Authenticated ADMIN /api/v1/saas:

- GET /metrics?start=YYYY-MM-DD&asOf=YYYY-MM-DD
- GET /plans?asOf=...&search=...&sort=name|price&page=0&size=10
- GET /plans/{id}/history?start=...&asOf=...
- GET /subscriptions?asOf=...&search=...&page=0&size=10
- POST /entry/preview and /entry/commit (CSRF required for both)

Money and rate outputs are decimal strings, calculated with BigDecimal. No monetary optimizer exists in the browser. Annual division uses twelve fractional digits, HALF_UP; UI shows rounded presentation and inspection values. A suggested plan price/actionable SaaS result is never returned.

See [setup](subscription-setup.md), [metrics](subscription-metrics.md), and [manual template](examples/subscription-entry-v1.json).
