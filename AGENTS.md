# AGENTS

## 版本与绿色版构建
- 每次修改项目文件后，将 `package.json` 中版本号的最后一项加 1。
- 每次修改项目文件后，运行 TypeScript 检查并构建 Windows portable 绿色版版本包。
- 绿色版构建命令：`corepack yarn vue-tsc --noEmit`、`corepack yarn vite build`、`corepack yarn electron-builder --win portable`。

## 界面i18n
- 如果没有明确说明界面要 i18n，则不要进行 i18n。
- 界面支持的语言包括：`en`、`zh-CN`、`zh-TW`、`ja`、`ko`、`fr`、`de`、`es`。
- 修改范围：仅处理应用界面中面向用户的文本，以及界面使用的日期、数字等本地化内容；不翻译代码标识符、日志、开发者提示和上游原始代码/文档。新增或修改界面文案时，应同步维护所有支持语言。

## 文档i18n
- 纳入翻译维护的文档：`README.md`、`README-ENGLISH.md`。
- `README.md` 为中文主文档，手动编写和修改；`README-ENGLISH.md` 及后续新增的其它语言 README 均根据中文主文档翻译，不直接作为内容源维护。
- `upstream/` 下的文档属于上游原始文档，`NOTICE.md`、`LICENSE` 属于来源/许可文件，均不纳入本项目文档 i18n。

## Git 提交
- 如果项目级 AGENTS.md 中没有说明 git 提交使用的语言，就默认使用中文。
