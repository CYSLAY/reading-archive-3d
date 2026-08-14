# Reading Gallery 3D

独立部署的沉浸式阅读档案首页，不会修改现有的 `reading-gallery` 网站。

线上地址：<https://cyslay.github.io/reading-archive-3d/>

## 本地启动

```bash
pnpm install
pnpm run extract:books -- /tmp/reading-gallery-index.html
pnpm run dev
```

## 当前版本

- 使用正式 13 秒成片作为滚动影像
- 机械密码锁 Loading 与真实视频下载进度绑定
- 网页前景机械门在资源加载完成后开启，再露出视频
- GSAP 使用非线性时间映射：延长单本书段、压缩工具箱段
- 自动选择最近一本阅读记录作为主角书
- 最终正视书架上展示全部阅读档案，可搜索并打开笔记

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到独立的 GitHub Pages 页面。

## 隔离原则

- 不包含原网站的部署密钥
- 不修改原网站仓库
- 与原 `reading-gallery` 仓库和 Pages 路径完全分离
