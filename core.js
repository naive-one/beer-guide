/* Pure calculations: quoted prices, explicit editorial guides, and independent score cohorts. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BeerCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const EPS=1e-9;
 const defaults=()=>({budget:20,unit:'unit',priceScope:'taobao',family:'all',style:'all',mode:'global',scoreMode:'community',scorePlatform:'all',mapMode:'all',chartRange:'focus',minRatings:0,maxAbv:16,includeHistoric:true,includeAmbiguous:false,onlyPersonalPrices:false,query:'',tierFilter:'all',sort:'price',libraryMode:'all',shortlist:[],overrides:{},personalScores:{}});
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 // Currency presentation only; cost/frontier retain unrounded inputs.
 function formatMoney(v){return finite(v)?(Math.round((v+Number.EPSILON*Math.abs(v))*100)/100).toFixed(2):'—';}
 function validQuote(q){return !!(q&&finite(q.total)&&q.total>0&&q.total<=1000000&&Number.isInteger(q.quantity)&&q.quantity>=1&&q.quantity<=10000&&(q.volumeMl==null||(finite(q.volumeMl)&&q.volumeMl>=1&&q.volumeMl<=100000)));}
 function cost(q,unit='500ml'){if(!validQuote(q))return null;return unit==='order'?q.total:unit==='unit'?q.total/q.quantity:finite(q.volumeMl)?q.total/q.quantity*500/q.volumeMl:null;}
 function guideCost(b,s){const g=b.purchaseGuide;return g?cost({total:g.ceiling,quantity:1,volumeMl:g.volumeMl},s.unit):null;}
 function getQuote(b,s){const q=s.overrides[b.id];if(validQuote(q))return {...q,personal:true,historical:false,ambiguous:false};return s.onlyPersonalPrices||(s.priceScope==='taobao'&&b.quote?.priceBasis!=='taobao-displayed-snapshot')?null:b.quote;}
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
 function catalogView(data){
  const ids=data.catalogScope?new Set(data.catalogScope.activeIds):null;
  const beers=ids?data.beers.filter(b=>ids.has(b.id)):data.beers;
  const active=new Set(beers.map(b=>b.id));
  const tierList=data.tierList?{...data.tierList,tiers:data.tierList.tiers.map(t=>({...t,entries:t.entries.filter(e=>active.has(e.beerId))})).filter(t=>t.entries.length)}:undefined;
  return {...data,beers,tierList};
 }
 function currentShortlist(data,shortlist){const ids=new Set(catalogView(data).beers.map(b=>b.id));return shortlist.filter(id=>ids.has(id)).slice(0,3);}
 function analyze(data,s){const rows=catalogView(data).beers.filter(b=>isInScope(b,s)).map(b=>resolve(b,s)),eligible=rows.filter(b=>b.eligible),edge=frontier(eligible,s.mode),available=eligible.filter(b=>b.price<=s.budget+EPS);
  const groups={};for(const b of available){const k=cohort(b,s.mode);(groups[k]||=[]).push(b);}
  const bestByCohort=Object.entries(groups).map(([name,items])=>({name,beer:items.slice().sort((a,b)=>b.activeRating.value-a.activeRating.value||a.price-b.price)[0]}));
  const best=bestByCohort.length===1?bestByCohort[0].beer:null;
  return {rows,eligible,edge,best,bestByCohort,available,edgeIds:new Set(edge.map(b=>b.id)),dominatedBy:b=>eligible.filter(a=>dominates(a,b,s.mode)).sort((a,b)=>a.price-b.price)};
 }
 function entryLimit(row,eligible,mode='global'){if(!row.activeRating)return null;const peers=eligible.filter(p=>p.id!==row.id&&comparable(p,row,mode)&&p.activeRating.value>=row.activeRating.value-EPS);if(!peers.length)return {price:null,strict:false,peerIds:[]};const min=Math.min(...peers.map(p=>p.price)),closest=peers.filter(p=>Math.abs(p.price-min)<=EPS);return {price:min,strict:closest.some(p=>p.activeRating.value>row.activeRating.value+EPS),peerIds:closest.map(p=>p.id)};}
 // A chart reference is NOT an eligible Pareto record. Unknown scores stay null.
 function displayPoint(row,s){const r=row.activeRating||(s.scoreMode==='community'?row.relatedRating:null);const hasPrice=finite(row.price),guide=!row.activeQuote&&s.priceScope==='all'&&!s.onlyPersonalPrices?guideCost(row,s):null;return {...row,plotPrice:hasPrice?row.price:guide,plotRating:r||null,reference:!row.eligible,priceBasis:hasPrice?'quote':finite(guide)?'editorial-ceiling':'unknown',scoreBasis:row.activeRating?'matched':r?'related':'unknown'};}
 // Shared geometry only: eligibility and domination remain in analyze/frontier.
 function chartModel(analysis,s,width=700){
  const rows=(s.mapMode==='evidence'?analysis.eligible:analysis.rows).map(b=>displayPoint(b,s));
  const placed=rows.filter(b=>finite(b.plotPrice)&&b.plotRating&&finite(b.plotRating.value));
  const unplaced=rows.filter(b=>!placed.includes(b));
  const W=Math.min(950,Math.max(240,width)),H=320,L=40,R=20,T=28,B=44;
  // Derive focus from ALL computed cohorts, never from budget or a viewport subset.
  const rangePrices=s.chartRange==='full'||!analysis.edge.length?placed.map(b=>b.plotPrice):analysis.edge.map(b=>b.price);
  const max=Math.max(5,...rangePrices.map(price=>price*1.12));
  const base=10**Math.floor(Math.log10(max)),xmax=Math.ceil(max/base*2)/2*base;
  const ymin=0,ymax=5,x=v=>L+v/xmax*(W-L-R),y=v=>T+(5-v)/5*(H-T-B);
  const offscreen=placed.filter(b=>b.plotPrice>xmax);
  const points=placed.filter(b=>b.plotPrice<=xmax).map(b=>({...b,x:x(b.plotPrice),y:y(b.plotRating.value),edge:analysis.edgeIds.has(b.id)}))
   .sort((a,b)=>Number(a.edge)-Number(b.edge));
  const clusters=[];
  for(const b of points){
   b.neighbours=points.filter(p=>Math.hypot(p.x-b.x,p.y-b.y)<18).map(p=>p.id);
   if(b.neighbours.length>1&&!clusters.some(c=>c.ids.includes(b.id)))clusters.push({ids:b.neighbours});
  }
  const platforms=[...new Set(placed.map(b=>b.plotRating.platform))];
  const byId=new Map(points.map(b=>[b.id,b])),groups=new Map();
  for(const edge of analysis.edge){
   const point=byId.get(edge.id);if(!point)continue;
   const key=cohort(edge,s.mode);
   if(!groups.has(key))groups.set(key,{key,platform:edge.activeRating.platform,points:[]});
   groups.get(key).points.push(point);
  }
  return {rows,placed:points,offscreen,unplaced,platforms,groups:[...groups.values()],clusters,W,H,L,R,T,B,xmax,ymin,ymax,x,y};
 }
 function validateImport(input,ids){if(!input||typeof input!=='object'||Array.isArray(input)||input.schemaVersion!==1)throw Error('只接受 schemaVersion 为 1 的个人数据JSON。');const out={overrides:{},personalScores:{},shortlist:[]};
  for(const [id,q]of Object.entries(input.overrides||{})){if(!ids.has(id))throw Error('包含未知酒款ID：'+id);if(!validQuote(q)||!finite(q.volumeMl))throw Error('报价无效：'+id);out.overrides[id]={total:q.total,quantity:q.quantity,volumeMl:q.volumeMl,checkedAt:typeof q.checkedAt==='string'?q.checkedAt.slice(0,32):'',note:typeof q.note==='string'?q.note.slice(0,200):''};}
  for(const [id,r]of Object.entries(input.personalScores||{})){if(!ids.has(id)||!finite(r)||r<0||r>5)throw Error('个人评分无效：'+id);out.personalScores[id]=r;}
  if(input.shortlist!==undefined&&!Array.isArray(input.shortlist))throw Error('清单格式不正确。');out.shortlist=[...new Set(input.shortlist||[])].filter(id=>ids.has(id));return out;
 }
 return {catalogView,currentShortlist,defaults,formatMoney,validQuote,cost,guideCost,getQuote,rating,isInScope,resolve,cohort,comparable,dominates,frontier,analyze,entryLimit,displayPoint,chartModel,validateImport};
});
