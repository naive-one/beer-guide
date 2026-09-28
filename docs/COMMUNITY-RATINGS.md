# 补充社区评分

`beer.communityRatings` 是可选数组，每项要求全部字段：

```json
{"platform":"Untappd","scale":5,"value":3.75,"count":120,"countType":"ratings","sourceId":"registered-source-id","checkedAt":"2026-09-28","note":"版本匹配说明","evidenceFile":"research/evidence.json","match":"matched"}
```

这是格式示例，不是已采集证据。value 为 0–5 有限数（0 有效），count 为非负整数；countType 为 ratings 或 reviews；match 为 matched 或 related。checkedAt 必须是有效的 YYYY-MM-DD 日期。evidenceFile 是安全的相对文件路径，不允许绝对路径或 `..`。所有来源必须登记，URL 仅支持 HTTP(S)。不把 reviews 当评分人数。

默认评分保留原 `rating`；显式选平台时，将同平台原主评分与 matched 补充记录一起按 checkedAt 从新到旧选择，同日按 sourceId 字符顺序确定，不选最高分。没有该平台匹配评分时保持缺分；相关版本独立展示为参考，不参与前沿。个人评分不回填社区分。卡片可展开各平台评分，详情列出日期、样本口径、来源和版本说明。同平台、来源、匹配身份的旧记录只显示一次。

输入 `{ "records": [{ "beerId": "已知ID", "rating": <上述对象>, "source": <data.sources现有条目结构> }] }`。source 必须包含 id、url、title、kind、evidence、publishedAt、checkedAt、note，且 id 与 rating.sourceId 一致。已登记同ID来源必须完全相同，避免覆盖旧证据。

```bash
node scripts/import-community-ratings.mjs --input /path/to/ratings.json
node scripts/import-community-ratings.mjs --input /path/to/ratings.json --data /path/to/beers.json --write
npm run check
```

默认 dry-run，不写文件；仅 `--write` 写入。输入文件不修改，输入输出不能是同一文件。未知ID、输入重复平台/来源、冲突的既有记录、非法数值/日期/路径/URL、无效来源使整次导入失败。相同输入重复导入幂等。导入添加 communityRatings 与来源，并重算来源总数，不修改主评分、相关评分、报价、历史、catalogScope 或 tierList；给归档款补分不会扩大当前40款范围。新增平台评分数量以实际数据为准，不由页面或导入器推测。
