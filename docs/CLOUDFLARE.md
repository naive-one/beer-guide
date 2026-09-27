# Cloudflare 部署说明

核对日期：2026-09-27。适用于此仓库，不需要 Docker、VPS 或后端。

## Workers Static Assets

在 Workers & Pages 入口新建应用，选择导入 Git 仓库，授权 `naive-one/beer-guide`，使用生产分支 `main`。Worker 名称设为 `beer-guide`。

- 根目录：仓库根目录。
- 构建命令：`npm run build`。
- 部署命令：`npx --yes wrangler@4 deploy`。
- 静态目录：仓库内 `wrangler.jsonc` 已指向 `./dist`。
- 不需要应用环境变量、数据库绑定、Pages Functions 或 Worker 入口脚本。
- 部署认证由 Cloudflare 正常授权流程处理，不要把 Token 放进仓库。

`@4` 限定 Wrangler 主版本，但不是锁定一个精确补丁版本；首次部署会下载部署工具。代码自身的构建没有第三方依赖。团队需要可复现工具链时，可在部署成功后将经过验证的 Wrangler 精确版本加入 devDependencies 并提交真实生成的 lockfile，不要编造锁文件。

## Pages

从同一入口选择 Pages，导入仓库，框架预设 None，构建命令 `npm run build`，输出目录 `dist`，根目录为仓库根目录。

根目录 Wrangler 文件是 Workers 配置，没有 `pages_build_output_dir`，因此不作为 Pages 生产配置。Pages 的静态发布以控制台设置的 `dist` 为准；不要给该文件直接补 `pages_build_output_dir` 并保留 Workers-only 字段。官方文档说明，不含此字段的 Wrangler 配置可产生缺失字段提示，并继续只用于本地配置。

若你的账户流程明确要求一份 Pages Wrangler 文件，可先把原文件重命名为 `wrangler.workers.jsonc`，然后在根目录新建仅含下列字段的 `wrangler.jsonc`：

```json
{
  "name": "beer-guide",
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2026-09-27"
}
```

这是**切换为 Pages 专用配置**，不是默认要求；之后若返回 Workers，需恢复原文件，或使用 `--config wrangler.workers.jsonc` 显式部署。

## 为什么没有 SPA 全路径回退

网站用 hash 锚点，不依赖 History API 路由。不存在的路径应返回 404，不应把缺失 `app.js` 等文件伪装成 `index.html`。`public/404.html` 在构建时复制到 `dist`；Workers 指定 `404-page`，Pages 读取顶层 404 页面。

## 缓存与隐私

`public/_headers` 会复制到 `dist/_headers`。由于资源文件名尚未内容哈希化，设置重新校验缓存，避免旧界面与新数据不匹配，并添加基本安全响应头。Cloudflare 会将该文件当作配置，不作为普通页面提供。

网站没有统计脚本和后台同步。个人记录保存在浏览器 localStorage，导出文件由用户自行保存；换域名、换设备或清除浏览器数据需要手动导入。原始研究数据是公开静态 JSON，不应把私人价格备注、账号或凭据写入它。

## 部署后检查

访问首页、切换预算、打开酒款详情、保存一个个人价格后刷新、导出再导入 JSON，最后在手机上检查布局。访问不存在的 JS 路径应得到 404，而不是 200 的 HTML 首页。确认页面无控制台异常，并关闭不需要的外部统计注入。

## 官方参考

- Workers 静态站点入门：https://developers.cloudflare.com/workers/static-assets/get-started/
- 静态资源配置：https://developers.cloudflare.com/workers/static-assets/binding/
- Workers Git 构建参数：https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- Pages 静态 HTML：https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- Pages Wrangler 配置：https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- Workers 自定义响应头：https://developers.cloudflare.com/workers/static-assets/headers/
- Workers 自定义 404：https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/
