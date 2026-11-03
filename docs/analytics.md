# Observed business analytics

Read-only Milestone 05 contract. Reports describe persisted transactions, never latent demand or recommendations. No schema migration is required.

## Accounting contract

All endpoints use inclusive `startDate`, exclusive `endDate`, UTC midnight boundaries, maximum 731 days. Completed orders are recognized at immutable `placed_at` because no separate completion timestamp exists. CANCELLED and UNPAID are excluded. Calendar DAY/MONTH buckets use the same UTC boundaries; edge months are partial and missing buckets contain zero financial activity, not invented observations.

- Gross sales: sum of immutable `line_net = quantity × unit_price − allocated discount`, before refunds, after discounts, excluding shipping and tax. This name follows the requested dashboard convention; it is not pre-discount list-price revenue.
- Refunds: merchandise LINE_RETURN and FINANCIAL_ADJUSTMENT amounts, recognized at `refunded_at` even if the original sale is outside the range. Shipping/tax refunds are excluded along with original shipping/tax.
- Net sales: gross minus period refunds; can be negative in refund-only periods. This is an operational measure, not GAAP revenue.
- Units sold: completed line quantities in sale period. Units refunded: LINE_RETURN quantities in refund period. Financial adjustments have zero units. Orders count distinct completed orders placed in range, including subsequently refunded orders; product order counts are distinct per product and are not additive across products.
- Gross AOV: gross sales / distinct eligible orders, null when no orders. We deliberately avoid dividing cross-period refund cash flow by unrelated new orders.
- Known-cost sales: line_net only for lines whose immutable unit_cost is nonnull. Known refunds use the referenced line's immutable cost availability. Known net = known-cost sales − known refunds.
- Known contribution **before return cost recovery**: known net − historical unit_cost × units sold. No returned-unit cost credit is assumed: a return does not establish resale/recovered inventory cost in this model. Financial adjustments lower contribution without changing cost. This narrower partial contribution excludes unknown-cost sales/refunds, shipping, tax, overhead, fees and any recovered return cost. It is null when there are no known-cost sale/refund events; a known zero is zero.
- Known margin: known contribution / known net × 100, only if known net is positive; otherwise null. Numerator/denominator cover the same cost-known event population.
- Sales cost coverage: known-cost sale lines / eligible sale lines × 100, null with no sales. Known/total refund-event counts are separately exposed so refund-only and partial-refund-cost periods are transparent. Coverage is COMPLETE, PARTIAL, UNKNOWN or NO_ACTIVITY over sale/refund events. No unknown cost is replaced by zero/current catalog cost.
- Inventory: latest observation strictly before endDate UTC (same asOf as the report), including archived variants. No observation = UNKNOWN with null quantity/time. INFERRED = UNCERTAIN. Otherwise quantity zero = KNOWN_STOCKOUT, positive = AVAILABLE. Independently stale if older than 24 hours at asOf. Latest timestamp ties break by UUID. This is a historical observation, not current on-hand, an inventory ledger, or proof of lost demand.

Single configured currency only. Each report checks selected completed orders/refunds against business currency and refuses incompatible history with 409 ANALYTICS_CURRENCY_MISMATCH. Decimal money strings use four fractional places; ratios use four places. Ratios and AOV use HALF_UP. Java/PostgreSQL numeric operations are exact; browser chart coordinates alone convert aggregates to Number (approximate beyond JavaScript precision). Visible money is formatted directly from decimal strings without floating point rounding.

## API contract

All GETs are under `/api/v1/analytics` with required startDate/endDate (ISO dates). Responses include range `{startDate,endDate,timezone:"UTC",currencyCode}`.

- `/overview`: `{range,metrics}`.
- `/trends?granularity=DAY|MONTH`: `{range,granularity,content:[{date,metrics}]}`; default DAY. At most 731 buckets; monthly date identifies first calendar day, even for a partial edge month.
- `/products?page=0&size=20&sort=NET_DESC&search=`: `{range,results:{content,page,size,totalElements,totalPages}}`. Sort allowlist NET_DESC, GROSS_DESC, NAME_ASC; stable name/UUID tie breaks. Search is literal case-insensitive substring of current product name, max 100 characters. All catalog products including archived/no-activity records remain inspectable.
- `/products/{productId}/variants`: same pagination/sort envelope, stable variant identity, current SKU/name/status; unknown product 404. Same parameters/search (matches variant name/SKU).
- `/inventory?page=0&size=20`: `{range,asOf,staleAfterHours:24,summary:{variants,stockouts,unknown,uncertain,stale},results:{...}}`. Fixed stable product/name/SKU/UUID order. Stockouts and stale overlap deliberately; summary is all variants, not only current page.

Page ≥0 and ≤100000, size 1–100, valid sort/granularity; invalid/reversed/overlong/malformed ranges produce 400. Invalid UUIDs produce 400. Errors follow the existing API error envelope; no SQL is exposed. Missing IDs produce 404. Monetary zero is `"0.0000"`; undefined AOV/margin/contribution/coverage is null. Product/variant rows contain IDs, current labels/status and `metrics`; current names are explicitly labels, not reconstructed transaction snapshots. Historical order details retain SKU/name snapshots.

Metrics include grossSales/refundAmount/netSales, unitsSold/unitsRefunded/orders, grossAverageOrderValue, salesLines/knownCostLines, refundEvents/knownCostRefundEvents, knownCostSales/knownCostRefunds/knownCostNetSales/historicalSoldCost, knownContributionBeforeReturnRecovery, knownContributionMarginPercent, salesCostCoveragePercent and costCoverageState. Example empty metrics: grossSales `"0.0000"`, orders 0, AOV/contribution/margin/coverage null, state NO_ACTIVITY.

Independent sale/refund event branches are UNION ALLed and aggregated in PostgreSQL; refunds never multiply sale rows. Product/variant grouping uses stable IDs. Bounded aggregates/pages, not full order hydration, reach Java. Inventory uses indexed latest-observation lateral lookups in one query, not one network call per variant. Read-only repeatable-read service transactions keep each endpoint internally consistent; separate dashboard endpoints may see newly ingested data between requests. No generator truth/control metadata is queried. Price/cost observations are provenance drill-downs; historical line snapshots, not present-day periods/catalog prices, drive financials.

## Running and reconciling

Use existing README normal startup (database 5433, backend 8080, frontend 4200) or `scripts/demo.ps1 serve` plus `npm.cmd run start:demo` (database 5434, backend 8081, frontend 4201). Navigate to `/analytics`. No seed/reset is part of analytics. Last 30/90 days use UTC; Full 2025 is an explicitly labeled historical preset for inspecting the demo, not automatic fake data or hardcoded totals. Empty normal data produces zero activity and undefined ratios. Inventory is evaluated at selected exclusive end, not the browser clock.

Trend gross/refunds/net/units sum to overview; orders sum because each order has one placement bucket. Product gross/refunds/net sum to overview; distinct product orders do not necessarily sum to business orders. Contribution sums over known buckets treating unavailable as no known event; ratios/AOV must be recomputed, never summed/averaged. Demo summary checksum before/after analytics must remain unchanged.
