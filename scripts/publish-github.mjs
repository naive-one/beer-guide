/** One-time importer for the user-selected repository. Uses normal Git authentication.
 * No force pushes, token handling, deletion of remote files, or global config changes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const TARGET='https://github.com/naive-one/beer-guide.git';
export const INITIAL_README_SHA='5bbb1e02c7958e2ac5aed98a085e86a162f9101f';
export const sha256=content=>crypto.createHash('sha256').update(content).digest('hex');

export function safePath(value){
 if(typeof value!=='string'||!value||value.includes('\\')||value.includes('\0')||value.includes(':')||value.startsWith('/')||path.posix.normalize(value)!==value)throw new Error('Unsafe package path');
 const parts=value.split('/');
 if(parts.some(x=>!x||x==='..'||x==='.git'||x==='node_modules'||x==='.wrangler'||x.startsWith('.env')||x.startsWith('.dev.vars')))throw new Error('Sensitive or unsafe package path: '+value);
 return value;
}
export function readManifest(root){
 const data=JSON.parse(fs.readFileSync(path.join(root,'repository-manifest.json'),'utf8'));
 if(data.schemaVersion!==1||data.target!==TARGET||!Array.isArray(data.files)||data.files.length===0)throw new Error('Invalid repository manifest');
 const seen=new Set();
 for(const item of data.files){
  safePath(item.path);
  if(seen.has(item.path)||!/^[a-f0-9]{64}$/.test(item.sha256))throw new Error('Duplicate path or invalid checksum');
  seen.add(item.path);
  const filename=path.join(root,item.path);
  // Every parent must also be a real directory, never a symlink to other data.
  let cursor=root;
  for(const part of item.path.split('/').slice(0,-1)){cursor=path.join(cursor,part);if(!fs.lstatSync(cursor).isDirectory()||fs.lstatSync(cursor).isSymbolicLink())throw new Error('Unsafe directory: '+item.path);}
  if(!fs.lstatSync(filename).isFile()||fs.lstatSync(filename).isSymbolicLink())throw new Error('Not a regular file: '+item.path);
  if(sha256(fs.readFileSync(filename))!==item.sha256)throw new Error('Package has changed: '+item.path+'. Review and commit manually instead of using the initial-import script.');
 }
 return [...data.files.map(f=>f.path),'repository-manifest.json'];
}

export function assertSafeRemote(root,checkout,packageFiles,remoteFiles,readmeSha){
 const allowed=new Set(packageFiles);
 for(const entry of remoteFiles){
  safePath(entry);
  if(!allowed.has(entry))throw new Error('Remote already contains an unrelated file: '+entry+'. Stopping without overwriting.');
  const local=fs.readFileSync(path.join(root,entry));
  const target=path.join(checkout,entry);
  if(!fs.lstatSync(target).isFile()||fs.lstatSync(target).isSymbolicLink())throw new Error('Remote path is not a regular file: '+entry);
  const remote=fs.readFileSync(target);
  if(local.equals(remote))continue;
  if(entry==='README.md'&&readmeSha===INITIAL_README_SHA)continue;
  throw new Error('Remote contains different content: '+entry+'. Stopping; merge manually and never force-push.');
 }
}
function run(command,args,options={}){
 const result=spawnSync(command,args,{stdio:options.capture?'pipe':'inherit',encoding:'utf8',...options});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error(`${command} ${args[0]??''} failed (exit ${result.status}).${options.capture?' '+(result.stderr||'').trim():''}`);
 return (result.stdout||'').trim();
}
const git=(cwd,args,capture=false)=>run('git',['-C',cwd,...args],{capture});

async function main(){
 if(process.argv.includes('--help')){
  console.log('Run: node scripts/publish-github.mjs\nRequires Node 22+, Git, and your own GitHub write authentication.\nTarget: '+TARGET+' (main)\nInitial import only; no force push or remote deletion.');return;
 }
 if(process.argv.length>2)throw new Error('Unsupported argument; use --help.');
 if(Number(process.versions.node.split('.')[0])<22)throw new Error('Node.js 22 or newer is required.');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const files=readManifest(root);
 run('git',['--version']);
 console.log('Checking build and tests before accessing the remote...');
 run(process.execPath,['scripts/build.mjs'],{cwd:root});
 run(process.execPath,['--test','tests/core.test.cjs','tests/deploy.test.cjs','tests/publish.test.cjs'],{cwd:root});
 readManifest(root);
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'beer-guide-publish-'));
 const checkout=path.join(work,'repo');
 let success=false;
 try{
  console.log('Cloning target; normal Git authentication will be used.');
  run('git',['clone','--branch','main','--single-branch','--',TARGET,checkout]);
  const remoteFiles=git(checkout,['ls-tree','-r','--name-only','HEAD'],true).split('\n').filter(Boolean);
  const readmeSha=remoteFiles.includes('README.md')?git(checkout,['hash-object','README.md'],true):null;
  assertSafeRemote(root,checkout,files,remoteFiles,readmeSha);
  for(const filename of files){const target=path.join(checkout,filename);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,filename),target);}
  git(checkout,['add','--all']);
  const diff=spawnSync('git',['-C',checkout,'diff','--cached','--quiet'],{stdio:'inherit'});
  if(diff.error)throw diff.error;
  if(diff.status===0){console.log('Repository already matches this package. No commit or push needed.');success=true;return;}
  if(diff.status!==1)throw new Error('Could not inspect staged changes.');
  for(const [key,value] of [['user.name','Beer Guide Publisher'],['user.email','noreply@localhost']]){
   const result=spawnSync('git',['-C',checkout,'config','--get',key],{encoding:'utf8'});
   if(result.status!==0||!result.stdout.trim())git(checkout,['config','--local',key,value]);
  }
  git(checkout,['commit','-m','feat: add beer frontier site and Cloudflare static deployment']);
  // A normal push rejects concurrent remote changes rather than overwriting them.
  git(checkout,['push','origin','HEAD:main']);
  const sha=git(checkout,['rev-parse','HEAD'],true);
  const remote=git(checkout,['ls-remote','origin','refs/heads/main'],true).split(/\s+/)[0];
  if(remote!==sha)throw new Error('Push returned success, but remote main changed before verification. Inspect the remote commit before reporting completion.');
  console.log('\nVerified remote commit: '+sha+'\nhttps://github.com/naive-one/beer-guide/commit/'+sha+'\nCloudflare was NOT deployed. Use the settings in README.md.');
  success=true;
 }finally{
  if(success)fs.rmSync(work,{recursive:true,force:true});
  else console.error('Kept temporary checkout for inspection: '+work+'\nNo force-push was attempted.');
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{console.error('\nPublish failed: '+error.message+'\nUse your own authenticated Git environment; do not paste access tokens into chat.');process.exitCode=1;});
}
