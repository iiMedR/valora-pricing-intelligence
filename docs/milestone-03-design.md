# Milestone 03 implementation plan

Extend the existing package-by-feature monolith, DTO errors, decimal strings, and Angular standalone UI. Keep Java/Angular versions, branch, port 5433, and migrations V1/V2 unchanged.

1. Add V3 with immutable sales orders/items/refunds, authoritative price/cost periods, inventory observations, restrictive FKs, source-key uniqueness, and PostgreSQL overlap constraints.
2. Add `history/{dto,repository,service,controller}` and `sales/{dto,repository,service,controller}`. Explicit SQL repositories use the existing Spring JDBC dependency for append-only records and PostgreSQL range/locking operations; catalog remains JPA. No persistence entities cross the API boundary.
3. Derive financial totals from immutable line snapshots using BigDecimal. Preserve unknown cost/list price, recognize only COMPLETED merchandise sales, and keep shipping/tax refunds separate from merchandise refunds. Reject over-refunds and conflicting source keys.
4. Add transactional listed-price/cost changes and connect future catalog edits to verified change events without fabricating pre-existing history. Distinguish zero stock observations from absent observations.
5. Add orders/list/detail/manual-entry/refund screens and per-variant price/cost/inventory history screens, using current styling and navigation. No UI library or redesign.
6. Test arithmetic/validation independently; test migration upgrades, rollback, idempotency/concurrency, constraints and archive retention in isolated PostgreSQL containers. Verify real local V3, then use disposable browser-test data without touching normal data.
7. Update history contracts and verification evidence; make cohesive local conventional commits. Stop before Prompt 04.

Security: the existing app has no authentication. New endpoints are local-development/manual ingestion APIs, not authenticated production ingestion. Future provider adapters must add authorization/connection scoping and normalize inputs into these provider-independent contracts.
