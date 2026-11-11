import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../docs/pricing-research/artifacts/',import.meta.url);
function parse(text){let rows=[],row=[],v='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(v);v='';}else if(c==='\n'&&!quoted){row.push(v);rows.push(row);row=[];v='';}else if(c!=='\r')v+=c;}const header=rows.shift();return rows.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]])));}
const rows=parse(await readFile(new URL('trials.csv',root),'utf8')).filter(r=>r.split==='TEST');
const number=v=>v===''?null:Number(v);
const stats=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;let mean=a.reduce((s,v)=>s+v,0)/a.length;return {n:a.length,mean,min:a[0],max:a.at(-1),variance:a.length>1?a.reduce((s,v)=>s+(v-mean)**2,0)/(a.length-1):null,p90:a[Math.ceil(a.length*.9)-1],sd:a.length>1?Math.sqrt(a.reduce((s,v)=>s+(v-mean)**2,0)/(a.length-1)):null};};
function summarize(list){const fitted=list.filter(r=>number(r.estimate)!==null),intervals=list.filter(r=>number(r.low)!==null),unsafe=list.filter(r=>r.shouldAbstain==='true'&&r.httpWindowSupported==='true');return {n:list.length,estimated:fitted.length,error:stats(fitted.map(r=>Number(r.estimate)-Number(r.syntheticTarget))),absoluteError:stats(fitted.map(r=>Math.abs(Number(r.estimate)-Number(r.syntheticTarget)))),intervals:intervals.length,covered:intervals.filter(r=>Number(r.low)<=Number(r.syntheticTarget)&&Number(r.high)>=Number(r.syntheticTarget)).length,intervalWidth:stats(intervals.map(r=>Number(r.high)-Number(r.low))),priorShare:stats(list.map(r=>number(r.priorShare)).filter(v=>v!==null)),actionable:list.filter(r=>r.policyActionable==='true').length,unsafeApiCases:unsafe.length,falseActionable:unsafe.filter(r=>r.falseActionable==='true').length,unsafeNegativeInterval:unsafe.filter(r=>r.signConfidentNegative==='true').length,regretPercent:stats(list.map(r=>number(r.regretPercent)).filter(v=>v!==null))};}
const methods=Object.fromEntries([...new Set(rows.map(r=>r.method))].map(m=>[m,summarize(rows.filter(r=>r.method===m))]));
const scenarios=Object.fromEntries([...new Set(rows.map(r=>r.scenario))].map(s=>[s,Object.fromEntries([...new Set(rows.filter(r=>r.scenario===s).map(r=>r.method))].map(m=>[m,summarize(rows.filter(r=>r.scenario===s&&r.method===m))]))]));
const pairedKeys=new Set(rows.filter(r=>r.method==='A_PRODUCTION'&&r.estimate!=='').map(r=>r.fixtureHash));
const paired=Object.fromEntries(Object.keys(methods).map(m=>[m,summarize(rows.filter(r=>r.method===m&&pairedKeys.has(r.fixtureHash)))]));
const experiments=parse(await readFile(new URL('experiment-simulation.csv',root),'utf8'));
const experimentSummary=[];
for(const days of ['30','90','365'])for(const volume of ['0.7','200.0'])for(const beta of ['-0.25','-2.0']){
 const list=experiments.filter(r=>r.days===days&&r.assumedDailyUnits===volume&&r.trueSyntheticElasticity===beta);
 experimentSummary.push({days,volume,beta,n:list.length,width:stats(list.map(r=>Number(r.conditionalIntervalWidth))),priorShare:stats(list.map(r=>Number(r.posteriorPriorShare))),downsideTrials:list.filter(r=>Number(r.syntheticExpectedContributionDifferenceVsHold100)<0).length,difference:stats(list.map(r=>Number(r.syntheticExpectedContributionDifferenceVsHold100)))});
}
await writeFile(new URL('experiment-summary.json',root),JSON.stringify(experimentSummary,null,2)+'\n');
const production=rows.filter(r=>r.method==='A_PRODUCTION'&&r.policyActionable==='true').map(r=>{
 const contribution=p=>(p-40)*(r.scenario==='NONLINEAR'?Math.exp(-2*(p-100)/100):Math.pow(p/100,Number(r.syntheticTarget)));
 return {scenario:r.scenario,seed:r.seed,price:Number(r.productionPrice),regret:100*(contribution(Number(r.oraclePrice))-contribution(Number(r.productionPrice)))/contribution(Number(r.oraclePrice))};
});
await writeFile(new URL('production-candidates.json',root),JSON.stringify({label:'Actual allowed production prices, synthetic expected-curve comparison only',summary:stats(production.map(r=>r.regret)),trials:production},null,2)+'\n');
await writeFile(new URL('summary.json',root),JSON.stringify({split:'TEST',seeds:'1001..1012',intervalCaveat:'Conditional approximate coverage of local synthetic targets; NOT calibrated confidence or causal identification. Mixed scenarios are not a population performance estimate.',methods,pairedOnProductionAvailable:paired,scenarios},null,2)+'\n');
console.log(JSON.stringify(methods,null,2));
