import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]??'http://localhost:8084',output=new URL('../../docs/pricing-research/milestone-11-12-artifacts/',import.meta.url);
await mkdir(output,{recursive:true});
const get=async path=>{const r=await fetch(base+path);if(!r.ok)throw Error(r.status+' '+path);return r.json()};
const expected='6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34';
const before=await get('/api/v1/demo/summary');if(before.currentChecksum!==expected||!before.matchesSeed)throw Error('Baseline checksum mismatch');
const rows=[];for(let page=0;page<3;page++){
 const r=await get(`/api/v1/optimization/overview?startDate=2025-01-01&endDate=2026-01-01&horizonDays=30&page=${page}&size=10`);
 for(const v of r.results.content){
  if(v.status==='ACTIONABLE'||v.recommendedPrice!==null||v.comparison!==null||v.sensitivity.length)throw Error('Unexpected permanent-demo actionability');
  const guidance=await get(`/api/v1/guidance/products/${v.variant.productId}/variants/${v.variant.variantId}`);
  if(guidance.resourceId!==v.variant.variantId||guidance.resultEvidence!=='CALCULATED_SCENARIO'||Object.keys(guidance.scenario).length)throw Error('Unexpected guidance authority/default scenario');
  rows.push({sku:v.variant.sku,variantId:v.variant.variantId,status:v.status,modelVersion:v.modelVersion,reasons:v.reasons,currentCatalogFacts:guidance.facts,asOf:guidance.asOf,assumptionsRequired:guidance.missing});
 }
}
if(rows.length!==30||new Set(rows.map(r=>r.variantId)).size!==30)throw Error('Incomplete demo check');
const after=await get('/api/v1/demo/summary');if(after.currentChecksum!==expected||!after.matchesSeed)throw Error('Demo changed');
await writeFile(new URL('permanent-demo.json',output),JSON.stringify({checksum:expected,unchanged:true,variants:30,orders:after.summary.orders,refunds:after.summary.refunds,historicalObservations:after.summary.priceObservations+after.summary.costObservations+after.summary.inventoryObservations,actionable:0,readOnlyGetOnly:true,rows},null,2)+'\n');
console.log(JSON.stringify({variants:rows.length,actionable:0,checksum:expected}));
