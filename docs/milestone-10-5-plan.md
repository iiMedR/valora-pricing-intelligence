# Milestone 10.5 implementation plan

Baseline: clean codex/milestone-01 at 1b72f35. No permanent demo or V1–V5 changes.

1. Audit existing observation selection, calendar-log-ols-v1, availability baseline, optimizer gates and schema. Record original demo checksum before changes.
2. Add deterministic reorthogonalized QR controlled association: six weekday indicators, two annual harmonics and centered trend. Preserve legacy calendar-risk gates; add residual-price variation/rank diagnostics. Promotions lack authoritative labels, so preserve discrepancy exclusion and disclose unavailable promotion control. Uncertainty remains explicitly unavailable rather than inventing calibrated intervals.
3. Add independent versioned fixed-seed fixtures, with predeclared tolerances: 365 days, log noise SD .03, absolute error <= .12 for independently varying prices across high/low/seasonal cases over five seeds. Confounded, promotion-discrepant, censored, sparse/constant and no-demand cases must abstain. Keep optimizer oracle and PostgreSQL actionable fixture.
4. Persist explicit authenticated evaluations in append-only V6 metadata, with input/config fingerprint, full sanitized result and bounded history. GET never writes; demo POST forbidden. No realized-outcome claim. Enforce deduplication and database immutability.
5. Extend diagnostic DTO/UI minimally with model version, identification and uncertainty. Run unit/integration/frontend/build/browser validation, migration and retained-data checks. Record old/new benchmarks, scientific limitations and exact test results before local conventional commits. Stop at 10.5.
