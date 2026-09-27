# 啤酒前沿 · Beer Guide

**按预算、风格与可追溯口碑探索啤酒的帕累托前沿。**

面向 `naive-one/beer-guide` 的静态网站仓库。原生 HTML / CSS / JavaScript，无运行时第三方依赖、后端、数据库、账号、API Key 或远程字体。个人报价和口味评分保存在访问者自己的浏览器中。

> v1.1.0 · 研究快照：2026-09-27。42款全部显示；35条匹配版本的社区评分、6条仅相关版本评分、1款未找到匹配均分；30条可换算报价样本，另12款提供明确标注的编辑试饮预算条件；83条来源。默认21款满足证据比较条件，形成7个分平台前沿节点。所有价格均非实时成交验证。


## 本版：42款都显示，不把目录误当成前沿

默认地图、快捷索引、完整明细、资料卡均有42个条目，取消12张卡片的分页。搜索、风格和平台筛选仍可缩小范围；点击“恢复全部42款”回到完整目录。

实心/圆形点是可比较证据点。灰色空心菱形是只供参考的点：可能使用明确标注的编辑试饮预算、相关版本评分，或被证据设置排除的报价；这些点不会进入证据前沿。未找到评分的A3显示在独立无评分带，不填0分。横轴含编辑预算时不等于市场价格，纵轴各平台不互相支配。

每款都包含产品版本、容量、已取得的规格、公开评价归纳、取舍、适合人群、报价状态、编辑试饮买入条件和出处。不能把“42款内容都显示”解读为“42款的当前价和独立评分全部核实”。详细缺口见 `docs/RESEARCH-COVERAGE.md`。

“纳德”暂选施纳德7号、梦小姐暂选6%酸浑浊版、珀亚拉暂选黑夜Pime Öö，均有醒目的代表款说明；这不是确认了原始模糊名称，更不代表整个品牌。

### 更新已有仓库

将本包 `beer-guide/` 内的项目文件合并到已有仓库根目录，保留远端/本地的 `.git` 与用户其他文件。运行 `npm run build && npm test`，检查差异后正常提交。不要强推，不要对已有不同代码使用仅供初始化的 `scripts/publish-github.mjs`。本包本身不是GitHub提交凭证。

版本选择已经明确的三条代表款，以及原先混写的奥古特/A3，请复核对应旧版个人记录后再沿用。个人JSON仍兼容schemaVersion 1，新增datasetVersion字段。

## 直接部署到 Cloudflare

`Workers & Pages` 是控制台入口名；**Workers Static Assets 和 Pages 是两条不同的部署流程，选一条即可**。已配置 Workers Static Assets，同时保留 Pages 静态部署兼容性。

### 方案 A：Workers Static Assets

连接本仓库的 `main` 分支，填写：

| 设置 | 值 |
|---|---|
| 项目 / Worker 名称 | `beer-guide` |
| 仓库 | `naive-one/beer-guide` |
| 生产分支 | `main` |
| 根目录 | 仓库根目录，留空或 `/` |
| 构建命令 | `npm run build` |
| 部署命令 | `npx --yes wrangler@4 deploy` |
| 静态资源目录 | `wrangler.jsonc` 已配置为 `./dist` |
| 应用环境变量 / Secrets | 不需要 |

首次配置时按 Cloudflare 的正常流程授权 GitHub 仓库并完成部署认证。不要把个人 Token 写进代码。名称应与 `wrangler.jsonc` 的 `name` 一致；要换名字，请一起修改。

没有 Worker 入口脚本，也不需要编造 `src/index.ts`。本项目只部署静态资源；`assets.directory` 足够。部署工具 Wrangler 按需下载，浏览器运行网站仍无第三方依赖。

### 方案 B：Pages

选择 **Pages → 导入现有 Git 仓库**，连接本仓库：

| 设置 | 值 |
|---|---|
| 框架预设 | `None` / 无 |
| 生产分支 | `main` |
| 根目录 | 仓库根目录 |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| 应用环境变量 | 不需要 |

**Pages 不填写 Workers 的部署命令。** 根目录的 `wrangler.jsonc` 专用于 Workers，没有 `pages_build_output_dir`。Pages 通过控制台指定 `dist`；遇到“缺少 Pages 配置字段”的提示时，不要把 Worker 和 Pages 的配置混在一个文件中。详见 [Cloudflare 部署说明](docs/CLOUDFLARE.md)。

仓库保留预先生成的 `dist/`，首次也可在 Pages 用 `exit 0` 配合 `dist` 发布。但长期建议使用 `npm run build`，避免改数据后忘记重新构建。

## 本地开发

Node.js 22 或更新版本。日常构建和测试仅用 Node 标准库，**不需要先运行 npm install**。

```bash
npm run check
npm run preview
```

打开终端输出的本地地址，默认为 `http://127.0.0.1:8080`。预览服务器只发布 `dist`，不会公开仓库文档或脚本。

```bash
npm run build      # 校验并生成 dist/、浏览器数据和单文件版
npm test           # 算法、构建、部署和发布保护测试
npm run dev        # 构建一次并启动预览；没有热更新
npm run deploy     # 已授权本地 Cloudflare CLI 时构建并发布 Workers
```

## 文件组织

```text
index.html / styles.css / app.js    界面结构、样式与交互
core.js                             纯计算逻辑
 data/beers.json                     唯一人工维护的研究数据
 data/schema.json                    数据结构规范
 data/data.js                        自动生成的浏览器数据
public/                             404 页面、Cloudflare 响应头、robots
scripts/build.mjs                   零依赖构建器
scripts/serve.mjs                   仅监听本机的静态预览服务
scripts/publish-github.mjs          初次推送辅助脚本，固定目标仓库
wrangler.jsonc                     Workers Static Assets 配置
dist/                               已生成的静态部署目录
standalone.html                     离线单文件体验版
tests/                              算法与部署相关测试
docs/                               Cloudflare 说明、验收及原版记录
AGENTS.md                           给维护 Agent 的约束
METHODOLOGY.md / SOURCES.md          方法与出处
```

## 数据维护与功能

只修改 `data/beers.json`，然后执行 `npm run check`。不要手工改 `dist/`、`data/data.js` 或 `standalone.html`。`scripts/seed.py` 仅保留原始研究重建过程，日常**不要运行**，否则会覆盖修改。

支持三种价格口径、预算筛选、全局 / 同风格前沿、预算阶梯、酒款详情与来源、最多三款对比、个人实付价重算、独立个人评分模式、JSON 导入导出。缺少价格或同源评分的条目不会被虚构数值填满。具体研究边界与旧版 UI 测试限制见 `docs/PROJECT-ORIGINAL.md` 和 `METHODOLOGY.md`。

改域名或从本地文件切到网站后，浏览器存储不会自动跨来源迁移。先在原地址导出个人 JSON，再在新地址导入。

## 将本地交付包首次提交到 GitHub

这份交付包不代表已经推送成功。在具有 GitHub 写入认证的电脑 / Agent 上，从包根目录执行：

```bash
node scripts/publish-github.mjs
```

需要 Node 22+、Git 以及本机已有的 GitHub 写入认证。脚本会校验交付文件、运行构建与测试、克隆目标仓库、保留原始提交历史，再新增提交并普通推送到 `main`。不会强推、删除远端文件、改变全局 Git 配置或读取浏览器凭据。目标仓库若已有不同的网站代码，将停止而不是覆盖。Git 作者未配置时，仅在临时克隆中使用 `Beer Guide Publisher <noreply@localhost>`，不会冒用你的邮箱。

不使用脚本也可把交付包内全部项目文件上传到 GitHub 仓库根目录。不要把 ZIP 本身当作网站上传，也不要多套一层 `beer-guide/`。

## 验收与状态

本地测试结果和未验证项见 `docs/VALIDATION.md`。代码包准备、远端 GitHub 提交、Cloudflare 构建、真实公网访问是不同状态；只有部署平台返回成功并实际打开网址，才算上线。

## 许可

程序代码使用 MIT 许可；品牌、商标和第三方评价归原权利人。此站提供事实摘录与简短评价归纳，不附第三方照片、字体或整篇文章。仅供成年人参考，不鼓励过量饮酒。
