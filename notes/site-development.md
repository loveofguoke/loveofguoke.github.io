# 个人网站更新记录

## 2026-10-28 / 独立知识源第一版

目标：为 https://loveofguoke.github.io/ 增加高质量个人博客、研究者网站与论坛目录，
建立可迁移的采集引擎和编辑 skill。仓库检出在 `D:\yyb\loveofguoke.github.io`。

### 设计参考与取舍

- [She Shuaijie](https://ricardokevins.github.io/)：AcademicPages 的内容层级与论文/笔记导航。
- [AcademicPages](https://github.com/academicpages/academicpages.github.io)：适合学术履历。
- [PaperMod](https://github.com/adityatelange/hugo-PaperMod)：参考简洁排版和文字优先的阅读方式。
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)：现有站点框架，保留历史笔记路径。

本次没有复制模板源码。目录页面使用独立静态 HTML/CSS/JS，暖白、森林绿、细线和编辑式排版；
旧内容继续使用 MkDocs。首页替换原始 MkDocs 默认模板，增加栏目入口。

### 内容与数据

首批 16 个来源已访问原站：ArthurChiao、阮一峰、Horace He、Simon Boehm、ezyang、Lil'Log、Karpathy、Hamel、
Simon Willison、Ahead of AI、Julia Evans、Ben Kuhn、PyTorch Forums、Lobsters、LessWrong、
She Shuaijie。四篇具体文章额外核验：Horace 性能原则、Boehm CUDA worklog、Hamel evals、
Lil'Log prompt engineering。来源说明为简短原创导读，不能理解为对整个站点每篇文章的背书。

苏剑林站点 `spaces.ac.cn` 本次访问返回 403，未将其标为已核验来源；作为后续中文来源扩充候选。
首批补入 ArthurChiao 的中英文技术索引和阮一峰周刊，仍以英文来源居多，后续继续补充中文作者。
论坛帖子与自动订阅候选不标记为精选文章。

`data/sources.json` 是精选来源的唯一输入；`scripts/refresh_sources.py` 以标准库并发读取 RSS/Atom，
保留原站日期、URL 去重、最多保存 240 个候选。采集失败保留旧数据，并公开每个 feed 的状态。
不保存文章全文，不使用模型编造摘要或质量评分。新作者发现由 skill 通过网页检索、blogroll、引用追踪执行。

### 自动更新与复现

GitHub Actions 每日 23:30 UTC（北京时间 07:30）采集已有订阅、提交候选数据并部署至 gh-pages。
同一个工作流也响应 master/main 推送和手动触发。网站收藏存在读者浏览器 localStorage，不上传服务器。

```bash
python -m venv .venv
# Activate the environment for your shell, then:
pip install -r requirements-site.txt
python scripts/refresh_sources.py
mkdocs build
mkdocs serve
```

便携 skill 保存在 `skills/independent-knowledge-curator/`，可复制到其他电脑的 Codex skills 目录。
网站仓库同时保留所有数据、采集脚本、页面和更新记录。

### 兼容修复

- 删除未实际提供页面功能的 statistics 插件依赖，避免部署时临时克隆第三方工具链。
- 修复没有 Giscus iframe 时旧脚本抛错的问题。
- 移除旧 polyfill.io 外部脚本，现代浏览器无需该兼容层。

### 验证

- 真实采集：16 个来源，13 个 RSS/Atom 订阅全部读取成功，3 个站点通过人工入口维护；
  输出 240 条 URL 去重候选。
- 两次初始失败已解决：ezyang 从原页 alternate link 确认真实地址为 `feed.xml`；
  Ahead of AI feed 超过初始 2 MB 上限，提升为仍有界的 8 MB。
- `node --check`、目录 schema/重复检查、skill `quick_validate.py` 和 `git diff --check` 通过。
- MkDocs 构建通过；现代 pymdown 版本移除了旧 `uslugify`，改回默认标题 slug，并更新 emoji
  扩展到 `material.extensions.emoji`。旧 PPL 笔记仍有一个历史格式链接警告，未改动其正文。
- 浏览器验证：CUDA 搜索返回 Simon Boehm；收藏与仅看收藏可用；无匹配显示空状态；
  GPU/编译器 + 技术论坛组合筛选返回 PyTorch Forums。
- 390×844 手机视口已检查单列卡片、筛选和文本；未出现横向溢出。桌面为三列卡片。
- skill 同时安装到当前 Codex skills 目录，并在 career 的 `实践教程/个人网站/` 备份。
- 发布提交：`3fdceaa`（栏目与采集引擎）、`1181a1e`（清除旧脚本强制深色主题造成的首页对比度问题）。
  HTTPS Git 连接短暂失败后使用已配置的 GitHub SSH 正常推送，没有修改代理或关闭 TLS 校验。
- GitHub 的 Refresh and publish 与 Pages build and deployment 均成功；线上
  `https://loveofguoke.github.io/atlas/` 已实际打开，确认 16 个来源、筛选控件和订阅候选正常加载。
- 线上截图保存到 `notes/screenshots/fieldnotes-desktop.png`。
- 手动演练每日采集分支时，遇到与人工文档推送并发造成的 non-fast-forward；增加采集提交后的
  `git pull --rebase`，再推送当天快照，保持已有人工提交。采集器在 GitHub runner 上运行通过。
