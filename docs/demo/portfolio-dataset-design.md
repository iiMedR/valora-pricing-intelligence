# Portfolio dataset design — frozen before implementation/evaluation

Generator portfolio-v1, seed20251114, dates1January–31December2025.30 synthetic single-variant products, five familiar categories, no customer identities, local existing fallback illustrations. Reuse the legacy ten scenario grouping keys for metadata compatibility, but per-variant story/truth below defines the new portfolio fixture. The legacy generator/data remain untouched. No algorithm outcome quota and no parameter search. This document is committed before generator code and before any portfolio optimizer evaluation.

## Independent process

Reference price B=80+7*groupOrdinal+10*replica MAD (replicas1–3). Reference demand40*(1+.1*(replica−1)) units/day. Standard recorded cost .4B; exceptions below. Independent weekly price assignments .8B/B/1.2B for the first309days, then56days at B as recent reference. Weekly assignment RNG is distinct from daily sales RNG; fixed seed/key/day mixing, no model-estimated coefficients feed generation. Expected sales = referenceUnits*(transactionPrice/B)^trueBeta*weekdayFactor*lognormalNoise, with weekday factors1.3 Monday/Tuesday,.8 weekend,1 otherwise; independent log-noise SD.06 and Poisson count sampling. These controls are business stories, not copied fitted annual harmonics. Weekly allocations provide about45 independent epochs, not365 randomized price experiments. Price changes stored only at actual transitions. Money uses four decimal places and BigDecimal; demand simulation uses StrictMath. Current price/availability comes from actual last history, no suggested price is seeded.

## Frozen scenarios (three replicas each)

|Metadata group|Replica1|Replica2|Replica3|Intended evidence/business category|
|---|---|---|---|---|
|ELASTIC_HIGH|beta−2|beta−2.6|beta−3|Independent elastic candidates; correct costs/full stock.|
|ELASTIC_LOW|beta−.25|beta−.6|beta0|Independent inelastic/no-response candidates; not guaranteed approval.|
|SEASONAL|beta−1.1|beta−1.2|beta−1.3|Calendar-assigned quarterly prices .8B/B/1.2B/B plus nonharmonic monthly demand ramp; deliberately confounded.|
|PROMOTION|own beta−.25, latent marketing exponent−1.75 tied to price|own beta−1.2,20% listed/effective promotion discrepancy on days10–16|own beta−2.6 first half,−.3 second|Hidden-confounding model-error witness, visible promotion and structural instability; must report any unsafe approval.|
|STOCKOUT|beta−1.4, stock caps5 every third day|beta−2, last14days stock0|beta−2, last stock10|Censored/absent/low inventory constraints.|
|SPARSE|5 observed dates|20 observed dates|50 observed dates|beta−.9; unobserved dates UNKNOWN, all cost history/catalog cost missing. Useful assumption-based guidance, not reliable elasticity.|
|REFUND|beta−2|beta−1.5|beta−2|Independent response with one-unit returns every31days and financial adjustments every61days. Refund-adjusted optimum is not claimed; evaluate existing contribution contract separately.|
|COST_CHANGE_UNKNOWN|beta−2; unknown cost months4–6, known elsewhere|beta−2; recorded .4B but actual .6B|beta−2; correct recorded .6B|Historical cost gap, deliberately wrong input witness and high-cost ceiling-constrained candidate.|
|ARCHIVE|beta−2, archived catalog item|beta−2, cost .5B (optimum near B)|beta−.25, catalog ceiling1.05B|Inactive, near-optimal and ceiling constrained. Only first replica archived.|
|ZERO_SALES|beta−1.2, zero observations every7days despite stock|beta−5/3, cost .4B (flat gain near B)|beta−2, floor .95B|Selection/closures, negligible economic gain and price-floor constraints.|

Six clean elastic/inelastic candidates, three return-affected candidates and one high-cost candidate support model exploration; remaining variants deliberately emphasize constrained, missing or unreliable evidence. These are planned stories, not promised approved counts. Preserve every miss/error in the final table. Independent assignment does not establish commercial causal validation or calibrated uncertainty; known latent parameters are evaluator-only metadata.

Known truth: for stationary constant elasticity with known true cost C, bounded expected-contribution oracle compares bounds/current and beta*C/(beta+1) when valid. Bounds intersect observed support, catalog bounds and engine +/-10%; no oracle value for structurally unstable/confounded/selection/sparse cases. Hidden-marketing witness has an evaluator own-price oracle but is explicitly unidentifiable from observations. Refund truth excludes unknown future refunds unless expressly modeled; no full net-profit claims. Financial comparisons use actual guidance DTOs, current cost provenance and explicit assumed units; missing fields remain missing.

Safety: separate portfolio container/volume5437, API8087, frontend4207, demo+portfolio profiles, PORTFOLIO immutable marker, ECOMMERCE only. No SaaS seed added. Canonical export excludes random UUIDs and insertion timestamps, uses existing logical keys and stable monetary precision. Freeze design/seed before code; do not alter truth categories after seeing outputs. No optimizer changes or research fixture deletions.
