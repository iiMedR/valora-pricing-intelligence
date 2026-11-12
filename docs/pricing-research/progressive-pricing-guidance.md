# Progressive pricing guidance — Milestone 11.12

Guidance answers “What follows from these inputs?” Optimization answers “Does the existing model/policy support reviewing a price?” They are separate APIs, UI sections and provenance. No scenario is a stored evaluation, inferred demand curve, automatic price change, realized uplift or full net profit.

## Evidence and source semantics

Responses explicitly include `sourceEvidence` (KNOWN_INPUT for current catalog fields, OBSERVED for immutable plan prices), `assumptionEvidence=MERCHANT_ASSUMPTION`, `resultEvidence=CALCULATED_SCENARIO` and calculation version `deterministic-guidance-v1`. MODEL_ESTIMATE and ACTIONABLE_OPTIMIZATION are distinct evidence enum members, never assigned to guidance. A displayed number alone cannot confer authority.

E-commerce facts are current catalog listed price and recorded unit cost. They do not fill missing historical costs, imply tax/fee completeness, or calculate historical realized profit. The demo's catalog facts are separate from historical2025 evaluations. Missing costs remain null; source facts never take a merchant override. The merchant may explicitly supply an assumed unit cost, clearly retained in the assumptions payload.

SaaS facts come from a selected actual price version belonging to the plan, effective on/before the selected as-of date. Annual1200 normalizes to100 monthly; that is not100 monthly cash received. Existing assigned subscription price versions and immutable MRR/cash/lifecycle accounting are unchanged. There is no validated subscription price optimizer.

## E-commerce equations and definitions

Let P be listed gross unit price, C recorded or explicitly assumed variable unit cost, E extra per-unit variable cost (including allocated shipping/fixed transaction cost if entered), d discount fraction, t tax fraction included in gross price, f payment-fee fraction of discounted gross billings, q assumed units, R assumed gross refunds of this period's billings and F explicitly supplied fixed costs for the period.

- Basic facts: price-minus-recorded-cost = P−C; margin before excluded expenses = (P−C)/P. Missing C or nonpositive P means no contribution/margin fact, never zero cost. This is a deliberately limited known-cost calculation.
- Discounted gross unit billings G=P×(1−d); tax-exclusive unit sales V=G/(1+t).
- Unit contribution U=V−C−E−G×f. Contribution margin=U/V, unavailable at V=0.
- Gross billings=G×q. Net sales=V×q−R/(1+t). Total contribution=U×q−R/(1+t).
- Net cash after payment fees/refunds=G×q−G×q×f−R. It is before servicing/other expenses/tax remittance, not profit. Refunds do not reverse payment fees, C or E; recovered-stock costs/fee reversals are excluded.
- Break-even units=ceil((F+R/(1+t))/U), only if F is explicitly supplied and U>0. F=0 explicitly and R=0 legitimately yields0; missing F does not. This is fixed-cost break-even, not merely unit-cost coverage.
- Arithmetic target-margin gross price=(C+E)/((1−d)×((1−m)/(1+t)−f)), where m is the supplied contribution-margin fraction. Unavailable for nonpositive denominator or combined variable cost. Round this required threshold upward to four decimals. It is not demand-validated optimal pricing.

Current and Scenario use separate explicitly entered unit assumptions. No observed forecast or invisible constant-volume assumption is inserted. Shared extra-cost/discount/tax/fee/refund assumptions apply separately to each hypothetical comparison, not to both as combined business activity. Expected units may be fractional; they are assumptions, not recorded order counts.

Unentered extras/discounts/taxes/fees/refunds are **not silently treated as known zero**: the merchant must check the visible confirmation that they assume unentered amounts are zero for this calculation. Until then no scenarios are calculated. Fixed cost and target margin stay unavailable until entered, even after confirmation. Other business expenses remain excluded; unit contribution and total contribution are not full net profit. SaaS servicing cost requires its own explicit value, including zero if assumed.

Hand-checkable example: P100/C40, candidate80, separately supplied units100/156.25 over30days, no extras assumed: current contribution6000; candidate6250. This is merchant-assumed arithmetic, not an elasticity-based suggestion. At fixed costs1000, break-even17units at current price and25 at80. Forty-percent target margin at cost40 implies66.6667 after upward threshold rounding.

Additional example: gross120,10%discount,20%included tax, cost40, extra5,2%fee gives discounted gross108, tax-exclusive90, unit contribution42.84. Ten units and gross refunds12 yield418.40 contribution. Fixed costs1000 including those refund assumptions break even at24units. Revenue, cash, costs and contribution remain distinct.

## SaaS periods and scenarios

All inputs use the recorded plan price's MONTHLY or YEARLY billing period. Starting subscribers, new subscribers and cancellations are whole merchant assumptions; scenario count=starting−cancellations+new. No churn/retention response is inferred from price. Scenario current price uses the supplied starting count; it is not the ledger's observed MRR or a claim that existing subscribers are assigned to this version.

Service cost is per subscriber per full billing period. All assumed subscribers are treated as assigned to this price for a full period and billed/paid; no proration, trial conversion, accrual recognition, cohort retention model, tax calculation or provider integration is inferred. Discount applies for the modeled full period. Recurring amount is discounted gross price×assumed subscribers; annual amount/12 gives normalized monthly recurring revenue and monthly×12 gives normalized annual recurring revenue. These are **scenario run rates**, not recognized accounting revenue or actual net cash collected.

Contribution deducts assumed servicing cost, payment fees and refunds. Refunds reduce assumed cash/contribution without automatically changing normalized recurring run rate; fee/cost reversals are excluded. Existing ledger semantics remain tested separately, including200+50−100=150 MRR,1800 ARR,50% subscription churn and25% net revenue churn.

Annual example: actual price1200, assumed candidate1440, starting10/new2/cancellations1, servicing240 per subscriber/year,10%discount,2%fee, refunds120. Scenario subscribers11; billings14256; normalized monthly recurring1188; normalized annual recurring14256; net cash after fees/refunds13850.88; contribution11210.88. None is an observed outcome. Monthly100→150 with assumed starting2/cancellation1/new0 and servicing40 produces scenario monthly recurring150/annual1800 and contribution110, without modifying any subscription.

## API, precision and protections

- GET `/api/v1/guidance/products/{productId}/variants/{variantId}` binds CommerceInput. Validate actual product/variant membership, server installation mode and currency; normal ADMIN session, anonymous demo read-only. No new generic mutation matcher is permitted.
- GET `/api/v1/saas/plans/{planId}/guidance?priceId=...&asOf=...` binds SubscriptionInput. Authenticated ADMIN, server-enforced SaaS mode, actual plan/price membership/effective date; cross-mode/conflicting currency rejected. Annual/monthly period is authoritative and cannot be overridden by query.
- Both are ephemeral, repeatable-read calculations. No scenario save, database table, migration, provider call, Shopify write or model audit insert. Existing evaluation saving remains explicit authenticated CSRF-protected re-evaluation; new safety version enters its fingerprint to avoid aliasing old conclusions. No old snapshot is rewritten.
- Unsupported/repeated parameters are rejected, so an ignored billing period or ambiguous candidate cannot silently describe a different scenario. Decimal money inputs are nonnegative (candidate>0), at most10^12 and four decimal places; expected volume≤10^6; SaaS counts integer0–10^6, resulting count≤10^6, cancellations≤starting. Period1–366days for e-commerce; no cross-currency conversion. Fee/target margin<100%, discount/tax≤100%; refunds cannot exceed each scenario's assumed period billings. Invalid parsing/extremes fail400.
- BigDecimal DECIMAL128 internal division; no double money arithmetic. Monetary/percentage results are decimal strings rounded HALF_UP to four decimals at output; required target price rounds CEILING and break-even uses integer CEILING. Normalized SaaS recurring values use unrounded intermediate arithmetic. Angular only formats returned values; it does not implement a second calculator. Display currency precision may hide extra transmitted decimals; formulas/version remain inspectable.
- Single-business installations have ADMIN authorization, not a newly invented tenant/owner schema. Resource pairs are checked against that installation's records. Existing session expiry, CSRF, encrypted tokens, read-only demo and cross-mode controls remain. Protected results/drafts clear on expiry or selection change. No scenario assumptions are added to URLs/local storage or saved automatically.

## Optimizer repair and scientific limits

See the committed pre-code audit and optimizer-safety artifacts. Six reused TEST failures are now named regressions, not held-out validation. Additional prospective seeds2001–2020 were fixed before implementation. Point estimator, exact mathematical objective and existing thresholds remain; optimizer-only diagnostics add replicated price-tier residual and disjoint-half stability checks. Tier mean log residual>log(1.10), minimum15days/tier and three replicated tiers; disjoint halves require supported controlled fits (at least130eligible days each), residual price SD≥.03/calendar R²≤.70 and existing .25 maximum coefficient difference. Unavailable checks withhold optimization.

These are material adequacy guardrails, **not calibrated significance tests or causal identification**. Unobserved marketing can still mimic an adequately shaped/stable response. Backtests of observed sales do not prove causal price response. Known mathematical optimum80 and independent genuine actionable constrained90 remain meaningful. Existing safe approvals and all false/safe abstentions are reported with denominators; zero observed unsafe approvals is not universal safety or a production incident-rate estimate.

Milestone11.13 should pursue independently designed additional DGP families/groups, robustness to smooth confounding/carryover/substitution, explicit exogeneity/provenance and calibrated uncertainty before expanding statistical authority. No Bayesian/pooling/experiment system ships here. Independent merchant usability NOT VERIFIED; LIVE_SHOPIFY_NOT_VERIFIED; live billing unavailable. Final Milestone12 readiness requires those honestly scoped validation decisions, not manufactured demo recommendations.
