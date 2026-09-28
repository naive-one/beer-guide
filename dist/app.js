/* Static, local-first interaction layer. All quotations remain evidence snapshots. */
(()=>{
'use strict';
const D=window.BEER_DATA,C=window.BeerCore,$=id=>document.getElementById(id);
if(!D||!C){document.body.textContent='数据文件未加载。请保留 data/data.js 与 core.js，或打开 standalone.html。';return;}
const V=C.catalogView(D),activeIds=new Set(V.beers.map(b=>b.id));
const visibleShortlist=()=>C.currentShortlist(D,state.shortlist);
const ids=new Set(D.beers.map(b=>b.id)),KEY='beer-frontier.personal.v1';
let state=C.defaults(),analysis,visibleLimit=42,lastDialogId=null,toastTimer,pickerOpener=null,pickerDialogOpener=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=C.formatMoney;
const units=()=>state.unit==='order'?'整单':state.unit==='unit'?'件':'500ml';
const unitLong=()=>state.unit==='order'?'元 / 整单':state.unit==='unit'?'元 / 件':'元 / 500ml';
const labelScore=b=>state.scoreMode==='personal'?'我的评分':((b?.activeRating||(b?C.relatedRating(b,state):null))?.platform||'原平台均分');
const countLabel=r=>!r?'未找到匹配分':r.platform==='个人口味'?'个人记录':!Number.isFinite(r.count)?'评分次数未公布':r.count.toLocaleString()+(r.countType==='reviews'?'条评论 · 评分次数未公布':'次评分');
const platformColor=p=>({'BeerAdvocate':'#b95530','酒花儿':'#657d57','Untappd':'#497986','个人口味':'#b95530'}[p]||'#72766c');
const sourceKind={review:'口碑 / 品饮',price:'价格样本',official:'厂商资料',report:'媒体报道',spec:'零售商商品规格'};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const p=C.validateImport(JSON.parse(raw),ids);state={...state,...p};}}catch(e){toast('未能读取本地记录，已保留默认研究数据。');}}
function personalExport(){return {schemaVersion:1,exportedAt:new Date().toISOString(),datasetVersion:D.meta.version,overrides:state.overrides,personalScores:state.personalScores,shortlist:state.shortlist};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(personalExport()));}catch(e){toast('浏览器禁止本地保存，请导出JSON备份。');}}
function qStatus(b){if(b.activeQuote?.priceBasis==='taobao-displayed-snapshot')return (b.activeQuote.provenance?.inputPriceBasis==='calculated-page-promotion'?'淘宝页面优惠计算价':'淘宝页面价')+(b.activeQuote.ambiguous?' · 版本未确认':'');if(b.activeQuote?.personal)return '个人实付价 · 仅本地';if(!b.activeQuote)return b.purchaseGuide?'未核实市场报价 · 有编辑预算条件':'价格待补';if(b.activeQuote.historical)return '旧价 · '+(D.sources[b.activeQuote.sourceId]?.publishedAt||'年份待核对');if(b.activeQuote.ambiguous)return '参考起价 · 版本有歧义';return '参考样本 · 不是实时售价';}
function sourceLinks(sourceIds){return [...new Set(sourceIds.filter(Boolean))].map(id=>{const s=D.sources[id];return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`:'';}).join('');}
function communityRows(b,compact=false){return C.communityRatings(b).map(r=>`<div class="community-rating"><strong>${esc(r.platform)} ${r.value.toFixed(2)} / 5</strong> · ${esc(countLabel(r))}${r.match==='related'?' · 相关版本（不参与前沿）':compact?'':' · 匹配版本'}<small>核对：${esc(r.checkedAt||D.sources[r.sourceId]?.checkedAt||'日期待补')}</small>${compact?'':`<p>${esc(r.note||'')}</p>`}${sourceLinks([r.sourceId])}</div>`).join('');}
function rowById(id){const b=V.beers.find(x=>x.id===id);return b?C.resolve(b,state):null;}
function syncControls(){
 $('score-platform').innerHTML='<option value="all">默认评分</option>'+[...new Set(V.beers.flatMap(b=>C.communityRatings(b).map(r=>r.platform)))].sort().map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
 $('budget').value=state.budget;$('budget-unit').textContent=unitLong();
 const max=state.unit==='order'?Math.max(500,state.budget):Math.max(80,state.budget);
 $('budget-range').max=max;$('budget-range').value=state.budget;$('range-max').textContent='¥'+max;
 for(const [id,key]of [['price-scope','priceScope'],['unit','unit'],['mode','mode'],['score-mode','scoreMode'],['score-platform','scorePlatform'],['map-mode','mapMode'],['min-ratings','minRatings'],['max-abv','maxAbv'],['library-mode','libraryMode'],['sort','sort']])$(id).value=state[key];
 for(const [id,key]of [['historic','includeHistoric'],['ambiguous','includeAmbiguous'],['personal-prices','onlyPersonalPrices']])$(id).checked=state[key];
 $('min-ratings').disabled=state.scoreMode==='personal';$('score-platform').disabled=state.scoreMode==='personal';
 $('unit-note').textContent=state.unit==='order'?'使用原报价整组总额；包装数量不同，不是等量比价。':state.unit==='unit'?'每件包括瓶、罐、桶；5L桶也算一件，容量仍可能不同。整箱的折合单件价，不保证可以只买一件。':'只作价格换算，不是建议饮用量。整箱折合价不代表能按单瓶买到。';
 const styleNames=[...new Set(V.beers.filter(b=>state.family==='all'||b.family===state.family).map(b=>b.style))].filter(s=>s!=='待确认');
 $('style').innerHTML='<option value="all">所有具体风格</option>'+styleNames.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');$('style').value=state.style;
 $('family-tabs').innerHTML=Object.entries(D.families).filter(([k])=>k!=='unresolved').map(([k,v])=>`<button data-family="${k}" class="${state.family===k?'active':''}" aria-pressed="${state.family===k}">${esc(v.name)}</button>`).join('');
 $('shortlist-count').textContent=visibleShortlist().length;
 const presets=state.unit==='order'?[50,100,150,250]:[8,15,25,40];$('budget-presets').innerHTML=presets.map(v=>`<button data-budget="${v}">${v}元</button>`).join('');
}
function render(){analysis=C.analyze(D,state);syncControls();renderChart();renderRecommendation();renderLadder();renderOpportunities();renderLibrary();}
function chartAxes(m){
 const {W,H,L,R,T,B,x,y,xmax}=m;
 let svg=`<title id="plot-title">价格与评分 · 共享坐标</title><desc id="plot-desc">横轴${esc(unitLong())}，纵轴0至5分。各平台共用坐标，但评分体系不等价；前沿只连接同平台、同一比较组的酒款。圆点可参与比较，菱形为参考，完整名称与相邻点入口位于图外。</desc>`;
 svg+=`<rect x="${L}" y="${T}" width="${Math.max(0,x(Math.min(xmax,state.budget))-L)}" height="${H-T-B}" fill="#eff2e9"/>`;
 const ticks=W<420?3:5;
 for(let i=0;i<=ticks;i++){
  const v=xmax*i/ticks;
  svg+=`<line x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H-B}" class="chart-grid-line"/><text class="axis-text x-tick" x="${x(v)}" y="${H-B+20}" text-anchor="${i===ticks?'end':i===0?'start':'middle'}">${v===0?'0':v<10?v.toFixed(1):Math.round(v)}</text>`;
 }
 for(let v=0;v<=5;v++)svg+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="chart-grid-line"/><text class="axis-text y-tick" x="${L-9}" y="${y(v)+4}" text-anchor="end">${v}</text>`;
 svg+=`<text class="axis-text axis-rating" x="${L}" y="14">${state.scoreMode==='personal'?'个人':'社区'}评分 / 5</text><text class="axis-text axis-price" x="${W-R}" y="${H-3}" text-anchor="end">${esc(unitLong())} →</text>`;
 if(state.budget<xmax)svg+=`<line x1="${x(state.budget)}" x2="${x(state.budget)}" y1="${T}" y2="${H-B}" class="budget-line"/>`;
 return svg;
}
function chartFrontiers(m){
 return m.groups.filter(g=>g.points.length>1).map(g=>{
  const [first,...rest]=g.points;
  const path=`M${first.x},${first.y}`+rest.map(b=>` H${b.x} V${b.y}`).join('');
  return `<path d="${path}" class="frontier-path" stroke="${platformColor(g.platform)}" data-platform="${esc(g.platform)}" data-cohort="${esc(g.key)}" data-ids="${g.points.map(b=>b.id).join(',')}"/>`;
 }).join('');
}
function chartPoints(m){
 return m.placed.map(b=>{
  const {x:cx,y:cy,edge}=b,color=platformColor(b.plotRating.platform),label=pointLabel(b,edge);
  const mark=b.reference?`<path d="M${cx},${cy-6} L${cx+6},${cy} L${cx},${cy+6} L${cx-6},${cy} Z" fill="#fffefa" stroke="${color}" stroke-width="1.5"/>`:`<circle cx="${cx}" cy="${cy}" r="${edge?6.5:4.5}" fill="${b.plotPrice<=state.budget?color:'#fffefa'}" stroke="${color}" stroke-width="1.8"/>`;
  return `<g class="point" tabindex="0" role="button" data-point="${b.id}" data-platform="${esc(b.plotRating.platform)}" data-neighbours="${b.neighbours.join(',')}" data-reference="${b.reference}" aria-label="${esc(label)}"><circle class="point-hit" cx="${cx}" cy="${cy}" r="12" fill="transparent"/>${mark}<title>${esc(label)}</title></g>`;
 }).join('');
}
function chartKeys(m){
 const clusters=m.clusters.length?`<div class="cluster-controls"><span>相邻点</span>${m.clusters.map((c,i)=>`<button data-cluster="${c.ids.join(',')}" aria-label="展开相邻的 ${c.ids.length} 款酒，第 ${i+1} 组" title="${esc(c.ids.map(id=>m.placed.find(b=>b.id===id).name).join(' / '))}">${i+1}组 · ${c.ids.length}款 ↗</button>`).join('')}</div>`:'';
 const keys=m.groups.map(g=>`<div class="frontier-list-title" style="--platform:${platformColor(g.platform)}">${esc(g.key)} · 前沿酒款 · 按价格从低到高</div><div class="frontier-key" style="--platform:${platformColor(g.platform)}">${g.points.map((b,i)=>`<button data-open="${b.id}"><span class="frontier-number">${i+1}</span><span><strong>${esc(b.name)}</strong><small>¥${money(b.price)} · ${b.activeRating.value.toFixed(2)} 分</small></span></button>`).join('')}</div>`).join('');
 return clusters+(keys||'<p class="frontier-list-title">当前暂无可比较的前沿节点。</p>');
}
function chartUnplaced(points){
 return points.length?`<section class="unplaced-points"><div><h4>待补坐标 <span>${points.length}</span></h4><p>补齐价格或评分后，可在图中查看。</p></div><div class="unplaced-grid">${points.map(b=>`<button data-point="${b.id}" data-reference="true" aria-label="${esc(pointLabel(b,false))}"><span>${esc(b.name)}</span><small>${!Number.isFinite(b.plotPrice)?'价格待补':!b.plotRating?'评分未知':''}${!Number.isFinite(b.plotPrice)&&!b.plotRating?' · 评分未知':''}</small></button>`).join('')}</div></section>`:'';
}
function chartOffscreen(m){
 return m.offscreen.length?`<section class="offscreen-points unplaced-points" aria-label="范围外酒款"><h4>范围外酒款 <span>${m.offscreen.length}</span></h4><p>价格超过当前横轴上限，未移到边界；选择「恢复完整范围」可查看实际坐标。</p><div class="unplaced-grid">${m.offscreen.map(b=>`<button data-point="${b.id}" aria-label="${esc(pointLabel(b,false))}"><span>${esc(b.name)}</span><small>¥${money(b.plotPrice)} / ${units()} · ${esc(b.plotRating.platform)} ${b.plotRating.value.toFixed(2)}分${b.reference?' · 仅参考':''}</small></button>`).join('')}</div></section>`:'';
}
function sharedChart(m){
 if(!m.placed.length)return '';
 const legend=`<div class="platform-legend" aria-label="评分平台图例">${m.platforms.map(p=>`<span data-platform="${esc(p)}" style="--platform:${platformColor(p)}"><i></i>${esc(p)}</span>`).join('')}<p>前沿按平台分别计算，平台间的分数不直接比较。</p></div>`;
 return `<section class="shared-chart" data-xmax="${m.xmax}">${legend}<div class="chart-range" role="group" aria-label="横轴范围"><button data-chart-range="focus" aria-pressed="${state.chartRange==='focus'}">聚焦全部前沿</button><button data-chart-range="full" aria-pressed="${state.chartRange==='full'}">恢复完整范围</button><p role="status">当前 ¥0–${money(m.xmax)} / ${units()} · 范围外 ${m.offscreen.length} 款 · 保留全部前沿</p></div><svg viewBox="0 0 ${m.W} ${m.H}" data-ymin="0" data-ymax="5" role="group" aria-labelledby="plot-title plot-desc">${chartAxes(m)}${chartFrontiers(m)}${chartPoints(m)}</svg>${chartOffscreen(m)}${chartKeys(m)}</section>`;
}
function renderChart(){
 const m=C.chartModel(analysis,state,$('chart-wrap').clientWidth-32),edgeIds=analysis.edgeIds;
 const restorePicker=!$('point-picker').hidden&&$('point-picker').contains(document.activeElement);
 $('tooltip').hidden=true;
 $('point-picker').hidden=true;
 $('chart-subtitle').textContent=`${state.scoreMode==='personal'?'我的口味评分':state.scorePlatform==='all'?'默认主评分 · 各平台分别计算':state.scorePlatform+' · 最新匹配评分'} · ${m.rows.length} 款展示 · ${analysis.eligible.length} 款可比较 · ${analysis.edge.length} 个前沿节点`;
 $('chart-empty').hidden=m.rows.length>0;
 $('chart-empty').textContent='暂无满足筛选条件的酒款。切换「全部酒款」可查看待补资料的候选。';
 $('scatter').innerHTML=sharedChart(m)+chartUnplaced(m.unplaced);
 $('map-note').innerHTML='<strong>各平台独立计算。</strong> 浅绿区域在预算内，菱形仅供参考。范围外酒款与缺坐标酒款列于图下。';
 $('chart-table').innerHTML=`<table><caption>完整明细：当前筛选范围内 ${analysis.rows.length} 款。</caption><thead><tr><th>酒款</th><th>价格 / 当前范围</th><th>评价与样本口径</th><th>计算状态</th></tr></thead><tbody>${analysis.rows.map(b=>{const r=b.activeRating||C.relatedRating(b,state);return `<tr><td><button data-open="${b.id}">${esc(b.name)}</button></td><td>${priceLabel(b)}<small>${esc(qStatus(b))}</small></td><td>${r?esc(r.platform)+' '+r.value.toFixed(2)+'/5'+(!b.activeRating?'（相关版）':''):'未找到匹配分'}<small>${esc(countLabel(r))}${r?.checkedAt?' · '+esc(r.checkedAt):''}</small></td><td>${edgeIds.has(b.id)?'分平台前沿':b.eligible?'非前沿':esc(b.reasons.join('；'))}</td></tr>`;}).join('')}</tbody></table>`;
 $('all-index').innerHTML=analysis.rows.map((b,i)=>`<button data-open="${b.id}" class="index-chip ${edgeIds.has(b.id)?'is-edge':''}"><small>${String(i+1).padStart(2,'0')}</small>${esc(b.name)}</button>`).join('');
 $('evidence-strip').innerHTML=`<span><b>${analysis.rows.length}</b> 款保留展示</span><span><b>${analysis.eligible.length}</b> 款参与比较</span><span><b>${analysis.edge.length}</b> 个分平台前沿节点</span><span>${state.priceScope==='taobao'?'本次收录的淘宝报价':'全部来源 · 含旧报价'}</span>`;
 if(restorePicker)dismissPointPicker();
}
function pointLabel(b,edge){
 const price=b.priceBasis==='unknown'?'价格未知':`${b.priceBasis==='quote'?'报价样本':'编辑试饮预算条件（非市场价）'} ¥${money(b.plotPrice)} / ${units()}`;
 const rating=b.plotRating?`${b.plotRating.platform} ${b.plotRating.value.toFixed(2)}分${b.scoreBasis==='related'?'，相关版本，不是本款评分':''}`:'评分未知';
 return `${b.name}，${price}，${rating}，${edge?'分平台前沿':b.reference?'仅展示不参与前沿':'可比但非前沿'}。`;
}
function priceLabel(b){return b.price!==null?`报价 ¥${money(b.price)} / ${units()}`:'价格待补';}
function restorePickerFocus(opener){
 if(!opener)return;
 const {node,cluster,point}=opener;
 const target=node.isConnected?node:
  (cluster?$('scatter').querySelector(`[data-cluster="${CSS.escape(cluster)}"]`):null)||
  $('scatter').querySelector(`[data-point="${CSS.escape(point)}"]`);
 (target||$('map-mode')).focus();
}
function dismissPointPicker(){
 $('point-picker').hidden=true;
 restorePickerFocus(pickerOpener);
 pickerOpener=null;
}
function showPointPicker(ids,opener){
 pickerOpener={node:opener,cluster:opener.dataset.cluster,point:opener.dataset.point||ids.split(',')[0]};
 const items=ids.split(',').map(rowById).filter(Boolean);
 $('tooltip').hidden=true;
 $('point-picker').innerHTML=`<div class="picker-heading"><strong>相邻点 · ${items.length} 款</strong><button data-dismiss-picker aria-label="关闭相邻点列表">×</button></div>${items.map(b=>`<button data-open="${b.id}"><strong>${esc(b.name)}</strong><small>${priceLabel(b)}</small></button>`).join('')}`;
 $('point-picker').hidden=false;
 $('point-picker').querySelector('button[data-open]')?.focus();
}

function renderRecommendation(){
 const bests=analysis.bestByCohort;
 if(bests.length){$('recommendation').innerHTML=`<div class="recommend-main"><div class="kicker">预算内 · 按平台查看</div><h3>${bests.length===1?'预算内高分酒款':'各平台预算内高分酒款'}</h3><div class="cohort-recs">${bests.map(({name,beer:b})=>`<button data-open="${b.id}" class="cohort-rec"><span>${esc(name)}</span><strong>${esc(b.name)}</strong><em>¥${money(b.price)} / ${esc(units())} · ${b.activeRating.value.toFixed(2)}/5</em><small>${esc(qStatus(b))}；整组 ¥${money(b.activeQuote.total)}</small></button>`).join('')}</div><p class="helper">结果仅覆盖当前筛选范围。</p></div>`;
 }else{$('recommendation').innerHTML='<div class="recommend-main"><div class="kicker">看看其他选择</div><h3>预算内暂无可比较酒款</h3><p>可查看下方酒款资料，或填写自己的价格和评分。</p></div>';}
}

function renderLadder(){
 if(!analysis.edge.length){$('ladder-content').innerHTML='<div class="empty-panel">暂时无法形成预算阶梯。补齐报价与同源评分，或切换个人口味模式后，这里会自动生成。</div>';return;}
 const groups={};for(const b of analysis.edge){const key=C.cohort(b,state.mode);(groups[key]||=[]).push(b);}
 $('ladder-content').innerHTML=Object.entries(groups).map(([name,items])=>{
 let last=null;const cards=items.map((b,i)=>{const gain=last?(b.activeRating.value-last.activeRating.value):null;const difference=last?b.price-last.price:null;last=b;
  return `<article class="ladder-card ${analysis.best?.id===b.id?'current':''}"><span class="step">选择 ${String(i+1).padStart(2,'0')}</span><span class="step-mark">${b.price<=state.budget?'预算覆盖':'预算之外'}</span><div class="price">¥${money(b.price)} <small>/ ${esc(units())}</small></div><h3>${esc(b.name)}</h3><span class="step-rating">${esc(labelScore(b))} ${b.activeRating.value.toFixed(2)} / 5</span><p>${gain!==null?`相比上一款：多 ¥${money(difference)}，均分 +${gain.toFixed(2)}。`:'当前范围内最便宜的前沿酒款。'}<br>${esc(qStatus(b))}<br>按原包装支付 ¥${money(b.activeQuote.total)} / ${b.activeQuote.quantity}件。</p><button class="inline-link" data-open="${b.id}">看评价与报价 ↗</button></article>`;});
 return `<h3 class="group-heading">${esc(name)} <span class="micro">${items.length} 个前沿节点</span></h3><div class="ladder-grid">${cards.join('')}</div>${state.mode==='style'&&items.length===1?'<p class="frontier-single">该风格目前只有一款前沿酒款。</p>':''}`;
 }).join('');
}
function renderOpportunities(){
 const candidates=analysis.rows.filter(b=>!b.identityPending&&b.activeRating&&(state.scoreMode==='personal'||b.activeRating.count>=state.minRatings)&&!b.eligible&&b.reasons.every(r=>['暂无可换算价格','未填写实付价','历史报价已排除','报价版本或状态待确认'].includes(r))).sort((a,b)=>b.activeRating.value-a.activeRating.value).slice(0,4);
 $('quote-opportunities').innerHTML=candidates.length?`<div class="opportunity-heading"><h3>把预算带去问价</h3><p>这些是还未进入计算的候选，不是已确认能买到的推荐。录入报价后，才判断是否入围。</p></div><div class="opportunity-grid">${candidates.map(b=>{const bound=C.entryLimit(b,analysis.eligible,state.mode);return `<button class="opportunity" data-open="${b.id}"><span class="opportunity-score">${b.activeRating.value.toFixed(2)}<small> / 5</small></span><strong>${esc(b.name)}</strong><span>${esc(qStatus(b))}</span><p>${bound?.price!==null&&bound?`想进入当前前沿，报价需在 ¥${money(bound.price)} / ${esc(units())}；${bound.strict?'需低于此价格':'不超过此价格'}。`:'当前没有同平台、评分不低于它的已报价酒款，可先填写实际报价。'}你的预算为 ¥${money(state.budget)}。</p><em>填写报价 ↗</em></button>`;}).join('')}</div><p class="section-note">以上价格由同平台评分和已有报价算出，仅作询价参考。填入实际报价后会重新计算；显示金额保留两位小数。</p>`:'';
}
function renderLibrary(){
 let rows=analysis.rows.slice();const q=state.query.trim().toLowerCase();if(q)rows=rows.filter(b=>[b.name,b.english,b.style,...b.tags,...b.aliases].join(' ').toLowerCase().includes(q));
 switch(state.libraryMode){case 'budget':rows=rows.filter(b=>Number.isFinite(b.price)&&b.price<=state.budget);break;case 'eligible':rows=rows.filter(b=>b.eligible);break;case 'edge':rows=rows.filter(b=>analysis.edgeIds.has(b.id));break;case 'pending':rows=rows.filter(b=>!b.eligible);break;case 'saved':rows=rows.filter(b=>state.shortlist.includes(b.id));break;}
 const score=b=>b.activeRating?.value??-1;
 rows.sort((a,b)=>state.sort==='score'?(labelScore(a).localeCompare(labelScore(b))||score(b)-score(a)):state.sort==='samples'?(labelScore(a).localeCompare(labelScore(b))||String(a.activeRating?.countType).localeCompare(String(b.activeRating?.countType))||(b.activeRating?.count||0)-(a.activeRating?.count||0)):state.sort==='name'?a.name.localeCompare(b.name,'zh'):(a.price??Infinity)-(b.price??Infinity));
 $('library-total').textContent=rows.length;
 $('library-caption').textContent=`共 ${rows.length} 款。搜索仅筛选酒款卡片；平台、风格和酒精度筛选同时用于图表。`;
 $('beer-grid').innerHTML=rows.length?rows.map(card).join(''):'<div class="empty-panel">没有匹配条目。请清除搜索词，或重置上方风格筛选。</div>';
 $('show-more').hidden=true;$('show-more').textContent=`再显示 ${Math.min(12,rows.length-visibleLimit)} 个条目 ↓`;
}
function card(b){const color=D.families[b.family].color,edge=analysis.edgeIds.has(b.id),saved=state.shortlist.includes(b.id),r=b.activeRating||C.relatedRating(b,state),g=b.purchaseGuide;
 return `<article class="beer-card" data-beer-id="${b.id}" style="--beer-color:${color}"><div class="card-top"><span class="style-badge">${esc(D.families[b.family].name)}</span><button class="save-btn ${saved?'saved':''}" data-save="${b.id}" aria-label="${saved?'从对比移除':'加入对比'} ${esc(b.name)}" aria-pressed="${saved}">${saved?'★':'☆'}</button></div><h3>${esc(b.name)}</h3><p class="english">${esc(b.english)}</p><div class="card-meta">${esc(b.country)} · ${b.abv!==null?b.abv+'% ABV':'ABV未核实'} · ${b.volumeMl||'—'}ml${b.representative?' · 明确选取的代表款':''}</div><p class="card-review">${esc(b.review.positive)}</p><div class="tag-row">${b.tags.map(t=>`<span class="taste-tag">${esc(t)}</span>`).join('')}</div><div class="card-numbers"><div class="card-price">${b.price!==null?'¥'+money(b.price):'价格待补'}<small> / ${esc(units())}</small></div><div class="card-rating">${r?r.value.toFixed(2):'未评分'}<small>${r?' / 5':''}</small></div></div><div class="number-labels"><span>${b.price!==null?'包装报价':'暂无报价'}</span><span>${r?esc(r.platform)+(b.activeRating?'':' · 相关版'):'暂无评分'}</span></div><p class="sample-note">${esc(countLabel(r))}${r?.checkedAt?' · '+esc(r.checkedAt):''}${r&&!b.activeRating?'；不参与前沿':''}</p><div class="price-status ${b.activeQuote?.personal?'price-personal':''}">${esc(qStatus(b))}${b.activeQuote?`<br>原包装 ¥${money(b.activeQuote.total)} / ${b.activeQuote.quantity}件 × ${b.activeQuote.volumeMl==null?'容量待补':b.activeQuote.volumeMl+'ml'} · ${esc(b.activeQuote.checkedAt||'日期待补')}`:''}</div>${g?`<div class="budget-guide"><span>试饮预算建议</span><strong>≤ ¥${money(g.ceiling)} / ${g.volumeMl}ml</strong><p>${esc(b.review.fit)}</p></div>`:`<div class="budget-guide"><p>${esc(b.review.fit||'')}</p></div>`}<details class="community-scores"><summary>各平台评分${C.communityRatings(b).some(r=>r.match==='related')?' · 含相关版本':''}</summary>${communityRows(b,true)}</details><div class="card-bottom">${edge?'<span class="edge-badge">↗ 分平台前沿</span>':`<span class="pending-badge">${b.reasons.length?esc(b.reasons[0]):'可比较'}</span>`}<button class="inline-link" data-open="${b.id}">详情 / 修改价格 ↗</button></div></article>`;
}

function detail(id){const b=rowById(id);if(!b)return;lastDialogId=id;
 const within=C.isInScope(b,state);const dominators=within&&b.eligible?analysis.dominatedBy(b):[];
 const reason=!within?'不在当前筛选范围内。':!b.eligible?'未进入前沿计算：'+b.reasons.join('；')+'。':dominators.length?`${dominators[0].name} 在当前口径中价格更低或相同（¥${money(dominators[0].price)}），评分更高或相同（${dominators[0].activeRating.value.toFixed(2)}），且至少一项更优，因此本款不在前沿。`:'位于当前筛选范围的前沿：没有另一个可比候选能同时做到不更贵且评分不更低，并至少一项严格更好。';
 const q=b.activeQuote,underlying=b.quote,r=b.activeRating||C.relatedRating(b,state);
 const seed=q||{quantity:1,volumeMl:b.volumeMl||'',total:''};
 const source=q?.sourceId?D.sources[q.sourceId]:null;
 $('dialog-content').innerHTML=`<div class="dialog-top"><div style="--beer-color:${D.families[b.family].color}"><span class="style-badge">${esc(b.style)}</span><h2 id="dialog-title">${esc(b.name)}</h2><p class="english">${esc(b.english)}</p></div><button class="icon-btn" data-close="beer-dialog" aria-label="关闭详情">×</button></div><div class="dialog-body"><div class="detail-stats"><div class="detail-stat"><strong>${b.price!==null?'¥'+money(b.price):'待补'}</strong><span>${esc(units())} · ${q?.personal?'个人价':'参考价'}</span></div><div class="detail-stat"><strong>${r?r.value.toFixed(2):'—'} <small>/ 5</small></strong><span>${esc(labelScore(b))}${r&&!b.activeRating?' · 相关版':''}<br>${esc(countLabel(r))}</span></div><div class="detail-stat"><strong>${b.abv!==null?b.abv+'%':'待核对'}</strong><span>ABV · ${esc(b.country)} · 实物优先</span></div></div>${b.identityNote?`<div class="detail-caution">${esc(b.identityNote)}</div>`:''}<section class="detail-section"><h3>风味资料</h3><p>${esc(b.review.positive)}</p><h3>选购提醒</h3><p>${esc(b.review.caution)}</p><h3>适合的口味偏好</h3><p>${esc(b.review.fit)}</p><div class="source-links">${sourceLinks(b.review.sourceIds)}</div></section><section class="detail-section"><h3>价格与包装</h3>${q?`<p class="quote-breakdown">${q.quantity}件包装；每件 ${q.volumeMl==null?'容量待补':q.volumeMl+'ml'}</p><p>每件 ¥${money(C.cost(q,'unit'))}；折合500ml ¥${money(C.cost(q,'500ml'))}；整单${q.provenance?.inputPriceBasis==='calculated-page-promotion'?'按所选页面计算':'显示'} ¥${money(q.total)}。整箱折合价格不是单瓶购买承诺。</p><p>${q.selectedSku?`规格：${esc(q.selectedSku)}。`:''}</p>${q.variantNote?`<p class="detail-caution">版本说明：${esc(q.variantNote)}</p>`:''}<details><summary>报价条件</summary><p>${esc(q.note||'个人填写的总价；请确认已经包含运费。')}</p></details><p>${esc(qStatus(b))}。记录核对日：${esc(q.checkedAt||'待补')}；来源发布日期：${esc(source?.publishedAt||'未能完整核实')}。</p><div class="source-links">${sourceLinks([q.sourceId])}</div>`:'<p>当前价格范围暂无可用报价。</p>'}${q?.personal&&underlying?`<p class="helper">原始参考样本仍保留：¥${money(underlying.total)} / ${underlying.quantity}件 × ${underlying.volumeMl}ml。清除个人价即可恢复。${sourceLinks([underlying.sourceId])}</p>`:''}</section><div class="detail-notice">${esc(reason)}<br>前沿只反映价格与评分，不是对个人口味、渠道或新鲜度的保证。</div><section class="detail-section"><h3>试饮预算建议</h3>${b.purchaseGuide?`<p class="guide-detail">建议先以 <strong>≤ ¥${money(b.purchaseGuide.ceiling)} / ${b.purchaseGuide.volumeMl}ml</strong> 作为试饮买入条件。</p><p>${esc(b.purchaseGuide.note)}</p>`:'<p>暂无预算建议。</p>'}<h3>各平台评分与来源</h3>${communityRows(b)}<h3>当前评分</h3><p>${r?esc(r.platform)+' · '+(b.activeRating?'匹配版本':'相关版本'):'暂无匹配版本评分'}</p>${r&&!b.activeRating?`<p class="detail-caution">仅相关版本评价：${esc(r.note)} 不参与本款前沿。</p>`:''}<div class="source-links">${sourceLinks([r?.sourceId,...(b.extraSourceIds||[])])}</div></section><form id="price-form" class="edit-form" data-id="${id}"><h3>用我的实际报价重新计算</h3><p>确认是这一款酒；总支出请包含运费。只写在你的浏览器里。</p><div class="form-grid"><div><label class="field-label" for="edit-total">总支出 / 元</label><input id="edit-total" name="total" type="number" min="0.01" max="1000000" step="0.01" value="${seed.total}" required></div><div><label class="field-label" for="edit-qty">包装件数</label><input id="edit-qty" name="quantity" type="number" min="1" max="10000" step="1" value="${seed.quantity}" required></div><div><label class="field-label" for="edit-volume">每件容量 / ml</label><input id="edit-volume" name="volume" type="number" min="1" max="100000" step="0.1" value="${seed.volumeMl??''}" required></div></div><p id="live-price" class="form-feedback"></p><div class="form-actions"><button class="primary" type="submit" ${b.identityPending?'disabled':''}>保存实付价并重算</button><button type="button" class="inline-link" data-clear-price="${id}">清除个人价</button></div>${b.identityPending?'<p class="identity-flag">名称或版本未确认，不能通过填价格绕过身份核对。请让维护者先确认具体SKU。</p>':''}<div class="personal-score-row"><div><label for="personal-score">我的口味分 · 0–5</label><p>只和其他个人分一起计算，不与任何社区分混合。</p></div><input class="score-input" id="personal-score" type="number" min="0" max="5" step="0.01" value="${state.personalScores[id]??''}" placeholder="未评分"><button type="button" class="outline" data-save-score="${id}">保存口味分</button></div></form></div>`;
 if(!$('beer-dialog').open)$('beer-dialog').showModal();
 $('price-form').addEventListener('submit',onPriceSubmit);
 for(const fid of ['edit-total','edit-qty','edit-volume'])$(fid).addEventListener('input',livePrice);
 livePrice();
}
function livePrice(){const q={total:Number($('edit-total').value),quantity:Number($('edit-qty').value),volumeMl:Number($('edit-volume').value)};$('live-price').textContent=C.validQuote(q)&&Number.isFinite(q.volumeMl)&&q.volumeMl>0?`即时换算：每件 ¥${money(C.cost(q,'unit'))} · 每500ml ¥${money(C.cost(q,'500ml'))}`:'请填写有效的总价、整数件数和容量。';}
function onPriceSubmit(e){e.preventDefault();const id=e.currentTarget.dataset.id;if(D.beers.find(b=>b.id===id)?.identityPending)return;
 const q={total:Number($('edit-total').value),quantity:Number($('edit-qty').value),volumeMl:Number($('edit-volume').value),checkedAt:new Date().toISOString().slice(0,10),note:'用户自行填写的总支出；商品身份与运费由用户核对。'};
 if(!C.validQuote(q)){toast('价格无效，请检查总价、件数和毫升数。');return;}state.overrides[id]=q;save();render();detail(id);toast('已保存个人报价，前沿已重新计算。');}
function toggleSave(id){if(!activeIds.has(id))return;if(state.shortlist.includes(id)){state.shortlist=state.shortlist.filter(x=>x!==id);}else if(visibleShortlist().length<3)state.shortlist.push(id);else {toast('最多对比3款，请先移除一款。');return;}save();renderLibrary();$('shortlist-count').textContent=visibleShortlist().length;if($('compare-dialog').open)renderCompare();}
function renderCompare(){const rows=visibleShortlist().map(rowById).filter(Boolean);$('compare-content').innerHTML=rows.length?`<div class="compare-grid">${rows.map(b=>`<article class="compare-cell" style="--beer-color:${D.families[b.family].color}"><span class="style-badge">${esc(D.families[b.family].name)}</span><h3>${esc(b.name)}</h3><p>${esc(b.style)} · ${b.abv??'—'}% ABV</p><div class="card-price">${b.price!==null?'¥'+money(b.price):'价格待补'} <small>/ ${esc(units())}</small></div><p>${esc(labelScore(b))}：${b.activeRating?b.activeRating.value.toFixed(2)+'/5':'缺数据'}</p><p>${esc(qStatus(b))}</p><p>${esc(b.review.positive)}</p><p><strong>取舍：</strong>${esc(b.review.caution)}</p><p><button class="inline-link" data-compare-open="${b.id}">查看来源 / 改价 ↗</button></p><p><button class="inline-link" data-save="${b.id}">从清单移除</button></p></article>`).join('')}</div><p class="compare-tip">这里可以跨风格对照，但不会把不同口味自动评为高低。价格口径沿用主页面。</p>`:'<div class="compare-body empty-panel">点击资料卡右上角 ☆，最多添加3款进行并排对比。</div>';}
function renderSources(){const list=Object.values(D.sources);$('sources-list').innerHTML=list.map(s=>`<div class="source-item"><span class="source-type">${sourceKind[s.kind]}<br>${s.evidence==='search-index'?'搜索索引':'页面读取'}</span><div><a class="source-name" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.note||'仅用于本页对应酒款、规格或公开评价；不是实时报价。')}</p></div><span>核对 ${esc(s.checkedAt)}<br>发布 ${esc(s.publishedAt||'日期未完整核实')}</span></div>`).join('');}
function update(key,value){state[key]=value;visibleLimit=42;render();}
function closeDialog(id){$(id).close();}
// Delegation handles dynamically rendered cards without inline JavaScript.
document.addEventListener('click',e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.hasAttribute('data-dismiss-picker'))dismissPointPicker();
 if(t.dataset.chartRange){state.chartRange=t.dataset.chartRange;renderChart();$('scatter').querySelector(`[data-chart-range="${state.chartRange}"]`).focus();}
 if(t.dataset.open){
  if($('point-picker').contains(t)){
   pickerDialogOpener=pickerOpener;
   dismissPointPicker();
  }else $('point-picker').hidden=true;
  detail(t.dataset.open);
 }
 if(t.dataset.save)toggleSave(t.dataset.save);
 if(t.dataset.close)closeDialog(t.dataset.close);
 if(t.dataset.budget)update('budget',Number(t.dataset.budget));
 if(t.dataset.family){state.family=t.dataset.family;state.style='all';visibleLimit=42;render();}
 if(t.dataset.clearPrice){delete state.overrides[t.dataset.clearPrice];save();render();detail(t.dataset.clearPrice);toast('已清除个人价，恢复原始资料状态。');}
 if(t.dataset.saveScore){const id=t.dataset.saveScore,raw=$('personal-score').value;if(raw===''){delete state.personalScores[id];}else{const n=Number(raw);if(!Number.isFinite(n)||n<0||n>5){toast('口味分必须是0–5之间的数字。');return;}state.personalScores[id]=n;}save();render();detail(id);toast('已保存；选择“我的口味评分”后参与独立计算。');}
 if(t.dataset.compareOpen){closeDialog('compare-dialog');detail(t.dataset.compareOpen);}
});
$('budget').addEventListener('input',e=>{if(e.target.value==='')return;const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=1000000){state.budget=n;analysis=C.analyze(D,state);$('budget-range').max=Math.max(Number($('budget-range').max),n);$('budget-range').value=n;renderChart();renderRecommendation();renderLadder();renderOpportunities();}});
$('budget').addEventListener('change',()=>render());
$('budget-range').addEventListener('input',e=>update('budget',Number(e.target.value)));
for(const [id,key,isNumber]of [['price-scope','priceScope'],['unit','unit'],['mode','mode'],['score-mode','scoreMode'],['score-platform','scorePlatform'],['map-mode','mapMode'],['min-ratings','minRatings',true],['max-abv','maxAbv',true],['style','style'],['sort','sort'],['library-mode','libraryMode']])$(id).addEventListener('change',e=>{if(key==='unit'){state.budget=e.target.value==='order'?150:20;}update(key,isNumber?Number(e.target.value):e.target.value);});
for(const [id,key]of [['historic','includeHistoric'],['ambiguous','includeAmbiguous'],['personal-prices','onlyPersonalPrices']])$(id).addEventListener('change',e=>update(key,e.target.checked));
$('switch-real').addEventListener('click',()=>{update('onlyPersonalPrices',true);$('explore').scrollIntoView({behavior:'smooth'});});
$('search').addEventListener('input',e=>{state.query=e.target.value;visibleLimit=42;renderLibrary();});
$('show-more').addEventListener('click',()=>renderLibrary());
$('show-all').addEventListener('click',()=>{$('reset-filters').click();$('library').scrollIntoView({behavior:'smooth'});});
$('reset-filters').addEventListener('click',()=>{const p=personalExport();state={...C.defaults(),overrides:p.overrides,personalScores:p.personalScores,shortlist:p.shortlist};$('search').value='';visibleLimit=42;render();toast('已重置筛选；个人报价与清单未删除。');});
$('toggle-table').addEventListener('click',()=>{const open=$('chart-table').hidden;$('chart-table').hidden=!open;$('toggle-table').setAttribute('aria-expanded',String(open));$('toggle-table').textContent=open?'收起图表数据 ↑':'查看图表数据 ↓';});
$('toggle-sources').addEventListener('click',()=>{const open=$('sources-list').hidden;$('sources-list').hidden=!open;$('toggle-sources').setAttribute('aria-expanded',String(open));$('toggle-sources').textContent=open?'收起全部来源':'展开全部来源';if(open)renderSources();});
$('nav-shortlist').addEventListener('click',()=>{renderCompare();$('compare-dialog').showModal();});
for(const id of ['beer-dialog','compare-dialog'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
$('scatter').addEventListener('click',e=>{const cluster=e.target.closest('[data-cluster]'),p=e.target.closest('[data-point]');if(cluster)showPointPicker(cluster.dataset.cluster,cluster);else if(p){if(p.dataset.neighbours?.includes(','))showPointPicker(p.dataset.neighbours,p);else {pickerDialogOpener={node:p,point:p.dataset.point};detail(p.dataset.point);}}});
$('scatter').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const cluster=e.target.closest('[data-cluster]'),p=e.target.closest('[data-point]');if(cluster||p){e.preventDefault();if(cluster)showPointPicker(cluster.dataset.cluster,cluster);else {pickerDialogOpener={node:p,point:p.dataset.point};detail(p.dataset.point);}}}});
$('point-picker').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dismissPointPicker();}});
$('beer-dialog').addEventListener('close',()=>{
 const dialog=$('beer-dialog');
 if(dialog.open)return; // A queued close must not consume a reopened dialog's opener.
 if(document.activeElement===document.body||dialog.contains(document.activeElement))restorePickerFocus(pickerDialogOpener);
 pickerDialogOpener=null;
});
function chartTooltip(e){const target=e.target.closest('[data-point]');if(!target){$('tooltip').hidden=true;return;}const b=C.displayPoint(rowById(target.dataset.point),state);$('tooltip').innerHTML=`<strong>${esc(b.name)}</strong><p>${priceLabel(b)}</p><p>${b.plotRating?esc(b.plotRating.platform)+' '+b.plotRating.value.toFixed(2)+'/5'+(b.scoreBasis==='related'?' · 相关版本':''):'评分未知'}</p><p>${b.reference?'◇ 仅展示，不参与前沿':esc(qStatus(b))}</p><p>点击看版本与出处 ↗</p>`;$('tooltip').hidden=false;const r=$('chart-wrap').getBoundingClientRect(),pr=target.getBoundingClientRect();$('tooltip').style.left=Math.max(5,Math.min((e.clientX||pr.left)-r.left+10,r.width-240))+'px';$('tooltip').style.top=Math.max(5,(e.clientY||pr.top)-r.top-90)+'px';}
$('scatter').addEventListener('pointermove',chartTooltip);$('scatter').addEventListener('focusin',chartTooltip);$('scatter').addEventListener('pointerleave',()=>$('tooltip').hidden=true);$('scatter').addEventListener('focusout',()=>$('tooltip').hidden=true);
$('export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(personalExport(),null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='beer-frontier-personal-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);toast('已导出个人报价、评分与对比清单。');});
$('import-data').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1000000)throw Error('文件超过1MB，请检查是否是个人数据JSON。');const p=C.validateImport(JSON.parse(await file.text()),ids);if(!confirm('导入会替换本浏览器的个人报价、口味分与对比清单。是否继续？'))return;state={...state,...p};save();render();toast('导入完成，前沿已重算。');}catch(err){toast('导入失败：'+err.message);}finally{e.target.value='';}});
$('reset-personal').addEventListener('click',()=>{if(!confirm('确定清空本浏览器的实付价、个人评分与对比清单？研究数据不受影响。'))return;state.overrides={};state.personalScores={};state.shortlist=[];save();render();toast('个人数据已清空。');});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(analysis)renderChart();},100);});
load();$('stat-total').textContent=V.beers.length;$('stat-rated').textContent=V.beers.filter(b=>b.rating).length;$('stat-prices').textContent=V.beers.filter(b=>b.quote?.priceBasis==='taobao-displayed-snapshot').length;$('scope-note').textContent=`当前可查看 ${V.beers.length} 款啤酒的价格、评分与来源。`;render();
// Test hook exposes read-only snapshots, not a writable state reference.
window.BeerFrontier={getState:()=>JSON.parse(JSON.stringify(state)),getAnalysis:()=>({eligible:analysis.eligible.map(b=>b.id),frontier:analysis.edge.map(b=>b.id),best:analysis.best?.id||null,bestByCohort:analysis.bestByCohort.map(x=>({name:x.name,id:x.beer.id})),displayed:analysis.rows.length})};
})();
