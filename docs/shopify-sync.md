# Shopify read-only import — mapping v1

Milestone 09 implements explicit administrator-initiated background imports. It reuses the M08 session/CSRF boundary, connection singleton, encrypted tokens and validated shop. **LIVE_SHOPIFY_NOT_VERIFIED**: official contracts were checked, but no real credentials, permitted test shop or public HTTPS callback were available. PostgreSQL fixtures and intercepted browser responses are not live Shopify validation. There are no Shopify price/inventory writes, bulk-operation mutations, webhooks, scheduled automatic imports, onboarding scores or pricing-model changes.

## Provider contract and limits

Admin GraphQL is pinned to **2026-10**, configured through `SHOPIFY_SYNC_API_VERSION` (application property `app.shopify.sync.api-version`). Quarterly version syntax is validated; changing it requires schema/fixture/live testing. A returned `X-Shopify-API-Version` that differs from the pin fails rather than silently accepting Shopify's version fallback. Required read scopes remain `read_products`, `read_orders`, `read_inventory`, `read_locations`; no write scope is added. Standard order permission exposes recent 60-day history. Initial bounds conservatively require the recent 59 days, no more than 31 days per job. Older ranges are rejected with instructions about separately approved `read_all_orders`; that extra scope/onboarding flow is not implemented here. Current installation currency must match Shopify shop/order/shopMoney amounts. No presentment-currency conversion or inferred FX rate is performed.

Official references checked during implementation:

- [Product variants](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/productVariants), [orders](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/orders), [line allocations](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/LineItem).
- [Refund line allocation/restocking](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/RefundLineItem), [refunds and transactions](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/Refund), [shipping refunds](https://shopify.dev/docs/api/admin-graphql/latest/objects/RefundShippingLine).
- [Inventory levels](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/InventoryLevel), [inventory item costs](https://shopify.dev/docs/api/admin-graphql/latest/objects/InventoryItem), [API limits](https://shopify.dev/docs/api/usage/limits), [access scopes](https://shopify.dev/docs/api/usage/access-scopes).
- [Expiring offline tokens](https://shopify.dev/docs/apps/build/security/credentials-and-data/use-expiring-offline-access-tokens), [refresh grant example](https://shopify.dev/docs/apps/build/authentication-authorization/implement-token-exchange#refresh-an-expiring-offline-token).

Ordinary cursor pagination was chosen for bounded MVP imports. Catalog pages contain 10 variants ordered by ID; each tracked inventory item has separate pages of 100 locations, at most 10 pages. Orders use conservative one-order pages, up to the canonical model's 100 lines. Refund details are fetched separately to avoid multiplying nested query costs. One order may have at most 100 refunds; refund lines, shipping lines and transactions are bounded at 100 each. Any nested `hasNextPage=true` in financial resources fails the page with an explicit limit error; it is never silently truncated. The canonical order contract itself supports at most 100 lines. Large catalogs/histories require repeated resume attempts; this is not a high-volume bulk importer. Shopify bulk operations were assessed but deferred because their mutation/poll/download lifecycle adds a separate durable protocol; future volume work must implement and test that protocol, not merely raise limits.

All provider queries are literal read-only query documents. The GraphQL boundary rejects mutation documents and arbitrary/noncanonical shop URLs. HTTPS endpoints are derived from validated `*.myshopify.com` names, redirects are disabled, connect timeout is five seconds and whole-response timeout is 15 seconds. Streaming is limited to 2 MiB; OAuth/refresh/uninstall responses use a 64 KiB/10-second limit. HTTP 429/5xx, network failures and GraphQL THROTTLED receive at most four attempts with exponential 500/1,000/2,000 ms delays plus bounded jitter. Returned throttle budget can add up to five seconds of pacing. Auth failures are terminal with safe codes. Other GraphQL errors fail the entire page; field errors confined to unitCost may degrade to unknown cost with a warning. Partial customer/provider payloads, raw error messages, response bodies and access tokens are never logged or returned.

## Persistence and ownership

V5 is forward-only; V1–V4 are unchanged. It adds:

| Table | Purpose / uniqueness |
| --- | --- |
| `shopify_source_mapping` | Single connection + canonical shop + resource + opaque external ID → UUID; unique local resource identity, source SKU, hash/version and seen-job provenance |
| `shopify_sync_job` | Durable request window, connection generation, state, attempt/page budget, safe counters/warnings/errors and timestamps; partial unique index allows only one PENDING/RUNNING job |
| `shopify_sync_checkpoint` | Per-job CATALOG/ORDERS cursor and completion flag; updated atomically with each page |
| `shopify_sync_watermark` | Per-shop latest completed window end, never moved by failed/partial jobs |
| `shopify_inventory_location` | Location-specific available quantities keyed by shop/item/location/source update time; read observation time retained |
| `shopify_order_metadata` | Source financial/cancellation/fulfillment metadata and fulfilled quantity separate from immutable financial snapshots |

Generic mapping UUIDs cannot have a single FK to several canonical tables; typed mapping services own those links. Job/connection/canonical order metadata use explicit FKs. External IDs are opaque strings, never parsed as numeric identifiers. Canonical order/refund/observation references use `sp5:` plus SHA-256 of shop/type/source identity, keeping existing 160-character source-key constraints while scoping different shops. No SKU matching, fuzzy linking, manual-record merging or adoption occurs. Each provider variant receives a deterministic shop/ID-based local SKU; the original possibly empty/duplicate SKU remains in source mapping metadata (null is normalized to empty, never the literal word null). Historical line snapshots use source sale title/SKU rather than today's catalog name. A one-character product title receives a visible Shopify prefix and warning to meet the canonical two-character name constraint; longer titles are bounded to existing column limits.

Imported positive-price variants initially have minimum/maximum bounds fixed at the source quote; an import does not invent an acceptable optimization range. Free/unavailable placeholders stay archived. Editing mapped local catalog fields increments their version and stops subsequent imports with LOCAL_EDIT_CONFLICT until explicitly reconciled; there is no automatic local/provider merge policy.

V5 permits NULL current catalog cost, so unavailable cost remains unknown throughout API/UI. Existing manual writes still require a known nonnegative cost. Read DTOs and catalog/history editing handle imported null safely. It also permits zero catalog price/minimum for explicitly archived free or unavailable historical variants; existing manual positive-price validation is unchanged. Missing historical variant/custom lines receive a clearly named archived placeholder with null cost and a zero non-quotable catalog sentinel, no listed-price history and no optimization eligibility. That sentinel is not a recovered Shopify current quote. A later attempt to attach a newly available catalog variant to a different placeholder parent fails for explicit reconciliation rather than silently relinking history.

## Mapping and financial semantics

| Shopify resource | Canonical destination / limitations |
| --- | --- |
| Product | Mapped `products`; source title/status, retained UUID; no categories/images/customer information imported |
| Variant | `product_variants` as optimization unit; deterministic local SKU, source title/current price/cost/status, mapping provenance; free variants are archived |
| Current price / unitCost | SNAPSHOT point observations at fetch/import time, never VERIFIED_CHANGE or backdated to product creation; no historical series fabricated |
| Order | Immutable SHOPIFY order + line snapshots using source createdAt, source unit prices and allocated discounts; current listed prices never replace paid prices |
| Fulfillment | Separate source metadata includes fulfilled quantity and display status; ordered quantity remains canonical gross units, not invented fulfilled/net units |
| Refund line | Stable reference to original order line; merchandise subtotal and line tax separately represented; physical returned units only when `restockType=RETURN` explicitly supports that interpretation |
| Refund shipping/tax | Separate SHIPPING/TAX events, capped by known original amounts; excluded from merchandise revenue |
| Inventory | Append-only aggregate current available observation only when all fetched levels are known and nonnegative; separate location/source-time provenance retained |

Money uses BigDecimal and NUMERIC(19,4), with UNNECESSARY scaling: no rounding or price-to-cost inference. Mixed currencies, excessive precision, negative unsupported amounts, over-refunds or mismatched allocations fail safely. Shipping/tax use their source fields, with zero distinct from unknown. Tax-inclusive orders require reconciliation and fail explicitly because the existing merchandise-exclusive canonical accounting cannot represent them faithfully without additional allocations. This limitation is material for stores whose prices include tax.

Paid/partially-refunded/refunded orders map to COMPLETED; cancellation at first import maps to CANCELLED and is excluded from recognized sales. Test orders are excluded with a warning. Pending, authorized and partly paid orders are deferred rather than frozen as recognized revenue. Their later updated state can be imported by an overlapping incremental run while source access permits it. For an already imported order, refund/fulfillment/update-time changes do not rewrite financial snapshots. A changed price, discount, quantity, title/SKU, cancellation or canonical status produces IMMUTABLE_ORDER_CONFLICT; a future audited reconciliation workflow is required. This intentionally favors correctness over silently reconciling mutable Shopify order edits. Historical sourceUpdatedAt is retained in separate metadata so changing it alone does not invalidate an immutable order fingerprint.

Refunds require a complete successful REFUND-transaction total matching the source total before allocation. Pending/failed/partly successful payments are deferred with a warning. A LINE_RETURN has source-supported returned units; other positive merchandise refunds are FINANCIAL_ADJUSTMENT with zero returned units. Zero monetary financial-only components unsupported by the canonical model are warned and omitted. Unallocated duties, discrepancies, store-credit or other adjustment components are flagged as not imported, never spread across variants. Fully represented line/shipping/tax refunds reuse the canonical cumulative caps, currency checks and source-key idempotency. Cancelled-order refunds cannot be inserted under existing canonical rules and are explicitly warned as not recognized.

Unavailable costs remain NULL, including historical order costs; current Shopify cost snapshots are not evidence of past transaction cost. Existing verified historical cost periods retain their existing precedence in the canonical sales service. Inventory quantities come from current `available` level data; a negative or missing level is retained as provenance where available but prevents a fabricated zero aggregate. An unchanged level set creates no duplicate observation. Zero is a known current zero only. No stock deduction/restock/history interpolation is performed. Sparse current observations cannot establish past stockouts, forecast readiness or an actionable recommendation.

## Jobs, checkpoints and recovery

POST starts a durable PENDING job and returns 202; no large backfill blocks the HTTP request. A one-second worker tick processes only explicitly requested PENDING/RUNNING jobs. It does not create scheduled imports. The normal worker acquires a PostgreSQL session advisory lock; the active-job unique index and connection-row lock prevent concurrent starts across instances. Demo never starts a worker import.

Every job records shop and connection generation. Credentials are retrieved server-side; near-expiry access is refreshed using the stored encrypted refresh token under the connection lock. Both rotated tokens and expiry values commit atomically without changing the original connection time. A failed/expired renewal yields REAUTHORIZATION_REQUIRED; no stale credential is exposed. The remote refresh and local commit are not a distributed transaction: a crash after Shopify rotates but before PostgreSQL commits may require reauthorization. There is no timer that refreshes dormant installations.

Provider reads occur outside canonical write transactions. Before applying a page, the service locks and rechecks the connection/shop/generation. Disconnect or replacement therefore prevents an in-flight page from writing. A page's catalog/orders/refunds/observations, counters, warnings and cursor commit in one transaction. Failed validation rolls back the entire page; previously committed pages remain. Import states are PENDING, RUNNING, SUCCEEDED, PARTIAL and FAILED. PARTIAL means committed progress exists; SUCCEEDED can still carry explicit coverage warnings and is not a readiness score.

The per-attempt page budget is 1–200 (default 100), including catalog and order pages. Hitting it stops with PAGE_BUDGET_REACHED_RESUME_REQUIRED. Resume uses the same job/window/cursors, increments attempts and clears only the attempt budget/error. It never resets domain data. After process restart, unfinished RUNNING/PENDING jobs are picked up under the same DB lock and continue from committed checkpoints. Repeated source payloads do not duplicate records; conflicting immutable financial payloads fail. Local catalog version changes produce LOCAL_EDIT_CONFLICT, preserving manual edits.

Catalog and current inventory are fully scanned in both initial and incremental jobs because inventory/cost changes are not reliably inferred from an order watermark. Only after a complete catalog scan are mapped-but-unseen variants archived; nothing is deleted. Reappearing source variants reuse UUIDs and can reactivate, with a new current observation. Historical links remain valid.

Initial orders filter source created_at over `[from,to)`; incremental orders filter updated_at over `[lastCompletedWindowEnd−48h,now)`, with the same bounded/range checks. Watermarks advance only when both resource checkpoints complete successfully. They report the latest completed window end, not proof that all earlier business history was imported. Import any additional desired initial windows explicitly; do not interpret disjoint initial windows as continuous coverage. Large backlogs beyond the 31-day incremental bound require explicit initial windows. Shopify visibility, delayed updates beyond overlap, deleted remote orders and historical access limits remain material coverage limits.

## API, configuration and operations

All routes below require the existing ADMIN session; POST requires X-XSRF-TOKEN from the existing cookie/CSRF mechanism. Anonymous normal access is 401, missing/invalid CSRF or permission is 403. Demo permits only a sanitized GET status (demo=true, no shop/job); writes/history are forbidden. There is no new public mutation/webhook endpoint.

| Method / route | Result |
| --- | --- |
| POST `/api/v1/shopify/sync` | 202 durable job; INITIAL/INCREMENTAL or resumeJobId; 400 invalid bounds, 409 disconnected/conflicting job/connection |
| GET `/api/v1/shopify/sync/status` | Connected identity, latest current-generation job, checkpoints, last completed window end, required scopes and explicit live-validation flag |
| GET `/api/v1/shopify/sync/jobs?page=0&size=20` | Bounded history array, newest first; page>=0, size 1–100; retained previous-shop jobs belong to the same single-business installation |
| GET `/api/v1/shopify/sync/jobs/{id}` | Safe job and per-resource checkpoint metadata |

Example JSON bodies (send through the authenticated Angular panel or an authenticated CSRF-aware client):

```json
{"kind":"INITIAL","from":"2026-11-01T00:00:00Z","to":"2026-11-08T00:00:00Z","maxPages":100}
```

```json
{"kind":"INCREMENTAL","maxPages":100}
```

```json
{"resumeJobId":"<existing-failed-or-partial-job-uuid>"}
```

Dates are examples; choose current permitted ranges. Settings and encrypted connection setup remain in [shopify-connection.md](shopify-connection.md). Optional `SHOPIFY_SYNC_API_VERSION=2026-10`; tests can disable ticks with `app.shopify.sync.worker-enabled=false` and drive one page directly. `app.shopify.sync.poll-ms` controls worker polling, not automatic import creation. Do not disable security filters to test imports.

Normal startup from the repository root, separate terminals:

```powershell
docker compose -f infra/compose.yaml up -d --wait
```

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.11'
cd backend
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

```powershell
cd frontend
npm.cmd start
```

Existing demo: `.\scripts\demo.ps1 serve`, and in another terminal `cd frontend` then `npm.cmd run start:demo`. Do not reinitialize/reset/reseed either existing database. Normal ports remain 5433/8080/4200; demo 5434/8081/4201. V5 applies during startup without generating business data. Provisioning/sign-in remain as documented in [authentication.md](authentication.md).

Run `.\mvnw.cmd verify` in backend (Docker required), and `npm.cmd test -- --watch=false` / `npm.cmd run build` in frontend, using separate commands. See [actual verification evidence](milestone-09-verification.md).

## Before claiming real-store compatibility

Supply a permitted development shop, app client credentials/external encryption key, registered public HTTPS callback and a same-origin secure-cookie session. Verify live OAuth/scopes, currency, a small tax-exclusive supported-order range, current catalog/cost/location visibility, incremental repeat, refund/payment semantics, access expiry/rotation, disconnect and read-only behavior. Capture sanitized counts/IDs only, never customer payloads or secrets. Validate actual query cost/schema and adjust bounded resource strategy if needed. **LIVE_SHOPIFY_NOT_VERIFIED** remains the current truthful status. M10 onboarding/data readiness and separate recommendation-quality work have not begun.
