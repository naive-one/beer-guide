import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const data=JSON.parse(read('data/beers.json'));
if(data.schemaVersion!==1||!Array.isArray(data.beers))throw new Error('Invalid dataset');
const allIds=new Set();
for(const b of data.beers){if(allIds.has(b.id))throw new Error('Duplicate ID '+b.id);allIds.add(b.id);if(b.rating&&(b.rating.value<0||b.rating.value>5||!data.sources[b.rating.sourceId]))throw new Error('Invalid rating '+b.id);if(b.quote&&(!data.sources[b.quote.sourceId]||b.quote.total<=0||b.quote.quantity<1||(b.quote.volumeMl!=null&&b.quote.volumeMl<=0)))throw new Error('Invalid quote '+b.id);}
if(data.catalogScope){const scoped=data.catalogScope.activeIds;if(!Array.isArray(scoped)||new Set(scoped).size!==scoped.length||scoped.some(id=>!allIds.has(id)))throw new Error('Invalid catalog scope');}
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const payload='window.BEER_DATA = '+JSON.stringify(data)+';\n';
fs.writeFileSync(path.join(root,'data/data.js'),payload);
let html=read('index.html').replace('<link rel="stylesheet" href="styles.css">','<style>'+read('styles.css')+'</style>');
html=html.replace('<script defer src="data/data.js"></script>','').replace('<script defer src="core.js"></script>','').replace('<script defer src="app.js"></script>','');
html=html.replace('</body>','<script>'+escapeScript(payload)+'</script><script>'+escapeScript(read('core.js'))+'</script><script>'+escapeScript(read('app.js'))+'</script></body>');
fs.writeFileSync(path.join(root,'standalone.html'),html);
const sources=['# 来源登记\n','研究快照：'+data.meta.snapshotDate+'。不保证可访问性、库存或结算价。所有价格为静态记录；发布日期未知不意味着新价。\n'];
for(const s of Object.values(data.sources)){sources.push(`## ${s.id}\n\n${s.title}\n\n- URL: ${s.url}\n- 类型: ${s.kind}\n- 读取方式: ${s.evidence==='search-index'?'搜索索引（未保证全文可访问）':'页面内容'}\n- 核对日: ${s.checkedAt}\n- 发布日: ${s.publishedAt||'未完整核实'}\n- 说明: ${s.note||'仅用于相应产品规格或评价，不外推到其他SKU。'}\n`);}
fs.writeFileSync(path.join(root,'SOURCES.md'),sources.join('\n'));
console.log(`Built ${data.beers.length} entries, ${Object.keys(data.sources).length} sources; standalone.html ${Buffer.byteLength(html)} bytes.`);

// Ship a minimal deployable root; never publish documentation or test fixtures.
const dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(path.join(dist,'data'),{recursive:true});
for(const f of ['index.html','styles.css','app.js','core.js'])fs.copyFileSync(path.join(root,f),path.join(dist,f));
for(const f of ['data.js','beers.json'])fs.copyFileSync(path.join(root,'data',f),path.join(dist,'data',f));
for(const f of ['404.html','_headers','robots.txt'])fs.copyFileSync(path.join(root,'public',f),path.join(dist,f));
console.log('dist/ is ready: six application files plus 404.html, _headers, and robots.txt.');
