# 2026-09-28 补充社区评分与文案整理

## 本轮结果

核查当前展示的40款，读取37个不同的Untappd公开酒款页。新增38条评分记录，覆盖38款，对应33个不同来源页面：其中30条与所收录酒款匹配，8条只作相关版本参考。胖东来与A3的现有Untappd评分及次数未变，核对后未重复添加。

同一页面可能被不同研究条目引用，例如德国教士与范佳乐代表款、比利时福佳白与福佳白代表款；33个来源不是38次独立测量。喜力总体分给不同包装条目作参考，也没有算成包装独立评分。

新增评分来自页面顶部的5分制均分与`Ratings`。`Ratings`记为评分次数，不当作去重人数；也没有使用`Total`或`Unique`打卡数。只保存产品标识、评分、次数、酒精度、来源、日期和页面哈希，没有保存个人评论、登录信息或完整网页。

日期按采集环境本地时间记录。价格保持既有2026-09-27快照，本次未重新采价。主评分、相关评分、历史记录、酒精度、容量及40款展示范围均与修改前逐项核对，保持不变。

## 版本限制

- Primátor：新页4.8%，现有研究对象5.0%，只作相关版本。[26]
- 朝日：新页名称明确国产Super Dry、5.0%，但酒厂归属写作青岛啤酒，有身份冲突。[27]
- 青岛全麦白：新页为白啤4.1%，未明确全麦500ml／11°P规格。[28]
- 老雪：新页为4.7%／12°P，产品介绍对应盒马1L装，不能证明就是640ml沈阳老雪。[33]
- 国产喜力绿罐、绿瓶与5L桶：新分为经典喜力总体分，不是各自独立样本。[22]
- 健力士：新分为Draught总体分，未单独统计氮气罐装。[19]

以上8条不参加前沿比较。施纳德7号、梦小姐6%款、Pime Öö、范佳乐与福佳白继续按已说明的代表款处理。梦小姐的评分对应6%款，但既有报价仍有版本歧义，不能因为多了一条评分就进入默认比较。

另读到的老雪4.4%、福佳国产4.5%不符合本页所选版本，未加入。大九另一URL重定向至同一酒款，去重后只加一条。

BeerAdvocate普通HTTP访问返回拒绝抓取提示，本轮停止该路径，没有绕过访问限制或把旧分标为新分。部分搜索结果的评分与实际页首不同，入库使用实际读取的页首数字，而非搜索摘要。

## 文件

- `candidates.json`、`discovery.json`：查找过程中的候选URL与标题；不是入库凭证。
- `collect-evidence.py`：公开页首数值采集工具，按URL去重，只保存最小证据。
- `observations.json`、`evidence/`：实际页首观察。重复引用同一URL不重复请求；`rawPageSha256`标识当次响应，并不表示仓库包含完整网页。
- `audit.json`：当前40个ID的最终处理结果及理由。
- `community-ratings.json`：可重复导入的38条记录。
- `source-ledger.json`：37个已读页面的来源索引。
- `summary.json`：程序计算的覆盖计数。
- `copy-edits.json`：当前40款的文案改写，只精简既有风味描述、纠正过时状态与清除榜单残留，未编造试饮体验。
- `previous-copy.json`：改写前的简介、名称及版本说明档案。旧文字仅存档，不再展示为当前状态。

## 导入

```bash
node scripts/import-community-ratings.mjs --input research/2026-09-28/community-ratings.json
node scripts/import-community-ratings.mjs --input research/2026-09-28/community-ratings.json --write
node scripts/import-community-ratings.mjs --input research/2026-09-28/community-ratings.json
npm run check
```

不带`--write`只检查。重复导入输出`changed:false`。各平台分数分别展示，可通过评分来源切换图表；默认仍使用原主评分，不挑最高分、不平均成一个综合分。用户榜单区块及档位入口已移除，原始榜单数据仅作档案保留。

## Sources

[19] https://untappd.com/b/guinness-guinness-draught/4473 — Guinness Draught - Guinness - Untappd
[22] https://untappd.com/b/heineken-heineken/5860 — Heineken - Heineken - Untappd
[26] https://untappd.com/b/primator-weizen/30947 — Weizen - Primátor - Untappd
[27] https://untappd.com/b/tsingtao-brewery-asahi-super-dry-chinese-version/5284196 — Asahi Super Dry (Chinese Version) - Tsingtao (青岛啤酒) Brewery - Untappd
[28] https://untappd.com/b/tsingtao-brewery/4229247 — 白啤 - Tsingtao (青岛啤酒) Brewery - Untappd
[33] https://untappd.com/b/china-resources-snow-breweries-snow-12-deg-p-12-deg-p-4-7/4909071 — Snow 12°P (雪花 12°P) 4.7% - China Resources Snow Breweries (雪花啤酒) - Untappd
