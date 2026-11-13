import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),dir=new URL('docs/demo/artifacts/',root);
const sql=q=>execFileSync('docker',['exec','smartpricing-portfolio-postgres-portfolio-1','psql','-U','smartpricing_demo','-d','smartpricing_demo','-At','-c',q],{encoding:'utf8'}).trim();
const migrations=sql('SELECT version,checksum FROM flyway_schema_history ORDER BY installed_rank');
if(migrations!=='1|1436242292\n2|581270318\n3|-1414359703\n4|56597636\n5|147175724\n6|-1432513541\n7|-319300667')throw Error('Migration drift');
if(sql('SELECT mode FROM installation_mode')!=='ECOMMERCE')throw Error('Mode drift');
const count=sql("SELECT (SELECT count(*) FROM products),(SELECT count(*) FROM product_variants),(SELECT count(*) FROM sales_orders),(SELECT count(*) FROM sales_refunds),(SELECT count(*) FROM app_accounts),(SELECT count(*) FROM model_evaluation_audit),(SELECT count(*) FROM subscription_events)");if(count!=='30|30|9863|54|0|0|0')throw Error('Count drift');
const invalidLines=sql('SELECT count(*) FROM sales_order_items WHERE line_net<>quantity*unit_price-discount_amount OR line_net<0');
const invalidOrders=sql('SELECT count(*) FROM sales_orders o WHERE o.subtotal<>(SELECT coalesce(sum(line_net),0) FROM sales_order_items i WHERE i.order_id=o.id)');
const invalidRefunds=sql('SELECT count(*) FROM (SELECT i.id FROM sales_order_items i JOIN sales_refunds r ON r.item_id=i.id GROUP BY i.id,i.quantity,i.line_net HAVING sum(r.quantity)>i.quantity OR sum(r.amount)>i.line_net) q');
if([invalidLines,invalidOrders,invalidRefunds].some(x=>x!=='0'))throw Error('Financial inconsistency');
const get=async path=>{const r=await fetch('http://localhost:8087'+path);if(!r.ok)throw Error(r.status+' '+path);return r.json()};
const summary=await get('/api/v1/demo/summary'),analytics=await get('/api/v1/analytics/overview?startDate=2025-01-01&endDate=2026-01-01');
const net=sql('SELECT (SELECT sum(line_net) FROM sales_order_items)-(SELECT sum(amount) FROM sales_refunds)');
const scaled=s=>{let [whole,fraction='']=s.split('.');return BigInt(whole)*10000n+BigInt(fraction.padEnd(4,'0'))};
if(scaled(net)!==scaled(analytics.metrics.netSales)||analytics.metrics.orders!==9863)throw Error('Analytics reconciliation');
for(const route of ['/api/v1/products','/api/v1/optimization/evaluations']){const r=await fetch('http://localhost:8087'+route,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});if(r.status!==403)throw Error('Demo write not refused: '+route+' '+r.status);}
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=await readFile(new URL('backend/target/portfolio-local-canonical.jsonl',root)),fresh=await readFile(new URL('backend/target/portfolio-verification/canonical.jsonl',root));
if(!canonical.equals(fresh)||hash(canonical)!=='5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6'||summary.currentChecksum!==hash(canonical)||!summary.matchesSeed)throw Error('Canonical drift');
const current13=await readFile(new URL('backend/target/evidence-quality/cases.csv',root)),saved13=await readFile(new URL('docs/pricing-research/milestone-11-13-artifacts/cases.csv',root));if(!current13.equals(saved13))throw Error('11.13 research changed');
const current12=await readFile(new URL('backend/target/pricing-research/optimizer-safety.csv',root)),saved12=await readFile(new URL('docs/pricing-research/milestone-11-12-artifacts/optimizer-safety.csv',root));if(!current12.equals(saved12))throw Error('11.12 safety changed');
const controls={};for(const split of ['KNOWN_REGRESSION','PROSPECTIVE']){const rows=current12.toString().trim().split(/\r?\n/).slice(1).map(x=>x.split(',').map(v=>v.replace(/^"|"$/g,''))).filter(r=>r[0]===split&&r[4]==='true'&&r[5]==='true');controls[split]={unsafe:rows.length,approved:rows.filter(r=>r[7]==='ACTIONABLE').length};}
const result={portfolioChecksum:hash(canonical),canonicalBytes:canonical.length,localMatchesTwoFreshTestExport:true,rows:count,mode:'ECOMMERCE',migrations:migrations.split('\n'),invalidLines:+invalidLines,invalidOrders:+invalidOrders,invalidRefunds:+invalidRefunds,sqlNetSales:net,apiAnalytics:analytics,writeAttemptsRefused403:true,benchmark11_12ByteIdentical:true,benchmark11_13ByteIdentical:true,controls,liveShopify:'NOT_VERIFIED',liveBilling:'NOT_VERIFIED'};
await writeFile(new URL('portfolio-integrity.json',dir),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({checksum:result.portfolioChecksum,bytes:canonical.length,netSales:net,controls}));
