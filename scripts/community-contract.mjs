const text=v=>typeof v==='string'&&v.trim().length>0;
export const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function validateSource(s,id){
 if(!s||s.id!==id||!text(id)||!text(s.title)||typeof s.note!=='string'||!['review','price','official','report','spec'].includes(s.kind)||!['page','search-index'].includes(s.evidence)||!validDate(s.checkedAt)||!(s.publishedAt===null||validDate(s.publishedAt)))throw Error('Invalid community source '+id);
 let url;try{url=new URL(s.url);}catch{throw Error('Invalid source URL');}if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid source protocol or credentials');
}
export function validateRating(r,sources){
 const keys=['platform','scale','value','count','countType','sourceId','checkedAt','note','evidenceFile','match'];
 if(!r||keys.some(k=>!Object.hasOwn(r,k))||Object.keys(r).some(k=>!keys.includes(k))||!text(r.platform)||r.scale!==5||!Number.isFinite(r.value)||r.value<0||r.value>5||!Number.isInteger(r.count)||r.count<0||!['ratings','reviews'].includes(r.countType)||!['matched','related'].includes(r.match)||!validDate(r.checkedAt)||typeof r.note!=='string'||!text(r.evidenceFile)||!/^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9_-]+(?:[.\/][A-Za-z0-9_-]+)*$/.test(r.evidenceFile)||!Object.hasOwn(sources,r.sourceId))throw Error('Invalid community rating');
 validateSource(sources[r.sourceId],r.sourceId);
}
export function validateCommunity(data){for(const b of data.beers){if(b.communityRatings===undefined)continue;if(!Array.isArray(b.communityRatings))throw Error('communityRatings must be an array');const seen=new Set();for(const r of b.communityRatings){validateRating(r,data.sources);const key=JSON.stringify([r.platform,r.sourceId]);if(seen.has(key))throw Error('Duplicate community rating '+b.id);seen.add(key);}}}
