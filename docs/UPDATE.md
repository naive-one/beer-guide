# 更新已有网站

1. 先导出自己浏览器里的个人JSON作备份。
2. 解压本包，将beer-guide文件夹中的项目文件合并到原仓库根目录。保留.git、远端配置以及无关用户文件；不要把整个beer-guide再次嵌套为网站子目录。
3. 执行npm run build及npm test。dist会重新生成。审查差异后正常commit/push，不强推。不使用仅供首次空仓库导入的publish-github脚本覆盖已有代码。
4. 原Cloudflare设置不用改变：Workers构建npm run build、部署npx --yes wrangler@4 deploy；Pages构建npm run build、输出dist。两者选其一。
5. 网页默认应看到42/42、21款证据候选、7个分平台前沿节点。手机和电脑都检查卡片42张。若浏览器有个人记录或改过筛选，计算结果可以不同。
6. 对3处明确选取的代表款，以及奥古特A3，请先复核旧个人数据版本。真实域名的localStorage、刷新保持和部署权限由部署环境验收。

本包没有直接替用户提交GitHub或部署Cloudflare。
