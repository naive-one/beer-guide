const test=require('node:test'),assert=require('node:assert/strict');
const schema=require('../data/schema.json');

test('runtime evidence paths agree with the JSON Schema for ordinary and edge cases',async()=>{
 const {validateRating}=await import('../scripts/community-contract.mjs');
 const pattern=new RegExp(schema.$defs.communityRating.properties.evidenceFile.pattern);
 const source={id:'fixture',url:'https://example.com/beer',title:'Fixture',kind:'review',evidence:'page',publishedAt:null,checkedAt:'2026-09-28',note:''};
 const base={platform:'Untappd',scale:5,value:0,count:0,countType:'ratings',sourceId:'fixture',checkedAt:'2026-09-28',note:'',match:'matched'};
 const paths=['research/.hidden.json','research/a..json','research/a./b.json','research/a/.json','research/a.json','research/2026-09-28/evidence/123.json','test.json','a','../private','/private','a//b.json','a/../b.json','a/./b.json','a\\b.json','a/','a.','a%2fb','a b.json',''];
 for(const evidenceFile of paths){
  let accepted=true;try{validateRating({...base,evidenceFile},{fixture:source});}catch{accepted=false;}
  assert.equal(accepted,pattern.test(evidenceFile),evidenceFile);
 }
});
