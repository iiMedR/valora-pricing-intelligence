# Milestone 11.13 results

**RESEARCH PASS / MODEL NOT READY.** Production behavior is unchanged. New held-out failures are reported, not used to loosen safeguards. These are synthetic, truth-audited experimental populations, not estimated merchant failure rates. The existing regression sets still have0/228 known and0/380 prospective unsafe approvals; this does not establish safety against a broader generator.

## Frozen experiment and labels

Preregistered at76fa1bf before implementation, clarified at a604aed.35 families ×36 seeds =1260 cases: DEV140 (3101,3103,3109,3119), TEST700 (4101–4120), CHALLENGE420 (7101–7112). Challenge results were evaluated with the same frozen policy, without tuning. No claim is made that this partition is now untouched for future research.

Historical sample sizes5/20/50/130/180/365/700; exogenous discrete/continuous/narrow prices,14-day plateaus, calendar overlap, promotion discrepancy, smooth hidden marketing, competitor/holiday shocks, level/response shifts and repeated regimes, stockouts/gaps, missing/wrong costs, refunds, weak/strong/zero response, sparse/correlated-noisy counts, flat economics, constant prices, exponential response, costs20/60 and optimum90.1 near a constraint. All use existing DTOs and actual production model/optimizer. Scenario names/truth are not supplied through identity, price-source strings or estimator features.

SAFE_ELIGIBLE depends on independently audited allocation, stable response and correct costs/stock, adequate n/support and material oracle gain; it does not mean knowing the simulator optimum alone. UNSAFE means insufficient action justification under the audited assumptions, not necessarily an economically losing recommendation in every realization. INDETERMINATE is reported separately. Small samples, plateaus, sparse counts, AR noise, refund-objective mismatch, nonlinear and negligible-gain cases are not counted as false abstentions. Labels use external provenance that the production observation contract does not contain.

## Decision-quality matrices

Cells are approved / withheld. Precision excludes indeterminate approvals. See the [complete family/n tables](milestone-11-13-artifacts/tables.md) for every split, all denominators, error, coverage and regret; [summary.json](milestone-11-13-artifacts/summary.json) is machine readable.

|Split|Safe A/W|Unsafe A/W|Indeterminate A/W|Precision|Recall|Unsafe approval|False abstention|Overall abstention|
|---|---|---|---|---|---|---|---|---|
|DEV140|29/23|12/40|16/20|29/41|29/52|12/52|23/52|83/140|
|TEST700|146/114|65/195|80/100|146/211 (69.19%)|146/260 (56.15%)|65/260 (25%)|114/260 (43.85%)|409/700 (58.43%)|
|CHALLENGE420|89/67|41/115|48/60|89/130 (68.46%)|89/156 (57.05%)|41/156 (26.28%)|67/156 (42.95%)|242/420 (57.62%)|

TEST unsafe approvals: hidden marketing20/20, wrong recorded cost20/20, level shift20/20, competitor4/20, holiday1/20. A shifted baseline or holiday approval may still select the right price under the standardized curve: the unsafe label concerns evidence authority, not an assertion of realized loss. HOLIDAY is deliberately conservative; reclassifying that family indeterminate gives64/240 unsafe TEST approvals instead of65/260. This sensitivity does not resolve the marketing/cost failures.

The exogenous DISCRETE365 and HIDDEN_MARKETING worlds have exactly identical observable histories per seed. In one world own-price beta is−2; in the other it is−.25 with a latent correlated marketing response making observed beta−2. Each receives the same90 price, yet the causal optimal constrained direction differs. Neither response-shape checks, stability, backtests nor narrow intervals can distinguish these worlds. This is an information limitation, not a defensible one-line production repair.

## False abstentions and diagnostics

TEST discrete130/180, continuous365/700 and narrow-spread families each withhold20/20 despite externally audited material opportunities. At130 the sample/coverage/disjoint checks block; at180 disjoint halves cannot each meet130 fit rows. Continuous prices lack three exact repeated tiers. Narrow95/100/105 prices fail the15% spread requirement despite independently allocated high-information observations. These are conditional research false abstentions; superficially similar observational merchant histories are not thereby authorized for advice. Weak and zero-response estimates face sign/gate instability. Distinguish zero response from zero sales.

All returned reasons are retained, not just first status. [diagnostics.csv](milestone-11-13-artifacts/diagnostics.csv) includes eligible/unknown/censored/zero days, support/tier counts, residual variation, calendar R², df, fit RMSE, uncertainty, both backtest statuses/MAE/WAPE, cost and feasible bounds. Residual price SD is a model information diagnostic, not an independent randomized sample count. Exogenous random-assignment days are n−56 for n>=130, n for smaller histories; the fixed recent reference tail is not independent price variation. Plateaus have approximately ceil((365−56)/14) allocation epochs, not309 independent prices. No effective causal sample size is claimed for hidden/confounded worlds.

## Error, uncertainty and economics

Available coherent-target production estimates: TEST431, bias−.11991, MAE.13764, RMSE.42122; CHALLENGE259, bias−.12167, MAE.13593, RMSE.41870. Availability is selective (e.g. positive fitted coefficients may be withheld); these pooled values are descriptive mixture statistics. Structural/regime/nonlinear local derivatives are excluded from global-beta error. All strata and inclusion counts are in tables.

Production confidence intervals are unavailable in all1260 cases, not calibrated and not scored as zero coverage. Research nominal95% conditional Wald,99-replicate pairs and14-day moving-block percentile intervals are experimental proxies. TEST exogenous365 coverage: Wald19/20, pairs19/20 (Wilson95%76.39–99.11%), block17/20 (63.96–94.76%). Widths .06078/.06007/.05435. Hidden-marketing causal coverage is0/20 for all three (Wilson0–16.11%) despite the same narrow widths. n130 block18/20; n180 pairs/block18/20; n700 pairs/block19/20. Small denominators and99 bootstrap draws do not establish calibration. Resampling positive eligible rows does not reconstruct selection, latent interventions, full nuisance uncertainty or wrong costs.

No approved price violates observed/catalog/+/-10% constraints. TEST approved291: mean true reference-context contribution regret43,940.22 MAD, normalized mean2.4248%, maximum510,518.44. CHALLENGE178:43,098.22 MAD,2.3784%, maximum510,518.44. Absolute losses scale with the synthetic reference demand; they are not merchant profit forecasts. Regret excludes abstentions rather than assigning them price0; hold-price opportunity is separately reported. Standardized evaluator truth assumes a future30-day no-shock context with1000 units/day at100 (sparse .7), true costs and the declared response curve. Historical shocks/weekday patterns are not a future oracle forecast. Contribution excludes other expenses and refund-objective extensions. Correct-cost20/60 and boundary90.1 cases pass through the actual market inputs; WRONG_COST intentionally reports40 while truth is60. A narrow elasticity interval cannot validate that cost.

Research-only negative-upper-Wald policy retains TEST65 unsafe approvals while reducing safe approvals from146 to136; CHALLENGE unsafe41 remain and safe89→82. Block shadow is intentionally fail-closed outside the nine prespecified bootstrap families; it therefore rejects untested families and cannot be compared as a same-coverage estimator. It still approves every supported hidden-marketing twin. On the same nine-family population, TEST safe approvals fall51/120 to40/120 while unsafe approvals remain20/40; CHALLENGE safe31/72 to24/72 while unsafe remain12/24. No new price is introduced by either alternative. Earlier prior/pooling sensitivity tests were rerun: conditional priors are not promoted to causal evidence or calibrated intervals.

## Permanent demo

All30 abstain; checksum6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34 unchanged.30 variants,9466 orders,114 refunds,10044 observations. Overlapping reasons: calendar confounding21; disjoint check unavailable21; unreliable elasticity9; selection9; insufficient backtests9; coverage6; stock coverage6; unsupported forecast6; inactive3; missing/stale price3; cost3; insufficient demand3; unavailable support3; fresh stock3; mixed recent reference3. Counts overlap and do not total30. Fixing a field does not guarantee a recommendation. Full GET-only evidence is in permanent-demo.json. No permanent fixture was made eligible.

## Reproduction and limitations

From root, JDK21:

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-21.0.11'
cd backend
./mvnw.cmd verify
cd ..
node research/pricing/evidence-quality-summary.mjs
node research/pricing/evidence-quality-tables.mjs
node research/pricing/verify-evidence-demo.mjs http://localhost:8081
npm.cmd test --prefix frontend -- --watch=false
npm.cmd run build --prefix frontend
```

Focused rerun from backend: ./mvnw.cmd -Dtest=EvidenceQualityBenchmarkTest test. To reproduce the byte check, copy target/evidence-quality/cases.csv to repro-cases.csv and diagnostics.csv to repro-diagnostics.csv in that directory, rerun the same test, then run node research/pricing/evidence-quality-manifest.mjs from root. Database verification: node research/pricing/verify-evidence-integrity.mjs (existing named local containers required). Default files are under backend/target/evidence-quality; production data is never written. Check fixture/source hashes in manifest.json. Complete Day hashes cover all observation fields; intentionally paired worlds share hashes. The reference-tail implementation correction for n5/20/50 was documented and regenerated; no thresholds or eligibility definitions were optimized on results.

No new live datasets, causal trials, Shopify/billing validation or independent participants. Developer browser rehearsal at375 and1440px checked existing commerce guidance/evidence reachability and assumptions; it cannot establish comprehension or a full accessibility audit. SaaS remains deterministic guidance/accounting only. No production model, UI, endpoint, migration or security changes. **Milestone12 is not started; model-shipping go/no-go is NO-GO.**
