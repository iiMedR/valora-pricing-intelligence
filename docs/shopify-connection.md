# Shopify connection lifecycle (Milestone 08)

This milestone authorizes one store and stores encrypted credentials. It does not synchronize products, variants, orders, refunds, inventory or costs; no webhooks, refresh scheduler or price writes run. Connection status is independent of data readiness. **Real Shopify OAuth has not been tested:** credentials and a public HTTPS callback were unavailable. Provider transport and lifecycle are mock-tested, with real PostgreSQL persistence.

## Verified provider contract

The adapter uses Shopify's [standalone app authorization-code flow](https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps), rather than embedded-app managed installation/token exchange. An app created through Shopify's developer tooling, including an eligible custom-distribution app, must have matching distribution/install settings and the registered redirect URL. Legacy admin-created custom apps and owner-app client-credentials grants have different setup/token acquisition paths and are not implemented; there is no paste-an-admin-token shortcut. Distribution, installation permissions and protected-data approvals still need validation with the actual app.

The authorization URL is fixed to `https://{canonical-shop}/admin/oauth/authorize`. The server supplies client ID, exact callback, requested scopes and an unpredictable state. Code exchange is an HTTPS form POST to the same shop's `/admin/oauth/access_token`, with `expiring=1`. Both access and refresh tokens are required and encrypted; actual returned expiry intervals are persisted. See [access tokens](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens) and [expiring offline tokens](https://shopify.dev/docs/apps/build/security/credentials-and-data/use-expiring-offline-access-tokens). Expired access is displayed as reauthorization required. Automatic refresh is deferred to Milestone 09; disconnect and authorize again for now.

Requested [read-only scopes](https://shopify.dev/docs/api/usage/access-scopes) are exactly `read_products`, `read_orders`, `read_inventory`, `read_locations`. Products includes variants; order access supplies order/refund financial history. Standard order access is limited to the recent 60-day window; older orders need separately approved `read_all_orders`, which this implementation does not request. Required app/data approvals still apply. [InventoryItem costs](https://shopify.dev/docs/api/admin-graphql/latest/objects/InventoryItem) require appropriate inventory access and may depend on staff permission to view product costs. Unavailable costs must remain unknown in future sync. Unexpected missing or broader granted scopes fail authorization and trigger best-effort revoke rather than quietly expanding access.

## Local HTTPS setup

Ordinary normal/demo startup works with `SHOPIFY_ENABLED=false`, without secrets. For a real test, arrange an HTTPS forwarding origin serving both Angular and `/api` to this normal installation. Do not expose demo or provision hosting for this milestone. A secure local tunnel or existing trusted reverse proxy can provide the origin; configure forwarding yourself and keep callback/body/access logs disabled.

Register exactly `https://YOUR-PUBLIC-HOST/api/v1/integrations/shopify/callback` as an allowed redirect URL in the app configuration. Use that same HTTPS origin to open SmartPricing and sign in **before** connecting. A localhost cookie does not transfer to a public hostname. SameSite=Lax allows the top-level GET return from Shopify, while HTTPS cookies must be Secure.

Set these environment variables in the normal backend terminal, using real values only in your private environment/secret manager:

```powershell
$env:SHOPIFY_ENABLED = 'true'
$env:SHOPIFY_CLIENT_ID = '<app-client-id>'
$env:SHOPIFY_CLIENT_SECRET = '<private-client-secret>'
$env:SHOPIFY_ENCRYPTION_KEY = '<base64-32-random-bytes>'
$env:SHOPIFY_PUBLIC_BASE_URL = 'https://YOUR-PUBLIC-HOST'
$env:FRONTEND_ORIGIN = 'https://YOUR-PUBLIC-HOST'
$env:CORS_ALLOWED_ORIGINS = 'https://YOUR-PUBLIC-HOST'
$env:SESSION_COOKIE_SECURE = 'true'
# Restart the normal backend with the README command.
```

`SHOPIFY_PUBLIC_BASE_URL` must be an HTTPS origin, without userinfo, query or path. The callback path is fixed by code. Loopback binding is the default; forward locally or configure `SERVER_ADDRESS` deliberately. `infra/.env.example` contains placeholders; Spring does not automatically load that file, so export values explicitly. Never put app secrets in Angular configuration. Enabled normal integration fails startup before serving HTTP if client credentials, valid key, HTTPS origin or Secure cookies are missing. Disabled integration reports CONFIGURATION_REQUIRED instead of inventing a connection. Demo always disables real connections even if provider settings are accidentally present.

Generate a key privately in PowerShell, for example:

```powershell
$env:SHOPIFY_ENCRYPTION_KEY = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Back up that key separately and securely before restarting. AES-256-GCM uses a fresh 12-byte IV, a 128-bit authentication tag, and shop/token-kind authenticated context. The `v1:` Base64 envelope contains ciphertext, IV and tag; Base64 is encoding, not encryption. Refresh tokens are encrypted too. There is no automatic key rotation/re-encryption or key-ID ring. Keep the old key until an offline controlled migration or disconnect/reconnect is completed. Lost/wrong keys prevent token use, but local disconnect still clears ciphertext and warns that manual Shopify uninstall may be required. Do not log or commit the key.

## Lifecycle and safety

Only a bare canonical `*.myshopify.com` shop is accepted; URLs, paths, ports, IPs and nested subdomains are rejected. The provider adapter follows no redirects, uses fixed HTTPS endpoints, bounded response size, five-second connect and ten-second request timeouts. GraphQL is pinned to API 2026-10 for own-app uninstall only.

Connect requires an authenticated session and CSRF. A random 32-byte state and separate session binding are stored only as SHA-256 hashes in PostgreSQL, bound to the single account/business/shop and a lifecycle generation. One pending attempt is permitted; a new attempt invalidates the previous one. State expires after ten minutes. Connected installations require an explicit disconnect before replacement.

The public callback still requires the initiating authenticated session. It rejects duplicate/oversized/control-bearing parameters, mismatched shop/session/generation, expired/consumed state, stale timestamps (five minutes) and invalid HMAC. Following Shopify's standalone guide, decoded single-valued parameters excluding `hmac` are sorted by key, joined as `key=value` with `&`, and authenticated with SHA-256 HMAC using constant-time comparison. Valid state is consumed before exchange/denial handling. External failures are caught so consumed state commits; replay cannot exchange again. The connection row lock serializes callback/reconnect/disconnect across bounded network operations. A database commit failure can require a new authorization attempt; this is not a distributed transaction with Shopify.

OAuth responses redirect only to the configured origin and allowlisted `connected`, `failed` or `denied` outcome; raw code/state/HMAC never reach Angular. The outcome page does not trust the query as proof of connection and links to server-verified status. Callback queries and tokens must never be recorded by proxy/access/request logging. Only safe error codes are persisted.

Disconnect asks the provider to [uninstall this app](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appUninstall), which revokes the installation and should be treated as deliberate. It always clears local encrypted access/refresh credentials and invalidates pending states even if decrypt/revoke fails. A failed remote attempt yields REMOTE_REVOCATION_UNCONFIRMED and instructions to remove the app in Shopify admin. Existing catalog/history is retained. The UI requires explicit confirmation.

## API and UX

| Route under `/api/v1/integrations/shopify` | Contract |
| --- | --- |
| GET `/status` | Normal ADMIN; demo anonymous disabled view. Safe status, configured, shop, scopes, timestamps, lastError, synchronization; no secrets/state/codes |
| POST `/connect` | ADMIN + CSRF, JSON `{"shop":"your-store.myshopify.com"}`; 200 `{authorizationUrl}` |
| GET `/callback` | Independently validated public entry; 303 to fixed frontend outcome |
| POST `/disconnect` | ADMIN + CSRF; 200 safe status after local cleanup |

Malformed domain is 400; missing config or active-connection replacement is 409; unauthorized is 401; CSRF or demo writes are 403. Status labels include DISCONNECTED, PENDING, CONNECTED, FAILED, CONFIGURATION_REQUIRED, AUTHORIZATION_EXPIRED, REAUTHORIZATION_REQUIRED and DEMO_DISABLED. Connected status explicitly says “Not yet synchronized — available in Milestone 09”. Failed/expired/session-lost callbacks offer sign-in and retry, without showing provider details.

Use unit/HTTP/PG tests without real provider credentials: `cd backend; .\mvnw.cmd verify` (run commands separately in PowerShell). Frontend tests exercise status, failure, confirmation and safe redirects. The UI does not fabricate a production connection for demos or tests. Before Milestone 09, validate an actual test-app installation/expiry/uninstall round trip on HTTPS, resolve required data approvals, and implement rotating refresh-token handling before any sync calls.
