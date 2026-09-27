/* Static, local-first interaction layer. All quotations remain evidence snapshots. */
(()=>{
'use strict';
const D=window.BEER_DATA,C=window.BeerCore,$=id=>document.getElementById(id);
if(!D||!C){document.body.textContent='数据文件未加载。请保留 data/data.js 与 core.js，或打开 standalone.html。';return;}
const ids=new Set(D.beers.map(b=>b.id)),KEY='beer-frontier.personal.v1';
let state=C.defaults(),analysis,visibleLimit=42,lastDialogId=null,toastTimer;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number.isFinite(v)?v.toFixed(2):'—';
const units=()=>state.unit==='order'?'整单':state.unit==='unit'?'瓶 / 罐':'500ml';
const unitLong=()=>state.unit==='order'?'元 / 整单':state.unit==='unit'?'元 / 瓶或罐':'元 / 500ml';
const labelScore=b=>state.scoreMode==='personal'?'我的评分':((b?.activeRating||b?.relatedRating)?.platform||'原平台均分');
const countLabel=r=>!r?'未找到匹配分':r.platform==='个人口味'?'个人记录':r.count?.toLocaleString()+(r.countType==='reviews'?'条文字评论 · 评分人数未知':'个评分');
const platformColor=p=>({'BeerAdvocate':'#b95530','酒花儿':'#657d57','Untappd':'#497986','个人口味':'#b95530'}[p]||'#72766c');
const sourceKind={review:'口碑 / 品饮',price:'价格样本',official:'厂商资料',report:'媒体报道',spec:'零售商商品规格'};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const p=C.validateImport(JSON.parse(raw),ids);state={...state,...p};}}catch(e){toast('未能读取本地记录，已保留默认研究数据。');}}
function personalExport(){return {schemaVersion:1,exportedAt:new Date().toISOString(),datasetVersion:D.meta.version,overrides:state.overrides,personalScores:state.personalScores,shortlist:state.shortlist};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(personalExport()));}catch(e){toast('浏览器禁止本地保存，请导出JSON备份。');}}
function qStatus(b){if(b.activeQuote?.personal)return '个人实付价 · 仅本地';if(!b.activeQuote)return '未核实市场报价 · 有编辑预算条件';if(b.activeQuote.historical)return '旧价 · '+(D.sources[b.activeQuote.sourceId]?.publishedAt||'年份待核对');if(b.activeQuote.ambiguous)return '参考起价 · 版本有歧义';return '参考样本 · 不是实时售价';}
function sourceLinks(sourceIds){return [...new Set(sourceIds.filter(Boolean))].map(id=>{const s=D.sources[id];return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`:'';}).join('');}
function rowById(id){const b=D.beers.find(x=>x.id===id);return b?C.resolve(b,state):null;}
function syncControls(){
 $('budget').value=state.budget;$('budget-unit').textContent=unitLong();
 const max=state.unit==='order'?Math.max(500,state.budget):Math.max(80,state.budget);
 $('budget-range').max=max;$('budget-range').value=state.budget;$('range-max').textContent='¥'+max;
 for(const [id,key]of [['unit','unit'],['mode','mode'],['score-mode','scoreMode'],['score-platform','scorePlatform'],['map-mode','mapMode'],['min-ratings','minRatings'],['max-abv','maxAbv'],['library-mode','libraryMode'],['sort','sort']])$(id).value=state[key];
 for(const [id,key]of [['historic','includeHistoric'],['ambiguous','includeAmbiguous'],['personal-prices','onlyPersonalPrices']])$(id).checked=state[key];
 $('min-ratings').disabled=state.scoreMode==='personal';$('score-platform').disabled=state.scoreMode==='personal';
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
 const svg=$('scatter'),rows=(state.mapMode==='evidence'?analysis.eligible:analysis.rows).map(b=>C.displayPoint(b,state)),edgeIds=analysis.edgeIds;
 $('chart-subtitle').textContent=`${rows.length} / ${analysis.rows.length} 款显示 · ${analysis.eligible.length} 款进入证据比较 · ${analysis.edge.length} 个分平台前沿节点`;
 $('chart-empty').hidden=rows.length>0;
 if(!rows.length)$('chart-empty').innerHTML='当前没有符合条件的数据。<br>切回“全款参考视图”仍可查看缺资料的候选。';
 const W=Math.max(310,Math.min(850,$('chart-wrap').clientWidth-24)),H=W<500?390:430,L=W<500?40:56,R=22,T=34,B=105,PW=W-L-R,PH=H-T-B;
 svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
 const xmax=niceMax(Math.max(10,state.budget*1.1,...rows.map(b=>(b.plotPrice||0)*1.12))),vals=rows.filter(b=>b.plotRating).map(b=>b.plotRating.value);
 const ymin=vals.length?Math.max(0,Math.floor((Math.min(...vals)-.15)*4)/4):0,ymax=vals.length?Math.min(5,Math.ceil((Math.max(...vals)+.15)*4)/4):5;
 const x=v=>L+v/xmax*PW,y=v=>T+(ymax-v)/(ymax-ymin||1)*PH,unknownY=H-25;
 let out=`<title id="chart-title">全部酒款与分平台证据前沿</title><desc id="chart-description">展示${rows.length}款。横轴为报价或明确标注的编辑试饮预算，纵轴保留原平台分。空心菱形参考点不参与前沿。未知评分在图下独立无评分带，不当作零分。</desc>`;
 out+=`<rect x="${L}" y="${T}" width="${x(Math.min(xmax,state.budget))-L}" height="${PH}" fill="#edf1e6" opacity=".7"/>`;
 for(let i=0;i<=5;i++){const v=xmax*i/5;out+=`<line x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H-B}" stroke="#e8eadf" stroke-dasharray="2 5"/><text class="axis-text" x="${x(v)}" y="${H-B+21}" text-anchor="middle">${v<10?v.toFixed(1):Math.round(v)}</text>`;}
 for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4;out+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#e7e9df"/><text class="axis-text" x="${L-10}" y="${y(v)+4}" text-anchor="end">${v.toFixed(2)}</text>`;}
 out+=`<text class="axis-text" x="${L}" y="16">原平台 / 个人分（${ymin.toFixed(2)}—${ymax.toFixed(2)}）</text><text class="axis-text" x="${W-R}" y="${H-B+43}" text-anchor="end">报价 / 预算条件 · ${esc(unitLong())}</text>`;
 if(state.budget<xmax)out+=`<line x1="${x(state.budget)}" x2="${x(state.budget)}" y1="${T}" y2="${H-B}" stroke="#788565" stroke-dasharray="5 4"/>`;
 const groups={};for(const b of analysis.edge){const k=C.cohort(b,state.mode);(groups[k]||=[]).push(b);}
 for(const g of Object.values(groups)){if(g.length<2)continue;let path='M'+x(g[0].price)+','+y(g[0].activeRating.value);for(const b of g.slice(1))path+=` H${x(b.price)} V${y(b.activeRating.value)}`;out+=`<path d="${path}" fill="none" stroke="${platformColor(g[0].activeRating.platform)}" stroke-width="2"/>`;}
 if(rows.some(b=>!b.plotRating)){out+=`<rect x="${L}" y="${unknownY-14}" width="${PW}" height="27" rx="5" fill="#f0eee7"/><text class="axis-text" x="${L}" y="${unknownY-20}">未取得评分 · 独立区域，不是 0 分</text>`;}
 const labels=[];
 for(const b of rows.slice().sort((a,b)=>Number(edgeIds.has(a.id))-Number(edgeIds.has(b.id)))){
  const cx=x(b.plotPrice??0),cy=b.plotRating?y(b.plotRating.value):unknownY,edge=edgeIds.has(b.id),color=b.reference?'#858980':platformColor(b.activeRating.platform);
  const priceText=b.priceBasis==='editorial-ceiling'?'编辑试饮预算条件（非市场价）':'报价样本';
  const scoreText=b.plotRating?`${b.plotRating.platform} ${b.plotRating.value.toFixed(2)}分${b.scoreBasis==='related'?'，相关版本，不能当作本款评分':''}`:'评分未知，不按零分处理';
  const label=`${b.name}，${priceText}¥${money(b.plotPrice)}/${units()}，${scoreText}，${edge?'分平台前沿':b.reference?'仅展示不参与前沿':'可比但非前沿'}。`;
  const mark=b.reference?`<path d="M${cx},${cy-6} L${cx+6},${cy} L${cx},${cy+6} L${cx-6},${cy} Z" fill="#fffefa" stroke="${color}" stroke-width="1.6"/>`:`<circle cx="${cx}" cy="${cy}" r="${edge?6:4.6}" fill="${b.price<=state.budget?color:'#fffefa'}" stroke="${color}" stroke-width="${edge?2:1.5}"/>`;
  out+=`<g class="point" tabindex="0" role="button" data-point="${b.id}" data-reference="${b.reference}" aria-label="${esc(label)}">${mark}<title>${esc(label)}</title></g>`;
  if(edge){const text=b.name.length>8?b.name.slice(0,8)+'…':b.name,tw=text.length*10;let lx=cx+9+tw>W-R?cx-tw-9:cx+9,ly=cy-10;for(let n=0;n<7;n++){if(!labels.some(q=>Math.abs(q.y-ly)<15&&lx<q.x+q.w&&lx+tw>q.x))break;ly+=16;}ly=Math.max(T+9,Math.min(H-B-9,ly));labels.push({x:lx,y:ly,w:tw});out+=`<text class="point-label" x="${lx}" y="${ly}">${esc(text)}</text>`;}
 }
 svg.innerHTML=out;
 $('map-note').innerHTML=`<strong>● 有证据的点；◇ 仅供参考，不参与前沿。</strong> 菱形可能使用编辑试饮预算或相关版本评价，点开可看具体区别。缺评分的酒在独立区域，不填假分。不同平台各算各的，不跨平台连线；重叠点可从下方表格、42款快捷索引或资料卡分别打开。`;
 $('chart-table').innerHTML=`<table><caption>完整明细：${analysis.rows.length}款均列出；不是只有前沿才显示。</caption><thead><tr><th>酒款</th><th>价格 / 预算条件</th><th>评价与样本口径</th><th>计算状态</th></tr></thead><tbody>${analysis.rows.map(b=>{const r=b.activeRating||(state.scoreMode==='community'?b.relatedRating:null);return `<tr><td><button data-open="${b.id}">${esc(b.name)}</button></td><td>${b.price!==null?'报价 ¥'+money(b.price):'编辑预算 ≤¥'+money(C.guideCost(b,state))} / ${esc(units())}<small>${esc(qStatus(b))}</small></td><td>${r?esc(r.platform)+' '+r.value.toFixed(2)+'/5'+(!b.activeRating?'（相关版）':''):'未找到匹配分'}<small>${esc(countLabel(r))}</small></td><td>${edgeIds.has(b.id)?'分平台前沿':b.eligible?'非前沿':esc(b.reasons.join('；'))}</td></tr>`;}).join('')}</tbody></table>`;
 $('all-index').innerHTML=analysis.rows.map((b,i)=>`<button data-open="${b.id}" class="index-chip ${edgeIds.has(b.id)?'is-edge':''}"><small>${String(i+1).padStart(2,'0')}</small>${esc(b.name)}</button>`).join('');
 $('evidence-strip').innerHTML=`<span><b>${analysis.rows.length}</b> 款保留展示</span><span><b>${analysis.eligible.length}</b> 款参与证据比较</span><span><b>${analysis.edge.length}</b> 个分平台前沿节点</span><span>${state.includeHistoric?'当前含历史报价 · 非实时行情':'历史报价不参与计算'}</span>`;
}

function renderRecommendation(){
 const bests=analysis.bestByCohort;
 if(bests.length){$('recommendation').innerHTML=`<div class="recommend-main"><div class="kicker">预算内 · 各评分群体分别查看</div><h3>${bests.length===1?'这个比较范围的高分候选':'不把不同平台拼成一个冠军'}</h3><div class="cohort-recs">${bests.map(({name,beer:b})=>`<button data-open="${b.id}" class="cohort-rec"><span>${esc(name)}</span><strong>${esc(b.name)}</strong><em>¥${money(b.price)} / ${esc(units())} · ${b.activeRating.value.toFixed(2)}/5</em><small>${esc(qStatus(b))}；整组 ¥${money(b.activeQuote.total)}</small></button>`).join('')}</div><p class="helper">仅为本平台 / 当前风格范围内的预算高分项。单一候选也会形成前沿，但不代表胜过整个市场。</p></div>`;
 }else{$('recommendation').innerHTML='<div class="recommend-main"><div class="kicker">仍保留全部资料</div><h3>预算内暂无满足证据条件的候选</h3><p>这不代表你必须加预算。下方酒款卡继续显示参考评价与编辑预算条件，也可以填写自己的实付价和口味分。</p></div>';}
}

function renderLadder(){
 if(!analysis.edge.length){$('ladder-content').innerHTML='<div class="empty-panel">暂时无法形成预算阶梯。补齐报价与同源评分，或切换个人口味模式后，这里会自动生成。</div>';return;}
 const groups={};for(const b of analysis.edge){const key=C.cohort(b,state.mode);(groups[key]||=[]).push(b);}
 $('ladder-content').innerHTML=Object.entries(groups).map(([name,items])=>{
 let last=null;const cards=items.map((b,i)=>{const gain=last?(b.activeRating.value-last.activeRating.value):null;const difference=last?b.price-last.price:null;last=b;
  return `<article class="ladder-card ${analysis.best?.id===b.id?'current':''}"><span class="step">FRONTIER ${String(i+1).padStart(2,'0')}</span><span class="step-mark">${b.price<=state.budget?'预算覆盖':'预算之外'}</span><div class="price">¥${money(b.price)} <small>/ ${esc(units())}</small></div><h3>${esc(b.name)}</h3><span class="step-rating">${esc(labelScore(b))} ${b.activeRating.value.toFixed(2)} / 5</span><p>${gain!==null?`相比上一节点：多 ¥${money(difference)}，均分 +${gain.toFixed(2)}。这不是感官提升幅度。`:'当前比较范围中，价格最低的前沿节点。'}<br>${esc(qStatus(b))}<br>按原包装支付 ¥${money(b.activeQuote.total)} / ${b.activeQuote.quantity}件。</p><button class="inline-link" data-open="${b.id}">看评价与报价 ↗</button></article>`;});
 return `<h3 class="group-heading">${esc(name)} <span class="micro">${items.length} 个前沿节点</span></h3><div class="ladder-grid">${cards.join('')}</div>${state.mode==='style'&&items.length===1?'<p class="frontier-single">该风格只有一个前沿节点；可能是可比样本不足，不代表它已击败全市场。</p>':''}`;
 }).join('');
}
function renderOpportunities(){
 const candidates=analysis.rows.filter(b=>!b.identityPending&&b.activeRating&&(state.scoreMode==='personal'||b.activeRating.count>=state.minRatings)&&!b.eligible&&b.reasons.every(r=>['缺少可换算报价','未填写实付价','历史报价已排除','报价版本或状态有歧义'].includes(r))).sort((a,b)=>b.activeRating.value-a.activeRating.value).slice(0,4);
 $('quote-opportunities').innerHTML=candidates.length?`<div class="opportunity-heading"><h3>把预算带去问价</h3><p>这些是还未进入计算的候选，不是已确认能买到的推荐。录入报价后，才判断是否入围。</p></div><div class="opportunity-grid">${candidates.map(b=>{const bound=C.entryLimit(b,analysis.eligible,state.mode);return `<button class="opportunity" data-open="${b.id}"><span class="opportunity-score">${b.activeRating.value.toFixed(2)}<small> / 5</small></span><strong>${esc(b.name)}</strong><span>${esc(qStatus(b))}</span><p>${bound?.price!==null&&bound?`当前样本的前沿竞争界线约为 ¥${money(bound.price)} / ${esc(units())}；${bound.strict?'需低于此界线':'不高于精确界线时仍可入围'}。`:'当前没有评分更高或相同的已报价对手；价格上限无法从现有竞争样本推导。'}你的预算为 ¥${money(state.budget)}。</p><em>填报价，验证而非猜测 ↗</em></button>`;}).join('')}</div><p class="section-note">竞争界线是由当前评分与对手报价算出的条件，不是市场价或合理零售价。价格显示经四舍五入，精确判断以填价后的前沿为准。旧价、缺价和SKU歧义仍须分别核验。</p>`:'';
}
function renderLibrary(){
 let rows=analysis.rows.slice();const q=state.query.trim().toLowerCase();if(q)rows=rows.filter(b=>[b.name,b.english,b.style,...b.tags,...b.aliases].join(' ').toLowerCase().includes(q));
 switch(state.libraryMode){case 'budget':rows=rows.filter(b=>(b.price??C.guideCost(b,state))<=state.budget);break;case 'eligible':rows=rows.filter(b=>b.eligible);break;case 'edge':rows=rows.filter(b=>analysis.edgeIds.has(b.id));break;case 'pending':rows=rows.filter(b=>!b.eligible);break;case 'new':rows=rows.filter(b=>!b.originalList);break;case 'saved':rows=rows.filter(b=>state.shortlist.includes(b.id));break;}
 const score=b=>b.activeRating?.value??-1;
 rows.sort((a,b)=>state.sort==='score'?(labelScore(a).localeCompare(labelScore(b))||score(b)-score(a)):state.sort==='samples'?(labelScore(a).localeCompare(labelScore(b))||String(a.activeRating?.countType).localeCompare(String(b.activeRating?.countType))||(b.activeRating?.count||0)-(a.activeRating?.count||0)):state.sort==='name'?a.name.localeCompare(b.name,'zh'):(a.price??Infinity)-(b.price??Infinity));
 $('library-total').textContent=rows.length;
 $('library-caption').textContent=`全部渲染 ${rows.length} 个条目，无分页隐藏；上方风格、平台和酒精度筛选会改变此数量。搜索与此处“仅前沿/待补资料”只改变资料卡，不改变前沿。`;
 $('beer-grid').innerHTML=rows.length?rows.map(card).join(''):'<div class="empty-panel">没有匹配条目。请清除搜索词，或重置上方风格筛选。</div>';
 $('show-more').hidden=true;$('show-more').textContent=`再显示 ${Math.min(12,rows.length-visibleLimit)} 个条目 ↓`;
}
function card(b){const color=D.families[b.family].color,edge=analysis.edgeIds.has(b.id),saved=state.shortlist.includes(b.id),r=b.activeRating||(state.scoreMode==='community'?b.relatedRating:null),g=b.purchaseGuide;
 return `<article class="beer-card" data-beer-id="${b.id}" style="--beer-color:${color}"><div class="card-top"><span class="style-badge">${esc(D.families[b.family].name)}</span><button class="save-btn ${saved?'saved':''}" data-save="${b.id}" aria-label="${saved?'从对比移除':'加入对比'} ${esc(b.name)}" aria-pressed="${saved}">${saved?'★':'☆'}</button></div><h3>${esc(b.name)}</h3><p class="english">${esc(b.english)}</p><div class="card-meta">${esc(b.country)} · ${b.abv!==null?b.abv+'% ABV':'ABV未核实'} · ${b.volumeMl||'—'}ml${b.representative?' · 明确选取的代表款':''}</div><p class="card-review">${esc(b.review.positive)}</p><div class="tag-row">${b.tags.map(t=>`<span class="taste-tag">${esc(t)}</span>`).join('')}</div><div class="card-numbers"><div class="card-price">${b.price!==null?'¥'+money(b.price):'≤¥'+money(C.guideCost(b,state))}<small> / ${esc(units())}</small></div><div class="card-rating">${r?r.value.toFixed(2):'未评分'}<small>${r?' / 5':''}</small></div></div><div class="number-labels"><span>${b.price!==null?'可追溯报价样本':'编辑试饮预算 · 非报价'}</span><span>${r?esc(r.platform)+(b.activeRating?'':' · 相关版'):'不编造分数'}</span></div><p class="sample-note">${esc(countLabel(r))}${r&&!b.activeRating?'；不参与证据前沿':''}</p><div class="price-status ${b.activeQuote?.personal?'price-personal':''}">${esc(qStatus(b))}${b.activeQuote?`<br>原包装 ¥${money(b.activeQuote.total)} / ${b.activeQuote.quantity}件 × ${b.activeQuote.volumeMl}ml`:''}</div><div class="budget-guide"><span>编辑买入条件 · 不是行情</span><strong>≤ ¥${money(g.ceiling)} / ${g.volumeMl}ml</strong><p>${esc(b.review.fit)}</p></div><div class="card-bottom">${edge?'<span class="edge-badge">↗ 分平台前沿</span>':`<span class="pending-badge">${b.reasons.length?esc(b.reasons[0]):'有证据 · 非前沿'}</span>`}<button class="inline-link" data-open="${b.id}">完整评价 / 改价 ↗</button></div></article>`;
}

function detail(id){const b=rowById(id);if(!b)return;lastDialogId=id;
 const within=C.isInScope(b,state);const dominators=within&&b.eligible?analysis.dominatedBy(b):[];
 const reason=!within?'不在当前筛选范围内。':!b.eligible?'未进入前沿计算：'+b.reasons.join('；')+'。':dominators.length?`${dominators[0].name} 在当前口径中价格更低或相同（¥${money(dominators[0].price)}），评分更高或相同（${dominators[0].activeRating.value.toFixed(2)}），且至少一项更优，因此本条被支配。`:'位于当前筛选范围的前沿：没有另一个可比候选能同时做到不更贵且评分不更低，并至少一项严格更好。';
 const q=b.activeQuote,underlying=b.quote,r=b.activeRating||(state.scoreMode==='community'?b.relatedRating:null);
 const seed=q||{quantity:1,volumeMl:b.volumeMl||'',total:''};
 const source=q?.sourceId?D.sources[q.sourceId]:null;
 $('dialog-content').innerHTML=`<div class="dialog-top"><div style="--beer-color:${D.families[b.family].color}"><span class="style-badge">${esc(b.style)}</span><h2 id="dialog-title">${esc(b.name)}</h2><p class="english">${esc(b.english)}</p></div><button class="icon-btn" data-close="beer-dialog" aria-label="关闭详情">×</button></div><div class="dialog-body"><div class="detail-stats"><div class="detail-stat"><strong>${b.price!==null?'¥'+money(b.price):'待补'}</strong><span>${esc(units())} · ${q?.personal?'个人价':'参考价'}</span></div><div class="detail-stat"><strong>${r?r.value.toFixed(2):'—'} <small>/ 5</small></strong><span>${esc(labelScore(b))}${r&&!b.activeRating?' · 相关版':''}<br>${esc(countLabel(r))}</span></div><div class="detail-stat"><strong>${b.abv!==null?b.abv+'%':'待核对'}</strong><span>ABV · ${esc(b.country)} · 实物优先</span></div></div>${b.identityNote?`<div class="detail-caution">${esc(b.identityNote)}</div>`:''}<section class="detail-section"><h3>公开评价 / 资料归纳</h3><p>${esc(b.review.positive)}</p><h3>需要知道的取舍</h3><p>${esc(b.review.caution)}</p><h3>什么人更可能喜欢 · 编辑判断</h3><p>${esc(b.review.fit)}</p><p class="helper">${esc(b.review.type)}</p><div class="source-links">${sourceLinks(b.review.sourceIds)}</div></section><section class="detail-section"><h3>价格证据与原包装</h3>${q?`<p class="quote-breakdown">¥${money(q.total)} ÷ ${q.quantity}件；每件 ${q.volumeMl}ml</p><p>每件 ¥${money(C.cost(q,'unit'))}；折合500ml ¥${money(C.cost(q,'500ml'))}；整单需付 ¥${money(q.total)}。整箱折合价格不是单瓶购买承诺。</p><p>${esc(q.note||'个人填写的总价；请确认已经包含运费。')}</p><p>${esc(qStatus(b))}。记录核对日：${esc(q.checkedAt||'待补')}；来源发布日期：${esc(source?.publishedAt||'未能完整核实')}。</p><div class="source-links">${sourceLinks([q.sourceId])}</div>`:'<p>未取得可同时确认总价、件数与容量的价格。没有用猜测价补齐；也没有把网页的0.00占位符当作免费。</p>'}${q?.personal&&underlying?`<p class="helper">原始参考样本仍保留：¥${money(underlying.total)} / ${underlying.quantity}件 × ${underlying.volumeMl}ml。清除个人价即可恢复。${sourceLinks([underlying.sourceId])}</p>`:''}</section><div class="detail-notice">${esc(reason)}<br>前沿只反映价格与评分，不是对个人口味、渠道或新鲜度的保证。</div><section class="detail-section"><h3>选购预算 · 编辑判断，不是市场价</h3><p class="guide-detail">建议先以 <strong>≤ ¥${money(b.purchaseGuide.ceiling)} / ${b.purchaseGuide.volumeMl}ml</strong> 作为试饮买入条件。</p><p>${esc(b.purchaseGuide.note)}</p><h3>评分出处与版本</h3><p>${r?esc(r.platform)+' '+r.value.toFixed(2)+'/5；'+esc(countLabel(r)):'未查到与此版本匹配的独立平台均分；不以销量、原麦汁浓度或品牌奖项造分。'}</p>${r&&!b.activeRating?`<p class="detail-caution">仅相关版本评价：${esc(r.note)} 不参与本款证据前沿。</p>`:''}<div class="source-links">${sourceLinks([r?.sourceId,...(b.extraSourceIds||[])])}</div><p class="helper">${esc(b.researchNote)}</p></section><form id="price-form" class="edit-form" data-id="${id}"><h3>用我的实际报价重新计算</h3><p>确认是这一款酒；总支出请包含运费。只写在你的浏览器里。</p><div class="form-grid"><div><label class="field-label" for="edit-total">总支出 / 元</label><input id="edit-total" name="total" type="number" min="0.01" max="1000000" step="0.01" value="${seed.total}" required></div><div><label class="field-label" for="edit-qty">包装件数</label><input id="edit-qty" name="quantity" type="number" min="1" max="10000" step="1" value="${seed.quantity}" required></div><div><label class="field-label" for="edit-volume">每件容量 / ml</label><input id="edit-volume" name="volume" type="number" min="1" max="100000" step="0.1" value="${seed.volumeMl}" required></div></div><p id="live-price" class="form-feedback"></p><div class="form-actions"><button class="primary" type="submit" ${b.identityPending?'disabled':''}>保存实付价并重算</button><button type="button" class="inline-link" data-clear-price="${id}">清除个人价</button></div>${b.identityPending?'<p class="identity-flag">名称或版本未确认，不能通过填价格绕过身份核对。请让维护者先确认具体SKU。</p>':''}<div class="personal-score-row"><div><label for="personal-score">我的口味分 · 0–5</label><p>只和其他个人分一起计算，不与任何社区分混合。</p></div><input class="score-input" id="personal-score" type="number" min="0" max="5" step="0.01" value="${state.personalScores[id]??''}" placeholder="未评分"><button type="button" class="outline" data-save-score="${id}">保存口味分</button></div></form></div>`;
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
function renderCompare(){const rows=state.shortlist.map(rowById).filter(Boolean);$('compare-content').innerHTML=rows.length?`<div class="compare-grid">${rows.map(b=>`<article class="compare-cell" style="--beer-color:${D.families[b.family].color}"><span class="style-badge">${esc(D.families[b.family].name)}</span><h3>${esc(b.name)}</h3><p>${esc(b.style)} · ${b.abv??'—'}% ABV</p><div class="card-price">${b.price!==null?'¥'+money(b.price):'价格待补'} <small>/ ${esc(units())}</small></div><p>${esc(labelScore(b))}：${b.activeRating?b.activeRating.value.toFixed(2)+'/5':'缺数据'}</p><p>${esc(qStatus(b))}</p><p>${esc(b.review.positive)}</p><p><strong>取舍：</strong>${esc(b.review.caution)}</p><p><button class="inline-link" data-compare-open="${b.id}">查看证据 / 改价 ↗</button></p><p><button class="inline-link" data-save="${b.id}">从清单移除</button></p></article>`).join('')}</div><p class="compare-tip">这里可以跨风格对照，但不会把不同口味自动评为高低。价格口径沿用主页面。</p>`:'<div class="compare-body empty-panel">点击资料卡右上角 ☆，最多添加3款进行并排对比。</div>';}
function renderSources(){const list=Object.values(D.sources);$('sources-list').innerHTML=list.map(s=>`<div class="source-item"><span class="source-type">${sourceKind[s.kind]}<br>${s.evidence==='search-index'?'搜索索引':'页面读取'}</span><div><a class="source-name" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.note||'仅用于本页对应酒款、规格或公开评价；不是实时报价。')}</p></div><span>核对 ${esc(s.checkedAt)}<br>发布 ${esc(s.publishedAt||'日期未完整核实')}</span></div>`).join('');}
function update(key,value){state[key]=value;visibleLimit=42;render();}
function closeDialog(id){$(id).close();}
// Delegation handles dynamically rendered cards without inline JavaScript.
document.addEventListener('click',e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.open)detail(t.dataset.open);
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
for(const [id,key,isNumber]of [['unit','unit'],['mode','mode'],['score-mode','scoreMode'],['score-platform','scorePlatform'],['map-mode','mapMode'],['min-ratings','minRatings',true],['max-abv','maxAbv',true],['style','style'],['sort','sort'],['library-mode','libraryMode']])$(id).addEventListener('change',e=>{if(key==='unit'){state.budget=e.target.value==='order'?150:20;}update(key,isNumber?Number(e.target.value):e.target.value);});
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
$('scatter').addEventListener('click',e=>{const p=e.target.closest('[data-point]');if(p)detail(p.dataset.point);});
$('scatter').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const p=e.target.closest('[data-point]');if(p){e.preventDefault();detail(p.dataset.point);}}});
function chartTooltip(e){const target=e.target.closest('[data-point]');if(!target){$('tooltip').hidden=true;return;}const b=C.displayPoint(rowById(target.dataset.point),state);$('tooltip').innerHTML=`<strong>${esc(b.name)}</strong><p>${b.priceBasis==='quote'?'报价样本':'编辑预算条件（非市价）'} ¥${money(b.plotPrice)} / ${esc(units())}</p><p>${b.plotRating?esc(b.plotRating.platform)+' '+b.plotRating.value.toFixed(2)+'/5'+(b.scoreBasis==='related'?' · 相关版本':''):'评分未知 · 不当作0分'}</p><p>${b.reference?'◇ 仅展示，不参与前沿':esc(qStatus(b))}</p><p>点击看版本与出处 ↗</p>`;$('tooltip').hidden=false;const r=$('chart-wrap').getBoundingClientRect(),pr=target.getBoundingClientRect();$('tooltip').style.left=Math.max(5,Math.min((e.clientX||pr.left)-r.left+10,r.width-240))+'px';$('tooltip').style.top=Math.max(5,(e.clientY||pr.top)-r.top-90)+'px';}
$('scatter').addEventListener('pointermove',chartTooltip);$('scatter').addEventListener('focusin',chartTooltip);$('scatter').addEventListener('pointerleave',()=>$('tooltip').hidden=true);$('scatter').addEventListener('focusout',()=>$('tooltip').hidden=true);
$('export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(personalExport(),null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='beer-frontier-personal-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);toast('已导出个人报价、评分与对比清单。');});
$('import-data').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1000000)throw Error('文件超过1MB，请检查是否是个人数据JSON。');const p=C.validateImport(JSON.parse(await file.text()),ids);if(!confirm('导入会替换本浏览器的个人报价、口味分与对比清单。是否继续？'))return;state={...state,...p};save();render();toast('导入完成，前沿已重算。');}catch(err){toast('导入失败：'+err.message);}finally{e.target.value='';}});
$('reset-personal').addEventListener('click',()=>{if(!confirm('确定清空本浏览器的实付价、个人评分与对比清单？研究数据不受影响。'))return;state.overrides={};state.personalScores={};state.shortlist=[];save();render();toast('个人数据已清空。');});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(analysis)renderChart();},100);});
load();$('stat-total').textContent=D.beers.length;$('stat-rated').textContent=D.beers.filter(b=>b.rating).length;$('stat-prices').textContent=D.beers.filter(b=>b.quote).length;render();
// Test hook exposes read-only snapshots, not a writable state reference.
window.BeerFrontier={getState:()=>JSON.parse(JSON.stringify(state)),getAnalysis:()=>({eligible:analysis.eligible.map(b=>b.id),frontier:analysis.edge.map(b=>b.id),best:analysis.best?.id||null,bestByCohort:analysis.bestByCohort.map(x=>({name:x.name,id:x.beer.id})),displayed:analysis.rows.length})};
})();
