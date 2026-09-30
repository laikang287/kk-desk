import { watch, FSWatcher, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

global.addon = require("../../native/addon.node");

type DesktopSettings = { showHiddenFiles: boolean; showTemporaryFiles: boolean };
type DesktopEntry = {
  key: string;
  name: string;
  type: number;
  target: string;
  params: string | null;
  icon: string | null;
  sourcePath: string;
};

const virtualItems = [
  { key: "shell:MyComputerFolder", target: "shell:MyComputerFolder", clsids: ["{20D04FE0-3AEA-1069-A2D8-08002B30309D}"], visibleByDefault: false, languageKey: "computer" },
  { key: "shell:UsersFilesFolder", target: "shell:UsersFilesFolder", clsids: ["{59031A47-3F72-44A7-89C5-5595FE6B30EE}"], visibleByDefault: false, languageKey: "userFiles" },
  { key: "shell:ControlPanelFolder", target: "shell:ControlPanelFolder", clsids: ["{26EE0668-A00A-44D7-9371-BEB064C98683}", "{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}"], visibleByDefault: false, languageKey: "controlPanel" },
  { key: "shell:NetworkPlacesFolder", target: "shell:NetworkPlacesFolder", clsids: ["{F02C1A0D-BE21-4350-88B0-7367FC96EF3C}"], visibleByDefault: false, languageKey: "network" },
  { key: "shell:RecycleBinFolder", target: "shell:RecycleBinFolder", clsids: ["{645FF040-5081-101B-9F08-00AA002F954E}"], visibleByDefault: true, languageKey: "recycleBin" },
];

let rootId = 0;
let folders: string[] = [];
let settings: DesktopSettings = { showHiddenFiles: false, showTemporaryFiles: false };
let language: Record<string, string> = {};
let watchers: FSWatcher[] = [];
let pendingPaths = new Map<string, string>();
let pendingFullScan = false;
let debounce: NodeJS.Timeout | null = null;
let processing = false;
let visibilityCache = new Map<string, { visible: boolean; expiresAt: number }>();

function post(message: unknown) {
  process.parentPort.postMessage(message);
}

function safeFileIcon(sourcePath: string, target?: string) {
  try {
    return global.addon.getFileIcon(sourcePath) ?? (target ? global.addon.getFileIcon(target) : null);
  } catch (error) {
    console.warn(`[desktop-worker] Unable to read icon: ${sourcePath}`, error);
    return null;
  }
}

function isVirtualVisible(item: typeof virtualItems[number]) {
  const cacheKey = item.clsids.join(",");
  const cached = visibilityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.visible;
  let visibility: boolean | null = null;
  for (const key of [
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel",
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\ClassicStartMenu",
  ]) {
    for (const clsid of item.clsids) {
      try {
        const output = execFileSync("reg.exe", ["query", key, "/v", clsid], { encoding: "utf8", windowsHide: true });
        const match = output.match(/REG_DWORD\s+0x([0-9a-f]+)/i);
        if (match) visibility = parseInt(match[1], 16) === 0;
      } catch {}
    }
  }
  const visible = visibility ?? item.visibleByDefault;
  visibilityCache.set(cacheKey, { visible, expiresAt: Date.now() + 30_000 });
  return visible;
}

function readEntry(sourcePath: string, name: string): DesktopEntry | null {
  try {
    const isTemporary = /^~\$/.test(name) || /\.(tmp|temp)$/i.test(name);
    if (isTemporary && !settings.showTemporaryFiles) return null;
    if (!settings.showHiddenFiles && global.addon.isHiddenOrSystemFile(sourcePath)) return null;
    const stats = statSync(sourcePath);
    const key = stats.ino ? `file:${stats.dev}:${stats.ino}` : `path:${sourcePath.toLowerCase()}`;
    const ext = name.toLowerCase().slice(name.lastIndexOf("."));
    let target = sourcePath;
    let params: string | null = null;
    if (ext === ".lnk") {
      try {
        const shortcut = global.addon.getShortcutFileInfo(sourcePath);
        if (shortcut?.target) target = shortcut.target;
        if (shortcut?.arguments) params = shortcut.arguments;
      } catch (error) {
        console.warn(`[desktop-worker] Unable to resolve shortcut: ${sourcePath}`, error);
      }
    }
    return {
      key,
      name: stats.isDirectory() ? name : (ext === ".lnk" || ext === ".url" ? name.slice(0, name.lastIndexOf(".")) : name),
      type: stats.isDirectory() ? 1 : 0,
      target,
      params,
      icon: safeFileIcon(sourcePath, target),
      sourcePath,
    };
  } catch (error) {
    console.warn(`[desktop-worker] Unable to read desktop item: ${sourcePath}`, error);
    return null;
  }
}

function readVirtualItems(): DesktopEntry[] {
  return virtualItems.filter(isVirtualVisible).map((item) => ({
    key: item.key,
    name: language[item.languageKey] ?? item.languageKey,
    type: 3,
    target: item.target,
    params: null,
    icon: safeFileIcon(item.target),
    sourcePath: item.target,
  }));
}

function fullScan() {
  const startedAt = Date.now();
  let complete = true;
  const entries = new Map<string, DesktopEntry>();
  for (const folder of folders) {
    let names: string[];
    try {
      names = readdirSync(folder);
    } catch (error) {
      complete = false;
      console.warn(`[desktop-worker] Unable to read desktop folder: ${folder}`, error);
      continue;
    }
    for (const name of names) {
      const entry = readEntry(join(folder, name), name);
      if (entry) entries.set(entry.key, entry);
    }
  }
  for (const item of readVirtualItems()) entries.set(item.key, item);
  const virtualItemOrder = new Map(virtualItems.map((item, index) => [item.key, index]));
  const items = Array.from(entries.values()).sort((a, b) => {
    const aOrder = virtualItemOrder.get(a.key);
    const bOrder = virtualItemOrder.get(b.key);
    if (aOrder !== undefined || bOrder !== undefined) {
      if (aOrder === undefined) return 1;
      if (bOrder === undefined) return -1;
      return aOrder - bOrder;
    }
    return 0;
  });
  console.info(`[desktop-worker] Full scan root=${rootId}: items=${items.length}, complete=${complete}, duration=${Date.now() - startedAt}ms`);
  post({ type: "snapshot", rootId, full: true, complete, items, removedPaths: [], durationMs: Date.now() - startedAt });
}

function syncPath(path: string) {
  const name = path.slice(path.lastIndexOf("\\") + 1).split("/").pop() ?? path;
  const entry = readEntry(path, name);
  post({
    type: "snapshot",
    rootId,
    full: false,
    complete: true,
    items: entry ? [entry] : [],
    removedPaths: entry ? [] : [path],
    durationMs: 0,
  });
}

function processPending() {
  if (processing) return;
  processing = true;
  try {
    if (pendingFullScan) {
      pendingFullScan = false;
      pendingPaths.clear();
      fullScan();
    } else {
      const paths = Array.from(pendingPaths.values());
      pendingPaths.clear();
      for (const path of paths) syncPath(path);
    }
  } finally {
    processing = false;
    if (pendingFullScan || pendingPaths.size) scheduleProcessing();
  }
}

function scheduleProcessing(full = false, path?: string) {
  if (full) {
    pendingFullScan = true;
    pendingPaths.clear();
  } else if (path && !pendingFullScan) {
    pendingPaths.set(path.toLowerCase(), path);
  }
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(processPending, 350);
}

process.parentPort.on("message", (event) => {
  const message = event.data;
  if (message.type === "start") {
    rootId = message.rootId;
    folders = message.folders;
    settings = message.settings;
    language = message.language;
    watchers = folders.flatMap((folder) => {
      try {
        return [watch(folder, (_eventType, filename) => {
          if (!filename) scheduleProcessing(true);
          else scheduleProcessing(false, join(folder, filename.toString()));
        })];
      } catch (error) {
        console.warn(`[desktop-worker] Unable to watch desktop folder: ${folder}`, error);
        return [];
      }
    });
    fullScan();
  } else if (message.type === "syncPath") {
    scheduleProcessing(false, message.path);
  } else if (message.type === "refresh") {
    settings = message.settings;
    language = message.language;
    scheduleProcessing(true);
  } else if (message.type === "stop") {
    for (const watcher of watchers) watcher.close();
    if (debounce) clearTimeout(debounce);
    process.exit(0);
  }
});
