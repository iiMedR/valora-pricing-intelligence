# Milestone 02 verification

Verdict: **Milestone 02 passed**. Executed on Windows on 2026-11-12, branch `codex/milestone-01`, starting from clean commit `2b3d085`. No Milestone 03 functionality, seeder, external integration, dependency, deployment, or remote operation was added.

## Environment and persistence

Java 21.0.11, Spring Boot 3.5.16, Maven wrapper 3.9.11, PostgreSQL 17.7 (`postgres:17.7-alpine`), Angular/CLI 22.2.6, Node 24.22.1, npm 11.19.1, Docker Desktop 4.92.0 / engine 29.8.0. Local Compose stays at host port 5433; the Windows PostgreSQL service on 5432 is unchanged.

The existing local V1 database upgraded to V2 during normal local-profile startup. Both Flyway history rows report success. V1 is unchanged. No volume reset or local data deletion occurred. After UI QA, normal categories/products/variants each contain zero rows; the singleton settings remains the installation default. Browser-created records used only a disposable, separately named PostgreSQL container on host port 5434, backend 8081, and Angular 4201.

## Commands and actual results

| Check | Outcome |
| --- | --- |
| `docker compose -f infra/compose.yaml ps` | PASS: PostgreSQL healthy on `127.0.0.1:5433`. |
| Backend `.\mvnw.cmd test` | Existing health/CORS regression suite passed during bootstrap; complete final unit coverage also runs under verify below. |
| Backend `.\mvnw.cmd verify` | PASS: 24 unit tests (18 catalog, 3 business, 3 health/CORS) plus 7 integration tests; 0 failures, errors, or skips. Executable JAR packaging passes. |
| MigrationIT | PASS: isolated V1 database upgraded to V2; an existing app_metadata row is preserved. |
| CatalogApiIT / application context IT | PASS: clean V1+V2 migration, singleton constraint, unique category/SKU indexes, FK RESTRICT, monetary checks, API create/read/update/archive, filtering/pagination, invalid inputs, duplicate case variants, stale edits, wrong-parent variant lookup, activation guard, category conflict, and currency restriction. |
| Frontend `npm.cmd test -- --watch=false` | PASS: 13 tests across 7 suites, including API parameter/error handling, decimal-string preservation, product/variant form validation, failed-save input retention, listing loading/empty/error/filter behavior, settings conflict, and existing health/retry behavior. Final formatted-source rerun passed. |
| Frontend `npm.cmd run build` | PASS: strict TypeScript/templates and production bundle, including lazy-loaded catalog/settings pages. |
| `GET :8080/api/v1/health`, `GET :8080/actuator/health` | PASS: HTTP 200, status UP. |
| `GET :4200/api/v1/products` | PASS: real backend response, empty paginated catalog, no fixture substitution. |
| Local-profile backend / Angular | PASS: normal app remains on ports 8080/4200 with PostgreSQL on 5433. |

An initial new test compilation exposed an ambiguous Mockito overload; the matcher was typed and the full suite rerun successfully. No test skips or weakened assertions were used. Java/Mockito emit non-blocking dynamic-agent warnings; test results are green.

## Browser QA

Browser plugin not available; used Playwright CLI. The main flow was categories → create product → add/edit variant → activate → archive → list/filter → edit settings. All calls used real backend/PostgreSQL, with no mocked success responses. QA data was isolated from the normal local database.

| Check | Evidence / outcome |
| --- | --- |
| Page identity | PASS: Products, Categories, Product detail, Business settings titles and routes match. |
| Meaningful content / framework overlay | PASS: all pages render forms/data or explicit empty/error states; no framework overlay. |
| Category creation/persistence | PASS: create category, refresh, record remains. |
| Product creation/persistence | PASS: create product with category; it starts ARCHIVED and survives refresh. |
| Variant validation | PASS: invalid min/current bounds and five fractional digits prevent save with visible messages. |
| Variant persistence/edit | PASS: create at 10.1234, refresh, edit current price to 13.4567 and cost to 14.0000; exact values retained. Below-cost warning displayed without blocking save. |
| Duplicate SKU | PASS: `qa-mug-001` conflicts with `QA-MUG-001`; clear backend error and typed form values retained. |
| Product activation/archive | PASS: activation with an active variant works; product archive confirmation retains its active variant. Reactivation works. |
| Variant archive | PASS: confirmation retains archived record; archiving last active variant also archives parent. |
| Search/status filters | PASS: ACTIVE filter hides archived product; ARCHIVED plus name search returns it. Pagination is covered by API integration tests; browser pagination buttons correctly disable for one page. |
| Business settings | PASS: name update survives refresh; currency change rejected with clear explanation while an archived variant exists. |
| Category conflicts/edit/delete | PASS: referenced-category delete confirmation yields 409 feedback. An unused category is created, edited, and deleted successfully through UI. |
| Console/network | Expected HTTP 409 console entries from deliberate duplicate-SKU, blocked-currency, and in-use-category requests. No unexpected runtime/CORS errors or warnings observed. |
| Desktop/mobile | Reviewed 1280×900 and 390×844 layouts. Forms/actions wrap, money values remain readable, and mobile document width equals viewport width (390px). |

Screenshots and CLI logs are outside Git in the session visualization directory. Some early CLI references became stale after refresh and one exact select-label locator timed out; refreshing the DOM snapshot and using the observed combobox resolved the QA automation issue. The completed flows passed without modifying application behavior to accommodate the test.

After QA, the separate frontend/backend processes were stopped and the disposable container removed. The normal app on 4200 was rechecked: product catalog empty, overview Connected/retry works, and browser console has zero errors or warnings.

## Decisions, limits, and next steps

- Existing repository layout, base package, and Angular standalone conventions are preserved; no OpenAPI dependency was added. Representative API requests/responses and all endpoints are documented in catalog.md.
- Product creation is a two-step archived-first flow. Activation requires an ACTIVE variant (stronger than merely having an archived variant). Last-active-variant archive also archives the parent. Parent archive preserves variant statuses; future operations must require both statuses ACTIVE.
- All updates require an optimistic version. Deletes accept an optional version; the UI sends it. Product locks and singleton locks protect state/currency transitions.
- Error envelopes now consistently contain code/message/timestamp/fieldErrors, replacing the original generic ProblemDetail response while preserving health successes.
- Decimal strings preserve NUMERIC(19,4); no frontend financial totals or Java double money arithmetic. Frontend validation compares scaled BigInt values.
- Currency cannot change after any variant exists; no conversion workflow or hard-delete product/variant API is provided. Categories list without pagination, while products use bounded pagination. Variant details are returned with the product.
- No browser testing across other engines was performed. No sales/history, inventory, optimization, integrations, authentication, tenancy, or demo data is implemented.

Milestone 03 can build on variant IDs and archive-safe relationships after the user's next prompt. This task stops at Milestone 02.
