# Benchmark methodology — preregistration v1

Written and committed before new fixture generation/results. Do not revise criteria to make a method/demo look better. Any later correction must be logged as an amendment, retaining original intent. Production source, thresholds, oracle80, independent constrained90 and permanent demo are frozen.

## Questions and decision rules

1. Which useful facts/scenarios are valid without identifying demand? Deterministic calculations must match independent hand arithmetic, with unknown inputs withholding outputs and explicit cost scope.
2. How do point bias/error/variance and interval coverage change with observation count, informative within-calendar variation, confounding and model mismatch? Report all seeds/scenarios, including bad results. No superiority claim from one seed. Production intervals are UNCERTAINTY_UNAVAILABLE.
3. How often does the unchanged production policy return ACTIONABLE in cases designated non-identifiable/unsafe? Count these as false actionability relative to the synthetic experiment definition, even if existing tests pass. Separately report eligible-policy recall on the identified known-curve case. Never change gates to reduce errors.
4. Do prior/pooling choices dominate weak data or transfer the wrong group response? Report prior precision share, interval widths, comparable vs heterogeneous donor tests. E/E-Bayes outputs are always exploratory, never authoritative recommendations.
5. Quantify conditional synthetic plug-in optimum/regret separately from exact optimizer correctness. Synthetic truths/oracles are evaluator-only and are not application advice. Full source accounting identities must reconcile separately.

Acceptance of the research is reproducibility/coverage/integrity, NOT a preassigned winning algorithm or achieving a target number of recommendations. New methods are not candidates to ship unless identification, empirical calibration, transfer robustness, safety and operational validation are separately established. Fixed simulation target of nominal95% interval coverage: report measured binomial numerator/denominator; shortfalls are a research failure, not a reason to retune. Small12-replicate cells are exploratory; no universal calibration claim, asymptotic causal claim or SBC certification.

## Frozen scenarios and seeds

Development seeds11,17,23; held-out evaluation seeds1001–1012. Both labeled in raw results; final quantitative claims use held-out seeds. No fitting/selection/hyperparameter adjustment after observing held-out results. Donors use independent offset seeds and separate products; focal observations, future outcomes and true coefficients never enter donor hyperparameter fitting. Permanent demo is neither training nor evaluation holdout.

Scenarios: empty0 and zero sales; sparse5 (constant/three prices),20 (two/five prices),50 (constant/five prices/low demand); growing100/250/500; mature3000; large constant price; seasonal-price confounding; promotion/marketing with visible price discrepancy and hidden marketing without discrepancy; weekday/nonlinear trend; stockout-censored observations; refunds/missing variable cost; weak/strong elasticity; high noise; nonlinear demand; structural/nonstationary elasticity; outliers; known optimum; comparable and misleadingly heterogeneous pooling. Explicitly record realized eligible sample count and informative price transitions, not just nominal n.

The generator uses count demand with independent Poisson sampling, multiplicative random variation, piecewise/ramp/weekday/marketing effects and separate nonlinear/structural curves. It does not call production estimators/generator or copy the harmonic regression equation. Sparse series include independent missing/unobserved calendar days, not fabricated zero demand. Record raw date span and API support: >731 daily dates are component-only performance tests, never HTTP-eligible recommendations. Mature transactions do not imply independent daily sample size; document this limitation.

Synthetic truth: usual local elasticity-2 unless scenario overrides (weak-.25/strong-3, seasonal-1.1, marketing-1.2, structural final-.3). Nonlinear truth is a known local derivative and full curve, not a constant global coefficient. Expected abstention on missing/zero/small/constant/confounded/censored/cost-unknown/structural/heterogeneous cases; identified known-curve case is a positive control. Low noise does not establish causal identification when marketing/seasonality co-move with price.

## Comparators

A. Unmodified DemandModel + OptimizationService/ContributionOptimizer with real defaults and complete known market where appropriate. Record all policy reasons, estimates and absent intervals. Synthetic market boundaries/reference/history are explicit; no mocked elasticity supplied to this comparator. API-window validity is a separate eligibility restriction.

B. Research-only BigDecimal unit contribution/target-margin/break-even calculations: gross sales vs tax-exclusive revenue, known variable cost, allocated shipping and fixed/percentage fees; fixed overhead only when explicitly supplied. Unknown cost/fee/tax inputs withhold affected values; never silently zero unknown costs. These are arithmetic facts/assumptions, not full net profit or demand estimates.

C. Assumed sensitivity curves at supplied elasticities/ranges (-.25,-1,-2,-3), price90/100/110, cost40, units100. Label user assumptions; no coefficient learning, confidence or recommended best price.

D. Minimal empirical-Bayes Gaussian log1p-count slope after within month×weekday centering, normal slope priors: weak mean-1.5/SD2; optimistic mean-.5/SD.5; elastic mean-3/SD.5. Observed residual noise estimate (floor .05²; insufficient residual df defaults1). Conditional normal95% intervals, not full Bayesian posterior uncertainty over noise/nuisance/model selection. In zero residual price variation the posterior equals the prior. Priors are assumptions, not observed evidence. Report empirical coverage and prior share; misspecification can invalidate intervals. No causal/actionability output.

E. Minimal donor-only empirical partial pooling, four independent donor products, estimated prior mean/variance with SD floor .25; focal data never fit hyperparameters. Comparable vs misleading broad-category donors intentionally test negative transfer. Not a full multilevel model or a validated comparability classifier; reasoned exclusion of production hierarchy until group semantics/robustness are established.

F. Offline bounded randomized price planning simulation (±5%, durations30/90/365, sparse vs higher volume; true curve only for simulator evaluation). Report observed price information, interval width and expected contribution downside relative to held100 under assumptions. No live experiment, sequential price write or experiment API. Carryover, seasonality, substitution and customer fairness can invalidate a simple design; propose authorization/stop/analysis requirements, not operational instructions for automatic deployment.

G. Separate SaaS count/ledger fixtures with monthly/annual prices, future effective ends, expansions/contractions, refunds, unpaid lifecycle, new cohorts and beginning denominators at n0/1/5/20 across independent seeds. Compare exact independent arithmetic to actual SubscriptionService in disposable PostgreSQL; never apply merchandise elasticity to subscriptions. Small denominator rate granularity is measured; no validated SaaS price effect.

## Metrics, constraints and artifacts

Per trial record generator version/scenario/split/seed/hash, raw span, observed/eligible n, price levels/transitions, target semantics, estimates/intervals/prior share, production status/reasons, API support, null candidate behavior, runtime. Error = estimate−local synthetic target; aggregate mean bias, MAE, empirical SD, range/p90 and95% local-target coverage with counts. Distinguish missing/abstained estimates from zero error. Flag local-target comparisons under nonlinearity/nonstationarity as misspecification diagnostics rather than coherent global-parameter coverage.

Evaluate a common hypothetical price grid90–110 (0.01tick), cost40, no stock cap for expected-curve plug-in regret; production actual candidate comes from its own unchanged tighter historical/support constraints and is reported separately. Optimum80 for cost40/e-2 on50–150 is a separate mathematical oracle, not the constrained90 opportunity. A true curve is used only by evaluator brute-force grid search/expected regret. Regret unavailable if no candidate; never impute zero. A fall-back hold100 is explicitly a reference policy, not an optimized recommendation.

Store deterministic trial CSV/fixture hashes, pooled/experiment/calculator artifacts and summary tables under docs/pricing-research/artifacts. Measured wall durations may vary and are not hashed fixture truth. Generator seed streams use Java Random; rounding to integer count is part of the DGP. No numerical dependency, MCMC, cross-validation tuning or hidden ground-truth input. Tests assert reproducibility, truth separation, posterior/prior behavior, cost null handling, negative controls and ledger identities; performance values themselves are not forced to optimistic thresholds.

## Evidence ladder and literature

Facts: observed price/cost/paid history with source/window/coverage. Scenarios: explicit user inputs and assumed ranges; no best-price claim. Exploration: conditional point/interval with prior/identification/selection caveats. Recommendation: existing production eligibility only, still no causal guarantee or calibrated interval; future independent validation needed.

Primary sources read for design context: [Talts et al., simulation-based calibration](https://arxiv.org/abs/1804.06788) motivates future computational validation; this benchmark is not SBC. [Gelman, multilevel modeling](https://sites.stat.columbia.edu/gelman/surveys.course/Gelman2006.pdf) distinguishes pooling/prediction from causal interpretation. [Bojinov et al., switchback experiments](https://arxiv.org/abs/2009.00148) analyzes carryover-dependent randomization/inference; our minimal offline simulation does not implement its full design/inference procedure. No quotations or empirical results from these papers are represented as our measured outcomes.
