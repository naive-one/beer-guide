const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('consumer UI has no supplied ranking or classification',()=>{
 const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('app.js','utf8');
 assert.doesNotMatch(html,/id="ranking"|href="#ranking"|id="tier-filter"|value="new"|YOUR PICKS/);
 assert.doesNotMatch(app,/renderTierBoard|tierBadge|tierDetail|state\.tierFilter|b\.originalList/);
});
const C=require('../core.js');
const r=(value,checkedAt,match='matched',sourceId='new')=>({platform:'Untappd',scale:5,value,count:0,countType:'reviews',sourceId,checkedAt,note:'test',evidenceFile:'test.json',match});
test('explicit platform selects latest matched supplemental, never highest or related',()=>{
 const b={id:'test',rating:{...r(4,'2026-09-01'),platform:'BeerAdvocate'},communityRatings:[r(5,'2026-09-01'),r(0,'2026-09-28','matched','latest'),r(5,'2026-09-29','related','related')]};
 const s={...C.defaults(),scorePlatform:'Untappd'};
 assert.equal(C.rating(b,C.defaults()),b.rating);
 assert.equal(C.rating(b,s).value,0);assert.equal(C.isInScope(b,s),true);
 assert.equal(C.resolve(b,{...s,minRatings:1}).eligible,false);
 assert.equal(C.rating(b,{...s,scoreMode:'personal'}),null);
 const related={...b,communityRatings:[r(5,'2026-09-29','related')]};
 assert.equal(C.rating(related,s),null);assert.equal(C.isInScope(related,s),true);
 assert.equal(C.displayPoint(C.resolve(related,s),s).scoreBasis,'related');
 assert.equal(C.displayPoint(C.resolve(related,{...s,scorePlatform:'Other'}),{...s,scorePlatform:'Other'}).plotRating,null);
 assert.equal(C.communityRatings({...b,communityRatings:[{...b.rating,match:'matched'}]}).length,1);
});
test('platform fallback, tie breaking and chart agree without changing default cohorts',()=>{
 const b={...require('../data/beers.json').beers.find(b=>b.id==='paulaner'),communityRatings:[r(4,'2026-09-28','matched','z'),r(1,'2026-09-28','matched','a')]};
 const s={...C.defaults(),scorePlatform:'Untappd'},row=C.resolve(b,s);
 assert.equal(row.activeRating.sourceId,'a');assert.equal(C.displayPoint(row,s).plotRating.value,1);
 assert.equal(C.chartModel(C.analyze({beers:[b]},s),s).rows[0].plotRating.value,1);
 assert.equal(C.rating({...b,communityRatings:[]},{...s,scorePlatform:b.rating.platform}),b.rating);
 assert.equal(C.rating(b,{...s,scoreMode:'personal',personalScores:{[b.id]:0}}).value,0);
});
test('newer legacy beats supplement; equal-date selection is deterministic and immutable',()=>{
 const b={id:'x',rating:r(1,'2026-09-29','matched','legacy'),communityRatings:[r(5,'2026-09-28')]},before=JSON.stringify(b),s={...C.defaults(),scorePlatform:'Untappd'};
 assert.equal(C.rating(b,s).sourceId,'legacy');
 b.communityRatings.push(r(4,'2026-09-29','matched','aaa'));
 assert.equal(C.rating(b,s).sourceId,'aaa');
 b.communityRatings.pop();assert.equal(JSON.stringify(b),before);
});
test('real supplemental paths keep primary, related and personal scores separate',()=>{
 const D=require('../data/beers.json'),s={...C.defaults(),scorePlatform:'Untappd'};
 for(const id of ['weihen','asahi','snow']){
  const b=D.beers.find(b=>b.id===id),supp=b.communityRatings.find(r=>r.platform==='Untappd');assert.ok(supp);
  assert.deepEqual(C.rating(b,C.defaults()),b.rating||null);
  assert.equal(C.rating(b,{...s,scoreMode:'personal'}),null);
  if(id==='weihen')assert.deepEqual(C.rating(b,s),supp);
  else {assert.equal(C.rating(b,s),null);assert.equal(C.relatedRating(b,s).sourceId,supp.sourceId);}
  for(const r of C.communityRatings(b))assert.match(D.sources[r.sourceId].url,/^https?:\/\//);
 }
});
test('actual card renderer does not call priced no-guide beers pending',()=>{
 const vm=require('node:vm'),D=require('../data/beers.json');
 const code=fs.readFileSync('app.js','utf8').split('// Delegation handles')[0]+"analysis=C.analyze(D,state);window.testUI={card,countLabel};})();";
 const context={window:{BEER_DATA:D,BeerCore:C},document:{},console};vm.runInNewContext(code,context);
 const beers=C.catalogView(D).beers.filter(b=>b.quote&&!b.purchaseGuide);assert.ok(beers.length);
 for(const b of beers){const html=context.window.testUI.card(C.resolve(b,C.defaults()));assert.doesNotMatch(html,/暂无已核验报价|价格、规格与评价待补/);assert.ok(html.includes(b.review.fit));}
 assert.equal(context.window.testUI.countLabel({platform:'Untappd',count:123,countType:'ratings'}),'123次评分');
 assert.equal(context.window.testUI.countLabel({platform:'酒花儿',count:123,countType:'reviews'}),'123条评论 · 评分次数未公布');
});
