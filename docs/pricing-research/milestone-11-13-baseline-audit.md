# Milestone 11.13 baseline audit

Audit date: 2026-11-14. Baseline: eed55667a232bcfa2b15df4e8088a25bb509d70d, clean codex/milestone-01. No AGENTS.md found. Available skills were inspected; none provides Java/statistical benchmarking. Standard existing JUnit, Maven, Angular and Node tooling suffices; no dependencies installed.

Inspected: DemandModel, ControlledElasticity, ForecastSettings, OptimizationService, OptimizationSettings, ResponseDiagnostics, ContributionOptimizer, EvaluationAudit, ResearchFixtures, ResearchEstimators, LowDataBenchmarkTest, DecisionSupportResearchTest, OptimizerSafetyRegressionTest, pricing-evidence.html, milestone-11-12-optimizer-safety.md and the 11.10 usability script.

Production uses log-sales QR with weekday, annual harmonic and trend controls. Identification is observational. Point estimates have no calibrated interval. The response-adequacy gate requires replicated exact prices and supported disjoint half fits; these are engineering checks, not causal identification. Backtests assess observed sales, not counterfactual price effects. First status hides overlapping reasons unless the reasons array is inspected. Costs, fresh stock, price support and coverage are separate constraints. Contribution excludes other business expenses. Guidance is separate assumption-based arithmetic, not a fitted response model. SaaS evidence does not establish commerce elasticity.

Existing synthetic safe-case labels are not formal false-abstention truth. The new audit will distinguish independently audited opportunities from known curves without adequate identification. Smooth hidden confounding can be observationally indistinguishable from an exogenous price response; passing regression checks cannot prove causality.

Baseline command: backend/mvnw.cmd -Dtest=ContributionOptimizerTest,OptimizationGateTest,IdentificationBenchmarkTest,LowDataBenchmarkTest,DecisionSupportResearchTest,OptimizerSafetyRegressionTest,GuidanceCalculatorTest test (JAVA_HOME JDK21). Result: 41 tests, zero failures/errors/skips. Frontend: npm.cmd test --prefix frontend -- --watch=false: 145 tests /35 files passed. Existing unsafe counts remain subject to independent artifact reconciliation in final verification.

Preservation contract: no production/model/schema/UI changes planned; immutable original demo checksum 6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34 and all30 abstentions, V1–V7, normal/demo isolation, authenticated explicit CSRF-protected saves and guidance accounting. No provider writes, price application, deployment or push.
