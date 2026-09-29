# AGENTS

## 版本与绿色版构建
- 每次修改项目文件后，将 `package.json` 中版本号的最后一项加 1。
- 每次修改项目文件后，运行 TypeScript 检查并构建 Windows portable 绿色版版本包。
- 绿色版构建命令：`corepack yarn vue-tsc --noEmit`、`corepack yarn vite build`、`corepack yarn electron-builder --win portable`。

## Git 提交
- 如果项目级 AGENTS.md 中没有说明 git 提交使用的语言，就默认使用中文。
