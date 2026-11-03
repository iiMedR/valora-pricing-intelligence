# Sales, pricing, cost and inventory history

Milestone 03 extends the existing single-business catalog. The application remains a Spring Boot monolith with PostgreSQL on local host port 5433 and Angular on 4200. `sales` and `history` feature packages contain DTOs, thin controllers, transactional services and SQL repositories. JDBC is already supplied by Data JPA; no new Java or Angular dependencies were added. Catalog persistence remains JPA. SQL repositories are used for append-only snapshots, range constraints, and explicit PostgreSQL locks.

## Security and sources

There is **no authentication or authorization** in the current application. These endpoints follow the existing local-development/manual API posture. Do not expose them as authenticated production ingestion. Future store/manual access must add authorization, credentials and connection scoping before exposure.

Every record identifies `source`: MANUAL, SHOPIFY, or DEMO. SHOPIFY and DEMO are reserved metadata values accepted by the generic ingestion contract; no connector or generator is implemented. Non-manual sources require an externalReference. References are case-sensitive, unpadded, nonblank strings up to 160 characters. Optional manual references should also be supplied for retry safety. The UI generates a UUID retry key per entry and retains it on failures.

Uniqueness is scoped by source and object type: order, refund, listed-price event, cost event, or inventory observation. References are not scoped by variant/order, so an external observation key cannot accidentally be reused for another object of the same type. Line references are unique within an order. A future store connection must become part of this scope; no fake connection or tenant ID exists now.

Transactional advisory locks serialize same-key requests, while unique indexes remain the final database guard. Canonical SHA-256 payload fingerprints ignore JSON object ordering and BigDecimal scale differences. An identical event returns 200 and the existing record; a new event returns 201; the same key with different content returns 409 SOURCE_KEY_CONFLICT. Omitted optional values deserialize as null, and line order is part of the order payload. Retrying an event never rewrites it. Imports with corrections need an explicit later reconciliation workflow rather than silent upserts.

## Time and money

Requests/JSON use ISO 8601 timestamps with offsets; Java uses Instant and PostgreSQL uses TIMESTAMPTZ. Times are normalized to PostgreSQL microsecond precision. The UI accepts local date/time inputs and converts them to UTC; historical displays explicitly show UTC. Observation/transaction timestamps cannot be in the future. Date filters and authoritative periods are half-open `[from,to)`; `to` is exclusive. Endpoints accept page ≥ 0 and size 1–100 (default 20), with stable time-descending/UUID sorting.

All currency amounts must match the installation currency. Line/refund currency is additionally constrained against the parent order in PostgreSQL. Existing settings still reject currency changes when variants exist. Java uses BigDecimal and PostgreSQL NUMERIC(19,4); JSON responses and UI use decimal strings. At most 15 integer digits and four fractional digits are accepted. No rounding is performed: scaling uses UNNECESSARY, and excessive precision/overflow is rejected. Multiplication uses an integer quantity and exact decimal arithmetic. Fractional JSON quantities are rejected rather than coerced to integers. The UI never calculates financial totals using JavaScript Number.

## Orders and immutable financial snapshots

Order status is COMPLETED, UNPAID, or CANCELLED; it is supplied, never inferred from fulfillment. Only COMPLETED orders contribute `recognizedNetMerchandise`. Orders are immutable in this milestone, including status. Future provider status transitions need an explicit audited workflow.

Each line references an existing variant (including archived variants, since valid historical imports may arrive after archival) and snapshots SKU/name, quantity, currency, optional listUnitPrice, unitPrice, discountAmount, lineNet, optional unitCost, costProvenance, and optional sourceLineReference. Quantities are integers from 1 to 1,000,000; an order has 1–100 lines. Financial input is validated and every line is inserted atomically with its order. Catalog edits/archiving do not rewrite these snapshots. Database mutation triggers reject UPDATE/DELETE of orders, items, refunds and inventory; FKs to variants use RESTRICT, never cascade deletion.

`unitPrice` is the transaction unit amount before the separately allocated line discount. The optional `listUnitPrice` is an explicitly supplied reference value, not an amount used in totals. No listed price is inferred from a sale. Derived amounts are:

- subtotal = sum(unitPrice × quantity), before allocated line discounts;
- discountAmount = sum(line discountAmount); each discount cannot exceed its line gross;
- lineNet = unitPrice × quantity − allocated line discount;
- netMerchandise = subtotal − discounts − merchandise refunds;
- recognizedNetMerchandise = netMerchandise for COMPLETED, otherwise zero;
- totalCharged = subtotal − discounts + shipping + tax, **before refunds**, only if shipping and tax are both known. If either is omitted/null, totalCharged is unknown/null, not a fabricated zero.

Shipping and tax are optional explicitly supplied order amounts; zero is a known zero, null is unknown. They are not included in merchandise net sales. No externally supplied subtotal/grand total is trusted; unknown properties are rejected by the existing strict JSON configuration.

## Costs and provenance

Transaction cost precedence is explicit `unitCost` → VERIFIED_CHANGE cost period covering placement → null/UNKNOWN. Explicit zero is known. Provenance is PROVIDED, EFFECTIVE_HISTORY, or UNKNOWN. Current catalog cost, snapshots and inferred cost observations are never used as actual past cost. The selected value is stored once and is not retroactively changed by later cost-history imports or corrections. There is no profitability calculation when cost is unknown.

## Refunds and returns

Refunds reference a completed order, have a timestamp on/after placement, source/reference, amount, currency, optional reason, and one of:

- LINE_RETURN: line required, positive returned quantity, nonnegative monetary amount (a physical return can have no monetary refund).
- FINANCIAL_ADJUSTMENT: line required, zero quantity, positive amount. It is never counted as returned units.
- SHIPPING or TAX: no line, zero quantity, positive amount, capped at the known order shipping/tax amount.

Cumulative returned quantity cannot exceed purchased quantity, and cumulative line-refund money cannot exceed paid lineNet, independently. This permits partial returns and partial/financial-only refunds without double counting. Order-row locks serialize refunds; a database trigger also validates aggregate limits, status and dates. Same-key duplicates return the original refund. Shipping/tax refunds are separate output fields and never reduce merchandise sales. Refund entry records history only; it does not send money, restock inventory, or contact a payment provider.

## Listed prices, effective costs and current catalog values

V3 does not backfill any history from existing current catalog fields. No observations means historical data is unknown. Each price/cost record has variant, amount, currency, validFrom, optional validTo, source, quality, externalReference, hash and ingestion timestamp.

Quality is VERIFIED_CHANGE, SNAPSHOT, or INFERRED. Only VERIFIED_CHANGE defines an authoritative effective period. Snapshots/inferred entries are point observations with validTo null; null does **not** imply continuous validity for them. They never update the current catalog. An authoritative bounded period records known past history without changing today's catalog values. Both bounds must be nonfuture and end after start.

An authoritative open period requires `variantVersion`, must follow any existing authoritative open period, and atomically closes that previous period and updates currentPrice/costPrice plus variant version. Price changes must remain within existing min/max constraints. Service validation and PostgreSQL GiST exclusion constraints prevent authoritative overlap, including concurrent writers. The migration enables the trusted PostgreSQL `btree_gist` extension; the migration role needs permission to create it. The supplied PostgreSQL image supports it. Reference: [PostgreSQL range/exclusion constraints](https://www.postgresql.org/docs/17/rangetypes.html).

Catalog PUT remains available and retains its original validation. Changing current price/cost now appends a verified MANUAL change event at edit time in the same transaction, closing the prior open period. Unchanged values create no event. Variant creation does not fabricate history. Existing SKU/name/status/min/max edits retain their semantics. Historical order snapshots stay unchanged.

No arbitrary period correction/deletion API is provided. Database triggers allow only closing an open period; historical amount/source/bounds cannot otherwise be rewritten. A future audited correction workflow must explicitly model revisions and must not silently recalculate transaction snapshots.

## Inventory observations

Each snapshot records variant, observedAt, nonnegative integer quantityAvailable, source/reference, quality, and ingestion timestamp. A trusted (VERIFIED_CHANGE/SNAPSHOT) quantity zero returns KNOWN_STOCKOUT **at that observation instant**; positive returns AVAILABLE. INFERRED observations return UNCERTAIN. No snapshots means UNKNOWN, never zero. Sparse observations do not prove continuous stockout periods, and this milestone performs no inventory deduction/restocking or availability interpolation.

## Endpoint inventory

All paths below are under `/api/v1`. DTO errors retain code/message/timestamp/fieldErrors. Invalid input is 400, missing references 404, and conflicting source keys, stale versions, overlap or over-refunds 409. Persistence constraints return safe generic conflicts, never SQL/stack traces.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/sales/orders` | Atomically create order and lines, or replay identical key. |
| GET | `/sales/orders` | Page by placedAt descending/id; optional from, to, status, source filters. |
| GET | `/sales/orders/{id}` | Order summary, immutable lines and append-only refunds. |
| POST | `/sales/orders/{id}/refunds` | Add partial return/adjustment, or replay identical key. |
| GET / POST | `/products/variants/{id}/price-history` | Page/add listed-price periods or point observations. |
| GET / POST | `/products/variants/{id}/cost-history` | Page/add cost periods or point observations. |
| GET / POST | `/products/variants/{id}/inventory-history` | Page/add inventory snapshots. |

Representative payloads (use actual variant/item IDs, business currency and latest variant version):

```json
{
  "source": "MANUAL", "externalReference": "order-001", "placedAt": "2026-10-02T10:00:00Z",
  "status": "COMPLETED", "currencyCode": "MAD", "shippingAmount": "0.0000", "taxAmount": null,
  "lines": [{"variantId": "<variant UUID>", "quantity": 2, "unitPrice": "10.1234", "discountAmount": "1.0000", "unitCost": null, "listUnitPrice": null, "sourceLineReference": "1"}]
}
```

POST to `/sales/orders`; response is `{ "order": {...}, "lines": [...], "refunds": [] }`. The example subtotal is `20.2468`, merchandise net is `19.2468`, and totalCharged is null because tax is unknown.

```json
{"source":"MANUAL","externalReference":"refund-001","refundedAt":"2026-10-03T10:00:00Z","kind":"LINE_RETURN","itemId":"<line UUID>","quantity":1,"amount":"5.0000","currencyCode":"MAD","reason":"Partial return"}
```

POST to `/sales/orders/{order UUID}/refunds`; the example merchandise net becomes `14.2468`. Use kind FINANCIAL_ADJUSTMENT and quantity 0 for money-only line adjustments.

```json
{"amount":"12.0000","currencyCode":"MAD","validFrom":"2026-10-01T00:00:00Z","validTo":null,"source":"MANUAL","quality":"VERIFIED_CHANGE","externalReference":"listed-001","variantVersion":0}
```

POST to the price-history route. For cost history use the same shape with a nonnegative amount. Snapshots use quality SNAPSHOT and do not modify the catalog.

```json
{"observedAt":"2026-10-03T00:00:00Z","quantityAvailable":0,"source":"MANUAL","quality":"SNAPSHOT","externalReference":"stock-001"}
```

POST to inventory-history. The response includes quantityAvailable 0 and stockState KNOWN_STOCKOUT. GET collections return the existing content/page/size/totalElements/totalPages envelope.

```powershell
Invoke-RestMethod 'http://localhost:8080/api/v1/sales/orders?status=COMPLETED&source=MANUAL&page=0&size=20'
Invoke-RestMethod 'http://localhost:8080/api/v1/products/variants/<variant UUID>/price-history?page=0&size=20'
# Save a payload above to a local file, then explicitly ingest it:
Invoke-RestMethod 'http://localhost:8080/api/v1/sales/orders' -Method Post -ContentType 'application/json' -Body (Get-Content ./order.json -Raw)
```

## Demo seeder and future Shopify adapter

The deterministic seeder supplies DEMO references and known historical timestamps through these services; source keys make reruns safe, and conflicting datasets are rejected. It uses a dedicated database with identity/profile/reset guards, not a source label alone. Normal ingestion rejects DEMO sources. See [demo-data.md](demo-data.md).

Idempotency advisory locks use 1,024 deterministic stripes so atomic bulk seeding has bounded PostgreSQL lock-table usage. Hash collisions only serialize unrelated keys; exact source/reference uniqueness and payload fingerprints still determine replay versus conflict.

The Shopify adapter must normalize orders/refunds, currency, discounts, cost provenance and event quality into these contracts, add connection-scoped uniqueness and authorization, and explicitly reconcile status/correction events. The pricing engine must depend on normalized domain history, not Shopify payloads. Forecasting, optimization, CSV imports, webhooks and integrations remain out of scope.
