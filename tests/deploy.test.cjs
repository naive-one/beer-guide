const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync,spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const expected=['404.html','_headers','app.js','core.js','data/beers.json','data/data.js','index.html','robots.txt','styles.css'];
const tree=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(path.join(dir,e.name)).map(x=>e.name+'/'+x):[e.name]).sort();

test('Workers config uses only dist, a matching name, and actual 404s',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
 assert.equal(cfg.name,'beer-guide');assert.equal(cfg.assets.directory,'./dist');
 assert.equal(cfg.assets.not_found_handling,'404-page');assert.equal(cfg.main,undefined);
 assert.equal(cfg.pages_build_output_dir,undefined);
});
test('build is deterministic, purges stale dist files, and publishes only allowlisted files',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'beer-guide-build-test-'));
 try{
  for(const f of ['index.html','styles.css','app.js','core.js','data/beers.json','scripts/build.mjs','public/404.html','public/_headers','public/robots.txt']){
   fs.mkdirSync(path.dirname(path.join(temp,f)),{recursive:true});fs.copyFileSync(path.join(root,f),path.join(temp,f));
  }
  fs.mkdirSync(path.join(temp,'dist'),{recursive:true});fs.writeFileSync(path.join(temp,'dist','stale-private.txt'),'not for publication');
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:temp});
  assert.deepEqual(tree(path.join(temp,'dist')),expected);
  const first=fs.readFileSync(path.join(temp,'standalone.html'));
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:temp});
  assert.deepEqual(fs.readFileSync(path.join(temp,'standalone.html')),first);
  assert.equal(fs.existsSync(path.join(temp,'dist','stale-private.txt')),false);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('committed dist assets match current sources and include non-sticky cache headers',()=>{
 assert.deepEqual(tree(path.join(root,'dist')),expected);
 for(const f of ['index.html','app.js','core.js','styles.css','data/beers.json','data/data.js'])assert.deepEqual(fs.readFileSync(path.join(root,f)),fs.readFileSync(path.join(root,'dist',f)));
 const headers=fs.readFileSync(path.join(root,'dist/_headers'),'utf8');
 assert.match(headers,/X-Content-Type-Options: nosniff/);assert.match(headers,/max-age=0, must-revalidate/);
 assert.ok(!fs.readFileSync(path.join(root,'dist/index.html'),'utf8').includes('src="https://'));
});
test('local preview serves the application, not repository files, and returns real 404',async t=>{
 const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill());
 const base=await new Promise((resolve,reject)=>{
  let text='';const timer=setTimeout(()=>reject(new Error('Preview start timed out')),7000);
  child.on('error',err=>{clearTimeout(timer);reject(err);});
  child.stdout.on('data',data=>{text+=data;const m=text.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});
  child.on('exit',code=>{clearTimeout(timer);reject(new Error('Preview exited: '+code));});
 });
 for(const file of ['/','/styles.css','/app.js','/core.js','/data/data.js','/data/beers.json'])assert.equal((await fetch(base+file)).status,200,file);
 for(const file of ['/README.md','/.git/config','/_headers','/missing.js','/scripts/build.mjs'])assert.equal((await fetch(base+file)).status,404,file);
 assert.equal((await fetch(base+'/app.js',{method:'HEAD'})).status,200);
 assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
});
