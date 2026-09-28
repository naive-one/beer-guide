const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const data=read('data/beers.json');
const input=read('research/2026-09-28/community-ratings.json');
const audit=read('research/2026-09-28/audit.json');
const summary=read('research/2026-09-28/summary.json');

test('supplemental research covers every current ID without duplicate measurements',()=>{
 assert.deepEqual(audit.map(x=>x.beerId).sort(),data.catalogScope.activeIds.slice().sort());
 assert.equal(new Set(audit.map(x=>x.beerId)).size,audit.length);
 assert.equal(audit.length,summary.auditedBeerCount);
 assert.equal(input.records.length,summary.newRatingRecords);
 assert.equal(new Set(input.records.map(x=>x.source.url)).size,summary.newDistinctSourcePages);
 assert.equal(input.records.filter(x=>x.rating.match==='matched').length,summary.matchedRecords);
 assert.equal(input.records.filter(x=>x.rating.match==='related').length,summary.relatedRecords);
 assert.equal(data.meta.coverage.sources,Object.keys(data.sources).length);
});

test('every imported number is bound to a saved public-page observation and source',()=>{
 const keys=new Set();
 for(const {beerId,rating,source} of input.records){
  const beer=data.beers.find(x=>x.id===beerId);
  const evidence=read(rating.evidenceFile);
  assert.ok(beer);
  const key=beerId+'|'+source.url;
  assert.ok(!keys.has(key));keys.add(key);
  assert.deepEqual(beer.communityRatings.find(x=>x.sourceId===source.id),rating);
  assert.deepEqual(data.sources[source.id],source);
  assert.equal(evidence.status,'read');
  assert.equal(evidence.url,source.url);
  for(const field of ['platform','scale','value','count','countType','checkedAt'])assert.equal(rating[field],evidence[field],`${beerId}: ${field}`);
  assert.equal(evidence.countLabel,'Ratings');
  assert.equal(evidence.retrieval,'public-page-header');
  assert.match(evidence.rawPageSha256,/^[a-f0-9]{64}$/);
  assert.ok(rating.note.length>0);
  if(rating.match==='matched')assert.equal(beer.abv,evidence.abv,beerId);
 }
});

test('current editorial copy has no ranking labels and archival originals remain',()=>{
 const current=data.beers.filter(b=>data.catalogScope.activeIds.includes(b.id));
 const history=read('research/2026-09-28/previous-copy.json');
 assert.equal(history.length,current.length);
 for(const b of current){
  assert.ok(history.find(x=>x.beerId===b.id));
  assert.doesNotMatch([b.review.positive,b.review.caution,b.review.fit,...b.tags].join(' '),/用户榜单|用户将|主观档位|顶级|人上人|拉完了/);
 }
 assert.ok(data.tierList.tiers.length>0);
});
