const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../data/beers.json');
const C=require('../core.js');
const expected=require('./fixtures/user-tiers.json');

test('all supplied tiers and original names are preserved in original order',()=>{
  assert.ok(D.tierList,'the supplied ranking must be stored separately');
  assert.deepEqual(D.tierList.tiers.map(t=>({id:t.id,label:t.label,names:t.entries.map(e=>e.name)})),expected);
  const entries=D.tierList.tiers.flatMap(t=>t.entries),seen=new Set();
  for(const t of D.tierList.tiers)for(const e of t.entries){
    assert.ok(!seen.has(e.beerId),e.name+' must not collapse into another ranked item');seen.add(e.beerId);
    const b=D.beers.find(b=>b.id===e.beerId);assert.ok(b,e.name);assert.equal(b.userTier,t.id);
    assert.ok(b.name===e.name||b.aliases.includes(e.name),e.name+' must remain searchable');
  }
  assert.equal(entries.length,expected.reduce((n,t)=>n+t.names.length,0));
});

test('user-only additions do not invent specifications, ratings, prices, budgets or citations',()=>{
  const additions=D.beers.filter(b=>b.coverage?.identity==='user-list-unverified');
  assert.ok(additions.length>0);
  for(const b of additions){
    for(const key of ['abv','volumeMl','rating','quote','purchaseGuide'])assert.equal(b[key],null,b.name+' '+key);
    assert.equal(b.relatedRating,undefined);assert.equal(b.identityPending,true);
    assert.deepEqual(b.review.sourceIds,[]);
    assert.equal(C.resolve(b,C.defaults()).eligible,false);
    const p=C.displayPoint(C.resolve(b,C.defaults()),C.defaults());
    assert.equal(p.plotPrice,null);assert.equal(p.plotRating,null);assert.equal(p.priceBasis,'unknown');
  }
});

test('subjective tiers never affect community evidence and do not assert imported versions',()=>{
  const clone=structuredClone(D),before=C.analyze(D,C.defaults()).edge.map(b=>b.id);
  delete clone.tierList;for(const b of clone.beers)delete b.userTier;
  assert.deepEqual(C.analyze(clone,C.defaults()).edge.map(b=>b.id),before);
  assert.equal(D.beers.find(b=>b.id==='franziskaner').userTier,undefined);
  assert.equal(D.beers.find(b=>b.id==='hoegaarden').userTier,undefined);
  for(const id of ['nadu','dream','pohjala'])assert.ok(D.tierList.tiers.flatMap(t=>t.entries).find(e=>e.beerId===id).note);
});
