# KK Desk

[English](README-ENGLISH.md) · [上游原版文档](upstream/README.md) · [问题反馈](https://github.com/laikang287/kk-desk/issues)

KK Desk 是一款面向 Windows 10/11 的快捷启动工具。**本项目主要为我个人使用而维护，顺便开源分享。**功能和发布节奏以个人使用需求为准。

## 核心功能：关联桌面

关联桌面后，启动器会显示桌面上的图标，让桌面成为可在启动器中使用的分类。

1. **不用回到桌面，就能启动其他程序。**在启动器里直接点击桌面快捷方式或文件夹，省去最小化当前窗口、寻找桌面图标的步骤。
2. **与桌面图标实时同步。**桌面上的项目新增、删除或改名后，启动器中的图标会自动更新。程序监听用户桌面和公共桌面的文件变化，并定期检查同步状态。

首次运行会创建“桌面”分类；也可通过分类的右键菜单关联桌面。将已有分类关联桌面时，原有项目会被桌面图标替换，请先确认该分类中没有需要保留的项目。

此外，保留上游的分类管理、关联文件夹、快速搜索、相对路径、开始菜单和 Appx 应用扫描、网址快捷方式等功能。

## 项目来源与上游的关系

本项目 fork 自 [Dawn Launcher](https://github.com/fanchenio/DawnLauncher) **v1.5.2**（上游标签 [`1.5.2`](https://github.com/fanchenio/DawnLauncher/releases/tag/1.5.2)，对应本仓库历史提交 `ac36714`）。这是独立维护的非官方分支，与原项目没有隶属或官方授权关系。

相较于上游 v1.5.2，本分支重点增加了**关联桌面及桌面图标同步**，并按个人使用习惯调整了名称、图标和部分行为。本分支的问题和版本请在[本仓库](https://github.com/laikang287/kk-desk)查看；原项目的说明请参阅本仓库保存的[上游中文文档](upstream/README.md)和[上游英文文档](upstream/README-ENGLISH.md)。

## 获取与构建

源码与发布版本：[KK Desk 仓库](https://github.com/laikang287/kk-desk)。绿色版的数据保存在程序旁的 `data` 目录；从旧版迁移时，可使用程序内的“备份/还原数据”功能。

技术栈为 Electron、Vite、Vue 3、TypeScript 和 Rust。开发环境需要 Node.js、Yarn、Rust/Cargo，以及用于编译 SQLite3 的 node-gyp。安装依赖后运行 `corepack yarn dev`；构建绿色版依次运行：

```powershell
corepack yarn vue-tsc --noEmit
corepack yarn vite build
corepack yarn electron-builder --win portable
```

## 许可与致谢

代码采用 MIT 许可，详见 [LICENSE](LICENSE)。原项目的版权与许可声明予以保留；来源说明见 [NOTICE.md](NOTICE.md)。感谢 Dawn Launcher 原作者与贡献者。
