const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {pathToFileURL}=require('node:url');
const modulePromise=import(pathToFileURL(path.resolve(__dirname,'../scripts/publish-github.mjs')).href);

test('publisher rejects traversal paths, credentials, and other hidden runtime data',async()=>{
 const {safePath}=await modulePromise;
 for(const value of ['../secret','/etc/passwd','a/../../x','.git/config','.env','.env.local','node_modules/x','.wrangler/state','C:/secret','a\\b','a//b'])assert.throws(()=>safePath(value),value);
 for(const value of ['.gitignore','.nvmrc','data/beers.json','dist/index.html'])assert.equal(safePath(value),value);
});
test('manifest verifies regular files and prevents silently publishing a modified package',async()=>{
 const {readManifest,sha256,TARGET}=await modulePromise;
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'beer-guide-manifest-test-'));
 try{
  fs.writeFileSync(path.join(root,'README.md'),'known');
  fs.writeFileSync(path.join(root,'repository-manifest.json'),JSON.stringify({schemaVersion:1,target:TARGET,files:[{path:'README.md',sha256:sha256('known')}]}));
  assert.deepEqual(readManifest(root),['README.md','repository-manifest.json']);
  fs.writeFileSync(path.join(root,'README.md'),'modified');assert.throws(()=>readManifest(root),/Package has changed/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('remote protection permits only identical files or the known initial README',async()=>{
 const {assertSafeRemote,INITIAL_README_SHA}=await modulePromise;
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'beer-guide-remote-test-'));
 try{
  const root=path.join(temp,'source'),remote=path.join(temp,'remote');fs.mkdirSync(root);fs.mkdirSync(remote);
  fs.writeFileSync(path.join(root,'README.md'),'new');fs.writeFileSync(path.join(remote,'README.md'),'initial');
  assert.doesNotThrow(()=>assertSafeRemote(root,remote,['README.md'],['README.md'],INITIAL_README_SHA));
  assert.throws(()=>assertSafeRemote(root,remote,['README.md'],['README.md'],'unexpected'),/different content/);
  assert.throws(()=>assertSafeRemote(root,remote,['README.md'],['other.txt'],INITIAL_README_SHA),/unrelated file/);
  fs.writeFileSync(path.join(remote,'README.md'),'new');assert.doesNotThrow(()=>assertSafeRemote(root,remote,['README.md'],['README.md'],'irrelevant'));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
