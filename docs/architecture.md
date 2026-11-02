# Architecture

SmartPricing is a Java 21 / Spring Boot modular monolith backed by PostgreSQL, with a standalone Angular application. Each installation serves one business. Tenancy is planned, not implemented.

Package by feature. `health` contains the liveness API; `business` and `catalog` each separate controllers, DTOs, transactional services, entities, and repositories. `config` owns web configuration; `common` owns consistent safe API errors and entity auditing/version checks. There are no empty placeholder layers for the stateless health endpoint.

PostgreSQL is the source of truth. Flyway owns migrations, and Hibernate validates mappings. V1 creates an empty metadata table. V2 creates business settings, categories, products, and variants, with restrictive foreign keys, uniqueness indexes, and monetary constraints. Products group variants; only variants hold prices/costs. Local Compose runs only PostgreSQL; neither application has a production image or hosting configuration.

## Planned, not implemented

Sales history, demand modeling, and pricing recommendations belong to later milestones. The pricing engine should consume normalized domain inputs through application boundaries, independently of ingestion provider. Shopify-specific payloads and transport concerns must stay in a future ingestion adapter so file imports, demo generation, and future providers can share the same pricing engine. Future pricing operations must require both the parent product and variant to be ACTIVE.

Seeded demo mode is a permanent future capability. Its generated business datasets must be explicitly identified and isolated from real connected-store data; no seeder or isolation schema is implemented now. A future Shopify ingestion path will import real store data separately and produce read-only recommendations. There are no Shopify calls, credentials, write-back operations, authentication, or tenancy mechanisms in this milestone.

The public application health endpoint is a liveness/connectivity signal, not a pricing-readiness claim. Actuator health includes infrastructure checks. All API errors use code/message/timestamp/fieldErrors; unexpected failures return a generic message and stack traces stay in server logs. Optimistic versions reject stale updates; per-product locks serialize activation and variant changes, and singleton locking prevents currency changes racing with first-variant creation.

Dependencies are deliberately limited: Web for REST/MVC, Validation for request validation, Data JPA for future persistence and schema validation, PostgreSQL JDBC for database access, Flyway core and its PostgreSQL module for migrations, Actuator for operational health. Spring Boot Test supports controller assertions; Testcontainers and Boot service connections provide real PostgreSQL integration tests. Angular HttpClient/router support health calls and navigation; generated Vitest/jsdom tooling supplies frontend unit tests. There are no external service SDKs.
