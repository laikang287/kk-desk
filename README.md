# KK Desk

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](docs/README.zh-TW.md) · [日本語](docs/README.ja.md) · [한국어](docs/README.ko.md) · [Español](docs/README.es.md) · [Français](docs/README.fr.md) · [Deutsch](docs/README.de.md) · [Русский](docs/README.ru.md)

KK Desk is a Windows 10/11 launcher that stays synchronized with your desktop, so you can open desktop shortcuts directly without returning to the desktop.

## Key features

1. **Keep desktop shortcuts in sync and launch them without minimizing your open windows.** When many windows are arranged across one or more monitors, returning to the desktop with Win+D can disrupt that layout. KK Desk lets you open desktop shortcuts while preserving your workspace.
2. **Organize desktop shortcuts into categories.** Unclassified desktop shortcuts appear in the built-in **Default** subcategory. Create subcategories under the **Desktop** category and move shortcuts into them. This organization exists inside KK Desk and does not change the actual desktop.

## Demo

![KK Desk demo](public/demo.png)

## Project origin

This project is an independently maintained, unofficial fork of [Dawn Launcher](https://github.com/fanchenio/DawnLauncher) **v1.5.2** ([upstream release](https://github.com/fanchenio/DawnLauncher/releases/tag/1.5.2), corresponding to historical commit `ac36714` in this repository). It is not affiliated with or officially endorsed by the original project.

Compared with upstream v1.5.2, this fork adds desktop association and live desktop shortcut synchronization, supports multiple interface languages, changes the shortcut context menu to match the Windows 11 desktop menu, and includes other refinements.

Features not described here are inherited from upstream. See the preserved [upstream Chinese documentation](upstream/README.md) and [upstream English documentation](upstream/README-ENGLISH.md).

## Installation

Download a portable release from the [releases page](https://github.com/laikang287/kk-desk/releases). Runtime configuration data is stored in the `data` folder beside the application.

## License and acknowledgements

The code is licensed under MIT; see [LICENSE](LICENSE). Original copyright and license notices are retained, with source details in [NOTICE.md](NOTICE.md). Thanks to the Dawn Launcher author and contributors.

## Documentation languages

The Chinese README is the source document. Other language versions are translations and may lag behind future changes; the Chinese and English versions are prioritized for updates.
