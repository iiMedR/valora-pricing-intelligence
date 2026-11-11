# Proposed Milestone 11.12 — useful low-data decision support

**Design only. No endpoint, domain, UI, migration or production model is implemented by 11.11.** Research completion does not authorize live experiments or establish causal optimization. Keep the current optimizer/gates unchanged; its six unsafe synthetic actions require separate scientific review, not a silent threshold patch.

## Evidence ladder and merchant tasks

| Rung | Merchant question | Allowed display | Required limits |
|---|---|---|---|
| Observed facts | What do I know about this product? | Listed/effective price, paid units and refunds, known variable costs, cost coverage, stock evidence, dates/source | Missing remains unknown; sales do not reveal customers lost during stockouts. |
| Deterministic support | What does this price leave after known costs? | Unit contribution, target-margin arithmetic and break-even with explicit overhead | Definitions of gross/tax-exclusive revenue, variable/fixed costs, shipping and fees; excludes unknown business expenses; no demand prediction. |
| Assumed scenarios | What if units changed by this amount? | Side-by-side contribution for merchant-supplied prices/units or explicit assumed response range | All inputs visibly assumptions; no preselected learned coefficient, best price, predicted uplift or confidence. |
| Exploratory evidence | What association appears in my history? | Existing supported diagnostics with exact sample/window and identification status | Priors cannot masquerade as observations; conditional intervals are uncalibrated; association is not guaranteed effect. No new D/E models in 11.12. |
| Eligible recommendation | Which supported suggestion should I review? | Existing API-returned comparison only, when current gates permit it | Existing authenticated explicit evaluation saving; no automatic application. Policy eligibility is not causal proof or calibrated uncertainty. |

A merchant with five sales should still find known-price/cost arithmetic and a missing-input next action. With zero known costs, show price and history facts plus “Add/review variable costs”; do not present zero costs, zero profit or a fabricated suggestion. With five unchanged-price sales, show “Price response cannot be estimated reliably yet”; do not unlock a coefficient because a prior exists.

## Proposed contracts and domain boundaries

Reuse existing catalog/history/evaluation DTOs for facts and eligible comparisons. If a support contract is needed, propose a separate **read-only** `/api/v1/decision-support/variants/{id}` response behind a disabled-by-default feature flag, subject to implementation review. No migration is expected; do not overload saved model evaluations or change the existing recommendation DTO's semantics.

Proposed structure:

```text
evidenceLevel: OBSERVED_FACTS | ASSUMED_SCENARIO
variantId, businessMode, currencyCode, observationWindow, asOf
sources: [{field, sourceKind, effectiveDate, coverage, limitationCodes}]
knownInputs: {grossUnitPrice?, unitCost?, taxRate?, shippingPerUnit?,
              transactionFeeFixed?, transactionFeeRate?, fixedOverhead?}
unknownInputs: [field names]
definitions: {contribution, marginDenominator, taxTreatment, excludedExpenses}
arithmetic: {unitContribution?, targetMarginGrossPrice?, breakEvenUnits?}
scenario: {explicitInputs, assumptionRanges, periodDays, estimatedUnits?,
           contribution?, limitationCodes} | null
authority: DESCRIPTIVE_ONLY | USER_ASSUMPTIONS_ONLY
```

The scenario request should be ephemeral, validated arithmetic, never a persisted “model” or saved evaluation. No recommended/optimal-price field, learned elasticity, causal label, “confidence” or production benchmark score belongs in this contract. Derived amounts use one server arithmetic implementation with decimal rounding and explicit null propagation. Frontend formats returned values rather than adding a competing calculator. Missing fees/tax/shipping are unknown until explicitly supplied or explicitly confirmed absent. Do not mix currencies. Price must be positive, costs nonnegative, tax nonnegative, rates bounded, target margin feasible; denominator≤0 withholds target price with a reason. Positive contribution is required for finite break-even. Zero overhead may imply zero break-even only when explicitly known as zero.

Contribution is tax-exclusive sales minus modeled variable costs, shipping and transaction fees. Fixed overhead is supplied separately for break-even; it is not assumed known or included in unit contribution. A target-margin price is an arithmetic threshold under assumptions, not a demand-aware recommended price. Margin denominator and fee basis must be displayed and tested. Evidence sources/time stamps are part of the result, not hidden in developer diagnostics.

## Proposed UI within existing navigation

Keep compact typography, black charts, existing URLs and the separate four insight pages. No new redesign. On product detail, a “Understand your price” panel can lead with known inputs and a short contribution definition. Expand “Try assumptions” for explicit price/units/fee assumptions and reset controls. Keep assumptions visually separate from actual results, counts and saved evaluations. Do not put research output in production charts.

Recommendations continues to show actual API suggestions or compact abstention reasons with working next actions. Link to support arithmetic when no reliable suggestion exists, without implying that filling costs guarantees an eligible recommendation. Analytics retains net sales and known-cost coverage. Forecasting retains observed-sales/availability assumptions and actual historical dates. Readiness prioritizes concrete fixes with scope and provenance. Worked examples remain illustrative and separate from store counts; permanent demo still has 30 abstentions.

Accessibility acceptance: keyboard operation and focus restoration, announced validation errors and null states, meaningful input labels/currency/period, summary before expandable details, no reliance on color, exact chart values, 375/768/1440 layouts. Verify a merchant can find contribution or a useful next fix without opening a technical table. Engineering checks are not independent merchant usability evidence.

## SaaS is a separate bounded context

Subscription facts use the immutable subscription ledger, effective lifecycle dates and paid evidence. Monthly100 and annual1200 normalize to MRR100, not a product quantity price curve. Show beginning cohort, new/expansion/contraction/churn/reactivation, reconciliation, net cash and denominator definitions separately. A refund changes cash without automatically changing lifecycle MRR. Show null rates at zero denominators and counts beside small-n rates; one loss among five is20%, not a stable future churn forecast.

For later subscription scenarios, merchant-supplied subscriber/retention assumptions must remain explicit. Never import merchandise elasticity, infer retention from annual billing alone, equate MRR with cash, or describe an arithmetic subscription price as optimized. No ledger writes, accounting reinterpretation or live billing integration belongs in 11.12 support scope.

## Security, privacy and rollout

Preserve session protections, role checks, CSRF on any existing mutation, token encryption, tenant/store scoping, demo read-only behavior and cross-mode restrictions. Clear protected support/scenario state on session loss. Avoid PII, raw billing identifiers and tokens in logs, research artifacts or client cache. No Shopify or billing writes; no experiment launch route; no automatic save/apply. Explicit saved evaluations continue through the existing authenticated CSRF-protected flow only.

Ship facts/arithmetic first behind a feature flag after contract/rounding/null and cross-mode review. Test unknown/negative/zero inputs, tax/fee bases, cost coverage, refund windows, stale facts, currency mismatch and arithmetic reconciliation. Run existing backend/PostgreSQL/frontend regressions, demo checksum/all30 abstentions, session/CSRF/read-only tests and merchant-task walkthroughs. Start with internal demonstration and independently observed merchant comprehension; record unverified usability explicitly. Roll back by disabling the flag; no schema migration or price/ledger mutations require reversal.

## Deferred research and risks

Defer production prior-based coefficients, hierarchical pooling/comparability inference and bounded live experiments to a separately approved 11.13 research protocol. Require wider independent DGP families and held-out groups, handling marketing/stock selection/nonstationarity, uncertainty over nuisance/noise/hyperparameters, reproducible computational validation and calibrated target coverage. Fixed-truth coverage here is not simulation-based calibration. Do not adopt optimistic priors or choose donors from broad product category labels based on this benchmark.

Any future live experiment needs merchant approval of concrete exposure/prices, platform/legal review where applicable, inventory/cost/fairness controls, carryover/substitution assumptions, preregistered randomization and inference, monitoring/stop criteria and independent review. The offline simulator is a feasibility illustration, not authorization or a safe-loss guarantee.

Main product risk: users may mistake assumed arithmetic or policy-eligible association for predicted full profit. Counter it with explicit assumptions, “sales minus known variable costs” definitions, cost coverage, no best-price label, and independently tested comprehension. Statistical risk remains material: current gates admitted hidden-marketing and structural-change synthetic cases. Research reports this limitation without changing current production behavior.
