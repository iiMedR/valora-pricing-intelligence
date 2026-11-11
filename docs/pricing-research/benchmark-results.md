# Benchmark results — Milestone 11.11

## Verdict and scope

Research completed with negative findings. No comparator is validated for new production price recommendations. These are deliberately balanced synthetic stress cases, not merchant-population performance estimates. Production source, thresholds and permanent demo are unchanged. Acceptance of this research does not validate production causal claims.

The preregistered protocol was committed in `4ef67be` before comparator implementation. DEV seeds 11/17/23; held-out TEST 1001–1012. Twenty-nine scenarios × fifteen seeds = 435 fixture cases; 1,770 comparator rows (1,416 held out). There are406 unique observation hashes: the15 empty cases share the same empty-observation calendar, and comparable-pooling targets intentionally reuse the15 N20_FIVE histories as paired controls. Within a seed, scenarios share random streams; only seed replicates are independent, so no aggregate standard error treats all rows as independent. No seed selection or tuning after seeing results. Three priors are sensitivity analyses, not a tournament winner. The full scenario output, including failures, is retained.

## A, D and E: held-out estimates

| Method | Estimates / cases | Bias | MAE | Error SD | Absolute-error p90 / max | Target in interval | Mean interval width | Policy actions |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A_PRODUCTION | 156/348 | -0.132 | 0.280 | 0.544 | 1.222 / 1.492 | UNCERTAINTY_UNAVAILABLE | — | 25 |
| D_WEAK | 348/348 | 0.112 | 0.453 | 0.707 | 1.285 / 2.861 | 279/348 | 2.365 | 0 |
| D_OPTIMISTIC | 348/348 | 0.435 | 0.709 | 0.894 | 1.500 / 1.999 | 170/348 | 0.786 | 0 |
| D_ELASTIC | 348/348 | -0.364 | 0.607 | 0.818 | 1.299 / 2.750 | 184/348 | 0.786 | 0 |
| E_DONOR_POOL | 24/24 | -1.130 | 1.149 | 1.266 | 2.752 / 2.780 | 12/24 | 0.871 | 0 |

A estimates only a selected subset; the other methods can return pure priors with no information. Their all-case MAEs are not directly ranked. On the same 156 A-estimable fixtures, MAE is A_PRODUCTION: 0.280; D_WEAK: 0.418; D_OPTIMISTIC: 0.417; D_ELASTIC: 0.414. Full signed error ranges, empirical variance (SD²), interval counts/widths, missing estimates, prior shares and per-scenario distributions are in [summary.json](artifacts/summary.json). Intervals are conditional approximate local-target intervals, **not calibrated confidence, a full Bayesian posterior or causal identification**. Mixed-scenario coverage is not a calibration certificate.

## Scenario-level results

Each row has twelve held-out seeds. Missing estimates/regret stay unavailable; they are never converted to zero. A actions reflect API window restrictions as well as unchanged component policy.

| Scenario | A estimates | A MAE | A actions / false | D weak MAE | D interval hits | D plug-in regret mean % |
|---|---:|---:|---:|---:|---:|---:|
| EMPTY | 0/12 | — | 0/0 | 0.500 | 12/12 | 6.281 |
| ZERO_SALES | 0/12 | — | 0/0 | 2.000 | 0/12 | 6.281 |
| N5_CONSTANT | 0/12 | — | 0/0 | 0.500 | 12/12 | 6.281 |
| N5_THREE | 0/12 | — | 0/0 | 0.500 | 12/12 | 6.281 |
| N20_TWO | 0/12 | — | 0/0 | 0.310 | 12/12 | 3.087 |
| N20_FIVE | 0/12 | — | 0/0 | 0.340 | 12/12 | 4.187 |
| N50_CONSTANT | 0/12 | — | 0/0 | 0.500 | 12/12 | 6.281 |
| N50_FIVE | 0/12 | — | 0/0 | 0.120 | 12/12 | 0.140 |
| SPARSE_LOW_DEMAND | 0/12 | — | 0/0 | 0.830 | 10/12 | 3.480 |
| GROWING100 | 0/12 | — | 0/0 | 0.063 | 12/12 | 0.000 |
| GROWING250 | 0/12 | — | 0/0 | 0.039 | 12/12 | 0.000 |
| GROWING500 | 12/12 | 0.018 | 0/0 | 0.018 | 12/12 | 0.000 |
| MATURE3000 | 12/12 | 0.008 | 0/0 | 0.012 | 11/12 | 0.000 |
| LARGE_CONSTANT | 0/12 | — | 0/0 | 0.500 | 12/12 | 6.281 |
| SEASONAL_CONFOUNDED | 12/12 | 0.871 | 0/0 | 1.423 | 0/12 | — |
| PROMO_DISCREPANCY | 12/12 | 0.054 | 0/0 | 1.205 | 0/12 | 9.123 |
| HIDDEN_MARKETING | 12/12 | 1.220 | 2/2 | 1.205 | 0/12 | 9.123 |
| WEEKDAY_TREND | 12/12 | 0.023 | 12/0 | 0.025 | 12/12 | 0.000 |
| STOCKOUT | 0/12 | — | 0/0 | 0.026 | 12/12 | 0.000 |
| REFUNDS_MISSING_COST | 12/12 | 0.020 | 0/0 | 0.017 | 12/12 | 0.000 |
| WEAK | 12/12 | 0.021 | 7/0 | 0.029 | 11/12 | 0.000 |
| STRONG | 12/12 | 0.016 | 0/0 | 0.016 | 12/12 | 0.000 |
| HIGH_NOISE | 0/12 | — | 0/0 | 0.237 | 12/12 | 0.959 |
| NONLINEAR | 12/12 | 0.023 | 0/0 | 0.033 | 10/12 | 0.000 |
| STRUCTURAL | 12/12 | 1.333 | 4/4 | 1.319 | 0/12 | 6.987 |
| OUTLIERS | 12/12 | 0.023 | 0/0 | 0.116 | 10/12 | 0.377 |
| KNOWN_OPTIMUM | 12/12 | 0.013 | 0/0 | 0.015 | 12/12 | 0.000 |
| COMPARABLE_POOL | 0/12 | — | 0/0 | 0.340 | 12/12 | 4.187 |
| HETEROGENEOUS_POOL | 0/12 | — | 0/0 | 0.903 | 11/12 | 0.000 |

## Abstention, false actionability and optimum recovery

A abstains on 222/228 designated unsafe API-supported trials (97.37%); **6/228 false actions (2.63%)**: hidden marketing 2/12 and structural change 4/12. Six of the 25 allowed actions are unsafe by the synthetic design (24%). These are benchmark-specific counts, not a real-store risk estimate. Hidden treatment/marketing and a changing price response can evade current diagnostics. No gate is loosened or repaired in this milestone.

Known-optimum synthetic cases have 12/12 estimates with low error, but **0/12 policy actions**. All twelve report BACKTEST_EVIDENCE_INSUFFICIENT. Backtest skill requirements can withhold even a statistically clear price-response case; inspect the exact blockers in trials.csv. Mathematical correctness and operational eligibility answer different questions. The existing independent actionable fixture still tests constrained optimum90, while the exact elasticity−2/cost40 oracle remains80. No fabricated elasticity is fed to A.

All D/E actions are zero **by research-only authority policy**, not because their statistics detect every unsafe case. On 228 unsafe API-supported cases, negative-sign intervals occur D_WEAK: 114/228; D_OPTIMISTIC: 111/228; D_ELASTIC: 203/228. A negative interval alone would be a dangerous actionability criterion.

Hypothetical plug-in regret uses independently evaluated expected contribution on 90–110/.01 with cost40. It is not an actual suggested price or realized profit; true curves are evaluator-only. Low bounded regret can conceal large elasticity errors, especially where different slopes select the same boundary. A hypothetical plug-in regret mean is 1.372% (156 candidates; p90 9.123%, max23.493%). Actual 25 allowed production prices have mean2.200%, p90 9.123%, max23.493% synthetic regret; see [production-candidates.json](artifacts/production-candidates.json). Sparse missing candidates have no regret value. Stockout/refund/cost cases are diagnostic comparisons to an explicitly simplified uncensored/cost40 truth, never a profit claim for incomplete inputs.

## Prior dependence and negative transfer

At constant prices or no within-month×weekday price information, weak posterior remains mean−1.5/SD2, 95% interval[−5.42,2.42]; optimistic mean−.5/SD.5 and elastic mean−3/SD.5 remain assumptions. Five observations can occupy separate strata: three nominal prices do not guarantee informative within-stratum changes. log1p keeps zeros but can attenuate sparse count response. The empirical residual variance and nuisance uncertainty are incomplete; increasing n does not cure confounding.

Donor-only pooling: comparable products MAE 0.028, interval hits12/12; heterogeneous donors MAE 2.270, hits0/12, mean hypothetical regret 18.672%. Both use four independently seeded 250-observation donors and no focal-truth hyperparameters. All 24 intervals are negative despite half using misleading donors. Hyperparameter uncertainty is omitted. A full multilevel causal model, comparability classifier, robust nonstationarity model and calibrated Bayesian inference are reasoned exclusions from production; the minimal prototypes test their failure modes, not establish readiness. No MCMC convergence or SBC is claimed.

## B and C: useful arithmetic without learned demand

Known gross120, tax20%, variable40, shipping5, fixed transaction fee1 plus2% gross fee gives51.60 unit contribution; explicit fixed overhead1000 breaks even at20 units. A40% contribution-margin target under the same definitions implies gross95.833333333333. Unknown inputs withhold affected values. These omit demand response and other expenses; overhead is not smuggled into variable cost. Twelve assumption scenarios cover elasticities−.25/−1/−2/−3 and prices90/100/110 with units100/cost40. They are labeled assumptions, with no best-price output, confidence or causal promise. See calculator and assumed-scenario CSVs.

## F: offline experiment feasibility

±5% independent random price simulation, durations30/90/365, volumes .7/200 units/day, synthetic elasticities−.25/−2, twelve seeds =144 trials. No store was contacted and no prices changed. Conditional interval width and expected contribution difference versus hold100 are not observed live information gain or guaranteed downside limits.

| Days | Daily units | Truth | Mean interval width | Mean prior share | Downside trials / 12 | Expected contribution difference range |
|---|---:|---:|---:|---:|---:|---:|
| 30 | 0.7 | -0.25 | 5.326 | 0.462 | 7/12 | -24.627 to 34.888 |
| 30 | 0.7 | -2.0 | 5.487 | 0.492 | 6/12 | -9.400 to 3.105 |
| 30 | 200.0 | -0.25 | 1.132 | 0.021 | 9/12 | -10437.182 to 9967.981 |
| 30 | 200.0 | -2.0 | 1.174 | 0.023 | 8/12 | -1891.697 to 2475.110 |
| 90 | 0.7 | -0.25 | 3.838 | 0.240 | 10/12 | -38.172 to 15.391 |
| 90 | 0.7 | -2.0 | 3.795 | 0.235 | 8/12 | -17.084 to 5.147 |
| 90 | 200.0 | -0.25 | 0.692 | 0.008 | 6/12 | -24509.826 to 14600.071 |
| 90 | 200.0 | -2.0 | 0.640 | 0.007 | 9/12 | -5278.108 to 3058.524 |
| 365 | 0.7 | -0.25 | 2.058 | 0.069 | 3/12 | -60.578 to 159.628 |
| 365 | 0.7 | -2.0 | 2.031 | 0.067 | 10/12 | -40.029 to 12.769 |
| 365 | 200.0 | -0.25 | 0.328 | 0.002 | 9/12 | -25810.116 to 35405.374 |
| 365 | 200.0 | -2.0 | 0.333 | 0.002 | 9/12 | -12230.953 to 1266.449 |

A short low-volume trial can remain dominated by its prior. Counts randomize independently without carryover, cross-product substitution, customer fairness, platform constraints or sequential stopping. Merchant consent, full design/inference review, explicit bounded exposure, stock/cost checks and stop rules are prerequisites for any later live proposal; this simulation authorizes none.

## G: SaaS accounting

Separate disposable PostgreSQL fixtures use n0/1/5/20 beginning paid subscribers, seeds1001–1003, monthly100/annual1200 prices, new cohort, effective cancellation, upgrade150/downgrade50, linked refund and unpaid subscriber. Independent expected arithmetic tests actual SubscriptionService; no merchandise estimator is called. The integration test passed all twelve arithmetic cases in9.462s with no failures/errors/skips; exported rows are in subscription-research.csv. Full regression status is recorded in milestone verification. Seed permutations change subscriber role assignment, not claim twelve different economic histories.

Beginning MRR n×100; new100 for n>0; expansion50 at n≥2; contraction50 at n≥3; effective churn100. Ending MRR0/100/500/2000; ARR twelve times MRR. Cancellation effective July1 remains active June30. Window June2–July1 excludes original monthly/annual cash payments; net cash0/100/0/0, separate from MRR. Rate granularity unavailable/100%/20%/5%; zero denominators return null. Cohort expansion offsets net revenue churn but not gross churn; a new cohort is excluded from beginning-cohort rates. Annual1200 normalizes to100 monthly; one annual payment is not twelve price experiments. No observed subscription price-response identification or SaaS optimizer is claimed.

## Runtime, reproduction and limits

Research runner first completed435 fixtures/1,770 rows in8.273s (full targeted Maven33.502s), seven tests passed. Timing per method/case is retained separately (A mean9.269ms/max160.557ms across435; D variants approximately .403–.407ms mean; E mean2.027ms across30). A includes its forecast/backtest policy work; fixture and donor generation are outside the comparator timer, so this is not a normalized estimator-speed contest; it excludes HTTP/database and is not a production latency guarantee. Fixtures, trial rows, assumptions, experiment simulations and calculator results reproduced byte-for-byte in the full regression rerun; see [reproducibility.json](artifacts/reproducibility.json). Timing and metadata duration are intentionally not deterministic. Mature3000 is a component-only stress test, exceeding731-day HTTP limits and extending to2028; never claim it is API-eligible. Sparse rows are unknown days, not fake observed zeros. Price palettes are sampled, so realized levels/transitions are recorded rather than presumed.

Commands from repository root:

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-21.0.11'
cd backend
./mvnw.cmd '-Dtest=LowDataBenchmarkTest,DecisionSupportResearchTest' '-Dpricing.research.output=../docs/pricing-research/artifacts' test
./mvnw.cmd verify
cd ..
node research/pricing/summarize.mjs
node research/pricing/report.mjs
node research/pricing/export-demo.mjs http://localhost:8084
```

The audit and methodology contain source references and fixed decision rules. Reporting additions (paired-support summaries, actual-candidate regret and detailed distributions) did not change the generator, estimators, seeds or eligibility thresholds. One Java compound-var syntax issue was corrected before initial results; no statistical tuning. HTTP-support classification was subsequently frozen to the audit date2026-11-13, so future clocks cannot relabel a fixture; this preserves all measured rows and does not change an estimator or gate. The first sandboxed full test run stalled at Mockito attachment and was stopped; the actual completed rerun is recorded separately. No cherry-picked pass claim. Statistical validation remains limited: twelve held-out seeds per scenario, fixed synthetic families, hand-specified priors/groups, conditional intervals, no real-store randomized truth, no calibrated causal uncertainty. Independent usability remains NOT VERIFIED; LIVE_SHOPIFY_NOT_VERIFIED; live billing unavailable.
