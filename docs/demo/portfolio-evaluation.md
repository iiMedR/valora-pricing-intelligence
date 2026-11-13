# Portfolio evaluation — actual frozen-dataset outputs

**Demo implementation PASS; causal model validation NOT ESTABLISHED.** Frozen design/seed committed at 274cd26 before implementation and evaluation. There was no parameter search, quota filling or optimizer change. The first integration attempt rejected missing catalog cost and rolled back; the importer was repaired to represent null without changing editor rules or demand parameters.

Dataset portfolio-v1, seed 20251114,1 January–31 December 2025; current price comparison 30 days, actual historical forecast dates 1–30 January 2026, not the coming month today. Canonical checksum: `5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6`.

30 products/30 variants,5 categories,9863 orders,54 refunds,853 price periods,107 cost periods,9930 inventory snapshots. Orders are synthetic daily bulk shipments (one per observed variant/day), not a representative shopper-basket distribution. No customer PII. Quarterly cost attestations and price transitions are deterministic. Missing-cost lines:166; known-cost coverage remains partial.

## Planned stories versus actual engine outcomes

15 ACTIONABLE and 15 withheld: 9 DIAGNOSTIC_ONLY,3 MISSING_COST,2 UNRELIABLE_ELASTICITY,1 INACTIVE_VARIANT. ACTIONABLE is the unchanged engine's status, not a scientific pass label. Every variant remains in this report; planned categories are unchanged after seeing results.

|Group|Frozen intended story|Approved|Withheld|
|---|---|---:|---:|
|ELASTIC_HIGH|3 independent elastic candidates|2|1|
|ELASTIC_LOW|3 independent inelastic/no-response candidates|3|0|
|SEASONAL|3 deliberately calendar-confounded|0|3|
|PROMOTION|hidden marketing / visible promotion / structural change|1|2|
|STOCKOUT|censored / absent / low stock|0|3|
|SPARSE|5/20/50 observed days; missing cost|0|3|
|REFUND|3 independent responses; refund-objective limit|3|0|
|COST_CHANGE_UNKNOWN|historical gap / wrong-cost witness / high cost|3|0|
|ARCHIVE|inactive / near optimum / ceiling|2|1|
|ZERO_SALES|selection / flat gain / floor|1|2|

## Failures and limitations first

- **PORT-PROMOTION-1 is an unsafe hidden-marketing approval.** Own beta−.25, observational estimate−1.888807. Engine suggests111→99.9 while the controlled own-effect oracle is122.1. Synthetic30-day reference contribution regret23,313.40 MAD. This curve is not identifiable from the generated observations; its oracle is evaluator truth, not permission to recommend.
- **PORT-COST_CHANGE_UNKNOWN-2 is an unsafe incorrect-cost approval.** Recorded cost59.6 versus true89.4. Engine suggests149→134.1; true bounded oracle163.9; regret8,668.63 MAD. A good slope estimate does not verify a recorded cost.
- PORT-ARCHIVE-2 has true optimum156 but suggests156.5222 (regret1.18 MAD). PORT-ZERO_SALES-2 has true optimum163 but suggests160.2443 (regret21.73 MAD). These preserve near-optimum/noise failures instead of presenting all green cards as beneficial.
- PORT-ELASTIC_HIGH-3 was a planned independent candidate but withholds on BACKTEST_EVIDENCE_INSUFFICIENT despite point estimate−3.014518 near true−3. The floor and low-stock examples also withhold. These are honest demonstration misses, not evidence to lower gates.
- All 30 production coefficient intervals remain unavailable. Weekly assignments provide about 45 price epochs, not 365 independent randomized interventions. No commercially calibrated/causal recommendation is established, including the other approved examples.
- Earlier11.13 broad unsafe results remain TEST 65/260 and CHALLENGE 41/156, with 0/20 causal interval coverage in hidden-marketing TEST. Old11.12 regression0/228 and0/380 and byte-identical11.13 case exports were rerun; the portfolio fixture does not solve those failures.

## Per-variant truth and actual estimates

C=independent generator true cost; recorded cost is separate. Evidence categories are frozen generator provenance. Null/unreliable outputs remain unavailable, not0. Full model readiness, fit/identification, assumptions, both backtest summaries, dates and comparisons are in artifacts/portfolio-evaluations.json. All fields passed through existing DTOs; truth/fixture labels are not model inputs.

|Fixture SKU|Name / story group|True beta|C / recorded cost MAD|Evidence|Estimated beta|Engine status|Current → suggested MAD|Bounded oracle MAD|True reference regret MAD|All abstention reasons|
|---|---|---:|---|---|---:|---|---|---:|---:|---|
|PORT-ARCHIVE-1|Classic Notebook · Classic / ARCHIVE|-2|58.4 / 58.4|INACTIVE|-2.0507|INACTIVE_VARIANT|146 → unavailable|unavailable|unavailable|CURRENT_CATALOG_INACTIVE; NO_POSITIVE_SUPPORTED_FORECAST|
|PORT-ARCHIVE-2|Classic Notebook · Studio / ARCHIVE|-2|78 / 78|INDEPENDENT_CONSTRAINED|-1.9934|ACTIONABLE|156 → 156.5222|156|1.1787|none returned|
|PORT-ARCHIVE-3|Classic Notebook · Travel / ARCHIVE|-0.25|66.4 / 66.4|INDEPENDENT_CONSTRAINED|-0.2664|ACTIONABLE|166 → 174.3|174.3|0|none returned|
|PORT-COST_CHANGE_UNKNOWN-1|Cotton Table Linen · Classic / COST_CHANGE_UNKNOWN|-2|55.6 / 55.6|INDEPENDENT_COST_CONTEXT|-1.9833|ACTIONABLE|139 → 125.1|125.1|0|none returned|
|PORT-COST_CHANGE_UNKNOWN-2|Cotton Table Linen · Studio / COST_CHANGE_UNKNOWN|-2|89.4 / 59.6|INCORRECT_COST_WITNESS|-1.9807|ACTIONABLE|149 → 134.1|163.9|8668.6265|none returned|
|PORT-COST_CHANGE_UNKNOWN-3|Cotton Table Linen · Travel / COST_CHANGE_UNKNOWN|-2|95.4 / 95.4|INDEPENDENT_COST_CONTEXT|-1.9521|ACTIONABLE|159 → 174.9|174.9|0|none returned|
|PORT-ELASTIC_HIGH-1|Roasted Coffee · Classic / ELASTIC_HIGH|-2|36 / 36|INDEPENDENT_WEEKLY_ASSIGNMENT|-1.9904|ACTIONABLE|90 → 81|81|0|none returned|
|PORT-ELASTIC_HIGH-2|Roasted Coffee · Studio / ELASTIC_HIGH|-2.6|40 / 40|INDEPENDENT_WEEKLY_ASSIGNMENT|-2.7166|ACTIONABLE|100 → 90|90|0|none returned|
|PORT-ELASTIC_HIGH-3|Roasted Coffee · Travel / ELASTIC_HIGH|-3|44 / 44|INDEPENDENT_WEEKLY_ASSIGNMENT|-3.0145|DIAGNOSTIC_ONLY|110 → unavailable|99|unavailable|BACKTEST_EVIDENCE_INSUFFICIENT|
|PORT-ELASTIC_LOW-1|Everyday Rice · Classic / ELASTIC_LOW|-0.25|38.8 / 38.8|INDEPENDENT_WEEKLY_ASSIGNMENT|-0.351|ACTIONABLE|97 → 106.7|106.7|0|none returned|
|PORT-ELASTIC_LOW-2|Everyday Rice · Studio / ELASTIC_LOW|-0.6|42.8 / 42.8|INDEPENDENT_WEEKLY_ASSIGNMENT|-0.6963|ACTIONABLE|107 → 117.7|117.7|0|none returned|
|PORT-ELASTIC_LOW-3|Everyday Rice · Travel / ELASTIC_LOW|0|46.8 / 46.8|INDEPENDENT_WEEKLY_ASSIGNMENT|-0.0048|ACTIONABLE|117 → 128.7|128.7|0|none returned|
|PORT-PROMOTION-1|Ceramic Mug · Classic / PROMOTION|-0.25|44.4 / 44.4|CONFOUNDED_OR_SELECTION|-1.8888|ACTIONABLE|111 → 99.9|122.1|23313.3991|none returned|
|PORT-PROMOTION-2|Ceramic Mug · Studio / PROMOTION|-1.2|48.4 / 48.4|CONFOUNDED_OR_SELECTION|-1.1336|DIAGNOSTIC_ONLY|121 → unavailable|unavailable|unavailable|LOW_ELIGIBLE_COVERAGE; ZERO_DISCREPANCY_OR_OUTLIER_SELECTION; RECENT_PRICE_MIX_NOT_REFERENCE_DEMAND|
|PORT-PROMOTION-3|Ceramic Mug · Travel / PROMOTION|-0.3|52.4 / 52.4|CONFOUNDED_OR_SELECTION|-1.9023|DIAGNOSTIC_ONLY|131 → unavailable|unavailable|unavailable|DISJOINT_PRICE_RESPONSE_UNSTABLE|
|PORT-REFUND-1|Canvas Carry Bag · Classic / REFUND|-2|52.8 / 52.8|INDEPENDENT_REFUND_OBJECTIVE_LIMIT|-2.0824|ACTIONABLE|132 → 118.8|118.8|0|none returned|
|PORT-REFUND-2|Canvas Carry Bag · Studio / REFUND|-1.5|56.8 / 56.8|INDEPENDENT_REFUND_OBJECTIVE_LIMIT|-1.536|ACTIONABLE|142 → 156.2|156.2|0|none returned|
|PORT-REFUND-3|Canvas Carry Bag · Travel / REFUND|-2|60.8 / 60.8|INDEPENDENT_REFUND_OBJECTIVE_LIMIT|-2.0084|ACTIONABLE|152 → 136.8|136.8|0|none returned|
|PORT-SEASONAL-1|Summer Picnic Set · Classic / SEASONAL|-1.1|41.6 / 41.6|CONFOUNDED_OR_SELECTION|-1.2112|DIAGNOSTIC_ONLY|104 → unavailable|unavailable|unavailable|SEASONAL_OR_CALENDAR_CONFOUNDING; DISJOINT_PRICE_RESPONSE_UNCHECKED|
|PORT-SEASONAL-2|Summer Picnic Set · Studio / SEASONAL|-1.2|45.6 / 45.6|CONFOUNDED_OR_SELECTION|-1.2516|DIAGNOSTIC_ONLY|114 → unavailable|unavailable|unavailable|SEASONAL_OR_CALENDAR_CONFOUNDING; DISJOINT_PRICE_RESPONSE_UNCHECKED|
|PORT-SEASONAL-3|Summer Picnic Set · Travel / SEASONAL|-1.3|49.6 / 49.6|CONFOUNDED_OR_SELECTION|-1.2462|DIAGNOSTIC_ONLY|124 → unavailable|unavailable|unavailable|SEASONAL_OR_CALENDAR_CONFOUNDING; DISJOINT_PRICE_RESPONSE_UNCHECKED|
|PORT-SPARSE-1|Travel Organizer · Classic / SPARSE|-0.9|50 / unavailable|INSUFFICIENT_MISSING_COST|unavailable|MISSING_COST|125 → unavailable|unavailable|unavailable|MISSING_OR_STALE_EFFECTIVE_COST; INSUFFICIENT_DEMAND_EVIDENCE; ELASTICITY_NOT_TRUSTWORTHY; PRICE_SUPPORT_OR_CONSTRAINTS_UNAVAILABLE; NO_POSITIVE_SUPPORTED_FORECAST; LOW_ELIGIBLE_COVERAGE; CRITICAL_STOCK_COVERAGE; ZERO_DISCREPANCY_OR_OUTLIER_SELECTION; BACKTEST_EVIDENCE_INSUFFICIENT|
|PORT-SPARSE-2|Travel Organizer · Studio / SPARSE|-0.9|54 / unavailable|INSUFFICIENT_MISSING_COST|unavailable|MISSING_COST|135 → unavailable|unavailable|unavailable|MISSING_OR_STALE_EFFECTIVE_COST; INSUFFICIENT_DEMAND_EVIDENCE; ELASTICITY_NOT_TRUSTWORTHY; PRICE_SUPPORT_OR_CONSTRAINTS_UNAVAILABLE; NO_POSITIVE_SUPPORTED_FORECAST; LOW_ELIGIBLE_COVERAGE; CRITICAL_STOCK_COVERAGE; ZERO_DISCREPANCY_OR_OUTLIER_SELECTION; BACKTEST_EVIDENCE_INSUFFICIENT|
|PORT-SPARSE-3|Travel Organizer · Travel / SPARSE|-0.9|58 / unavailable|INSUFFICIENT_MISSING_COST|unavailable|MISSING_COST|145 → unavailable|unavailable|unavailable|MISSING_OR_STALE_EFFECTIVE_COST; INSUFFICIENT_DEMAND_EVIDENCE; ELASTICITY_NOT_TRUSTWORTHY; PRICE_SUPPORT_OR_CONSTRAINTS_UNAVAILABLE; NO_POSITIVE_SUPPORTED_FORECAST; LOW_ELIGIBLE_COVERAGE; CRITICAL_STOCK_COVERAGE; ZERO_DISCREPANCY_OR_OUTLIER_SELECTION; BACKTEST_EVIDENCE_INSUFFICIENT|
|PORT-STOCKOUT-1|Glass Storage Jar · Classic / STOCKOUT|-1.4|47.2 / 47.2|STOCK_CONSTRAINED|unavailable|UNRELIABLE_ELASTICITY|118 → unavailable|unavailable|unavailable|ELASTICITY_NOT_TRUSTWORTHY; LOW_ELIGIBLE_COVERAGE; CRITICAL_STOCK_COVERAGE; BACKTEST_EVIDENCE_INSUFFICIENT|
|PORT-STOCKOUT-2|Glass Storage Jar · Studio / STOCKOUT|-2|51.2 / 51.2|STOCK_CONSTRAINED|-2.0419|DIAGNOSTIC_ONLY|128 → unavailable|unavailable|unavailable|BACKTEST_EVIDENCE_INSUFFICIENT; NO_FRESH_TRUSTED_POSITIVE_STOCK|
|PORT-STOCKOUT-3|Glass Storage Jar · Travel / STOCKOUT|-2|55.2 / 55.2|STOCK_CONSTRAINED|-2.0539|DIAGNOSTIC_ONLY|138 → unavailable|unavailable|unavailable|BACKTEST_EVIDENCE_INSUFFICIENT|
|PORT-ZERO_SALES-1|Desk Pen Set · Classic / ZERO_SALES|-1.2|61.2 / 61.2|CONFOUNDED_OR_SELECTION|unavailable|UNRELIABLE_ELASTICITY|153 → unavailable|unavailable|unavailable|ELASTICITY_NOT_TRUSTWORTHY; ZERO_DISCREPANCY_OR_OUTLIER_SELECTION|
|PORT-ZERO_SALES-2|Desk Pen Set · Studio / ZERO_SALES|-1.6667|65.2 / 65.2|INDEPENDENT_CONSTRAINED|-1.686|ACTIONABLE|163 → 160.2443|163|21.7321|none returned|
|PORT-ZERO_SALES-3|Desk Pen Set · Travel / ZERO_SALES|-2|69.2 / 69.2|INDEPENDENT_CONSTRAINED|-2.1196|DIAGNOSTIC_ONLY|173 → unavailable|164.35|unavailable|BACKTEST_EVIDENCE_INSUFFICIENT|

## API estimated contribution versus independent reference economics

API values below are used directly, not recalculated as a second pricing model. Estimated contribution is sales minus known variable costs, excluding other business expenses. Never full net profit or guaranteed earnings. Independent regret uses expected synthetic own-price demand at the actual historical30-day comparison dates, including weekday factors and lognormal mean correction, true cost and intersected observed/catalog/+/-10% bounds. Normalized regret divides by positive oracle contribution. Floating residuals under1e−7 MAD are treated as numerical0. No price or regret is imputed for abstention. No independent oracle is assigned for preregistered confounded/structural/selection/sparse/stock-limited cases, except the explicitly controlled hidden-marketing witness. Refund cases use the optimizer's pre-refund contribution objective; no refund-adjusted/full-profit optimum is asserted.

|SKU|API current → candidate units|API current → candidate contribution MAD|API estimated difference MAD / %|Independent oracle contribution MAD|Approved-price true contribution MAD|Normalized regret|
|---|---|---|---|---:|---:|---:|
|PORT-ARCHIVE-1|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-ARCHIVE-2|1362.5000 → 1353.4539|106275.0000 → 106276.1789|1.1789 / 0.0011|105896.0414|105894.8627|0|
|PORT-ARCHIVE-3|1458.7500 → 1439.9155|145291.5000 → 155366.8777|10075.3777 / 6.9346|157869.3438|157869.3438|0|
|PORT-COST_CHANGE_UNKNOWN-1|1221.1250 → 1504.9143|101841.8250 → 104591.5459|2749.7209 / 2.7000|105899.0889|105899.0889|0|
|PORT-COST_CHANGE_UNKNOWN-2|1387.8750 → 1709.9402|124076.0250 → 127390.5480|3314.5230 / 2.6714|83590.3273|74921.7007|0.1037|
|PORT-COST_CHANGE_UNKNOWN-3|1521.1250 → 1262.8818|96743.5500 → 100399.1018|3655.5518 / 3.7786|97309.5451|97309.5451|0|
|PORT-ELASTIC_HIGH-1|1245.0000 → 1535.4835|67230.0000 → 69096.7572|1866.7572 / 2.7767|68567.7554|68567.7554|0|
|PORT-ELASTIC_HIGH-2|1371.1250 → 1825.4920|82267.5000 → 91274.5984|9007.0984 / 10.9486|89273.9196|89273.9196|0|
|PORT-ELASTIC_HIGH-3|unavailable|unavailable|unavailable|111740.0458|unavailable|unavailable|
|PORT-ELASTIC_LOW-1|1230.5000 → 1190.0177|71615.1000 → 80802.1991|9187.0991 / 12.8284|81830.2807|81830.2807|0|
|PORT-ELASTIC_LOW-2|1397.5000 → 1307.7633|89719.5000 → 97951.4694|8231.9694 / 9.1752|96035.3956|96035.3956|0|
|PORT-ELASTIC_LOW-3|1462.3750 → 1461.7024|102658.7250 → 119713.4242|17054.6992 / 16.6130|121299.102|121299.102|0|
|PORT-PROMOTION-1|1235.3750 → 1507.3909|82275.9750 → 83660.1926|1384.2176 / 1.6824|93640.8367|70327.4375|0.249|
|PORT-PROMOTION-2|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-PROMOTION-3|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-REFUND-1|1263.0000 → 1572.8562|100029.6000 → 103808.5104|3778.9104 / 3.7778|100566.0412|100566.0412|0|
|PORT-REFUND-2|1332.8750 → 1151.3540|113560.9500 → 114444.5923|883.6423 / 0.7781|116972.1519|116972.1519|0|
|PORT-REFUND-3|1433.6250 → 1771.4769|130746.6000 → 134632.2478|3885.6478 / 2.9719|138963.9843|138963.9843|0|
|PORT-SEASONAL-1|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-SEASONAL-2|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-SEASONAL-3|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-SPARSE-1|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-SPARSE-2|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-SPARSE-3|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-STOCKOUT-1|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-STOCKOUT-2|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-STOCKOUT-3|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-ZERO_SALES-1|unavailable|unavailable|unavailable|unavailable|unavailable|unavailable|
|PORT-ZERO_SALES-2|1385.1250 → 1425.5216|135465.2250 → 135487.6994|22.4744 / 0.0166|132777.3442|132755.6122|0.0002|
|PORT-ZERO_SALES-3|unavailable|unavailable|unavailable|156147.5829|unavailable|unavailable|

## Financial guidance and presentation

All 30 resource-scoped guidance endpoints were checked. Default scenarios are empty. Explicit assumed100 units at each price, candidate .9B,30days and zero-unentered-extras consent were supplied separately; these are **merchant assumptions, not forecasts**. Known-cost current contribution arithmetic was reconciled; sparse variants retain null cost and empty contribution scenarios rather than inventing zero. Missing fixed costs leave break-even unavailable. The browser exercise also used90→80 with assumed100→110 units, a separate unsaved calculator scenario; it was never saved as a model evaluation or actual price.

Analytics reconciles SQL net sales59,946,403.0400 MAD (gross59,950,686.4400 less refunds4,283.4000),9863 orders, zero invalid order/line/refund checks. Known-cost contribution33,465,177.0400 excludes return-cost recovery and other expenses; sales-cost coverage98.3169% is partial. These are generated records, not actual business results.

Browser checks reached product list/detail, guidance, actionable insight and missing-cost/withheld states at320/375/768/1440px.25 recorded states: no page/console errors, global overflow or axe WCAG A/AA violations in tested states. Keyboard opened/trapped/closed workspace disclosure and submitted search; this is a developer smoke check, not independent merchant usability or exhaustive accessibility certification. Real screenshots and browser-results.json are committed. Existing local monogram placeholders are used, no scraped assets. SaaS seeding remains deferred to keep installations isolated; no live Shopify/billing/customer validation.

## Reproduce

Launch via docs/demo/README.md. Run backend ./mvnw.cmd verify, then node research/pricing/evaluate-portfolio.mjs and node research/pricing/verify-portfolio.mjs from root. Export the live portfolio canonical file with ./scripts/portfolio-demo.ps1 export, copy backend/target/demo-canonical.jsonl to backend/target/portfolio-local-canonical.jsonl before running the verifier. The IT suite produces its independent canonical export under backend/target/portfolio-verification; full dumps are deliberately not committed. Read-only legacy/isolation verifiers write only new docs/demo/artifacts outputs. Preserve historical research artifacts, migrations and original checksum. Do not start 11.15 automatically.
