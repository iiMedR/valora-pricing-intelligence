# Portfolio interview notes

## A one-minute explanation

SmartPricing is a Java21/Spring Boot, Angular and PostgreSQL portfolio project. I built a catalog and immutable financial history, then used that data for analytics, explicit financial scenarios and guarded experimental pricing insights. I deliberately keep approved synthetic failures visible: a good statistical fit is not proof that changing a price will improve profit. No automatic price updates are implemented.

## Walkthrough to demonstrate

Use the [five-minute portfolio guide](demo/README.md). Show an elastic product's current/scenario contribution, then its experimental price comparison. Open Hidden marketing to show why approval can be wrong. Finally open Missing costs: unavailable information is not silently replaced with zero. SaaS guidance is a separate installation and preserves monthly versus yearly units.

## Design decisions I can defend

- Modular monolith: one deployment is practical for one business, while packages retain clear catalog, finance, modeling and connector boundaries. Multi-tenant isolation and microservices would require separately justified architecture.
- Immutable orders/refunds, effective price/cost periods and source fingerprints preserve accounting provenance. Exact replay is safe; a changed replay is a conflict. Database constraints and transactions back application validation.
- BigDecimal arithmetic and explicit currency/period units avoid binary floating-point money errors. Contribution excludes unknown overhead; financial what-if volumes are user assumptions, not model predictions.
- Server-side administrator sessions, BCrypt, CSRF, session rotation, explicit origins, read-only demo roles and encrypted purpose-bound OAuth tokens provide layered boundaries. Frontend guards are navigation aids, never authorization.
- Angular lazy routes, reusable comparison/guidance components and typed DTOs balance readability with bundle size. Measured category reuse reduced redundant requests in11.15;12 claims no further speedup.
- Deterministic seed exports and fresh PostgreSQL integration tests protect reproducibility. Mock provider tests do not establish live Shopify compatibility.

## What I must not overclaim

**MODEL NOT CAUSALLY VALIDATED.** Original optimum80 and independent constrained optimum90 fixtures test controlled mathematical cases. Narrow safety regressions0/228 and0/380 do not establish universal safety. Broader11.13 evidence still has unsafe TEST65/260 and CHALLENGE41/156 and hidden causal interval coverage0/20. The portfolio's15 approved/15 withheld are engine statuses, not correctness labels. Hidden marketing and incorrect costs intentionally expose failure modes.

This is one-business engineering, not production SaaS operations, validated revenue improvement, autonomous pricing, calibrated causal intervals or a real merchant usability study. Live Shopify, live billing, unsupported operating systems and fresh vulnerability advisories remain unverified. Login/logout and responsive QA were developer rehearsals.

## Likely questions

|Question|Answer direction|
|---|---|
|Why JPA and JDBC?|Entity lifecycle for catalog; explicit prepared SQL for financial/history aggregation. Tradeoff: two persistence styles need coherent transaction and integration tests.|
|What happens with missing costs or stockouts?|Keep unknown values/coverage visible; do not invent full profit or lost demand. Gates may withhold suggestions; adding data does not guarantee eligibility.|
|What is the difference between the calculator and model?|Calculator applies stated assumptions to financial arithmetic. Model estimates conditional historical price response, which may be confounded and wrong.|
|How do imports recover?|Bounded page transactions, persisted checkpoints, source identities and immutable replay/conflict handling; tests inject failures and retries.|
|How would you improve it next?|Owner chooses license/publication, add Docker-backed CI and current advisory scanning, obtain independent usability feedback and separately scope live provider verification. Causal validity needs stronger identification, not relaxed thresholds.|
|What did final verification change?|Documentation and a backward-compatible evidence output path; no data/model changes or unnecessary refactor. Full local verification and known limits are recorded.|

Use [final verification](milestone-12-verification.md) for exact current counts, not remembered numbers. Explain the parts you understand personally; source history and tests support the implementation claims. No public repository/license or hosted deployment was created by this milestone.
