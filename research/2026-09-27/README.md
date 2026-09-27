# 2026-09-27 研究输入与证据

## 最终用户范围

用户将任务收缩为夯档，并保留其它已经取得报价的条目。当前展示40款：夯21款＋其它19款；均有本轮淘宝价格记录。其余27款不继续采价，从当前卡片、图、榜单、索引和比较中移出，67款主库及49项原文榜单作为档案保留。

夯档21/21有报价，21/21有专业站评分来源记录；这不等于每条都是独立版本匹配。当前主评分34条（其中1条为保留旧分）、仅相关评分6款；2条报价版本待确认，不进入默认前沿。详细计数见completion-summary.json。

## 文件

- ratings-audit.json：67条评分核查决策；有分的模糊名称按用户授权采用具名常见代表。
- source-ledger.json、evidence/：65个不同所选评分URL的必要数值证据。父任务另核对了66条选择记录的分数和评论数与保存页面头部一致。专业站社区均分不是专家评委分。
- taobao-audit.json、taobao-evidence/：40条现价记录，对应38个不同商品SKU/报价来源；同SKU被两个保留研究条目引用时不冒充两次独立报价。
- price-candidates.json、taobao-unresolved.json：早期候选及未取得匹配报价的检索日志，不用于填充价格；其中部分对象已被用户移出当前范围。

按已核查商品链接内的最大同款包装总额除以件数；不把混装、杯子、原料套装或未选规格的起价当作酒价。有明确补贴展示时记录补贴，明确页面优惠的计算保留原数与推导；没有核到额外补贴的不臆算，保留实际读到的页面价。原包装金额不保证单件可购，也不是保证现金结算价。容量未核实保持null，不换算500ml。

只保留必要数值、SKU、店铺、来源与时间，不发布完整第三方品饮评论、账号、地址、购物车或凭据。证据文件有自身哈希；rawEvidenceSha256只标识原始采集记录，不代表这里保存了完整网页。

## 更新

```bash
node scripts/import-research.mjs --ratings research/2026-09-27/ratings-audit.json --prices research/2026-09-27/taobao-audit.json --sources research/2026-09-27/source-ledger.json --dry-run
# 校验无误后用 --write，随后 npm run check。
```

catalogScope.activeIds冻结当前40个ID。不能把主库中的27个归档缺价项继续当作本轮待办，也不能在未经用户新指示时自动扩大采集范围。动态总库计数见data.meta.coverage，当前视图以BeerCore.catalogView为准。
