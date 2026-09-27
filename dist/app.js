/* Static, local-first interaction layer. All quotations remain evidence snapshots. */
(()=>{
'use strict';
const D=window.BEER_DATA,C=window.BeerCore,$=id=>document.getElementById(id);
if(!D||!C){document.body.textContent='数据文件未加载。请保留 data/data.js 与 core.js，或打开 standalone.html。';return;}
const ids=new Set(D.beers.map(b=>b.id)),KEY='beer-frontier.personal.v1';
let state=C.defaults(),analysis,visibleLimit=12,lastDialogId=null,toastTimer;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number.isFinite(v)?v.toFixed(2):'—';
const units=()=>state.unit==='order'?'整单':state.unit==='unit'?'瓶 / 罐':'500ml';
const unitLong=()=>state.unit==='order'?'元 / 整单':state.unit==='unit'?'元 / 瓶或罐':'元 / 500ml';
const labelScore=()=>state.scoreMode==='community'?'BA 均分':'我的评分';
const sourceKind={review:'口碑 / 品饮',price:'价格样本',official:'酒厂资料',report:'媒体报道'};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const p=C.validateImport(JSON.parse(raw),ids);state={...state,...p};}}catch(e){toast('未能读取本地记录，已保留默认研究数据。');}}
function personalExport(){return {schemaVersion:1,exportedAt:new Date().toISOString(),overrides:state.overrides,personalScores:state.personalScores,shortlist:state.shortlist};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(personalExport()));}catch(e){toast('浏览器禁止本地保存，请导出JSON备份。');}}
function qStatus(b){if(b.activeQuote?.personal)return '个人实付价 · 仅本地';if(!b.activeQuote)return '缺少可换算价格';if(b.activeQuote.historical)return '旧价 · '+(D.sources[b.activeQuote.sourceId]?.publishedAt||'年份待核对');if(b.activeQuote.ambiguous)return '参考起价 · 版本有歧义';return '参考样本 · 不是实时售价';}
function sourceLinks(sourceIds){return [...new Set(sourceIds.filter(Boolean))].map(id=>{const s=D.sources[id];return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`:'';}).join('');}
function rowById(id){const b=D.beers.find(x=>x.id===id);return b?C.resolve(b,state):null;}
function syncControls(){
 $('budget').value=state.budget;$('budget-unit').textContent=unitLong();
 const max=state.unit==='order'?Math.max(500,state.budget):Math.max(80,state.budget);
 $('budget-range').max=max;$('budget-range').value=state.budget;$('range-max').textContent='¥'+max;
 for(const [id,key]of [['unit','unit'],['mode','mode'],['score-mode','scoreMode'],['min-ratings','minRatings'],['max-abv','maxAbv'],['library-mode','libraryMode'],['sort','sort']])$(id).value=state[key];
 for(const [id,key]of [['historic','includeHistoric'],['ambiguous','includeAmbiguous'],['personal-prices','onlyPersonalPrices']])$(id).checked=state[key];
 $('min-ratings').disabled=state.scoreMode==='personal';
 $('unit-note').textContent=state.unit==='order'?'使用原报价整组总额；包装数量不同，不是等量比价。':state.unit==='unit'?'不同瓶罐容量仍可能不同。整箱的折合单件价，不保证可以只买一件。':'只作价格换算，不是建议饮用量。整箱折合价不代表能按单瓶买到。';
 const styleNames=[...new Set(D.beers.filter(b=>state.family==='all'||b.family===state.family).map(b=>b.style))].filter(s=>s!=='待确认');
 $('style').innerHTML='<option value="all">所有具体风格</option>'+styleNames.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');$('style').value=state.style;
 $('family-tabs').innerHTML=Object.entries(D.families).filter(([k])=>k!=='unresolved').map(([k,v])=>`<button data-family="${k}" class="${state.family===k?'active':''}" aria-pressed="${state.family===k}">${esc(v.name)}</button>`).join('');
 $('shortlist-count').textContent=state.shortlist.length;
 const presets=state.unit==='order'?[50,100,150,250]:[8,15,25,40];$('budget-presets').innerHTML=presets.map(v=>`<button data-budget="${v}">${v}元</button>`).join('');
}
function render(){analysis=C.analyze(D,state);syncControls();renderChart();renderRecommendation();renderLadder();renderOpportunities();renderLibrary();}
function niceMax(v){const base=Math.pow(10,Math.floor(Math.log10(Math.max(v,1))));const mult=v/base;return Math.ceil(mult*2)/2*base;}
function renderChart(){
 const svg=$('scatter'),rows=analysis.eligible,edgeIds=analysis.edgeIds;
 $('chart-subtitle').textContent=`${state.scoreMode==='community'?'同源BA均分':'个人口味分'} · ${rows.length} 款可比 · ${analysis.edge.length} 款位于${state.mode==='style'?'各自风格':'当前'}前沿`;
 $('chart-empty').hidden=rows.length>0;
 if(!rows.length)$('chart-empty').innerHTML=state.scoreMode==='personal'?'还没有符合条件的个人评分与价格。<br>在资料卡内填写实付价和口味分后，就能生成你的前沿。':state.onlyPersonalPrices?'还没有符合条件的实付价。<br>打开任一有BA评分的酒款，填写你的实际报价。':'当前筛选范围内，缺少可同时比较的价格与评分。<br>可调整风格、样本门槛，或补充实际报价。';
 const W=Math.max(320,Math.min(850,$('chart-wrap').clientWidth-24)),H=W<500?300:360,L=W<500?42:60,R=W<500?17:30,T=28,B=55,PW=W-L-R,PH=H-T-B;
 svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
 const xmax=niceMax(Math.max(10,state.budget*1.1,...rows.map(b=>b.price*1.12)));
 const vals=rows.map(b=>b.activeRating.value);const ymin=rows.length?Math.max(0,Math.floor((Math.min(...vals)-.15)*4)/4):2.5;const ymax=rows.length?Math.min(5,Math.ceil((Math.max(...vals)+.15)*4)/4):5;
 const x=v=>L+v/xmax*PW,y=v=>T+(ymax-v)/(ymax-ymin||1)*PH;
 let content=`<title id="chart-title">价格与${state.scoreMode==='community'?'社区口碑':'个人口味'}的帕累托前沿</title><desc id="chart-description">横轴${esc(unitLong())}，纵轴${esc(labelScore())}，显示${rows.length}款可比酒。纵轴范围${ymin}至${ymax}。数据表可通过图下按钮打开。</desc>`;
 const cutoff=Math.min(xmax,state.budget);content+=`<rect class="budget-shade" x="${L}" y="${T}" width="${x(cutoff)-L}" height="${PH}" rx="3" fill="#edf1e6" opacity=".7"/>`;
 for(let i=0;i<=5;i++){const v=xmax*i/5,xx=x(v);content+=`<line x1="${xx}" y1="${T}" x2="${xx}" y2="${H-B}" stroke="#e8eadf" stroke-dasharray="2 5"/><text class="axis-text" x="${xx}" y="${H-B+22}" text-anchor="middle">${v<10?v.toFixed(1):Math.round(v)}</text>`;}
 for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,yy=y(v);content+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#e7e9df"/><text class="axis-text" x="${L-12}" y="${yy+3}" text-anchor="end">${v.toFixed(2)}</text>`;}
 content+=`<text class="axis-text" x="${L}" y="15">${esc(labelScore())} / 5 · 纵轴截取 ${ymin.toFixed(2)}—${ymax.toFixed(2)}</text><text class="axis-text" x="${W-R}" y="${H-9}" text-anchor="end">参考价格 · ${esc(unitLong())}</text>`;
 if(state.budget<xmax){content+=`<line x1="${x(state.budget)}" x2="${x(state.budget)}" y1="${T}" y2="${H-B}" stroke="#788565" stroke-dasharray="5 4"/><text class="axis-text" x="${Math.min(x(state.budget)+6,W-125)}" y="${H-B-8}" fill="#657d57">预算 ¥${money(state.budget)}</text>`;}
 const groups={};for(const b of analysis.edge){const key=state.mode==='style'?b.style:'global';(groups[key]||=[]).push(b);}
 for(const group of Object.values(groups)){if(group.length<2)continue;let path='M'+x(group[0].price)+','+y(group[0].activeRating.value);for(const b of group.slice(1))path+=` H${x(b.price)} V${y(b.activeRating.value)}`;content+=`<path d="${path}" fill="none" stroke="#b95530" stroke-width="2" opacity=".8"/>`;}
 // Labels are placed in bounded slots to avoid overlap; exact points are never jittered.
 const occupied=[];
 for(const [i,b]of rows.slice().sort((a,b)=>Number(edgeIds.has(a.id))-Number(edgeIds.has(b.id))).entries()){
  const cx=x(b.price),cy=y(b.activeRating.value),edge=edgeIds.has(b.id),inside=b.price<=state.budget;
  const color=edge?'#b95530':D.families[b.family].color;
  const label=`${b.name}，${money(b.price)}${unitLong()}，${labelScore()}${b.activeRating.value.toFixed(2)}，${edge?'位于前沿':'不在前沿'}。按回车查看详情。`;
  content+=`<g class="point" tabindex="0" role="button" data-point="${b.id}" aria-label="${esc(label)}"><circle cx="${cx}" cy="${cy}" r="${edge?6:4.5}" fill="${inside?color:'#fffefa'}" stroke="${color}" stroke-width="${edge?2:1.5}" opacity="${edge?1:.68}"/><title>${esc(label)}</title></g>`;
  if(edge){const text=b.name.length>10?b.name.slice(0,10)+'…':b.name,tw=text.length*11,preferredX=cx+10;
   let lx=preferredX+tw>W-R?cx-tw-10:preferredX,ly=cy-10;
   for(let tries=0;tries<5;tries++){if(!occupied.some(q=>Math.abs(q.y-ly)<16&&Math.abs(q.x-lx)<Math.max(q.w,tw)))break;ly+=18;}
   ly=Math.max(T+8,Math.min(H-B-7,ly));occupied.push({x:lx,y:ly,w:tw});content+=`<text class="point-label" x="${lx}" y="${ly}">${esc(text)}</text>`;
  }
 }
 svg.innerHTML=content;
 $('chart-table').innerHTML=rows.length?`<table><caption class="helper">与图表相同的筛选范围；价格为当前口径。</caption><thead><tr><th>酒款</th><th>${esc(unitLong())}</th><th>${esc(labelScore())}</th><th>样本</th><th>状态</th></tr></thead><tbody>${rows.map(b=>`<tr><td><button data-open="${b.id}">${esc(b.name)}</button></td><td>¥${money(b.price)}</td><td>${b.activeRating.value.toFixed(2)}</td><td>${b.activeRating.count?.toLocaleString()||'个人'}</td><td>${edgeIds.has(b.id)?'前沿':'被支配'} · ${esc(qStatus(b))}</td></tr>`).join('')}</tbody></table>`:'<p class="empty-panel">没有符合条件的图表数据。</p>';
 const best=analysis.best;
 $('evidence-strip').innerHTML=`<span><b>${analysis.rows.length}</b> 个范围内条目</span><span><b>${rows.length}</b> 款有可比较数据</span><span><b>${analysis.rows.length-rows.length}</b> 个条目未进入计算</span><span>${state.onlyPersonalPrices?'仅个人实付价':state.includeHistoric?'包含历史价格情景':'参考价日期不明时仍可能过时'}</span>`;
}
function renderRecommendation(){
 const best=analysis.best;
 if(best){let specificity=state.mode==='style'&&state.style==='all'?'跨风格最高分参考 · 不代表最合口味':'当前预算内 · 最高可比评分';
  $('recommendation').innerHTML=`<div class="recommend-icon" aria-hidden="true">↗</div><div class="recommend-main"><div class="kicker">${esc(specificity)}</div><h3>${esc(best.name)}</h3><p>${esc(best.tags.join(' · '))} · ${esc(labelScore())} ${best.activeRating.value.toFixed(2)}/5</p><p>${esc(qStatus(best))}。<strong>整组需付 ¥${money(best.activeQuote.total)} / ${best.activeQuote.quantity}件。</strong></p></div><div class="rec-price"><strong>¥${money(best.price)}</strong><span>/ ${esc(units())}</span><button data-open="${best.id}">查看依据 ↗</button></div>`;
 }else{const cheapest=analysis.eligible.slice().sort((a,b)=>a.price-b.price)[0];const missing=analysis.rows.filter(b=>b.price!==null&&b.price<=state.budget&&!b.activeRating);
  $('recommendation').innerHTML=`<div class="recommend-icon" aria-hidden="true">○</div><div class="recommend-main"><div class="kicker">不强行推荐</div><h3>${analysis.eligible.length?'预算内暂无可比项':'证据还不够'}</h3><p>${cheapest?'当前最便宜的可比项为 ¥'+money(cheapest.price)+' / '+esc(units())+'，不是“必须加预算”的建议。':'当前没有同时具备价格、评分且满足筛选条件的酒款。'}</p><p>${missing.length?`预算内另有 ${missing.length} 个有价格但缺同源分的候选，可到资料库查看。`:'可以在资料库补充自己的价格；缺资料不等于酒不好。'}</p></div>`;
 }
}
function renderLadder(){
 if(!analysis.edge.length){$('ladder-content').innerHTML='<div class="empty-panel">暂时无法形成预算阶梯。补齐报价与同源评分，或切换个人口味模式后，这里会自动生成。</div>';return;}
 const groups={};for(const b of analysis.edge){const key=state.mode==='style'?b.style:'当前范围';(groups[key]||=[]).push(b);}
 $('ladder-content').innerHTML=Object.entries(groups).map(([name,items])=>{
 let last=null;const cards=items.map((b,i)=>{const gain=last?(b.activeRating.value-last.activeRating.value):null;const difference=last?b.price-last.price:null;last=b;
  return `<article class="ladder-card ${analysis.best?.id===b.id?'current':''}"><span class="step">FRONTIER ${String(i+1).padStart(2,'0')}</span><span class="step-mark">${b.price<=state.budget?'预算覆盖':'预算之外'}</span><div class="price">¥${money(b.price)} <small>/ ${esc(units())}</small></div><h3>${esc(b.name)}</h3><span class="step-rating">${esc(labelScore())} ${b.activeRating.value.toFixed(2)} / 5</span><p>${gain!==null?`相比上一节点：多 ¥${money(difference)}，均分 +${gain.toFixed(2)}。这不是感官提升幅度。`:'当前比较范围中，价格最低的前沿节点。'}<br>${esc(qStatus(b))}<br>按原包装支付 ¥${money(b.activeQuote.total)} / ${b.activeQuote.quantity}件。</p><button class="inline-link" data-open="${b.id}">看评价与报价 ↗</button></article>`;});
 return `${state.mode==='style'?`<h3 class="group-heading">${esc(name)} <span class="micro">${items.length} 个前沿节点</span></h3>`:''}<div class="ladder-grid">${cards.join('')}</div>${state.mode==='style'&&items.length===1?'<p class="frontier-single">该风格只有一个前沿节点；可能是可比样本不足，不代表它已击败全市场。</p>':''}`;
 }).join('');
}
function renderOpportunities(){
 const candidates=analysis.rows.filter(b=>!b.identityPending&&b.activeRating&&(state.scoreMode==='personal'||b.activeRating.count>=state.minRatings)&&!b.eligible&&b.reasons.every(r=>['缺少可换算价格','未填写实付价','已知旧价默认排除','报价版本有歧义'].includes(r))).sort((a,b)=>b.activeRating.value-a.activeRating.value).slice(0,4);
 $('quote-opportunities').innerHTML=candidates.length?`<div class="opportunity-heading"><h3>把预算带去问价</h3><p>这些是还未进入计算的候选，不是已确认能买到的推荐。录入报价后，才判断是否入围。</p></div><div class="opportunity-grid">${candidates.map(b=>{const bound=C.entryLimit(b,analysis.eligible,state.mode);return `<button class="opportunity" data-open="${b.id}"><span class="opportunity-score">${b.activeRating.value.toFixed(2)}<small> / 5</small></span><strong>${esc(b.name)}</strong><span>${esc(qStatus(b))}</span><p>${bound?.price!==null&&bound?`当前样本的前沿竞争界线约为 ¥${money(bound.price)} / ${esc(units())}；${bound.strict?'需低于此界线':'不高于精确界线时仍可入围'}。`:'当前没有评分更高或相同的已报价对手；价格上限无法从现有竞争样本推导。'}你的预算为 ¥${money(state.budget)}。</p><em>填报价，验证而非猜测 ↗</em></button>`;}).join('')}</div><p class="section-note">竞争界线是由当前评分与对手报价算出的条件，不是市场价或合理零售价。价格显示经四舍五入，精确判断以填价后的前沿为准。旧价、缺价和SKU歧义仍须分别核验。</p>`:'';
}
function renderLibrary(){
 let rows=analysis.rows.slice();const q=state.query.trim().toLowerCase();if(q)rows=rows.filter(b=>[b.name,b.english,b.style,...b.tags,...b.aliases].join(' ').toLowerCase().includes(q));
 switch(state.libraryMode){case 'eligible':rows=rows.filter(b=>b.eligible);break;case 'edge':rows=rows.filter(b=>analysis.edgeIds.has(b.id));break;case 'pending':rows=rows.filter(b=>!b.eligible);break;case 'new':rows=rows.filter(b=>!b.originalList);break;case 'saved':rows=rows.filter(b=>state.shortlist.includes(b.id));break;}
 const score=b=>b.activeRating?.value??-1;
 rows.sort((a,b)=>state.sort==='score'?score(b)-score(a):state.sort==='samples'?(b.activeRating?.count||0)-(a.activeRating?.count||0):state.sort==='name'?a.name.localeCompare(b.name,'zh'):(a.price??Infinity)-(b.price??Infinity));
 $('library-total').textContent=rows.length;
 $('library-caption').textContent=`找到 ${rows.length} 个条目；受上方风格、酒精度筛选影响。搜索与此处“仅前沿/待补资料”只改变资料卡，不改变前沿。`;
 $('beer-grid').innerHTML=rows.length?rows.slice(0,visibleLimit).map(card).join(''):'<div class="empty-panel">没有匹配条目。请清除搜索词，或重置上方风格筛选。</div>';
 $('show-more').hidden=rows.length<=visibleLimit;$('show-more').textContent=`再显示 ${Math.min(12,rows.length-visibleLimit)} 个条目 ↓`;
}
function card(b){const color=D.families[b.family].color,edge=analysis.edgeIds.has(b.id),saved=state.shortlist.includes(b.id);
 return `<article class="beer-card" style="--beer-color:${color}"><div class="card-top"><span class="style-badge">${esc(D.families[b.family].name)}</span><button class="save-btn ${saved?'saved':''}" data-save="${b.id}" aria-label="${saved?'从对比移除':'加入对比'} ${esc(b.name)}" aria-pressed="${saved}">${saved?'★':'☆'}</button></div><h3>${esc(b.name)}</h3><p class="english">${esc(b.english)}</p><div class="card-meta">${esc(b.country)} · ${b.abv!==null?b.abv+'% ABV':'酒精度待核对'}${b.originalList?'':' · 新增候选'}</div><p class="card-review">${esc(b.review.positive)}</p><div class="tag-row">${b.tags.map(t=>`<span class="taste-tag">${esc(t)}</span>`).join('')}</div><div class="card-numbers"><div class="card-price">${b.price!==null?'¥'+money(b.price):'<span class="placeholder-score">价格待补</span>'}<small>${b.price!==null?' / '+esc(units()):''}</small></div><div class="card-rating">${b.activeRating?b.activeRating.value.toFixed(2):'—'}<small> / 5</small></div></div><div class="price-status ${b.activeQuote?.personal?'price-personal':''}">${esc(qStatus(b))}${b.activeQuote&&state.unit!=='order'?`<br>原包装 ¥${money(b.activeQuote.total)} / ${b.activeQuote.quantity}件 × ${b.activeQuote.volumeMl}ml`:''}</div><div class="card-bottom">${edge?'<span class="edge-badge">↗ 当前前沿</span>':`<span class="pending-badge">${b.reasons.length?esc(b.reasons[0]):'可比较 · 不在前沿'}</span>`}<button class="inline-link" data-open="${b.id}">评价 / 改价格 ↗</button></div></article>`;
}
function detail(id){const b=rowById(id);if(!b)return;lastDialogId=id;
 const within=C.isInScope(b,state);const dominators=within&&b.eligible?analysis.dominatedBy(b):[];
 const reason=!within?'不在当前筛选范围内。':!b.eligible?'未进入前沿计算：'+b.reasons.join('；')+'。':dominators.length?`${dominators[0].name} 在当前口径中价格更低或相同（¥${money(dominators[0].price)}），评分更高或相同（${dominators[0].activeRating.value.toFixed(2)}），且至少一项更优，因此本条被支配。`:'位于当前筛选范围的前沿：没有另一个可比候选能同时做到不更贵且评分不更低，并至少一项严格更好。';
 const q=b.activeQuote,underlying=b.quote,r=b.activeRating;
 const seed=q||{quantity:1,volumeMl:b.volumeMl||'',total:''};
 const source=q?.sourceId?D.sources[q.sourceId]:null;
 $('dialog-content').innerHTML=`<div class="dialog-top"><div style="--beer-color:${D.families[b.family].color}"><span class="style-badge">${esc(b.style)}</span><h2 id="dialog-title">${esc(b.name)}</h2><p class="english">${esc(b.english)}</p></div><button class="icon-btn" data-close="beer-dialog" aria-label="关闭详情">×</button></div><div class="dialog-body"><div class="detail-stats"><div class="detail-stat"><strong>${b.price!==null?'¥'+money(b.price):'待补'}</strong><span>${esc(units())} · ${q?.personal?'个人价':'参考价'}</span></div><div class="detail-stat"><strong>${r?r.value.toFixed(2):'—'} <small>/ 5</small></strong><span>${esc(labelScore())}${r?.count?' · '+r.count.toLocaleString()+'个评分':''}</span></div><div class="detail-stat"><strong>${b.abv!==null?b.abv+'%':'待核对'}</strong><span>ABV · ${esc(b.country)} · 实物优先</span></div></div>${b.identityNote?`<div class="detail-caution">${esc(b.identityNote)}</div>`:''}<section class="detail-section"><h3>公开评价 / 资料归纳</h3><p>${esc(b.review.positive)}</p><h3>需要知道的取舍</h3><p>${esc(b.review.caution)}</p><h3>什么人更可能喜欢 · 编辑判断</h3><p>${esc(b.review.fit)}</p><p class="helper">${esc(b.review.type)}</p><div class="source-links">${sourceLinks(b.review.sourceIds)}</div></section><section class="detail-section"><h3>价格证据与原包装</h3>${q?`<p class="quote-breakdown">¥${money(q.total)} ÷ ${q.quantity}件 × ${q.volumeMl}ml</p><p>每件 ¥${money(C.cost(q,'unit'))}；折合500ml ¥${money(C.cost(q,'500ml'))}；整单需付 ¥${money(q.total)}。整箱折合价格不是单瓶购买承诺。</p><p>${esc(q.note||'个人填写的总价；请确认已经包含运费。')}</p><p>${esc(qStatus(b))}。记录核对日：${esc(q.checkedAt||'待补')}；来源发布日期：${esc(source?.publishedAt||'未能完整核实')}。</p><div class="source-links">${sourceLinks([q.sourceId])}</div>`:'<p>未取得可同时确认总价、件数与容量的价格。没有用猜测价补齐；也没有把网页的0.00占位符当作免费。</p>'}${q?.personal&&underlying?`<p class="helper">原始参考样本仍保留：¥${money(underlying.total)} / ${underlying.quantity}件 × ${underlying.volumeMl}ml。清除个人价即可恢复。${sourceLinks([underlying.sourceId])}</p>`:''}</section><div class="detail-notice">${esc(reason)}<br>前沿只反映价格与评分，不是对个人口味、渠道或新鲜度的保证。</div><form id="price-form" class="edit-form" data-id="${id}"><h3>用我的实际报价重新计算</h3><p>确认是这一款酒；总支出请包含运费。只写在你的浏览器里。</p><div class="form-grid"><div><label class="field-label" for="edit-total">总支出 / 元</label><input id="edit-total" name="total" type="number" min="0.01" max="1000000" step="0.01" value="${seed.total}" required></div><div><label class="field-label" for="edit-qty">包装件数</label><input id="edit-qty" name="quantity" type="number" min="1" max="10000" step="1" value="${seed.quantity}" required></div><div><label class="field-label" for="edit-volume">每件容量 / ml</label><input id="edit-volume" name="volume" type="number" min="1" max="100000" step="0.1" value="${seed.volumeMl}" required></div></div><p id="live-price" class="form-feedback"></p><div class="form-actions"><button class="primary" type="submit" ${b.identityPending?'disabled':''}>保存实付价并重算</button><button type="button" class="inline-link" data-clear-price="${id}">清除个人价</button></div>${b.identityPending?'<p class="identity-flag">名称或版本未确认，不能通过填价格绕过身份核对。请让维护者先确认具体SKU。</p>':''}<div class="personal-score-row"><div><label for="personal-score">我的口味分 · 0–5</label><p>只和其他个人分一起计算，不与BA混合。</p></div><input class="score-input" id="personal-score" type="number" min="0" max="5" step="0.01" value="${state.personalScores[id]??''}" placeholder="未评分"><button type="button" class="outline" data-save-score="${id}">保存口味分</button></div></form></div>`;
 if(!$('beer-dialog').open)$('beer-dialog').showModal();
 $('price-form').addEventListener('submit',onPriceSubmit);
 for(const fid of ['edit-total','edit-qty','edit-volume'])$(fid).addEventListener('input',livePrice);
 livePrice();
}
function livePrice(){const q={total:Number($('edit-total').value),quantity:Number($('edit-qty').value),volumeMl:Number($('edit-volume').value)};$('live-price').textContent=C.validQuote(q)?`即时换算：每件 ¥${money(C.cost(q,'unit'))} · 每500ml ¥${money(C.cost(q,'500ml'))}`:'请填写有效的总价、整数件数和容量。';}
function onPriceSubmit(e){e.preventDefault();const id=e.currentTarget.dataset.id;if(D.beers.find(b=>b.id===id)?.identityPending)return;
 const q={total:Number($('edit-total').value),quantity:Number($('edit-qty').value),volumeMl:Number($('edit-volume').value),checkedAt:new Date().toISOString().slice(0,10),note:'用户自行填写的总支出；商品身份与运费由用户核对。'};
 if(!C.validQuote(q)){toast('价格无效，请检查总价、件数和毫升数。');return;}state.overrides[id]=q;save();render();detail(id);toast('已保存个人报价，前沿已重新计算。');}
function toggleSave(id){if(state.shortlist.includes(id)){state.shortlist=state.shortlist.filter(x=>x!==id);}else if(state.shortlist.length<3)state.shortlist.push(id);else {toast('最多对比3款，请先移除一款。');return;}save();renderLibrary();$('shortlist-count').textContent=state.shortlist.length;if($('compare-dialog').open)renderCompare();}
function renderCompare(){const rows=state.shortlist.map(rowById).filter(Boolean);$('compare-content').innerHTML=rows.length?`<div class="compare-grid">${rows.map(b=>`<article class="compare-cell" style="--beer-color:${D.families[b.family].color}"><span class="style-badge">${esc(D.families[b.family].name)}</span><h3>${esc(b.name)}</h3><p>${esc(b.style)} · ${b.abv??'—'}% ABV</p><div class="card-price">${b.price!==null?'¥'+money(b.price):'价格待补'} <small>/ ${esc(units())}</small></div><p>${esc(labelScore())}：${b.activeRating?b.activeRating.value.toFixed(2)+'/5':'缺数据'}</p><p>${esc(qStatus(b))}</p><p>${esc(b.review.positive)}</p><p><strong>取舍：</strong>${esc(b.review.caution)}</p><p><button class="inline-link" data-compare-open="${b.id}">查看证据 / 改价 ↗</button></p><p><button class="inline-link" data-save="${b.id}">从清单移除</button></p></article>`).join('')}</div><p class="compare-tip">这里可以跨风格对照，但不会把不同口味自动评为高低。价格口径沿用主页面。</p>`:'<div class="compare-body empty-panel">点击资料卡右上角 ☆，最多添加3款进行并排对比。</div>';}
function renderSources(){const list=Object.values(D.sources);$('sources-list').innerHTML=list.map(s=>`<div class="source-item"><span class="source-type">${sourceKind[s.kind]}<br>${s.evidence==='search-index'?'搜索索引':'页面读取'}</span><div><a class="source-name" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.note||'仅用于本页对应酒款、规格或公开评价；不是实时报价。')}</p></div><span>核对 ${esc(s.checkedAt)}<br>发布 ${esc(s.publishedAt||'日期未完整核实')}</span></div>`).join('');}
function update(key,value){state[key]=value;visibleLimit=12;render();}
function closeDialog(id){$(id).close();}
// Delegation handles dynamically rendered cards without inline JavaScript.
document.addEventListener('click',e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.open)detail(t.dataset.open);
 if(t.dataset.save)toggleSave(t.dataset.save);
 if(t.dataset.close)closeDialog(t.dataset.close);
 if(t.dataset.budget)update('budget',Number(t.dataset.budget));
 if(t.dataset.family){state.family=t.dataset.family;state.style='all';visibleLimit=12;render();}
 if(t.dataset.clearPrice){delete state.overrides[t.dataset.clearPrice];save();render();detail(t.dataset.clearPrice);toast('已清除个人价，恢复原始资料状态。');}
 if(t.dataset.saveScore){const id=t.dataset.saveScore,raw=$('personal-score').value;if(raw===''){delete state.personalScores[id];}else{const n=Number(raw);if(!Number.isFinite(n)||n<0||n>5){toast('口味分必须是0–5之间的数字。');return;}state.personalScores[id]=n;}save();render();detail(id);toast('已保存；选择“我的口味评分”后参与独立计算。');}
 if(t.dataset.compareOpen){closeDialog('compare-dialog');detail(t.dataset.compareOpen);}
});
$('budget').addEventListener('input',e=>{if(e.target.value==='')return;const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=1000000){state.budget=n;analysis=C.analyze(D,state);$('budget-range').max=Math.max(Number($('budget-range').max),n);$('budget-range').value=n;renderChart();renderRecommendation();renderLadder();renderOpportunities();}});
$('budget').addEventListener('change',()=>render());
$('budget-range').addEventListener('input',e=>update('budget',Number(e.target.value)));
for(const [id,key,isNumber]of [['unit','unit'],['mode','mode'],['score-mode','scoreMode'],['min-ratings','minRatings',true],['max-abv','maxAbv',true],['style','style'],['sort','sort'],['library-mode','libraryMode']])$(id).addEventListener('change',e=>{if(key==='unit'){state.budget=e.target.value==='order'?150:20;}update(key,isNumber?Number(e.target.value):e.target.value);});
for(const [id,key]of [['historic','includeHistoric'],['ambiguous','includeAmbiguous'],['personal-prices','onlyPersonalPrices']])$(id).addEventListener('change',e=>update(key,e.target.checked));
$('switch-real').addEventListener('click',()=>{update('onlyPersonalPrices',true);$('explore').scrollIntoView({behavior:'smooth'});});
$('search').addEventListener('input',e=>{state.query=e.target.value;visibleLimit=12;renderLibrary();});
$('show-more').addEventListener('click',()=>{visibleLimit+=12;renderLibrary();});
$('reset-filters').addEventListener('click',()=>{const p=personalExport();state={...C.defaults(),overrides:p.overrides,personalScores:p.personalScores,shortlist:p.shortlist};$('search').value='';visibleLimit=12;render();toast('已重置筛选；个人报价与清单未删除。');});
$('toggle-table').addEventListener('click',()=>{const open=$('chart-table').hidden;$('chart-table').hidden=!open;$('toggle-table').setAttribute('aria-expanded',String(open));$('toggle-table').textContent=open?'收起图表数据 ↑':'查看图表数据 ↓';});
$('toggle-sources').addEventListener('click',()=>{const open=$('sources-list').hidden;$('sources-list').hidden=!open;$('toggle-sources').setAttribute('aria-expanded',String(open));$('toggle-sources').textContent=open?'收起全部来源':'展开全部来源';if(open)renderSources();});
$('nav-shortlist').addEventListener('click',()=>{renderCompare();$('compare-dialog').showModal();});
for(const id of ['beer-dialog','compare-dialog'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
$('scatter').addEventListener('click',e=>{const p=e.target.closest('[data-point]');if(p)detail(p.dataset.point);});
$('scatter').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const p=e.target.closest('[data-point]');if(p){e.preventDefault();detail(p.dataset.point);}}});
function chartTooltip(e){const p=e.target.closest('[data-point]');if(!p){$('tooltip').hidden=true;return;}const b=rowById(p.dataset.point);$('tooltip').innerHTML=`<strong>${esc(b.name)}</strong><p>¥${money(b.price)} / ${esc(units())} · ${esc(labelScore())} ${b.activeRating.value.toFixed(2)}</p><p>${esc(qStatus(b))}</p><p>点击查看评价与出处 ↗</p>`;$('tooltip').hidden=false;const r=$('chart-wrap').getBoundingClientRect(),pr=p.getBoundingClientRect();const left=Math.max(5,Math.min((e.clientX||pr.left)-r.left+10,r.width-220));$('tooltip').style.left=left+'px';$('tooltip').style.top=Math.max(5,(e.clientY||pr.top)-r.top-90)+'px';}
$('scatter').addEventListener('pointermove',chartTooltip);$('scatter').addEventListener('focusin',chartTooltip);$('scatter').addEventListener('pointerleave',()=>$('tooltip').hidden=true);$('scatter').addEventListener('focusout',()=>$('tooltip').hidden=true);
$('export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(personalExport(),null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='beer-frontier-personal-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);toast('已导出个人报价、评分与对比清单。');});
$('import-data').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1000000)throw Error('文件超过1MB，请检查是否是个人数据JSON。');const p=C.validateImport(JSON.parse(await file.text()),ids);if(!confirm('导入会替换本浏览器的个人报价、口味分与对比清单。是否继续？'))return;state={...state,...p};save();render();toast('导入完成，前沿已重算。');}catch(err){toast('导入失败：'+err.message);}finally{e.target.value='';}});
$('reset-personal').addEventListener('click',()=>{if(!confirm('确定清空本浏览器的实付价、个人评分与对比清单？研究数据不受影响。'))return;state.overrides={};state.personalScores={};state.shortlist=[];save();render();toast('个人数据已清空。');});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(analysis)renderChart();},100);});
load();$('stat-total').textContent=D.beers.length;$('stat-rated').textContent=D.beers.filter(b=>b.rating).length;$('stat-prices').textContent=D.beers.filter(b=>b.quote).length;render();
// Test hook exposes read-only snapshots, not a writable state reference.
window.BeerFrontier={getState:()=>JSON.parse(JSON.stringify(state)),getAnalysis:()=>({eligible:analysis.eligible.map(b=>b.id),frontier:analysis.edge.map(b=>b.id),best:analysis.best?.id||null})};
})();
