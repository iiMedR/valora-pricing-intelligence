# Authentication and anonymous demo access

Milestone 08 adds one administrator for one business. Spring Security 6.5.11 is managed by Spring Boot 3.5.16; framework major versions are unchanged. Server-side sessions avoid browser-managed bearer tokens. Sessions are in memory and disappear on backend restart; there is no clustered session store, password-change screen or public account registration.

## Provision once

Start normal PostgreSQL using the README commands. In a new PowerShell terminal at the repository root:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.11'
.\scripts\admin.ps1 -Username owner
```

The script reads a password securely, passes it temporarily through the child process environment, runs the local non-web application with `--auth.action=provision`, then restores the environment. Choose at least 12 characters and at most 72 UTF-8 bytes. Account names use 3–64 lowercase letters, digits, dots, underscores or hyphens. A transaction/advisory lock and singleton database key prevent a second account. Existing accounts are never replaced. Normal startup does not provision accounts; there is no HTTP setup endpoint or generated Spring default user. Demo provisioning is refused using both profile and live database identity.

Only a salted BCrypt cost-12 hash is stored. Back up the database securely. Password recovery is currently an administrator-operated offline procedure; do not delete business data or reset the database to recover an account.

For this workstation's acceptance check, `owner` was explicitly provisioned with a random password. The temporary plaintext input was removed. The ignored `infra/admin-bootstrap.credential.local` is a Windows DPAPI-protected PowerShell credential, readable only by the same Windows user on this machine. To recover it locally for sign-in (do not paste it into chat, source, logs or a shared terminal):

```powershell
$credential = Import-Clixml .\infra\admin-bootstrap.credential.local
# Deliberately reveals the password only in your own local terminal:
$credential.GetNetworkCredential().Password
```

This file is a local QA convenience, not an application dependency or portable backup. New installations choose their own password with the provisioning script.

## Sessions, CSRF and CORS

Open normal frontend port 4200 and sign in. Business routes retain only allowlisted internal return destinations. The password field is cleared after submission and no credential or bearer token is saved to localStorage/sessionStorage.

`SP_SESSION` is HttpOnly, SameSite=Lax, with a 30-minute inactivity timeout. Successful login rotates a preexisting session ID. POST logout invalidates the server session and clears session/CSRF cookies. Set `SESSION_COOKIE_SECURE=true` for HTTPS; false is for local HTTP only. Demo uses the separate cookie name `SP_DEMO_SESSION`.

CSRF remains enabled, including login/logout. `GET /api/v1/auth/csrf` sets `XSRF-TOKEN`; unsafe requests must echo it in `X-XSRF-TOKEN`. Angular obtains a fresh token before unsafe relative `/api/` requests, handles post-login rotation, and never attaches it to external URLs. The CSRF cookie is intentionally readable by JavaScript; the session cookie is not. XOR request handling and raw-header validation follow Spring Security's SPA pattern. Unsafe operations are never automatically replayed after a 401. A business 401 clears frontend session state and opens sign-in; 403 displays an actionable API error.

The frontend proxy keeps requests same-origin. Backend credentialed CORS allows only explicit `CORS_ALLOWED_ORIGINS` (default `http://localhost:4200`; demo 4201). Wildcards are rejected. `FRONTEND_ORIGIN` controls the fixed callback outcome origin when Shopify is disabled. Bind defaults to loopback; public callback forwarding requires deliberate configuration. Security responses use generic JSON errors; response caching and referrers are restricted. Tomcat access logging is disabled so callback queries are not logged. Do not enable proxy/request-body logging of authentication or callbacks.

Login throttling is bounded in-memory: eight attempts per remote IP per 15 minutes and 30 global attempts per minute. Success clears that IP bucket. The map holds at most 4,096 IPs and refuses new entries when full. Forwarded headers are not trusted. Restart resets counters; a public deployment needs a trusted reverse-proxy/rate-limit design. Unknown account/password responses are identical.

## HTTP contract

| Endpoint | Access / response |
| --- | --- |
| GET `/api/v1/health`, `/actuator/health`, `/api/v1/environment` | Public, read-only health/environment |
| GET `/api/v1/auth/me` | Public; mode, authenticated, readOnly, username only |
| GET `/api/v1/auth/csrf` | Public; cookie plus `{"status":"READY"}` |
| POST `/api/v1/auth/login` | Normal only; CSRF + JSON username/password; 200 session view |
| POST `/api/v1/auth/logout` | Normal session logout, CSRF; 204 |
| GET `/api/v1/integrations/shopify/callback` | Public entry; independent session/state/HMAC checks, fixed 303 outcome redirect |
| Catalog, categories, business settings, sales/history, analytics, forecasting, optimization and Shopify administration | Normal ADMIN required |

All other endpoints fail closed, including Actuator info. Normal anonymous business requests return 401; authenticated authorization/CSRF failure returns 403; invalid login returns 401; throttling returns 429. Input validation returns 400. Errors contain code/message/timestamp/fieldErrors without password, token or exception details. No Basic or form-login fallback is enabled.

## Demo

The permanent synthetic demo remains anonymous and read-only at port 4201. Only existing business GET families, demo summary and disabled Shopify status are allowed. Login, account provisioning, business writes, connect and disconnect return 403. The new-order route redirects to the order list. Merchant editors are hidden or disabled with read-only explanations, including nested refund screens; backend authorization still rejects all writes. The banner and account navigation identify anonymous read-only synthetic data. There are no demo credentials usable in normal mode.

Demo startup validates the dedicated database identity before permitting anonymous access, and refuses accounts, OAuth states, a real shop or encrypted provider credentials in that database. V4 adds empty security metadata without changing the seed/reset business dataset or checksum.

See [Shopify setup](shopify-connection.md) and [verification](milestone-08-verification.md).

## Milestone 11 session UX

Revoked/expired business requests returning401 clear protected content and return to sign-in with a session-expired notice. Unsafe requests are never automatically retried. Approved internal return paths may retain only ISO startDate/endDate and 7/14/30-day horizon query parameters; callback codes, external destinations and arbitrary query keys are refused. A403 displays a permission/session notice; it does not silently retry. Editor navigation confirmation never blocks forced sign-in after session expiry. No session token is stored in browser storage.
