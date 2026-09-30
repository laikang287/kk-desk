# AGENTS

## 版本与绿色版构建
- 仅在本次改动涉及代码时，才将 `package.json` 中版本号的最后一项加 1。
- 纯文档修改（如 `AGENTS.md`、README、`docs/`、`NOTICE.md`）不需要递增版本号或构建版本包。
- 仅在修改项目版本号时，运行 TypeScript 检查并构建 Windows portable 绿色版版本包；
- 绿色版构建命令：`corepack yarn vue-tsc --noEmit`、`corepack yarn vite build`、`corepack yarn electron-builder --win portable`。

## 界面i18n
- 如果没有明确说明界面要 i18n，则不要进行 i18n。
- 界面支持的语言包括：`en`、`zh-CN`、`zh-TW`、`ja`、`ko`、`fr`、`de`、`es`、`ru`。
- 修改范围：仅处理应用界面中面向用户的文本，以及界面使用的日期、数字等本地化内容；不翻译代码标识符、日志、开发者提示和上游原始代码/文档。新增或修改界面文案时，应同步维护所有支持语言。
- i18n 核对不能只检查语言词条表；还要扫描界面模板和脚本中的硬编码文案，以及计算生成的标题、占位符、提示和版权/署名文字。搜索模式等动态界面提示应复用已有语言词条（例如命令行模式提示使用 `commandLine`），不要在组件中另写固定语言文本。
- 图标/表情选择器中显示给用户的分类名称、悬停标题和名称也属于界面文案，即使它们存放在数据文件中。为各支持语言提供完整名称映射，并检查映射覆盖所有项目；除非能确认数据属于上游原始内容，否则不能仅因其位于数据文件就跳过翻译。
- 完成后逐语言核对词条键和动态占位符，并检查 `title`、`placeholder`、菜单、确认/错误提示等界面位置，确保没有语言缺项或意外回退到英文。

## 文档i18n
- 如果没有明确说明文档要 i18n，则不要进行 i18n
- 有各种语言的README，分别支持`en`、`zh-CN`、`zh-TW`、`ja`、`ko`、`fr`、`de`、`es`、`ru`
- `README.zh-CN.md`、`README.md`，这两份文档在项目根目录，其它语言的README文档在docs目录下
- `README.zh-CN.md` 为主文档，手动编写和修改，如果明确说明文档要支持i18n时，则使用AI翻译将README.zh-CN.md翻译为README.md(英语)等其它语言
- `upstream/` 下的文档属于上游原始文档，`NOTICE.md`、`LICENSE` 属于来源/许可文件，均不纳入本项目文档 i18n。

## Git 提交
- 如果项目级 AGENTS.md 中没有说明 git 提交使用的语言，就默认使用中文。

## core file
- 如果程序崩溃，將core file存储在C盘下的files-vertical-tabs 目录下
