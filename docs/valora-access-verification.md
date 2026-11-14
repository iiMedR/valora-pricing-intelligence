# Valora entry routes and public demo access

The landing page is public at `/`; `/welcome` redirects there. The workspace overview is `/dashboard`. Existing business URLs remain protected. The previous neutral gray/blue theme has been restored, including the blue selected-navigation surface; the proposed mint application palette was removed. Original Valora brand assets remain in use.

The isolated portfolio profile now requires a real server session. The login page displays the intentionally public viewer account and offers a button to fill the form. Signing in remains an explicit action. The viewer has no administrator role and cannot edit records, save evaluations, import or connect providers. Normal installations expose no demo credentials; the original legacy demo retains anonymous read-only access. No migration, pricing model or synthetic fixture changed.

Verification on 2026-11-14:

- Frontend: 163 tests passed; production build and TypeScript checks passed.
- Backend: full Maven verify passed, including 70 integration tests with no failures or errors.
- Local Chrome: 17 route, session, read-only, checksum and responsive checks passed. Confirmed protected API 401 before sign-in, real authenticated session, HttpOnly cookie, CSRF rejection and loss of access after logout. Normal login showed no public demo credentials.
- Landing and login: axe WCAG A/AA checks found no violations at 375, 768 and 1440 pixels. Dashboard and login had no horizontal overflow at these widths. Automated checks do not replace assistive-technology testing.
- Read-only invariant verifier: portfolio remains 15 approved / 15 withheld, legacy 30 withheld. Pricing comparisons, both checksums, database record/account/audit counts, V1–V7 migration checksums, research artifacts and fresh-seed reproducibility remain unchanged.
- Separate code review checked default-deny write authorization, demo-only credential scope, CSRF/session handling and clearing protected frontend results. Normal administrator provisioning remains separate.

Browser screenshots and machine-readable QA output are stored locally under the Codex visualization directory `valora-access`; historical milestone evidence was preserved. This is local validation, not a public deployment or live provider test.
