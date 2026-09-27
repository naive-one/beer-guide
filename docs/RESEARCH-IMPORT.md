# v1.3.0 研究导入

当前用户范围：展示40款（夯21款＋已采集淘宝报价的其它19款）；67款主库及49项原始榜单完整归档，27款不进入当前卡片、单张共享图、索引、明细、档位榜或前沿计算。

保留单张共享坐标图，平台间不比较支配关系。默认按每件（瓶／罐／桶）计价（显示总价 ÷ 同款件数），价格范围默认仅本轮淘宝；可切换全部旧样本、500ml和整单。容量未知时只能计算单件和整单，不进入500ml前沿。所有67款、49项原始榜单继续保留。

在仓库根目录执行；默认只校验，成功后再写入：

```bash
node scripts/import-research.mjs \
  --ratings research/2026-09-27/ratings-audit.json \
  --prices research/2026-09-27/taobao-audit.json \
  --sources research/2026-09-27/source-ledger.json \
  --dry-run

node scripts/import-research.mjs \
  --ratings research/2026-09-27/ratings-audit.json \
  --prices research/2026-09-27/taobao-audit.json \
  --sources research/2026-09-27/source-ledger.json \
  --write
npm run check
```

可用 `--data /absolute/path/beers.json` 指定其他输出数据。导入不修改输入审计文件，不访问网络或账号。写入前完整校验，临时文件原子替换；重复导入不重复历史。原评分、相关分和报价更新前分别存入 `ratingHistory`、`relatedRatingHistory`、`quoteHistory`，原来源登记保留。未查到新分不删除旧分。

评分输入为数组：已知唯一 `id`、`status`（matched/related/ambiguous）、`selected`。所选分须有原始平台页面URL、数值、5分制、评论/评分数口径、checkedAt、evidenceFile，并与source-ledger中已读页面一致。22条有分的模糊名称按本次用户授权选用审计已选具名代表款，不从标题提取数值，不选更高分候选填空；7条related保持原目标。代表说明保留用户原名，并不确认用户原意。范佳乐所选页为德国版本，不自动等同国产；A3只使用相关的产品聚合评分，ABV继续null。施纳德7号、梦小姐及Pime Öö原说明保留。

淘宝输入为数组，每条要求已知唯一id、真实商品URL（item.taobao.com/detail.tmall.com）、checkedAt、currency:CNY、正数total、整数quantity、明确selectedSku；volumeMl可null。价格不从标题推测。采集者核对该页面最大的同款包装后，明确添加 `largestSameBeerPack: true`；没有该字段时状态为pending-pack-verification，保留原报价，不进入本轮淘宝范围。混装和起价不能使用（mixedPack/startingPrice为true会拒绝）。

`displayedPromotion` 有有效数值时优先使用，否则使用所选SKU的total。只记录页面显示／补贴价快照，不宣称普遍可复现现金结算价。保留SKU、原价、显示价、采集时间及输入证据文件引用；不复制账号、地址、金币余额、shipping、conditions或含个人细节的原文。商品链接仅保留id和skuId。详情显示包装、来源和时间，不逐项展示优惠条件。最小必要数值证据和可重复导入输入位于 research/2026-09-27/，不发布账号、地址或完整第三方评论。

本次覆盖：67条评分审计；36条matched、7条related、24条ambiguous，其中22条成为授权代表。有效主评分59条（36条本轮匹配、22条新代表、1条保留旧评分Primátor）；6款仅相关分，另2款珠江绿罐N/A和强爽无分。Primátor的新4.8%页只作相关分，旧5.0%目标评分未删除。总来源数见 `data.meta.coverage.sources`；旧样本与历史仍保留，不能当作本轮报价覆盖。

采集持续进行，当前覆盖以生成数据的 `data.meta.coverage` 为准：`freshTaobaoQuotes` 是已观察的本轮报价数，`versionMatchedTaobaoQuotes` 不含版本歧义，`ambiguousTaobaoQuotes` 单列版本待确认报价，`taobaoPending` 为尚缺本轮报价的候选数。当前用户已将范围收缩为夯档加已采价的其它条目：当前40款报价已齐，夯档21款均有价格与评分来源记录；主库其余27款已归档，不是本轮待完成任务。旧报价不能计入本轮覆盖。


`priceBasis: calculated-page-promotion` 表示采集者用所选页面标价及明确券额／立减额计算，并非页面直接显示该最终金额。导入要求 `listedTotal`、`discountAmount`、`minimumSpend`、`total` 均为有限非负数，`listedTotal >= minimumSpend`，`0 < discountAmount < listedTotal`，且 `total` 必须严格等于差额四舍五入到分（只容忍运算的浮点表示误差，不接受近似总额）。此类型要求 `displayedPromotion: null` 和非空证据文件引用；校验不满足会拒绝整次导入，不自动修正原始观察。

报价 provenance 保留真实 `listedTotal`、`discountAmount`、`minimumSpend`、推导式、输入类型、证据文件与证据哈希；不将计算后的 total 写成原标价。已有直接显示促销记录仍优先采用 displayedPromotion。为兼容本轮淘宝范围筛选，外层 `quote.priceBasis` 仍为 `taobao-displayed-snapshot`，具体计算类型由 `provenance.inputPriceBasis` 区分。来源、详情与报价状态明确标注“按所选页面计算”，主图不堆叠优惠条件，也不保证人人可获得相同现金结算价。

金额仅在展示时四舍五入到分：198.7 ÷ 20 显示 9.94。每件成本、预算比较、坐标及 Pareto 输入保留未舍入数值；容量未知继续只能计算每件／整单，500ml 为 null。

可选 `ambiguous` 必须是布尔值，缺省为 false；`variantNote` 仅用于商品版本说明，必须为1–400个字符的非空单行纯文本，不允许控制字符或HTML标记，不填优惠条件或个人信息。两者保留到 quote；版本歧义报价记为 `observed-version-ambiguous`，来源与详情明确提示版本未确认。真实价格仍显示，但默认不参与证据前沿；只有显式开启版本歧义情景才可参与，开关不改变版本匹配计数。梦小姐当前芒果酸艾尔价格不确认匹配既有6%酸浑浊IPA，既有身份、评分与历史继续保留。

展示范围冻结在 `data/beers.json` 的 `catalogScope.activeIds`（40个ID），由 `core.js` 的 `catalogView` 统一读取。价格导入仍校验完整67款主库，并保留该字段；之后给归档款添加报价不会自动重新展示。`meta.coverage` 是主库证据计数，首页价格与评分计数来自当前视图。所有夯档无论是否有价格都保留；本次最后的金刚桶报价已核验为5L×2桶，搜索补贴展示总额305元，当前40款都有本轮报价。版本与评分匹配限制继续明确保留，价格齐全不等于全部都可进入严格前沿。

个人数据继续用完整主库ID校验，归档实付价、口味分、对比ID保留在本地与导出JSON。当前可见对比清单只取当前范围的最多3款，归档ID不占槽位；重置筛选和恢复全部只恢复当前40款。默认每件包括瓶、罐、桶，5L桶仍是一件。
