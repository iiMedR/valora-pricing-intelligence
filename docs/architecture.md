# Architecture

SmartPricing is a Java 21 / Spring Boot modular monolith backed by PostgreSQL, with a standalone Angular application. Each installation serves one business. Tenancy is planned, not implemented.

Package by feature. `health` contains the present API and response DTO. `config` owns web configuration; `common` owns safe API error handling. Future features should separate API DTOs/controllers, application use cases, domain rules, and persistence within their feature packages. No empty layers or placeholder repositories are needed for the health endpoint, which has no business logic or persistence dependency.

PostgreSQL is the source of truth. Flyway owns migrations, and Hibernate validates mappings. V1 creates an empty metadata table. Local Compose runs only PostgreSQL; neither application has a production image or hosting configuration.

## Planned, not implemented

Catalog, sales history, demand modeling, and pricing recommendations belong to later milestones. The pricing engine should consume normalized domain inputs through application boundaries, independently of ingestion provider. Shopify-specific payloads and transport concerns must stay in a future ingestion adapter so file imports, demo generation, and future providers can share the same pricing engine.

Seeded demo mode is a permanent future capability. Its generated business datasets must be explicitly identified and isolated from real connected-store data; no seeder or isolation schema is implemented now. A future Shopify ingestion path will import real store data separately and produce read-only recommendations. There are no Shopify calls, credentials, write-back operations, authentication, or tenancy mechanisms in this milestone.

The public application health endpoint is a liveness/connectivity signal, not a pricing-readiness claim. Actuator health includes infrastructure checks. Unexpected failures return generic RFC 9457 problem details; stack traces stay in server logs.

Dependencies are deliberately limited: Web for REST/MVC, Validation for request validation, Data JPA for future persistence and schema validation, PostgreSQL JDBC for database access, Flyway core and its PostgreSQL module for migrations, Actuator for operational health. Spring Boot Test supports controller assertions; Testcontainers and Boot service connections provide real PostgreSQL integration tests. Angular HttpClient/router support health calls and navigation; generated Vitest/jsdom tooling supplies frontend unit tests. There are no external service SDKs.
