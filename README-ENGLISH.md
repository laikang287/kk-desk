# KK Desk

[简体中文](README.md) · [Original upstream docs](upstream/README-ENGLISH.md) · [Report an issue](https://github.com/laikang287/kk-desk/issues)

KK Desk is a quick launcher for Windows 10/11. **I maintain this project primarily for my own use and share the source code along the way.** Features and release timing follow my personal needs.

## Main feature: Associate Desktop

Once associated, the launcher displays your desktop icons in a classification you can use from the launcher.

1. **Launch other programs without returning to the desktop.** Open a desktop shortcut or folder directly in the launcher instead of minimizing your current windows to find its icon.
2. **Keep icons in sync with the desktop in real time.** Icons in the launcher update automatically when desktop items are added, removed, or renamed. The app watches the current user's and public desktop folders and periodically checks for changes.

The first launch creates a Desktop classification. You can also associate a classification from its context menu. Associating an existing classification replaces its current items with desktop icons, so check that it contains nothing you need to keep.

The fork also retains upstream features such as categories, linked folders, quick search, relative paths, Start menu and Appx app discovery, and website shortcuts.

## Origin and relationship to upstream

This project is forked from [Dawn Launcher](https://github.com/fanchenio/DawnLauncher) **v1.5.2** (upstream tag [`1.5.2`](https://github.com/fanchenio/DawnLauncher/releases/tag/1.5.2), at commit `ac36714` in this repository's history). It is an independently maintained, unofficial fork. It is not affiliated with or endorsed by the original project.

Compared with upstream v1.5.2, this fork's main addition is **desktop association and desktop icon synchronization**. It also changes the name, icons, and some behavior for personal use. For this fork's releases and issues, use [this repository](https://github.com/laikang287/kk-desk). The original project documentation is preserved here in [Chinese](upstream/README.md) and [English](upstream/README-ENGLISH.md).

## Download and build

Source code and releases: [KK Desk repository](https://github.com/laikang287/kk-desk). The portable edition stores data in a `data` directory beside the executable. Use the app's backup and restore feature when migrating from an older edition.

The stack is Electron, Vite, Vue 3, TypeScript, and Rust. Development requires Node.js, Yarn, Rust/Cargo, and node-gyp for SQLite3. After installing dependencies, run `corepack yarn dev`. To build the Windows portable edition, run:

```powershell
corepack yarn vue-tsc --noEmit
corepack yarn vite build
corepack yarn electron-builder --win portable
```

## License and credits

The code is licensed under MIT; see [LICENSE](LICENSE). The original copyright and license notice are retained; see [NOTICE.md](NOTICE.md) for provenance. Thanks to the Dawn Launcher author and contributors.
