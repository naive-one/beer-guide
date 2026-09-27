# v1.1.0 验收

运行npm run build && npm test：30项通过。运行python tests/ui_smoke.py：21项检查通过。详情见v1.1.0-CORE-TEST-REPORT.txt、v1.1.0-UI-TEST-REPORT.json。

界面检查涵盖42条目四处完整展示、所有弹窗、平台/样本/历史过滤、真实报价覆盖、个人分、导入导出、对比与390/768/1440px宽度。构建测试另检验部署文件白名单、404和静态HTTP响应。

受管Chromium禁止URL导航，本轮UI用实际构建后的standalone.html在set_content中渲染；Storage替身仅在测试中用于检查序列化。没有绕过策略，没有把替身加入生产代码。测试不证明已验证真实域名持久化或完成Cloudflare/GitHub部署。

旧v1.0.0报告只作历史记录，不代表新版基线。
