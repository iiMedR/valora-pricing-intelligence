# Milestone 11.13 verification

Date2026-11-14. **RESEARCH PASS / MODEL NOT READY.** Local branch codex/milestone-01; baseline eed55667a232bcfa2b15df4e8088a25bb509d70d. Audit/methodology committed before benchmark implementation at76fa1bf, matrix clarification a604aed, implementation/artifacts3a2b630. This report is the final local documentation commit; exact final hash is reported in the handoff. No push/deployment, provider action, automatic price application or Milestone12 work.

## Commands and observed outcomes

|Command / check|Actual outcome|
|---|---|
|JDK21.0.11 backend ./mvnw.cmd -Dtest=ContributionOptimizerTest,OptimizationGateTest,IdentificationBenchmarkTest,LowDataBenchmarkTest,DecisionSupportResearchTest,OptimizerSafetyRegressionTest,GuidanceCalculatorTest test|Baseline41 tests passed; zero failures/errors/skips.|
|JDK21.0.11 backend ./mvnw.cmd verify|BUILD SUCCESS,8:01;122 unit tests +66 PostgreSQL/Testcontainers integration tests; zero failures/errors/skips. Includes explicit save/security/CSRF, migrations, isolation, demo, commerce/SaaS guidance and accounting.|
|backend ./mvnw.cmd -Dtest=EvidenceQualityBenchmarkTest test|Final fixture-tail/hash/diagnostic refinements rerun:2 tests pass; repeated final runs42.499s and36.572s. These test-only refinements followed the full verification; other runtime/test classes unchanged. Final two exports byte-identical.|
|npm.cmd test --prefix frontend -- --watch=false|145 tests,35 files passed; no skipped/failing tests. Existing jsdom canvas getContext warning remains informational.|
|npm.cmd run build --prefix frontend|Passed; initial451.51kB, estimated transfer115.60kB.|
|node research/pricing/evidence-quality-summary.mjs|1260 cases; asserts complete unique keys, all paired-world hashes/labels/prices and old unsafe0/228 plus0/380.|
|node research/pricing/evidence-quality-tables.mjs|Generated every split/family/n confusion, error, coverage/CI/width and regret table plus matched shadow-policy comparison.|
|node research/pricing/evidence-quality-manifest.mjs|Cases SHA2568f44c4bc5cd759862799c743a2e3f926bddf703a9f6e39c3d13858bcfd0bc010; diagnostics d5b42f1b879bf6a1a74ee2acb4c872a2f190ea514177b86dd718a3faac3ab2be. Both repeated byte-identical. Source hashes normalize CRLF to LF for checkout portability.|
|node research/pricing/verify-evidence-demo.mjs http://localhost:8081|GET-only, all30 withheld with null suggested price/comparison and empty sensitivity; default guidance has no assumed scenario. Original checksum unchanged before/after.|
|node research/pricing/verify-evidence-integrity.mjs|Read-only SQL, normal/demo counts and V1–V7 identical to baseline.|
|node --check on summary/tables/demo/integrity scripts|Passed; manifest script also executed successfully.|
|git diff --cached --check|Passed before implementation commit; final report checked before its commit.|

The mathematical oracle80 and independently actionable constrained90 controls pass in the full backend suite. Existing11.11/11.12 research tests reran; prior/pooling comparators remain research-only. The old known/prospective unsafe controls were reconciled from freshly generated target/pricing-research/optimizer-safety.csv, not inferred from stale docs. Historical milestone artifacts were not overwritten.

## Findings and scope

TEST: safe146 approved/114 withheld; unsafe65/195; indeterminate80/100. CHALLENGE: safe89/67; unsafe41/115; indeterminate48/60. Precision/recall exclude indeterminate and include explicit denominators in results/tables. Hidden marketing and wrong trusted cost remain prominent failures; conditional intervals cannot establish missing causal/cost provenance. All production confidence intervals unavailable. No calibrated uncertainty claim.

No production Java, Angular, endpoint, DTO, model configuration, migration, authentication, CSRF, mode isolation, seeder or actual ledger changed. No threshold reduction. Research uses existing actual production services from test scope; test truth/labels stay outside observable inputs. All new model alternatives are stricter research-only shadows. SaaS remains deterministic arithmetic/accounting, not fitted commerce elasticity. Any future tuned policy requires new held-out seeds: these partitions are now seen.

The original demo remains checksum6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34;30 variants,9466 orders,114 refunds,10044 observations,0 recommendations. Reasons overlap: calendar21, disjoint unchecked21, elasticity/selection/backtests9 each, coverage/stock/forecast6 each and additional3-case input/support/inactive/reference groups; see permanent-demo.json.

Normal retained products0/orders0/refunds0/accounts1/evaluations0/subscriptionEvents0. Demo retained30/9466/114/0/0/0 respectively. Both V1–V7 checksums:1436242292,581270318,-1414359703,56597636,147175724,-1432513541,-319300667. Separate5433/5434 containers were inspected without SQL mutations. Existing main services were not restarted/deployed. Temporary QA proxy was stopped after verifying its PID/command line; developer browser closed.

## Usability and tools

No AGENTS.md found; available skills inspected. No installed Java/statistical research skill; existing Maven/JUnit/Node/Angular tools used, no new dependencies. Installed Playwright skill used with cached CLI/Chrome because Browser plugin unavailable. Existing demo4201 was stopped; temporary4204 built-frontend proxy to8081 used. Commerce evidence/product guidance rehearsed at375×812 and1440×960; explicit assumed units and zero-extras consent produced unsaved calculated scenarios. No full accessibility or merchant comprehension certification. Companion protocol and blank sheet prepared for actual store owners/founders; independent participant validation NOT VERIFIED. No fabricated timings, identities or quotes. SaaS/live billing and LIVE_SHOPIFY_NOT_VERIFIED remain unverified; no live experiment or provider credential required.

## Exact milestone file manifest

Research audit/protocol/reports:
- docs/pricing-research/milestone-11-13-baseline-audit.md
- docs/pricing-research/milestone-11-13-methodology.md
- docs/pricing-research/milestone-11-13-results.md
- docs/pricing-research/milestone-11-13-next-steps.md
- docs/milestone-11-13-verification.md
- docs/ux/milestone-11-13-evidence-usability.md

Test-only source:
- backend/src/test/java/com/smartpricing/research/EvidenceQualityFixtures.java
- backend/src/test/java/com/smartpricing/research/EvidenceQualityIntervals.java
- backend/src/test/java/com/smartpricing/research/EvidenceQualityBenchmarkTest.java

Scripts:
- research/pricing/evidence-quality-summary.mjs
- research/pricing/evidence-quality-tables.mjs
- research/pricing/evidence-quality-manifest.mjs
- research/pricing/verify-evidence-demo.mjs
- research/pricing/verify-evidence-integrity.mjs

Artifacts under docs/pricing-research/milestone-11-13-artifacts/:
- cases.csv
- diagnostics.csv
- summary.json
- tables.md
- manifest.json
- permanent-demo.json
- database-integrity.json
- browser-rehearsal.md

Baseline audit lists inspected production/research/UI sources. Verification logs are local ignored milestone1113-*.log; raw CLI snapshots retained in the writable visualization directory, not included as participant evidence. No PII, credentials or secrets exported. The source manifest plus fixed seeds and exact reproducibility commands in results.md identify the experiment. Repeat checks require saving the first final CSVs as repro-cases.csv/repro-diagnostics.csv in backend/target/evidence-quality before rerunning the focused test; clean-checkout full verify creates the initial outputs.

Final acceptance: local commits only; working tree checked clean after this report commit. **NO-GO for a model-validation/autonomous-pricing launch.** Prioritized external provenance, cost verification, continuous-price and effective-information research, then real usability study are in next-steps. Stop after11.13; await review before12.
