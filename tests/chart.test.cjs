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
