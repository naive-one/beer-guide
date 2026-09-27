# Beer Guide v1.2.0 · Agent施工说明

## 当前版本差异（优先于下方保留的v1.1基线）

当前资料库67款：原42款研究记录加25款仅用户清单的未核验条目。五档榜单49项，计数21/10/5/6/7，见docs/RANKING.md；未上榜旧款不能删除。quote/rating/purchaseGuide均可为null，不能用假预算让未知价格进入图，也不能把null当成免费。用户档位独立于社区分/个人分，不影响证据前沿。

默认67张卡、67图表条目（含待补坐标区）、67快捷索引、67明细；原35匹配分、6相关版分、30报价、83来源、21可比记录和7前沿节点不变。平台用独立小图和坐标；图下列出前沿全名，重叠点从图外入口展开。

运行npm run check；先启动npm run preview，再用已装Playwright的Python运行tests/ui_smoke.py、tests/ui_chart.py、tests/ui_ranking.py、tests/ui_readability.py。CHROMIUM_PATH指定本机浏览器；BEER_URL默认为http://127.0.0.1:8080。当前UI测试用真实HTTP和原生localStorage，不是旧版Storage替身。

以下为旧版研究维护约束；条目数量与浏览器限制以本节为准。

## 更新目标

本包是对原有啤酒网站的42款全显示更新。目标仓库是 naive-one/beer-guide，但生成文件不等于已经推送GitHub。未经请求不要操作Cloudflare账户。保留已有.git和用户修改，不强推、不删除无关文件；先审查差异，再正常提交。

## 构建与部署

原生HTML/CSS/JS，无运行时第三方依赖。只改data/beers.json、core.js、app.js、index.html、styles.css等源文件，随后执行：

```bash
npm run build
npm test
```

构建会刷新data/data.js、standalone.html、SOURCES.md和dist。Workers Static Assets的wrangler.jsonc指向./dist；Pages的输出目录也是dist。只发布dist内容，不部署源码根目录。部署入口与命令见README及docs/CLOUDFLARE.md。不要安装新框架、后端、账号系统、CDN或统计代码。不要运行旧scripts/seed.py覆盖新数据。

## 本版验收基线

无个人记录且使用默认筛选时：42张资料卡、42个图形条目、42个快捷索引按钮、42行明细；35条匹配评分、6条相关版评分、30条报价、83条来源；21款参与证据比较，7个分平台前沿节点。默认包含明示的历史报价，不包含版本/状态歧义价。

平台分别计算支配关系，禁止跨平台设置一个“总体最高分冠军”。个人模式只用个人评分，不能用社区评分补缺。酒花儿评论数不等于评分人数；最低评分人数大于0时，无评分人数的条目不符合门槛。

所有候选持续展示。缺报价时地图可显示编辑预算条件，但必须使用参考菱形，并且不能进入证据前沿；相关版分同理。无分点必须保留null并放在独立区，不能填0或人为补分。

## 数据维护

每条报价必须有总额、数量、单件容量、币种、来源与日期/限制。不能扣掉积分虚构现金实付，不把凑单分摊价冒充独立整单，也不把查询日当生效日。价格不明保持quote:null；编辑预算放purchaseGuide，不写进quote。

评分保留原平台的0–5用户均分、来源和countType。BA100分制不参与。相关产地、旧版、不同编号的评分只能写relatedRating，不允许塞进rating。

施纳德7号、梦小姐6%和珀亚拉Pime Öö是明确声明的代表款，不是对原始模糊名称的确认。不得去掉这类说明。A3暂未核实准确标签ABV，维持null。全部42款都能展示，不等于全部实时字段都已验证。

## 测试与报告

npm test有30项核心/部署/发布脚本测试。tests/ui_smoke.py有21项界面检查，包含所有42个弹窗、改价重算、个人分、导入导出和390/768/1440px布局。

测试浏览器的受管策略禁止URL导航，所以UI测试读取实际standalone.html后用set_content渲染；只有测试代码使用Storage替身验证数据序列化。生产网页没有替身。真实域名访问、原生localStorage持久化、Cloudflare构建权限及公网部署须在用户环境验收。不能把沙箱UI检查说成已上线。

首次初始化脚本publish-github.mjs不用于覆盖已有不同代码；远端已更新时不要绕过其保护。
