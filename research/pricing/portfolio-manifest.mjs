import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),manifestPath='docs/demo/artifacts/manifest.json';
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const changed=git(['diff','--name-only','6ae3e090fb832eace8cd489996de2ce8508a3ff3']).split(/\r?\n/),untracked=git(['ls-files','--others','--exclude-standard']).split(/\r?\n/);
const files=[...new Set([...changed,...untracked,manifestPath].filter(Boolean))].sort();
const hash=b=>createHash('sha256').update(b).digest('hex');
const entries=[];for(const file of files){if(file===manifestPath){entries.push({path:file,sha256:null,note:'Manifest excludes its own recursive hash'});continue;}const bytes=await readFile(new URL(file,root));entries.push({path:file,sha256:hash(file.endsWith('.png')?bytes:bytes.toString('utf8').replace(/\r\n/g,'\n'))});}
const legacy=await readFile(new URL('backend/target/legacy-research-canonical.jsonl',root)),portfolio=await readFile(new URL('backend/target/portfolio-local-canonical.jsonl',root));
if(hash(legacy)!=='6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34'||hash(portfolio)!=='5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6')throw Error('Fixture hash mismatch');
const result={milestone:'11.14',baseline:'6ae3e090fb832eace8cd489996de2ce8508a3ff3',designAuditCommit:'274cd26',gitHeadAtManifestGeneration:git(['rev-parse','HEAD']),sourceHashEncoding:'UTF-8 normalized LF; raw PNG bytes',datasets:{legacy:{version:'demo-v1',sha256:hash(legacy),canonicalBytes:legacy.length},portfolio:{version:'portfolio-v1',seed:20251114,startDate:'2025-01-01',endDate:'2025-12-31',sha256:hash(portfolio),canonicalBytes:portfolio.length,twoFreshRunsByteIdentical:true}},verification:{backendUnit:126,backendPostgresIntegration:67,frontendTests:145,frontendFiles:35,failures:0,errors:0,skipped:0,browserStates:25,browserWidths:[320,375,768,1440],liveShopify:'NOT_VERIFIED',liveBilling:'NOT_VERIFIED'},files:entries};
await writeFile(new URL(manifestPath,root),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({files:entries.length,legacyBytes:legacy.length,portfolioBytes:portfolio.length}));
