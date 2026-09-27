/* Pure calculations: quoted prices, explicit editorial guides, and independent score cohorts. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BeerCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const EPS=1e-9;
 const defaults=()=>({budget:20,unit:'500ml',family:'all',style:'all',mode:'global',scoreMode:'community',scorePlatform:'all',mapMode:'all',minRatings:0,maxAbv:16,includeHistoric:true,includeAmbiguous:false,onlyPersonalPrices:false,query:'',sort:'price',libraryMode:'all',shortlist:[],overrides:{},personalScores:{}});
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 function validQuote(q){return !!(q&&finite(q.total)&&q.total>0&&q.total<=1000000&&Number.isInteger(q.quantity)&&q.quantity>=1&&q.quantity<=10000&&finite(q.volumeMl)&&q.volumeMl>=1&&q.volumeMl<=100000);}
 function cost(q,unit='500ml'){if(!validQuote(q))return null;return unit==='order'?q.total:unit==='unit'?q.total/q.quantity:q.total/q.quantity*500/q.volumeMl;}
 function guideCost(b,s){const g=b.purchaseGuide;return g?cost({total:g.ceiling,quantity:1,volumeMl:g.volumeMl},s.unit):null;}
 function getQuote(b,s){const q=s.overrides[b.id];if(validQuote(q))return {...q,personal:true,historical:false,ambiguous:false};return s.onlyPersonalPrices?null:b.quote;}
 function rating(b,s){if(s.scoreMode==='personal'){const x=s.personalScores[b.id];return finite(x)&&x>=0&&x<=5?{value:x,count:null,countType:'personal',platform:'个人口味'}:null;}return b.rating;}
 function isInScope(b,s){const platform=(b.rating||b.relatedRating)?.platform;return (s.family==='all'||b.family===s.family)&&(s.style==='all'||b.style===s.style)&&(s.maxAbv>=16||(finite(b.abv)&&b.abv<=s.maxAbv))&&(s.scoreMode==='personal'||!s.scorePlatform||s.scorePlatform==='all'||platform===s.scorePlatform);}
 function resolve(b,s){const quote=getQuote(b,s),r=rating(b,s),price=cost(quote,s.unit),reasons=[];
  if(b.identityPending)reasons.push('酒款身份待确认');
  if(!r)reasons.push(s.scoreMode==='personal'?'未填写个人评分':b.relatedRating?'只有相关版本评价':'缺少匹配版本评分');
  if(r&&s.scoreMode==='community'&&s.minRatings>0){if(r.countType==='reviews')reasons.push('评分人数未知（只有评论数）');else if(!finite(r.count)||r.count<s.minRatings)reasons.push('评分样本少于门槛');}
  if(price===null)reasons.push(s.onlyPersonalPrices?'未填写实付价':'缺少可换算报价');
  if(quote?.historical&&!s.includeHistoric&&!quote.personal)reasons.push('历史报价已排除');
  if(quote?.ambiguous&&!s.includeAmbiguous&&!quote.personal)reasons.push('报价版本或状态有歧义');
  return {...b,activeQuote:quote,activeRating:r,price,reasons,eligible:reasons.length===0};
 }
 function cohort(b,mode='global'){return (b.activeRating?.platform||'unknown')+(mode==='style'?' · '+b.style:'');}
 function comparable(a,b,mode='global'){return a.activeRating&&b.activeRating&&cohort(a,mode)===cohort(b,mode);}
 function dominates(a,b,mode='global'){return a.id!==b.id&&comparable(a,b,mode)&&a.price<=b.price+EPS&&a.activeRating.value>=b.activeRating.value-EPS&&(a.price<b.price-EPS||a.activeRating.value>b.activeRating.value+EPS);}
 function frontier(rows,mode='global'){const valid=rows.filter(b=>b.eligible&&finite(b.price)&&b.activeRating&&finite(b.activeRating.value));return valid.filter(b=>!valid.some(a=>dominates(a,b,mode))).sort((a,b)=>a.price-b.price||a.name.localeCompare(b.name,'zh'));}
 function analyze(data,s){const rows=data.beers.filter(b=>isInScope(b,s)).map(b=>resolve(b,s)),eligible=rows.filter(b=>b.eligible),edge=frontier(eligible,s.mode),available=eligible.filter(b=>b.price<=s.budget+EPS);
  const groups={};for(const b of available){const k=cohort(b,s.mode);(groups[k]||=[]).push(b);}
  const bestByCohort=Object.entries(groups).map(([name,items])=>({name,beer:items.slice().sort((a,b)=>b.activeRating.value-a.activeRating.value||a.price-b.price)[0]}));
  const best=bestByCohort.length===1?bestByCohort[0].beer:null;
  return {rows,eligible,edge,best,bestByCohort,available,edgeIds:new Set(edge.map(b=>b.id)),dominatedBy:b=>eligible.filter(a=>dominates(a,b,s.mode)).sort((a,b)=>a.price-b.price)};
 }
 function entryLimit(row,eligible,mode='global'){if(!row.activeRating)return null;const peers=eligible.filter(p=>p.id!==row.id&&comparable(p,row,mode)&&p.activeRating.value>=row.activeRating.value-EPS);if(!peers.length)return {price:null,strict:false,peerIds:[]};const min=Math.min(...peers.map(p=>p.price)),closest=peers.filter(p=>Math.abs(p.price-min)<=EPS);return {price:min,strict:closest.some(p=>p.activeRating.value>row.activeRating.value+EPS),peerIds:closest.map(p=>p.id)};}
 // A chart reference is NOT an eligible Pareto record. Unknown scores stay null.
 function displayPoint(row,s){const r=row.activeRating||(s.scoreMode==='community'?row.relatedRating:null);const hasPrice=finite(row.price);return {...row,plotPrice:hasPrice?row.price:guideCost(row,s),plotRating:r||null,reference:!row.eligible,priceBasis:hasPrice?'quote':'editorial-ceiling',scoreBasis:row.activeRating?'matched':r?'related':'unknown'};}
 function validateImport(input,ids){if(!input||typeof input!=='object'||Array.isArray(input)||input.schemaVersion!==1)throw Error('只接受 schemaVersion 为 1 的个人数据JSON。');const out={overrides:{},personalScores:{},shortlist:[]};
  for(const [id,q]of Object.entries(input.overrides||{})){if(!ids.has(id))throw Error('包含未知酒款ID：'+id);if(!validQuote(q))throw Error('报价无效：'+id);out.overrides[id]={total:q.total,quantity:q.quantity,volumeMl:q.volumeMl,checkedAt:typeof q.checkedAt==='string'?q.checkedAt.slice(0,32):'',note:typeof q.note==='string'?q.note.slice(0,200):''};}
  for(const [id,r]of Object.entries(input.personalScores||{})){if(!ids.has(id)||!finite(r)||r<0||r>5)throw Error('个人评分无效：'+id);out.personalScores[id]=r;}
  if(input.shortlist!==undefined&&!Array.isArray(input.shortlist))throw Error('清单格式不正确。');out.shortlist=[...new Set(input.shortlist||[])].filter(id=>ids.has(id)).slice(0,3);return out;
 }
 return {defaults,validQuote,cost,guideCost,getQuote,rating,isInScope,resolve,cohort,comparable,dominates,frontier,analyze,entryLimit,displayPoint,validateImport};
});
