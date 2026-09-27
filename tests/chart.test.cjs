const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

test('missing price and guide stay unknown, never an editorial or zero-price point', () => {
  const s=C.defaults();
  const row={id:'pending',price:null,activeRating:null,relatedRating:null,purchaseGuide:null,eligible:false};
  const p=C.displayPoint(row,s);
  assert.equal(p.plotPrice,null);
  assert.equal(p.priceBasis,'unknown');
  assert.equal(p.plotRating,null);
});

const data = require('../data/beers.json');
const model = (s=C.defaults(), d=data, width=700) => C.chartModel(C.analyze(d,s),s,width);

test('shared chart model preserves inventory, nulls and independent platform frontiers', () => {
  const m=model();
  assert.equal(m.rows.length,40);
  assert.equal(m.placed.length+m.offscreen.length+m.unplaced.length,40);
  assert.deepEqual([m.ymin,m.ymax],[0,5]);
  assert.equal(m.groups.length,new Set(C.analyze(data,C.defaults()).edge.map(b=>b.activeRating.platform)).size);
  assert.equal(m.groups.flatMap(g=>g.points).length,C.analyze(data,C.defaults()).edge.length);
  for(const g of m.groups) {
    assert.ok(g.points.every(p=>p.plotRating.platform===g.platform && !p.reference));
    assert.ok(g.points.every(p=>p.x===m.x(p.plotPrice) && p.y===m.y(p.plotRating.value)));
  }
  assert.ok(m.unplaced.every(p=>p.plotPrice===null || p.plotRating===null));
  assert.deepEqual([...m.placed,...m.offscreen].filter(p=>p.reference).map(p=>p.id).sort(),C.analyze(data,C.defaults()).rows.filter(b=>!b.eligible&&Number.isFinite(b.price)&&(b.activeRating||b.relatedRating)).map(b=>b.id).sort());
  const analysis=C.analyze(data,C.defaults());
  if(analysis.bestByCohort.length>1)assert.equal(analysis.best,null);
  else assert.equal(analysis.best?.id,analysis.bestByCohort[0]?.beer.id);
});

test('shared geometry is budget independent in every price unit', () => {
  for(const unit of ['500ml','unit','order']) {
    const a=model({...C.defaults(),unit}), b=model({...C.defaults(),unit,budget:1000000});
    assert.equal(a.xmax,b.xmax);
    assert.deepEqual(a.placed.map(p=>[p.id,p.x,p.y,p.neighbours]),b.placed.map(p=>[p.id,p.x,p.y,p.neighbours]));
  }
});

test('chart model handles platform filters, style cohorts, empty and personal zero scores', () => {
  const filtered=model({...C.defaults(),scorePlatform:'Untappd'});
  assert.ok(filtered.placed.every(p=>p.plotRating.platform==='Untappd'));
  assert.ok(model({...C.defaults(),mode:'style'}).groups.every(g=>new Set(g.points.map(p=>p.style)).size===1));
  const personal={...C.defaults(),scoreMode:'personal'};
  assert.equal(model(personal).placed.length,0);
  assert.equal(model(personal).unplaced.length,40);
  assert.equal(model({...personal,mapMode:'evidence'}).rows.length,0);
  const id=data.beers.find(b=>C.getQuote(b,C.defaults()) && !b.identityPending).id;
  const m=model({...personal,personalScores:{[id]:0}});
  assert.equal(m.placed.length,1);
  assert.equal(m.placed[0].plotRating.value,0);
  assert.equal(m.placed[0].y,m.H-m.B);
  assert.ok(Number.isFinite(model(C.defaults(),{beers:[]}).xmax));
});

test('overlap detection includes coincident points from different platforms without joining frontiers', () => {
  const base={...data.beers[0],quote:{total:10,quantity:1,volumeMl:500,priceBasis:'taobao-displayed-snapshot',historical:false,ambiguous:false}};
  const beers=['BeerAdvocate','Untappd'].map((platform,i)=>({...base,id:'p'+i,name:'p'+i,rating:{...base.rating,platform}}));
  const m=model(C.defaults(),{beers});
  assert.deepEqual(m.placed[0].neighbours,['p0','p1']);
  assert.deepEqual(m.clusters,[{ids:['p0','p1']}]);
  assert.equal(m.groups.length,2);
  assert.equal(C.analyze({beers},C.defaults()).best,null);
  assert.ok(m.groups.every(g=>g.points.length===1));
});

test('editorial coordinates require explicit legacy scope, never personal-only or an unconvertible quote', () => {
  const beer={...data.beers[0],quote:null,purchaseGuide:{ceiling:12,volumeMl:500}};
  for(const priceScope of ['taobao','all'])for(const onlyPersonalPrices of [false,true])for(const unit of ['unit','order','500ml']) {
    const s={...C.defaults(),priceScope,onlyPersonalPrices,unit};
    const p=C.displayPoint(C.resolve(beer,s),s);
    const allowed=priceScope==='all'&&!onlyPersonalPrices;
    assert.equal(p.plotPrice,allowed?12:null);
    assert.equal(p.priceBasis,allowed?'editorial-ceiling':'unknown');
    assert.equal(p.price,null);
    assert.equal(p.reference,true);
    assert.equal(C.analyze({beers:[beer]},s).available.length,0);
    const quoted={...beer,quote:{total:60,quantity:6,volumeMl:null,priceBasis:'taobao-displayed-snapshot'}};
    const q=C.displayPoint(C.resolve(quoted,s),s);
    assert.equal(q.plotPrice,onlyPersonalPrices||unit==='500ml'?null:unit==='order'?60:10);
  }
});

test('focus retains every frontier; full restores coordinates without changing analysis', () => {
  assert.equal(C.defaults().chartRange,'focus');
  for(const unit of ['unit','500ml','order'])for(const mode of ['global','style']) {
    const s={...C.defaults(),unit,mode}, a=C.analyze(data,s), focus=C.chartModel(a,s,300);
    const full=C.chartModel(a,{...s,chartRange:'full'},300);
    assert.deepEqual(C.analyze(data,{...s,chartRange:'full'}).edge,a.edge);
    assert.deepEqual(focus.groups.flatMap(g=>g.points.map(p=>p.id)).sort(),a.edge.map(p=>p.id).sort());
    assert.ok(a.edge.every(p=>p.price<focus.xmax));
    assert.deepEqual([...focus.placed,...focus.offscreen,...focus.unplaced].map(p=>p.id).sort(),a.rows.map(p=>p.id).sort());
    assert.equal(full.offscreen.length,0);
    assert.equal(full.placed.length,focus.placed.length+focus.offscreen.length);
    assert.ok(focus.offscreen.every(p=>p.plotPrice>focus.xmax && p.x===undefined));
    for(const chartRange of ['focus','full']) {
      const lo=model({...s,chartRange,budget:0}),hi=model({...s,chartRange,budget:1000000});
      assert.equal(lo.xmax,hi.xmax);
      assert.deepEqual(lo.placed,hi.placed);
    }
  }
  assert.ok(model().xmax<60);
  assert.ok(model().offscreen.some(p=>p.plotPrice===152.5));
});

test('focus expands for expensive frontier changes and safely falls back without frontiers', () => {
  const id=C.analyze(data,C.defaults()).edge[0].id;
  const s={...C.defaults(),scoreMode:'personal',personalScores:{[id]:0},overrides:{[id]:{total:999999,quantity:1,volumeMl:500}}};
  const m=model(s);
  assert.ok(m.xmax>999999);
  assert.equal(m.placed[0].id,id);
  assert.equal(m.placed[0].plotRating.value,0);
  assert.equal(m.unplaced.length,m.rows.length-1);
  const noEdges=model({...C.defaults(),minRatings:100000000});
  assert.equal(noEdges.groups.length,0);
  assert.equal(noEdges.offscreen.length,0);
  assert.ok(Number.isFinite(model(s,{beers:[]}).xmax));
});
