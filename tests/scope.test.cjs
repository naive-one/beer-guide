const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../core.js'),D=require('../data/beers.json');
const captured=require('../research/2026-09-27/taobao-audit.json');
const approved=require('./fixtures/current-catalog.json');
test('frozen current scope retains hang21 and captured others while archiving master67',()=>{
 const view=C.catalogView(D),active=new Set(view.beers.map(b=>b.id));
 assert.equal(D.beers.length,67);assert.equal(view.beers.length,40);assert.equal(view.beers.filter(b=>b.userTier==='hang').length,21);
 assert.equal(view.beers.filter(b=>b.userTier!=='hang').length,19);
 assert.deepEqual([...active].sort(),D.catalogScope.activeIds.slice().sort());
 for(const b of D.beers.filter(b=>b.userTier==='hang'))assert.ok(active.has(b.id));
 assert.deepEqual([...active].sort(),approved.slice().sort());
 assert.equal(D.tierList.tiers.flatMap(t=>t.entries).length,49);
 assert.ok(view.tierList.tiers.flatMap(t=>t.entries).every(e=>active.has(e.beerId)));
});
test('archived personal evidence survives validation but never participates or uses compare slots',()=>{
 const hidden=D.beers.find(b=>!D.catalogScope.activeIds.includes(b.id));
 const p=C.validateImport({schemaVersion:1,overrides:{[hidden.id]:{total:1,quantity:1,volumeMl:500}},personalScores:{[hidden.id]:5},shortlist:[hidden.id,'paulaner','weihen','pang']},new Set(D.beers.map(b=>b.id)));
 assert.equal(p.personalScores[hidden.id],5);assert.equal(p.overrides[hidden.id].total,1);assert.ok(p.shortlist.includes(hidden.id));
 assert.deepEqual(C.currentShortlist(D,p.shortlist),['paulaner','weihen','pang']);
 const a=C.analyze(D,{...C.defaults(),...p,scoreMode:'personal',priceScope:'all'});
 assert.equal(a.rows.length,40);assert.ok(!a.rows.some(b=>b.id===hidden.id));assert.equal(a.eligible.length,0);
});
test('later imports preserve frozen scope, master audit support and idempotence',async()=>{
 const {integrate}=await import('../scripts/import-research.mjs');
 const hidden=D.beers.find(b=>!D.catalogScope.activeIds.includes(b.id));
 const prices=[{...captured[0],id:hidden.id}];
 const ratings=require('../research/2026-09-27/ratings-audit.json'),ledger=require('../research/2026-09-27/source-ledger.json');
 const result=integrate(D,ratings,prices,ledger);
 assert.deepEqual(result.catalogScope,D.catalogScope);assert.equal(result.beers.length,67);
 assert.ok(!C.analyze(result,C.defaults()).rows.some(b=>b.id===hidden.id));
 assert.deepEqual(integrate(result,ratings,prices,ledger),result);
});
