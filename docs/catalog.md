# Catalog and business configuration

Milestone 02 adds a single-business catalog. Start the normal app as documented in the root README: Compose PostgreSQL on host port 5433, backend `local` profile on 8080, Angular on 4200. No new dependencies, deployment components, remote operations, or demo seeder were added.

## Domain and creation flow

V2 initializes settings ID 1 with display name `My Business` and currency `MAD`. Change these before adding variants if another currency is needed. ISO 4217 currency codes must be recognized by Java's currency registry, uppercase, and three letters. Once any variant exists, including archived variants, changing currency returns 409 `CURRENCY_LOCKED`. Display-name edits remain allowed.

Create a category if useful, then create a product. New products are always ARCHIVED; requesting ACTIVE at creation returns 400. Add at least one ACTIVE variant and update the product to ACTIVE. A product cannot become ACTIVE with only archived variants or no variants. Archiving the last active variant automatically archives its parent product, including when the variant is archived through PUT. Restoring a variant does not automatically activate the parent.

DELETE on products and variants means archive, never physical deletion. Archiving a product retains its variants and their individual statuses. Future pricing/sales workflows must consider both parent and variant status; an archived parent makes all its variants unavailable for pricing. There is no destructive product/variant deletion endpoint. Archived SKUs remain globally reserved. Categories can be physically deleted only if no product references them, including archived products; otherwise 409 `CATEGORY_IN_USE`. Foreign keys use `ON DELETE RESTRICT`, with no cascade deletion.

Names and SKUs are trimmed at the boundary. The displayed SKU retains the user's letter case; uniqueness is case-insensitive and global. Categories likewise have case-insensitive unique names. Flat categories only; category assignment is optional.

## Monetary representation

Only variants store authoritative cost/current/min/max prices. Java uses BigDecimal and PostgreSQL NUMERIC(19,4). Responses use JSON decimal strings, e.g. `"10.1234"`; Angular forms retain and send strings. Requests accept BigDecimal-compatible JSON strings or numeric literals, but API clients should send strings to preserve precision. More than four fractional digits or fifteen integer digits is rejected before persistence, never rounded by the application. Constraints require cost ≥ 0 and 0 < min ≤ current ≤ max. A below-cost current price is permitted and returned as `belowCost: true`; the UI displays a warning.

JavaScript Number cannot represent every NUMERIC(19,4) value accurately. The UI never converts monetary strings to Number or calculates financial totals. Form checks compare scaled BigInt values built from validated decimal text. No currency conversion, financial totals, price recommendation, or historical pricing is implemented.

## HTTP API

All paths are relative to `/api/v1`. UUIDs identify catalog records. Responses include timestamps and `version`. GET product detail returns `{ "product": { ... }, "variants": [ ... ] }`; product lists return `{ "content": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0 }`.

| Method | Path | Behavior |
| --- | --- | --- |
| GET / PUT | `/business-settings` | Read/update the singleton settings. |
| GET / POST | `/categories` | List/create categories; creation returns 201. |
| PUT / DELETE | `/categories/{id}` | Update/delete an unused category; delete returns 204. |
| GET / POST | `/products` | Filtered paginated list/create archived product (201). |
| GET / PUT / DELETE | `/products/{id}` | Detail/update/archive product (200). |
| POST | `/products/{id}/variants` | Create a sellable variant (201). |
| PUT / DELETE | `/products/{id}/variants/{variantId}` | Update/archive a variant (200). |

Product-list parameters: page (default 0), size (default 20; range 1–100), search (literal case-insensitive name substring, max 160), optional categoryId UUID, optional status ACTIVE/ARCHIVED. Default lists include archived products. Sort is createdAt descending then UUID ascending for stable pagination. Invalid parameter values return 400 rather than being silently capped or coerced.

PUT requests require the version from the latest GET. Missing versions return 400; stale versions return 409 `STALE_VERSION`. DELETE accepts optional `?version=N`; the UI always supplies it. Without a version, DELETE archives/deletes the current record. JPA optimistic locking protects updates, product-row locks serialize variant/activation changes, and a shared settings-row lock serializes first-variant insertion with currency updates. Database unique/FK constraints also protect races and return 409 rather than internal SQL errors.

All errors use this shape (fieldErrors may be empty):

```json
{
  "code": "DUPLICATE_SKU",
  "message": "This SKU already exists, including archived variants (case-insensitive).",
  "timestamp": "2026-11-12T12:00:00Z",
  "fieldErrors": {}
}
```

400 covers invalid fields/types/JSON; 404 covers missing or wrongly nested records; 409 covers uniqueness, referenced categories, state conflicts, stale versions, and currency restriction. Unexpected failures return 500 `INTERNAL_ERROR` with a generic message. Numeric enum ordinals and unknown request properties are rejected. No stack traces or database internals are returned. This replaces Milestone 01's ProblemDetail-only unexpected-error representation with a consistent error envelope; successful health responses remain unchanged.

## Representative PowerShell requests

These examples create real records only when you explicitly run them. Use your own product names and SKU; there are no automatic catalog rows.

```powershell
$api = 'http://localhost:8080/api/v1'
$category = Invoke-RestMethod "$api/categories" -Method Post -ContentType 'application/json' -Body '{"name":"Accessories","description":"Optional product grouping"}'
$body = @{name='Travel Mug'; categoryId=$category.id} | ConvertTo-Json
$product = Invoke-RestMethod "$api/products" -Method Post -ContentType 'application/json' -Body $body
# Product response: UUID, name, categoryId, status ARCHIVED, timestamps, version 0.
$variant = Invoke-RestMethod "$api/products/$($product.id)/variants" -Method Post -ContentType 'application/json' -Body '{"sku":"MUG-001","name":"Standard","costPrice":"8.5000","currentPrice":"12.0000","minPrice":"7.0000","maxPrice":"18.0000","status":"ACTIVE"}'
# Variant response includes decimal strings, status ACTIVE, and belowCost false.
$body = @{name=$product.name; categoryId=$category.id; status='ACTIVE'; version=$product.version} | ConvertTo-Json
$product = Invoke-RestMethod "$api/products/$($product.id)" -Method Put -ContentType 'application/json' -Body $body
Invoke-RestMethod "$api/products?search=Mug&status=ACTIVE&page=0&size=20"
Invoke-RestMethod "$api/products/$($product.id)"
# Archive preserves both records and reserves the SKU:
Invoke-RestMethod "$api/products/$($product.id)/variants/$($variant.id)?version=$($variant.version)" -Method Delete
$settings = Invoke-RestMethod "$api/business-settings"
$body = @{displayName='My Store'; currencyCode=$settings.currencyCode; version=$settings.version} | ConvertTo-Json
Invoke-RestMethod "$api/business-settings" -Method Put -ContentType 'application/json' -Body $body
```

## Tests and local verification

Run `.\mvnw.cmd test` for Docker-independent service/controller tests, `.\mvnw.cmd verify` for those plus PostgreSQL integration tests, and `npm.cmd test -- --watch=false` / `npm.cmd run build` from frontend. Integration databases are isolated Testcontainers instances, including a dedicated V1-to-V2 upgrade check preserving an existing metadata row. Never reset local volumes to run tests.

Browser checks use real APIs in a disposable PostgreSQL container and separate backend/frontend ports (8081/4201) so test records never enter the normal catalog on 5433. See milestone-02-verification.md for actual results. No analytics, sales/orders, inventory, optimization, integrations, authentication, tenancy, or seeder are included.
