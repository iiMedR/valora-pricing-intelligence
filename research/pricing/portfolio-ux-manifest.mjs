import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),target='docs/demo/artifacts/milestone-11-15/manifest.json';
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const files=[...new Set([...git(['diff','--name-only','1e8df6fae9075282abb95887b28a22c89391e282']).split(/\r?\n/),...git(['ls-files','--others','--exclude-standard']).split(/\r?\n/),target].filter(Boolean))].sort();
const entries=[];for(const path of files){if(path===target){entries.push({path,sha256:null});continue;}let b=await readFile(new URL(path,root));if(!path.endsWith('.png'))b=b.toString('utf8').replace(/\r\n/g,'\n');entries.push({path,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile(new URL(target,root),JSON.stringify({milestone:'11.15',baseline:'1e8df6fae9075282abb95887b28a22c89391e282',auditCommit:'7e55af0',sourceHeadAtGeneration:git(['rev-parse','HEAD']),hashEncoding:'UTF-8 normalized LF; raw PNG; manifest excludes recursive self-hash',backendChanges:false,datasetChanges:false,files:entries},null,2)+'\n');console.log('Manifest files: '+entries.length);
