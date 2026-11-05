# Milestone 08 verification

Implemented only authentication, authorization and Shopify connection lifecycle. No Shopify synchronization, webhooks, refresh scheduling, price writes, tenancy or pricing-model changes were made. Real provider OAuth is **mock-tested only**; no live app credentials or public HTTPS callback were supplied.

## Starting point and changed files

Started with a clean `codex/milestone-01` at `e55c44b`. Existing user data and V1–V3 were preserved. Java 21.0.11, Boot 3.5.16, Angular 22.2.6 and PostgreSQL 17.7 remain unchanged. Added Boot-managed `spring-boot-starter-security` and test-scoped `spring-security-test`, resolved to Security 6.5.11; no frontend dependencies or lockfile changes.

- `backend/src/main/java/com/smartpricing/auth/`: `AccountService`, `AdminProvisioner`, `AuthController`, `AuthFoundation`, `LoginLimiter`, `SecurityConfiguration` implement the single ADMIN and session/CSRF boundary.
- `backend/src/main/java/com/smartpricing/shopify/`: `ShopifySettings`, `ShopifyConfiguration`, `ShopifyRules`, `TokenCipher`, `ShopifyProvider`, `HttpShopifyProvider`, `ShopifyRepository`, `ShopifyService`, `ShopifyController` implement validated OAuth and encrypted lifecycle persistence.
- `backend/src/main/resources/db/migration/V4__accounts_and_shopify_connection.sql`: singleton account/connection, foreign keys, encrypted access/refresh fields, expiry and one-pending-state index. V1–V3 untouched.
- `backend/pom.xml`, `SmartPricingApplication.java`, `config/WebConfiguration.java`, `application.yml`, `application-demo.yml`: dependencies, explicit CLI exit, default-user suppression, credentialed explicit CORS, cookies and provider configuration.
- `scripts/admin.ps1`, `infra/.env.example`: secure explicit provisioning and placeholder-only configuration. Existing ignore rules cover all populated local inputs and encrypted QA credential.
- `backend/src/test/java/com/smartpricing/auth/`: `AuthRulesTest`, `SecurityFlowIT`, `SecurityHttpIT`, `SecurityMigrationIT`, `TestHttp`; `shopify/ShopifyRulesTest`, `shopify/HttpProviderTest`, `demo/DemoReadOnlyIT` add security/provider coverage. Existing catalog/analytics/history/forecast/optimization API tests now authenticate through real HTTP/CSRF. `HealthControllerTest` retains public health/CORS verification; `DemoNormalSafetyIT` expects V4; `HistoryMigrationIT` explicitly targets V3 for its historical upgrade assertion.
- `frontend/src/app/core/`: `session.service.ts`, `auth-integration.ts`, `session-nav.ts`, `auth-integration.spec.ts`; `features/auth/login.ts` and its spec; `features/store-connection/` API/status/callback components and specs. App config/routes/template/component/spec integrate guards, navigation and XSRF handling. Environment banner adds read-only mode; home planned scope now names synchronization.
- README, development/architecture guides, `authentication.md`, `shopify-connection.md`, and this report describe current contracts and limitations. Historical milestone reports remain historical.

## Verification results

Backend final full `.\mvnw.cmd verify` passed **73 unit tests and 33 PostgreSQL integration tests**, with zero failures, errors or skips. BUILD SUCCESS at 2026-11-12 17:12:19 UTC; duration 8 minutes 53 seconds. The initial full run passed all unit tests and 32/33 integration tests; its only failure was the historical V2-to-V3 test counting both V3 and newly added V4. Explicitly targeting V3 preserves its original purpose, and the full rerun passed. Dedicated V3-to-V4 coverage independently verifies retained metadata and prior migration checksums.

Frontend: `npm.cmd test -- --watch=false` passed **56 tests in 20 files**, zero failures, on 2026-11-12. `npm.cmd run build` passed after the last source change. No new dependencies or budget warnings. Full backend command is `.\mvnw.cmd verify` in `backend`, with Java 21 and Docker available; builds were sequential.

Security coverage includes BCrypt salt/cost, provisioning refusal/repeat safety, normal 401 versus authorization/CSRF 403, default denial, rate limits, session ID rotation/logout invalidation, actual HTTP cookie/CSRF behavior, domain/URL rejection, HMAC/signature/stale timestamp rejection, one-use/session-bound/expired state, denial/exchange-failure consumption, encrypted token persistence/tamper/AAD/key errors, disconnect despite remote failure, and demo read-only/provider isolation. Provider mock tests inspect canonical HTTPS endpoints, expiring-token form, actual expiry parsing, safe exception redaction and uninstall transport. The HMAC unit vector is RFC 4231; callback fixtures also sign the documented canonical parameter string independently of HTTP transport. No live Shopify result is inferred from these tests.

Browser verification used installed Chrome via standalone Playwright, because no Browser plugin was available and the CLI sandbox cannot read process environment variables. Credentials were read from a Windows DPAPI-protected file into process memory/environment; they never entered the QA source, tool output or screenshots. Temporary browser contexts were closed after checks. Desktop 1440×1000 and mobile 390×844 screenshots were inspected for sign-in and connection layout; no horizontal page overflow.

Normal browser checks passed: protected products redirects to safe sign-in destination; direct anonymous products API returns 401; actual CSRF-backed login works; products, categories, settings, orders, analytics, forecasting, optimization and store status load; malformed shop input cannot connect; configuration-required status is honest; HttpOnly/SameSite=Lax session cookie is present; localStorage/sessionStorage remain empty; callback without valid authorization reaches safe failure screen; loss of cookies returns to sign-in; retry login works; logout removes business API access. Session-loss testing clears cookies rather than waiting 30 minutes; server timeout is configured, and real HTTP integration tests prove logout invalidation.

Demo browser checks passed: products, orders, analytics, forecasting, optimization and store connection load anonymously; session lookup identifies DEMO/readOnly/authenticated=false; Shopify is disabled; connect write returns 403; new-order route redirects to order list; desktop/mobile render without overflow. No runtime `pageerror` events occurred in either context. Additional authenticated browser checks confirmed server-side malformed shop rejection (400), valid domain with missing configuration (409), removal of extra code/state query fields from the callback outcome URL, and successful status retry after a deliberately aborted status request. Console monitoring found no unexpected errors; deliberate negative HTTP/aborted-network checks were excluded.

Live health: normal and demo Actuator report UP. Trusted-origin preflight returns 200; untrusted origin returns 403. Normal and demo Flyway histories both show successful versions 1,2,3,4. Normal business rows remain products=0/orders=0, matching the pre-milestone baseline. Explicit browser QA provisioning adds exactly one normal `owner` account with a BCrypt hash; there are no real Shopify credentials. Demo remains products=30/orders=9,466, accounts=0, OAuth states=0, with no shop/access/refresh credential in its disconnected singleton.

The permanent demo current checksum is `6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34`, identical to the original, with `matchesSeed=true`. The actual read-only summary endpoint calculates the current checksum. No permanent demo reseed/reset or normal business reset was performed. Optimization models/gates were untouched, preserving all 30 variants' abstention behavior. Integration tests use independent disposable databases.

Application/provisioning/test logs were checked without printing secret values: the actual local QA password is absent, and no generated Spring default password was logged. Access logging is disabled and provider failures discard raw exception bodies. Secret-bearing DTOs redact `toString`; API status omits credentials/state. The temporary plaintext bootstrap file was removed; its remaining Windows-protected credential file is ignored by Git. No live Shopify secret/key/token exists to scan in this environment. Request bodies/cookies are never printed by the QA scripts.

## Startup and endpoint inventory

Normal, from repository root, separate terminals:

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

Provision a new installation once with `.\scripts\admin.ps1 -Username owner` before sign-in. This workstation already has its explicit QA owner account; [authentication.md](authentication.md) explains the ignored protected local credential. Never rerun setup expecting to replace it.

Existing demo startup, separate terminals:

```powershell
.\scripts\demo.ps1 serve
```

```powershell
cd frontend
npm.cmd run start:demo
```

The existing demo is initialized; do not reset or reseed it. Fresh installations may follow README's explicit `demo.ps1 init` procedure. Normal ports are PostgreSQL5433/backend8080/frontend4200; isolated demo ports are 5434/8081/4201. Ordinary startup does not seed or provision. Shopify stays disabled without config; optional real setup is fully described in [shopify-connection.md](shopify-connection.md), using placeholders and no hardcoded tunnel.

Auth: GET `/api/v1/auth/me`, GET `/api/v1/auth/csrf`, POST `/api/v1/auth/login`, POST `/api/v1/auth/logout`. Provider: GET `/api/v1/integrations/shopify/status`, POST `/connect`, GET `/callback`, POST `/disconnect` under that same integration prefix. There is no HTTP setup endpoint. Authentication lookup/CSRF/health/environment and independently verified callback are public. Normal business API families require ADMIN; demo permits only enumerated GETs. Login is 200, logout 204, provider mutations 200, callback 303; input/auth/permission/conflict/throttle failures use 400/401/403/409/429 as documented in the contract guides. Unknown routes fail closed.

## Security checklist and remaining work

- Session: server-side, HttpOnly, ID rotation, 30-minute idle expiry, logout invalidation; Secure required for enabled real OAuth. CSRF applies to every unsafe route, with explicit credentialed CORS and no wildcard.
- Password: one explicit account, salted BCrypt12; no public/default setup. Bounded IP/global throttling, generic failures. In-memory sessions/throttle are suitable for this local single-instance milestone, not a distributed production deployment.
- OAuth: strict canonical domain, fixed HTTPS destinations/callback, random expiring one-use hashed state and session binding, HMAC/constant-time checks, scope verification, sanitized failure redirects and safe status.
- Tokens: separate external AES-256-GCM key; access and refresh encrypted with distinct context. No credentials in API/browser storage; key loss/rotation and manual uninstall limitations documented.
- Disconnect: deliberate confirmation, best-effort remote own-app uninstall, unconditional local credential/state cleanup, existing data retained. No sync or price write path introduced.
- Real OAuth remains unverified, blocked on actual test-app credentials, provider configuration/data approvals and public HTTPS callback. Do not call this a successful store connection. Refresh-token rotation, actual data import and provider installation testing are prerequisites for future Milestone 09 work, which has not begun.

Local commits on `codex/milestone-01`: `fb4132e` (sessions/V4/Shopify lifecycle), `434033e` (security and migration tests), `85dfe37` (frontend workflow), followed by the documentation commit containing this report. The final report names that last hash. Nothing is pushed and no history or identity is rewritten. Milestone 09 has not begun.
