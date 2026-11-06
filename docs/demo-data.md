# Reproducible synthetic demo

Milestone 04 adds a permanent local synthetic workspace using the existing catalog, sales, refund and history services. It is not a real connected business or a pricing model. No analytics, forecast, optimizer, adapter, authentication or deployment component is added.

## Strong isolation

Normal development remains unchanged: PostgreSQL `smartpricing` on host **5433**, backend 8080, frontend 4200. Demo uses a separate PostgreSQL container and named volume, database `smartpricing_demo` on **5434**, restricted login `smartpricing_demo`, backend 8081, frontend 4201. The two instances do not share business tables, credentials or volumes.

The isolated container's administrator creates `demo_control.environment`. The application can SELECT this marker but cannot insert, update, delete or truncate it. Seed/reset require all of: active `demo` profile without `local`, application mode `demo`, exact database and restricted role names, a non-superuser login, and the expected administrator-owned/read-only identity marker. Reset additionally requires `RESET_SYNTHETIC_DEMO`. These checks refuse a normal database even if configuration is misdirected. Destructive operations revalidate the live identity. Demo identity is checked before Flyway and again on demo startup; startup with Flyway disabled is also protected.

Normal mode rejects `DEMO` source ingestion through the shared ingestion services. A verified demo context may use it. Source labels remain provenance, not the isolation boundary. There is no destructive HTTP endpoint. `GET /api/v1/environment` identifies the actual environment; the Angular shell shows **Synthetic Demo Data** for demo responses, and an unverified-environment warning if identity cannot be loaded.

Milestone 04 needed no new domain migration: V1–V3 support all generated records. Later V4/V5 add empty security/import metadata without altering the permanent dataset. M08/M09 keep demo browsing anonymous and read-only; real connections and imports are disabled. The existing guarded reset includes the V5 order-metadata FK table explicitly, while retaining identity/confirmation checks and checksum semantics. Demo-only control tables are bootstrapped by `infra/demo/10-isolated-demo.sh` exclusively in the separate container, outside the public/domain schema. They hold the identity marker, stable logical catalog mappings, seed-run metadata, normalized checksum and generator ground truth. Normal databases never receive these tables.

## Exact local commands (PowerShell)

From the repository root, with Java 21, Node/npm and Docker Desktop running:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.11'
.\scripts\demo.ps1 init
```

`init` generates local random passwords in Git-ignored `infra/.env.demo.local` if absent, starts only the isolated demo Compose service, waits for health, then explicitly seeds. Credentials are passed via environment, never printed or committed. Retain this private file with the demo volume: reinitializing passwords does not change an existing PostgreSQL role's password. No ordinary application startup seeds anything, including startup with the demo profile alone.

Inspect or safely repeat the same seed:

```powershell
.\scripts\demo.ps1 summary
.\scripts\demo.ps1 seed
```

Run the demo backend, then the existing frontend in another terminal:

```powershell
.\scripts\demo.ps1 serve
# Another terminal, from frontend/:
npm.cmd ci
npm.cmd run start:demo
```

Open [synthetic demo](http://localhost:4201). Products, sales orders and each variant's price/cost/inventory history use the existing real APIs. The normal workspace stays available separately at [localhost:4200](http://localhost:4200).

Stop the demo backend before a reset. **Reset replaces all business records in the isolated synthetic demo only**, including manual edits made there:

```powershell
.\scripts\demo.ps1 reset -ConfirmReset
# Explicitly replace the demo with another deterministic seed:
.\scripts\demo.ps1 reset -ConfirmReset -Seed 42 -StartDate 2025-01-01
```

Omitting the switch refuses reset. Calling a demo command against a normal profile/database refuses it even with the confirmation token. The reset is a guarded transactional TRUNCATE/reseed of only the dedicated demo's business/control-run tables; it never truncates the identity marker or uses a normal database URL. Failures roll back the reset and retain the previous complete dataset. No volumes/databases are dropped.

To stop demo infrastructure without deleting its data:

```powershell
docker compose --env-file infra/.env.demo.local -f infra/compose.demo.yaml --profile demo down
```

The separate Compose file is intentional: required demo password variables never affect normal `infra/compose.yaml` commands. Passwords and optional `DEMO_DB_PORT` are local environment configuration. If the isolated DB is missing or fails identity/authentication checks, commands fail closed; they never fall back to port 5433. Do not delete/reset normal data to fix a demo startup problem.

## Version, dates and bounded size

Generator version: `demo-v1`; default seed: `20250101`; fixed reference start: **2025-01-01**; exclusive end: **2026-01-01**. The window contains twelve complete calendar months. A seed override changes bounded demand noise while catalog definitions and scenario parameters remain fixed. Start-date overrides must start on a month's first day, and the complete window must be in the past. Generation never uses today's date; the clock is used only to reject future observations.

The executed default dataset contains five categories, **30 products / 30 variants** (three replicas of each of ten scenarios), **9,466 orders / lines**, **114 refunds**, 117 listed-price observations, 57 cost periods, and **9,870 inventory observations**. There are 286 unknown-cost lines and 404 observed variant/dates without sales. Each core variant has daily beginning-of-day inventory observations; sparse variants intentionally have five observed dates. One completed synthetic order aggregates each variant/date's positive observed units into one immutable line. Volumes are bounded by the 30-variant/12-month window; counts can vary with seed/date overrides.

Default normalized SHA-256: `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`. The actual explicit seed command and an identical rerun both returned this checksum.

No fake customer identities, addresses or emails are generated. Keys such as `demo-v1/order/ELASTIC_HIGH/1/2025-01-01` are opaque synthetic provenance, not store IDs. Internal UUIDs and audit timestamps may differ across fresh databases; stable logical mappings persist within a demo installation, and normalized business content/checksums are identical for the same generator version, seed and dates. Do not assume global UUID equivalence with future provider IDs.

## Scenario catalog

| Stable scenario ID | Intended behavior |
| --- | --- |
| ELASTIC_HIGH | Latent elasticity −2.6; substantial unit decline at higher prices. |
| ELASTIC_LOW | Latent elasticity −0.25; much smaller response to the same price changes. |
| SEASONAL | Monthly seasonality, peaking July/August, plus weekly variation. |
| PROMOTION | Days 10–16 of each month use an effective transaction unit price 20% below listed price. |
| STOCKOUT | Zero availability on day indices 150–169; availability capped at three units on 240–254. Observed sales cannot exceed stock. |
| SPARSE | Five inventory dates and three listed-price snapshots; only a few positive orders and no trustworthy cost periods. |
| REFUND | Partial quantity/money returns every fourteen days and financial-only adjustments every thirty-one days, subject to date/amount limits. |
| COST_CHANGE_UNKNOWN | Known first-quarter cost, an explicit second-quarter gap, then higher known costs. Order costs in the gap stay null/UNKNOWN. |
| ARCHIVE | Sales stop after ten months; catalog records are archived after historical ingestion and remain linked to their orders. |
| ZERO_SALES | Scheduled variant-specific no-sale dates every seventh day despite positive observed inventory; no fake zero-quantity orders. |

Listed-price periods change at quarter boundaries using factors 1.00, 1.10, 1.30, 1.00. Sparse observations are points, not fabricated periods. Known cost histories change by half-year, while the unknown-cost scenario has a deliberate gap. All authoritative periods use the existing half-open interval rules and overlap constraints. Current catalog values are synchronized by those same history services, not by separate SQL business-data writers.

Promotions supply listedUnitPrice separately from the lower actual transaction unitPrice. Allocated line discount is zero because this reduction is already in the effective unit price; it is never subtracted twice. Refunds use exact BigDecimal amounts and existing cumulative limits. Returned units are not silently restocked. Inventory snapshots represent beginning-of-day stock with synthetic overnight replenishment, not a full movement ledger.

## Latent versus observed demand

The generator uses:

```text
latent units = base demand × replica factor × (effective price / base price)^elasticity
               × monthly seasonality × weekday factor × bounded seeded noise
requested units = seeded stochastic integer rounding of latent units
observed sales = min(requested units, available stock), subject to no-sale/retirement rules
```

Noise is bounded to [0.90,1.10); weekday factors are 0.95 on weekdays and 1.15 on weekends. Replicas scale base demand by 1.00, 1.15, 1.30. A stable date/SKU/seed mix makes random access/order of generation irrelevant. StrictMath is used for unitless latent-demand math; all persisted prices, costs and refunds remain BigDecimal with exact four-place scaling.

Latent units are generator ground truth, not observed sales. A stockout can hide positive latent demand; an absent/zero sale is not proof of zero demand. Sparse records remain sparse and unknown cost is not replaced with today's cost. The archive scenario's historical rows are retained even though the current variant is unavailable.

Ground-truth elasticities, base demand and formula metadata are written only to `demo_control.seed_runs.ground_truth` by demo-only generator/repository classes. They are not fields in products/orders/history DTOs, and no pricing/analytics runtime service reads them. The read-only summary shows scenario coverage/counts and reproducibility evidence, not an estimated pricing model. Future analytics must use normalized observations, never parse scenario SKUs or consume generator parameters as learned inputs.

## Atomicity, reruns and performance

Catalog writes reuse CatalogService/BusinessService; observations and transactions reuse VariantHistoryService/SalesService. No parallel sales/catalog persistence path is introduced. Demo-only repositories write control metadata and compute a streaming normalized checksum; they do not bypass domain rules to write business data.

One transaction contains the bounded seed, its mappings and READY metadata. Only complete datasets become visible; a failed initialization leaves no partial catalog/history, and a failed reset restores the old dataset. Stable source references and a seed-level advisory lock protect concurrent/rerun commands. Existing READY data with the same seed/date/version is checksum-verified and returned without inserting duplicates. Different configuration, missing metadata on nonempty data, or edited records is refused and preserved until an explicit isolated reset.

Ingestion advisory locks now use 1,024 deterministic stripes rather than retaining a distinct lock per event for an entire bulk transaction. Collisions serialize unrelated keys; exact source/reference indexes and payload hashes still enforce uniqueness/conflicts. This bounds PostgreSQL shared lock memory without requiring server tuning or weakening idempotency. Generation iterates a date/product at a time and checksum reads use bounded fetches. Runs can take several minutes locally because all domain checks and immutable writes are real PostgreSQL operations.

The normalized SHA-256 includes logical catalog data, stable mapping keys, historical periods/observations, line financial snapshots and refunds in predictable order. It excludes internal UUIDs, row versions, ingestion timestamps and UUID-dependent payload hashes. `summary` and the demo-only read-only `GET /api/v1/demo/summary` return the stored summary plus current checksum/matchesSeed, making later edits visible. There is no reset/seed HTTP endpoint.

## Verification and limitations

Run `.\mvnw.cmd verify` from backend and the existing Angular test/build commands from frontend. Tests use actual isolated PostgreSQL databases, including two independent fresh demo instances, repeated seeding, different seeds, failed seed/reset rollback, read-only marker permissions, guarded normal-database command refusal with preexisting records, period/refund/stock invariants, unknown costs and archived-history retention. Generator unit tests compare directional scenario behavior with tolerances rather than brittle exact statistical counts.

This is synthetic daily aggregate data, not a behavioral claim about real customers or a retail basket simulator. There is one variant per product in the bounded default dataset. Stock observations do not establish continuous stockout periods. Audit timestamps describe ingestion; no historical archival timestamp is fabricated. Any change to generator rules/parameters must bump the dataset version and pass reproducibility tests. Later Shopify work still needs authentication and connection-scoped source keys. Demo remains a separate database; no shared-database tenant/isDemo reset mechanism is added.
