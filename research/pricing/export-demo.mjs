// Read-only, anonymous diagnostics. No writes to application data.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=process.argv[2]??'http://localhost:8084';
const out=new URL('../../docs/pricing-research/artifacts/',import.meta.url);
await mkdir(out,{recursive:true});
const get=async path=>{const r=await fetch(base+path);if(!r.ok)throw Error(`${r.status} ${path}`);return r.json();};
const query='startDate=2025-01-01&endDate=2026-01-01&horizonDays=30';
const summary=await get('/api/v1/demo/summary');
const checksum='6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34';
if(!summary.matchesSeed||summary.currentChecksum!==checksum)throw Error('Permanent checksum changed');
let evaluations=[];
for(let page=0;page<3;page++)evaluations.push(...(await get(`/api/v1/optimization/overview?${query}&size=10&page=${page}`)).results.content);
if(evaluations.length!==30||new Set(evaluations.map(e=>e.variant.variantId)).size!==30)throw Error('Incomplete catalog');
const source=await readFile(new URL('../../backend/src/main/java/com/smartpricing/optimization/service/OptimizationService.java',import.meta.url),'utf8');
const gates=[...source.matchAll(/blockers.put\("([A-Z_]+)"/g)].map(m=>m[1]);
const records=[];
for(const e of evaluations){
 if(e.status==='ACTIONABLE'||e.recommendedPrice!==null||e.comparison!==null||e.sensitivity.length)throw Error('Demo no longer abstains');
 const d=await get(`/api/v1/forecasting/variants/${e.variant.variantId}/demand?${query}`);
 const history=d.history; if(!Array.isArray(history))throw Error('History unavailable');
 const prices=history.map(x=>x.effectivePrice).filter(x=>x!==null);let transitions=0;
 for(let i=1;i<prices.length;i++)if(prices[i]!==prices[i-1])transitions++;
 const reported=new Set(e.reasons);
 records.push({sku:e.variant.sku,variantId:e.variant.variantId,name:e.variant.productName,status:e.status,
  days:history.length,quantityObservationDays:history.filter(x=>x.units>0).length,units:history.reduce((s,x)=>s+x.units,0),returnedUnits:history.reduce((s,x)=>s+x.returnedUnits,0),
  priceLevels:new Set(prices).size,priceTransitions:transitions,priceSpread:prices.length?Math.max(...prices.map(Number))/Math.min(...prices.map(Number))-1:null,
  historySha256:createHash('sha256').update(JSON.stringify(history)).digest('hex'),
  statisticalEffectiveSampleSize:null,unavailableDiagnostics:['AUTOCORRELATION_ADJUSTED_ESS','SUBWINDOW_COEFFICIENT_NOT_EXPOSED_BY_DTO','CALIBRATED_UNCERTAINTY'],
  elasticity:e.elasticity,inputs:e.inputs,forecast:{...e.forecast,daily:undefined},backtests:e.backtests,
  blockers:e.reasons,assumptions:e.assumptions,
  gates:Object.fromEntries(gates.map(g=>[g,reported.has(g)?'BLOCKED':g==='NO_SUPPORTED_CONTRIBUTION_IMPROVEMENT'||g==='INVALID_OR_NONFINITE_MODEL_OUTPUT'?'NOT_REACHED':'NOT_REPORTED_AS_BLOCKER']))});
}
records.sort((a,b)=>a.sku.localeCompare(b.sku));
const counts={};for(const r of records)for(const b of r.blockers)counts[b]=(counts[b]??0)+1;
await writeFile(new URL('demo-diagnosis.json',out),JSON.stringify({window:{start:'2025-01-01',endExclusive:'2026-01-01',horizon:30},checksum,gateInterpretation:'NOT_REPORTED_AS_BLOCKER is not proof of scientific validity. Conditional branches may not run. Post-optimization gates NOT_REACHED.',counts,records},null,2)+'\n');
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const rows=records.map(r=>[r.sku,r.status,r.quantityObservationDays,r.units,r.priceLevels,r.priceTransitions,r.elasticity.readiness.eligibleDays,r.elasticity.estimate,r.elasticity.identification?.calendarPriceR2,r.elasticity.identification?.residualLogPriceSd,r.blockers.join(';'),r.historySha256]);
await writeFile(new URL('demo-diagnosis.csv',out),['sku,status,positiveQuantityDays,units,priceLevels,priceTransitions,eligibleDays,estimate,calendarPriceR2,residualPriceSd,blockers,historySha256',...rows.map(r=>r.map(quote).join(','))].join('\n')+'\n');
const table=['| Variant | Eligible / days | Prices / changes | Estimate | Final status | All blockers |','|---|---:|---:|---:|---|---|',...records.map(r=>`| ${r.sku} | ${r.elasticity.readiness.eligibleDays}/${r.days} | ${r.priceLevels}/${r.priceTransitions} | ${r.elasticity.estimate??'unavailable'} | ${r.status} | ${r.blockers.join(', ')} |`)];
await writeFile(new URL('../demo-abstention-diagnosis.md',out),'# Permanent demo abstention diagnosis\n\nRead-only actual pipeline, full 2025 window, 30-day horizon. All 30 withhold prices, comparisons and sensitivity curves. Historical forecast dates remain historical.\n\n'+table.join('\n')+'\n\n## Overlapping causes\n\n'+Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`- ${k}: ${v}/30`).join('\n')+'\n\nCounts overlap; final status is the first blocking status, not a complete diagnosis. Seasonal confounding is not the only cause. The JSON artifact contains every returned gate reason, source-code gate inventory, quantities, readiness/exclusions, controls, parameter/RMSE and identification diagnostics, input freshness and backtests for each variant. A gate not reported as blocking is not proof of identification. Post-optimization gates are not reached on these abstentions. No calibrated intervals exist; promotion labels are unavailable. Availability and effective sample size limitations remain.\n\nReproduce: `node research/pricing/export-demo.mjs http://localhost:8084` against the unchanged demo profile (port configurable). This performs GETs only. Source history SHA-256 hashes accompany the artifact; no PII is exported. Permanent checksum: `'+checksum+'`.\n');
console.log(JSON.stringify({variants:records.length,actionable:0,checksum,counts}));
