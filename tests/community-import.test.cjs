const test=require('node:test'),assert=require('node:assert/strict');
const data=require('../data/beers.json');
const source={id:'supplement-test',title:'Test',url:'https://example.com/rating',kind:'review',evidence:'page',publishedAt:null,checkedAt:'2026-09-28',note:'fixture'};
const rating={platform:'Untappd',scale:5,value:0,count:0,countType:'ratings',sourceId:source.id,checkedAt:'2026-09-28',note:'fixture',evidenceFile:'research/test.json',match:'matched'};
test('supplemental importer preserves archives, is immutable and idempotent',async()=>{
 const {integrate}=await import('../scripts/import-community-ratings.mjs');
 const input={records:[{beerId:data.beers[0].id,rating,source}]},before=JSON.stringify(data),raw=JSON.stringify(input);
 const next=integrate(data,input);assert.equal(JSON.stringify(data),before);assert.equal(JSON.stringify(input),raw);
 assert.equal(next.meta.coverage.sources,Object.keys(next.sources).length);
 assert.deepEqual(integrate(next,input),next);
 const restored=structuredClone(next);if(data.beers[0].communityRatings)restored.beers[0].communityRatings=structuredClone(data.beers[0].communityRatings);else delete restored.beers[0].communityRatings;delete restored.sources[source.id];restored.meta.coverage.sources=data.meta.coverage.sources;assert.deepEqual(restored,data);
 for(const patch of [{scale:10},{value:6},{count:-1},{count:0.5},{match:'other'},{checkedAt:'2026-02-30'},{evidenceFile:'../secret'},{sourceId:'missing'}])assert.throws(()=>integrate(data,{records:[{...input.records[0],rating:{...rating,...patch}}]}));
 assert.throws(()=>integrate(data,{records:[...input.records,...input.records]}));
 assert.throws(()=>integrate(data,{records:[{...input.records[0],beerId:'unknown'}]}));
 assert.throws(()=>integrate(data,{records:[{...input.records[0],source:{...source,url:'javascript:alert(1)'}}]}));
});
test('build contract rejects missing registration, bad source and duplicate rows',async()=>{
 const {validateCommunity}=await import('../scripts/community-contract.mjs');
 assert.throws(()=>validateCommunity({beers:[{communityRatings:[rating]}],sources:{}}));
 for(const patch of [{url:'file:///tmp/private'},{checkedAt:'bad'},{publishedAt:'2026-02-30'},{title:9}])assert.throws(()=>validateCommunity({beers:[{communityRatings:[rating]}],sources:{[source.id]:{...source,...patch}}}));
 assert.throws(()=>validateCommunity({beers:[{communityRatings:[rating,rating]}],sources:{[source.id]:source}}));
});
test('CLI defaults to dry-run, writes idempotently and never overwrites input',()=>{
 const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
 const root=require('node:os').tmpdir();fs.mkdirSync(root,{recursive:true});
 const dir=fs.mkdtempSync(path.join(root,'community-cli-'));
 try{
  const dataPath=path.join(dir,'beers.json'),inputPath=path.join(dir,'input.json');
  const initial=JSON.stringify(data),input=JSON.stringify({records:[{beerId:data.beers[0].id,rating,source}]});
  fs.writeFileSync(dataPath,initial);fs.writeFileSync(inputPath,input);
  const launch=args=>{const out=path.join(dir,'stdout'),err=path.join(dir,'stderr'),outFd=fs.openSync(out,'w'),errFd=fs.openSync(err,'w');let result;try{result=spawnSync(process.execPath,args,{stdio:['ignore',outFd,errFd]});}finally{fs.closeSync(outFd);fs.closeSync(errFd);}return {...result,stdout:fs.readFileSync(out,'utf8'),stderr:fs.readFileSync(err,'utf8')};};
  const run=(...extra)=>launch(['scripts/import-community-ratings.mjs','--data',dataPath,'--input',inputPath,...extra]);
  let result=run();assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).mode,'dry-run');assert.equal(fs.readFileSync(dataPath,'utf8'),initial);
  result=run('--write');assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).changed,true);
  const written=fs.readFileSync(dataPath,'utf8');result=run('--write');assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).changed,false);assert.equal(fs.readFileSync(dataPath,'utf8'),written);
  assert.equal(fs.readFileSync(inputPath,'utf8'),input);
  result=launch(['scripts/import-community-ratings.mjs','--data',inputPath,'--input',inputPath,'--write']);assert.notEqual(result.status,0);assert.equal(fs.readFileSync(inputPath,'utf8'),input);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
