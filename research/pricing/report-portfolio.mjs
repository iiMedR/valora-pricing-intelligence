import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url),dir=new URL('docs/demo/artifacts/',root);
const rows=JSON.parse(await readFile(new URL('portfolio-evaluations.json',dir),'utf8')),summary=JSON.parse(await readFile(new URL('portfolio-summary.json',dir),'utf8'));
const value=x=>x===null||x===undefined?'unavailable':Number(x).toLocaleString('en-US',{maximumFractionDigits:4,useGrouping:false});
const planned={ELASTIC_HIGH:'3 independent elastic candidates',ELASTIC_LOW:'3 independent inelastic/no-response candidates',SEASONAL:'3 deliberately calendar-confounded',PROMOTION:'hidden marketing / visible promotion / structural change',STOCKOUT:'censored / absent / low stock',SPARSE:'5/20/50 observed days; missing cost',REFUND:'3 independent responses; refund-objective limit',COST_CHANGE_UNKNOWN:'historical gap / wrong-cost witness / high cost',ARCHIVE:'inactive / near optimum / ceiling',ZERO_SALES:'selection / flat gain / floor'};
let text=`# Portfolio evaluation — actual frozen-dataset outputs

**Demo implementation PASS; causal model validation NOT ESTABLISHED.** Frozen design/seed committed at 274cd26 before implementation and evaluation. There was no parameter search, quota filling or optimizer change. The first integration attempt rejected missing catalog cost and rolled back; the importer was repaired to represent null without changing editor rules or demand parameters.

Dataset portfolio-v1, seed 20251114,1 January–31 December 2025; current price comparison 30 days, actual historical forecast dates 1–30 January 2026, not the coming month today. Canonical checksum: \`${summary.currentChecksum}\`.

${summary.summary.products} products/${summary.summary.variants} variants,5 categories,${summary.summary.orders} orders,${summary.summary.refunds} refunds,${summary.summary.priceObservations} price periods,${summary.summary.costObservations} cost periods,${summary.summary.inventoryObservations} inventory snapshots. Orders are synthetic daily bulk shipments (one per observed variant/day), not a representative shopper-basket distribution. No customer PII. Quarterly cost attestations and price transitions are deterministic. Missing-cost lines:${summary.summary.unknownCostLines}; known-cost coverage remains partial.

## Planned stories versus actual engine outcomes

15 ACTIONABLE and 15 withheld: 9 DIAGNOSTIC_ONLY,3 MISSING_COST,2 UNRELIABLE_ELASTICITY,1 INACTIVE_VARIANT. ACTIONABLE is the unchanged engine's status, not a scientific pass label. Every variant remains in this report; planned categories are unchanged after seeing results.

|Group|Frozen intended story|Approved|Withheld|
|---|---|---:|---:|
`;
for(const [group,story] of Object.entries(planned)){let r=rows.filter(x=>x.truth.group===group);text+=`|${group}|${story}|${r.filter(x=>x.status==='ACTIONABLE').length}|${r.filter(x=>x.status!=='ACTIONABLE').length}|\n`;}
text+=`
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
`;
for(const r of rows)text+=`|${r.sku}|${r.name} / ${r.truth.group}|${value(r.truth.ownPriceElasticity)}|${value(r.truth.trueUnitCost)} / ${value(r.truth.recordedUnitCost)}|${r.truth.evidence}|${value(r.elasticity.estimate)}|${r.status}|${value(r.inputs.currentPrice)} → ${value(r.recommendedPrice)}|${value(r.oraclePrice)}|${value(r.absoluteRegret)}|${r.reasons.length?r.reasons.join('; '):'none returned'}|\n`;
text+=`
## API estimated contribution versus independent reference economics

API values below are used directly, not recalculated as a second pricing model. Estimated contribution is sales minus known variable costs, excluding other business expenses. Never full net profit or guaranteed earnings. Independent regret uses expected synthetic own-price demand at the actual historical30-day comparison dates, including weekday factors and lognormal mean correction, true cost and intersected observed/catalog/+/-10% bounds. Normalized regret divides by positive oracle contribution. Floating residuals under1e−7 MAD are treated as numerical0. No price or regret is imputed for abstention. No independent oracle is assigned for preregistered confounded/structural/selection/sparse/stock-limited cases, except the explicitly controlled hidden-marketing witness. Refund cases use the optimizer's pre-refund contribution objective; no refund-adjusted/full-profit optimum is asserted.

|SKU|API current → candidate units|API current → candidate contribution MAD|API estimated difference MAD / %|Independent oracle contribution MAD|Approved-price true contribution MAD|Normalized regret|
|---|---|---|---|---:|---:|---:|
`;
for(const r of rows){const c=r.comparison;text+=`|${r.sku}|${c?`${c.current.expectedUnits} → ${c.candidate.expectedUnits}`:'unavailable'}|${c?`${c.current.estimatedContribution} → ${c.candidate.estimatedContribution}`:'unavailable'}|${c?`${c.estimatedUplift} / ${c.estimatedUpliftPercent}`:'unavailable'}|${value(r.oracleContribution)}|${value(r.approvedTrueContribution)}|${value(r.normalizedRegret)}|\n`;}
text+=`
## Financial guidance and presentation

All 30 resource-scoped guidance endpoints were checked. Default scenarios are empty. Explicit assumed100 units at each price, candidate .9B,30days and zero-unentered-extras consent were supplied separately; these are **merchant assumptions, not forecasts**. Known-cost current contribution arithmetic was reconciled; sparse variants retain null cost and empty contribution scenarios rather than inventing zero. Missing fixed costs leave break-even unavailable. The browser exercise also used90→80 with assumed100→110 units, a separate unsaved calculator scenario; it was never saved as a model evaluation or actual price.

Analytics reconciles SQL net sales59,946,403.0400 MAD (gross59,950,686.4400 less refunds4,283.4000),9863 orders, zero invalid order/line/refund checks. Known-cost contribution33,465,177.0400 excludes return-cost recovery and other expenses; sales-cost coverage98.3169% is partial. These are generated records, not actual business results.

Browser checks reached product list/detail, guidance, actionable insight and missing-cost/withheld states at320/375/768/1440px.25 recorded states: no page/console errors, global overflow or axe WCAG A/AA violations in tested states. Keyboard opened/trapped/closed workspace disclosure and submitted search; this is a developer smoke check, not independent merchant usability or exhaustive accessibility certification. Real screenshots and browser-results.json are committed. Existing local monogram placeholders are used, no scraped assets. SaaS seeding remains deferred to keep installations isolated; no live Shopify/billing/customer validation.

## Reproduce

Launch via docs/demo/README.md. Run backend ./mvnw.cmd verify, then node research/pricing/evaluate-portfolio.mjs and node research/pricing/verify-portfolio.mjs from root. Export the live portfolio canonical file with ./scripts/portfolio-demo.ps1 export, copy backend/target/demo-canonical.jsonl to backend/target/portfolio-local-canonical.jsonl before running the verifier. The IT suite produces its independent canonical export under backend/target/portfolio-verification; full dumps are deliberately not committed. Read-only legacy/isolation verifiers write only new docs/demo/artifacts outputs. Preserve historical research artifacts, migrations and original checksum. Do not start 11.15 automatically.
`;
await writeFile(new URL('docs/demo/portfolio-evaluation.md',root),text);
