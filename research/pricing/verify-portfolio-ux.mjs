import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),out=new URL(process.argv[2] ?? 'docs/demo/artifacts/milestone-11-15/',root);
const get=async(base,path)=>{const r=await fetch(base+path);if(!r.ok)throw Error(r.status+' '+path);return r.json()};
const expected={portfolio:'5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6',legacy:'6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34'};
const result={readOnly:true,datasets:{},migrations:{},counts:{},benchmarkBytes:{}};
const baseline=JSON.parse(await readFile(new URL('docs/demo/artifacts/portfolio-evaluations.json',root),'utf8'));
for(const [name,port] of [['portfolio',8087],['legacy',8081]]){
 const base='http://localhost:'+port,s=await get(base,'/api/v1/demo/summary');if(!s.matchesSeed||s.currentChecksum!==expected[name])throw Error('Dataset drift '+name);
 const rows=[];for(let page=0;page<3;page++){const r=await get(base,`/api/v1/optimization/overview?startDate=2025-01-01&endDate=2026-01-01&horizonDays=30&page=${page}&size=10`);rows.push(...r.results.content)}
 if(rows.length!==30)throw Error('Incomplete evaluation');
 if(name==='portfolio')for(const row of rows){let b=baseline.find(x=>x.sku===row.variant.sku);if(!b||b.status!==row.status||b.recommendedPrice!==row.recommendedPrice||JSON.stringify(b.comparison)!==JSON.stringify(row.comparison))throw Error('Portfolio output changed '+row.variant.sku);}
 if(name==='legacy'&&rows.some(r=>r.status==='ACTIONABLE'||r.recommendedPrice!==null||r.comparison!==null||r.sensitivity.length))throw Error('Legacy abstention changed');
 result.datasets[name]={checksum:s.currentChecksum,summary:s.summary,approved:rows.filter(r=>r.status==='ACTIONABLE').length,withheld:rows.filter(r=>r.status!=='ACTIONABLE').length,outputsUnchanged:true};
}
const migrationLines=['1|1436242292','2|581270318','3|-1414359703','4|56597636','5|147175724','6|-1432513541','7|-319300667'];
for(const [name,container,user,counts] of [['normal','smartpricing-local-postgres-1','smartpricing','0|0|0|1|0|0'],['legacy','smartpricing-demo-postgres-demo-1','smartpricing_demo','30|9466|114|0|0|0'],['portfolio','smartpricing-portfolio-postgres-portfolio-1','smartpricing_demo','30|9863|54|0|0|0']]){
 const q="SELECT (SELECT count(*) FROM products),(SELECT count(*) FROM sales_orders),(SELECT count(*) FROM sales_refunds),(SELECT count(*) FROM app_accounts),(SELECT count(*) FROM model_evaluation_audit),(SELECT count(*) FROM subscription_events); SELECT version,checksum FROM flyway_schema_history ORDER BY installed_rank;";
 const r=execFileSync('docker',['exec',container,'psql','-U',user,'-d',user,'-At','-c',q],{encoding:'utf8'}).trim().split(/\r?\n/);if(r[0]!==counts||JSON.stringify(r.slice(1))!==JSON.stringify(migrationLines))throw Error('DB invariant '+name);result.counts[name]=r[0];result.migrations[name]=r.slice(1);
}
for(const [name,current,saved] of [['11.12','backend/target/pricing-research/optimizer-safety.csv','docs/pricing-research/milestone-11-12-artifacts/optimizer-safety.csv'],['11.13','backend/target/evidence-quality/cases.csv','docs/pricing-research/milestone-11-13-artifacts/cases.csv']]){const a=await readFile(new URL(current,root)),b=await readFile(new URL(saved,root));if(!a.equals(b))throw Error('Benchmark changed '+name);result.benchmarkBytes[name]={unchanged:true,sha256:createHash('sha256').update(a).digest('hex')};}
const fresh=await readFile(new URL('backend/target/portfolio-verification/canonical.jsonl',root));if(createHash('sha256').update(fresh).digest('hex')!==expected.portfolio)throw Error('Fresh export mismatch');result.twoFreshSeeds=await readFile(new URL('backend/target/portfolio-verification/reproducibility.txt',root),'utf8');
await writeFile(new URL('invariants.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({portfolio:result.datasets.portfolio.approved,withheld:result.datasets.portfolio.withheld,legacyWithheld:result.datasets.legacy.withheld,benchmarksUnchanged:true,twoFreshSeeds:true}));
