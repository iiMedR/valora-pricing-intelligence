# Subscription metrics

All definitions use recorded partial manual history, one reporting currency, UTC effective dates inclusive through end-of-day asOf. The window [start, asOf] has at most 366 inclusive days, never extends beyond today, and begins no earlier than 2000. Beginning population is reconstructed at start minus one day. Recorded-at timestamps preserve when evidence arrived, but reports are effective-date reconstructions using all evidence now recorded, not historical knowledge-at-time reports. Later paid evidence can improve prior reports.

## State and recurring run rate

At date d, choose each subscription's latest lifecycle event with effectiveDate <= d. START/CHANGE/REACTIVATE represents active service. CANCEL/END represents ended service from its effective date. A future end is scheduled only; it does not reduce today's active population.

Active paid subscriptions = count of active lifecycle IDs having at least one PAID charge dated <= d. A lifecycle alone is NO_PAID_EVIDENCE. A fully refunded charge remains historical paid evidence: a refund does not cancel service. This is not a delinquency or renewal-entitlement model; ongoing activity assumes the explicit lifecycle remains valid. Do not interpret these counts as validated currently collectible accounts.

For each active paid subscription, use the immutable explicit price version referenced by its latest event. Monthly contribution = monthly price, or yearly price / 12. MRR = sum of these monthly contributions. ARR = MRR × 12. Neither is cash collected, realized annual revenue or recognized accounting revenue. New plan price versions do not move subscriptions without an explicit CHANGE event. Missing/invalid price references are rejected at entry instead of replaced by zero. Non-paid/inactive IDs are excluded; if no paid IDs exist the sum is zero with an honest empty state and partial-source warning.

Money uses BigDecimal/NUMERIC(19,4); annual division rounds HALF_UP to 12 fractional digits, rates to 6, never binary floating-point arithmetic. API money/rates are decimal strings. UI rounds common figures to two decimals, daily inspection to four. ARR may differ at sub-cent scale from a pure annual amount because it is defined from rounded MRR. No conversion, proration, tax, discounts, credits to run rate, inferred acquisition, stockout demand or elasticity is assumed.

## Movement and reconciliation

Compare paid state on each consecutive UTC date. For a subscription's before B and after E:

- B=0, E>0: new MRR if there is no earlier recorded PAID history; otherwise reactivation MRR.
- B>0, E=0: churned/ended MRR = B.
- Both positive: expansion = max(E−B,0); contraction = max(B−E,0).

Sum each category across the window. New includes first paid evidence becoming available during an already-active lifecycle. Reactivation includes an ID with prior paid history returning from an ended state. Multiple changes within a window count as movements, even if ending run rate equals beginning.

Ending MRR = beginning + new + expansion − contraction − churned + reactivation. The API returns reconciliationDifference; tests require zero. These are run-rate movements, not cash movements. Same-day lifecycle transitions are deliberately unsupported, removing ambiguous intraday movement ordering.

## Churn rates and population

Paid-subscription churn = beginning paid IDs absent from ending paid population / count of beginning paid IDs × 100. It is a beginning-to-ending population loss rate, not a count of every cancellation event. An ID that ends then reactivates before the end is retained for this rate, while both movements remain in the movement summary. There is no distinct-customer/logo churn because opaque subscription IDs do not establish a customer population.

For each beginning paid ID, compare ending MRR (zero if absent) with its own beginning MRR. Cohort loss = sum of reductions; cohort expansion = sum of increases. Gross revenue churn = cohort loss / total beginning MRR × 100. Net revenue churn = (cohort loss − cohort expansion) / total beginning MRR × 100. New subscriptions are excluded from these revenue-churn numerators. Net churn can be negative. Zero beginning denominator yields null/unavailable, never a fabricated zero percentage.

MRR per active paid subscription = ending MRR / active paid subscription count. It is neither customer/account ARPA nor period cash ARPU. Zero paid count yields null. Historical trend is daily effective-state MRR. Per-plan daily paid-subscriber/MRR trends use each subscription's actual effective plan on each date. Cohort/logo retention is unavailable: no customer mapping or complete acquisition-cohort coverage is asserted.

## Cash

Net collected cash in window = PAID amounts − REFUND amounts with effective dates in [start, asOf]. A refund of an earlier charge can make this negative. A yearly charge is collected once at its actual amount and does not get divided by 12 in cash. This is not recognized revenue; no invoice accrual schedule or tax reporting is provided.

## Hand-checkable fixture

SubscriptionIT creates only an isolated test fixture:

| Effective date | Evidence                                                        | MRR effect                           |
| -------------- | --------------------------------------------------------------- | ------------------------------------ |
| Jan 1, 2025    | A monthly 100, B yearly 1,200, START and PAID evidence for both | 100 + 1,200/12 = 200                 |
| Jan 10         | A explicitly changes to monthly 150                             | +50; total 250                       |
| Jan 20         | B's cancellation becomes effective                              | −100; total 150                      |
| Jan 21         | Refund 100 against B's 1,200 charge                             | Cash −100 in Jan 2–31; MRR unchanged |

Jan 2–31: beginning MRR 200 + expansion 50 − churned 100 = ending 150; ARR 1,800; one active paid subscription; paid-subscription churn 1/2=50%; gross revenue churn 100/200=50%; net revenue churn (100−50)/200=25%; MRR per paid subscription 150. Through Jan 19 B is still active and total MRR is 250. Cash Jan 1–31 is 1,200; cash Jan 2–31 is −100. First-day window has no beginning population, so churn rates are unavailable.

A second boundary case downgrades A to 100 on Jan 25 (contraction 50) and reactivates B on Jan 26 (+100), giving ending MRR 200 and zero reconciliation difference. An active unpaid ID does not increase paid count. Duplicate source replay does not alter metrics; conflicting replay, refund 1,101 after a prior 100 refund, zero prices, unsupported intervals and missing price references fail validation.

Missing records can bias every reconstruction. Adding arbitrary history does not establish a causal price response or guarantee a recommendation. No SaaS elasticity, uplift or optimized price has been validated.
