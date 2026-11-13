import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]??'http://localhost:8087',dir=new URL('../../docs/demo/artifacts/',import.meta.url);await mkdir(dir,{recursive:true});
const get=async path=>{let r=await fetch(base+path);if(!r.ok)throw Error(r.status+' '+path);return r.json();};
const summary=await get('/api/v1/demo/summary');if(summary.summary.generatorVersion!=='portfolio-v1'||!summary.matchesSeed)throw Error('Wrong fixture');
const truth=JSON.parse(execFileSync('docker',['exec','smartpricing-portfolio-postgres-portfolio-1','psql','-U','smartpricing_demo','-d','smartpricing_demo','-At','-c','SELECT ground_truth FROM demo_control.seed_runs WHERE id=1'],{encoding:'utf8'}));
const rows=[];
for(let page=0;page<3;page++){
 const data=await get(`/api/v1/optimization/overview?startDate=2025-01-01&endDate=2026-01-01&horizonDays=30&page=${page}&size=10`);
 for(const r of data.results.content){
  const t=truth.scenarios.find(x=>x.sku===r.variant.sku);if(!t)throw Error('Missing truth');
  const path=`/api/v1/guidance/products/${r.variant.productId}/variants/${r.variant.variantId}`;
  const facts=await get(path),assumed=await get(path+'?periodDays=30&candidatePrice='+(Number(t.basePrice)*.9).toFixed(4)+'&currentUnits=100&scenarioUnits=100&costsConfirmed=true');
  if(facts.resultEvidence!=='CALCULATED_SCENARIO'||Object.keys(facts.scenario).length)throw Error('Guidance authority/default changed');
  if(t.recordedUnitCost===null&&(facts.facts.unitCost!=null||Object.keys(assumed.current).length||Object.keys(assumed.scenario).length))throw Error('Invented missing cost');
  if(t.recordedUnitCost!==null&&Math.abs(Number(assumed.current.totalContribution)-(Number(t.basePrice)-Number(t.recordedUnitCost))*100)>1e-7)throw Error('Guidance arithmetic mismatch');
  const oracleAvailable=!['SEASONAL','PROMOTION','STOCKOUT','SPARSE'].includes(t.group)&&!(t.group==='ARCHIVE'&&t.replica===1)&&!(t.group==='ZERO_SALES'&&t.replica===1);
  const witness=t.group==='PROMOTION'&&t.replica===1;
  let low=Math.max(Number((.9*Number(t.basePrice)).toFixed(4)),Number(r.inputs.catalogMin)),high=Math.min(Number((1.1*Number(t.basePrice)).toFixed(4)),Number(r.inputs.catalogMax));
  // Standardized future30-day own-price response; not an estimated or guaranteed outcome.
  let reference=0;for(let i=0;i<30;i++){const day=new Date(Date.UTC(2026,0,1+i)).getUTCDay();reference+=Number(t.referenceUnits)*(day===1||day===2?1.3:day===0||day===6?.8:1)*Math.exp(.5*.06*.06);}
  const contribution=p=>reference*Math.pow(p/Number(t.basePrice),Number(t.ownPriceElasticity))*(p-Number(t.trueUnitCost));
  let oracle=null;if(oracleAvailable||witness){let options=[low,high,Number(t.basePrice),Number(t.ownPriceElasticity)*Number(t.trueUnitCost)/(Number(t.ownPriceElasticity)+1)].filter(p=>Number.isFinite(p)&&p>=low&&p<=high);oracle=options.reduce((best,p)=>contribution(p)>contribution(best)?p:best,options[0]);}
  let recommended=r.recommendedPrice===null?null:Number(r.recommendedPrice),regret=recommended!==null&&oracle!==null?contribution(oracle)-contribution(recommended):null;if(regret!==null&&Math.abs(regret)<1e-7)regret=0;
  rows.push({sku:r.variant.sku,name:r.variant.productName,truth:t,status:r.status,reasons:r.reasons,assumptions:r.assumptions,inputs:r.inputs,elasticity:r.elasticity,forecastDates:r.forecast.daily.map(x=>x.date),backtests:r.backtests.map(x=>({cutoff:x.cutoff,status:x.status,model:x.model,naive:x.naive,reasons:x.reasons})),recommendedPrice:r.recommendedPrice,comparison:r.comparison,oraclePrice:oracle,oracleBasis:witness?'CONTROLLED_OWN_EFFECT_WITNESS_NOT_IDENTIFIABLE':oracleAvailable?'KNOWN_STATIONARY_GENERATOR_EXCLUDING_FUTURE_REFUNDS':'UNAVAILABLE_UNDER_PREREGISTERED_EVIDENCE_SCOPE',oracleContribution:oracle===null?null:contribution(oracle),approvedTrueContribution:recommended===null||oracle===null?null:contribution(recommended),absoluteRegret:regret,normalizedRegret:regret===null?null:regret/contribution(oracle),guidance:{facts:facts.facts,missing:facts.missing,current:assumed.current,scenario:assumed.scenario,assumptions:assumed.assumptions,exclusions:assumed.exclusions,resultEvidence:assumed.resultEvidence},browserContext:{productId:r.variant.productId,variantId:r.variant.variantId}});
 }
}
if(rows.length!==30||new Set(rows.map(r=>r.sku)).size!==30)throw Error('Incomplete portfolio evaluation');rows.sort((a,b)=>a.sku.localeCompare(b.sku,'en'));
await writeFile(new URL('portfolio-summary.json',dir),JSON.stringify(summary,null,2)+'\n');await writeFile(new URL('portfolio-truth.json',dir),JSON.stringify(truth,null,2)+'\n');await writeFile(new URL('portfolio-evaluations.json',dir),JSON.stringify(rows,null,2)+'\n');
const counts={};for(const r of rows)counts[r.status]=(counts[r.status]??0)+1;console.log(JSON.stringify({checksum:summary.currentChecksum,counts,approved:rows.filter(r=>r.status==='ACTIONABLE').map(r=>({sku:r.sku,price:r.recommendedPrice,beta:r.elasticity.estimate,oracle:r.oraclePrice,regret:r.absoluteRegret}))},null,2));
