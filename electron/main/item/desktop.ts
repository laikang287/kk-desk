import { app } from "electron";
import { watch, FSWatcher, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { deleteExtname, newItem } from "../../../commons/utils/common";
import { list as listClassifications, selectById as selectClassification } from "../classification/data";
import { add, del, list, update } from "./data";

const watchers = new Map<number, { handles: FSWatcher[]; debounce: NodeJS.Timeout | null }>();
const virtualDesktopItems: Array<{
  key: string;
  target: string;
  clsid: string;
  visibilityClsids?: string[];
  visibleByDefault: boolean;
}> = [
  { key: "shell:MyComputerFolder", target: "shell:MyComputerFolder", clsid: "{20D04FE0-3AEA-1069-A2D8-08002B30309D}", visibleByDefault: false },
  { key: "shell:UsersFilesFolder", target: "shell:UsersFilesFolder", clsid: "{59031A47-3F72-44A7-89C5-5595FE6B30EE}", visibleByDefault: false },
  { key: "shell:ControlPanelFolder", target: "shell:ControlPanelFolder", clsid: "{26EE0668-A00A-44D7-9371-BEB064C98683}", visibilityClsids: ["{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}"], visibleByDefault: false },
  { key: "shell:NetworkPlacesFolder", target: "shell:NetworkPlacesFolder", clsid: "{F02C1A0D-BE21-4350-88B0-7367FC96EF3C}", visibleByDefault: false },
  { key: "shell:RecycleBinFolder", target: "shell:RecycleBinFolder", clsid: "{645FF040-5081-101B-9F08-00AA002F954E}", visibleByDefault: true },
];
const priorityDesktopKeys = [
  "shell:UsersFilesFolder",
  "shell:MyComputerFolder",
  "shell:NetworkPlacesFolder",
  "shell:ControlPanelFolder",
  "shell:RecycleBinFolder",
];

function defaultChild(rootId: number) {
  return listClassifications(rootId).find((item) => item.data.desktopUncategorized) ?? null;
}

function desktopFolders() {
  const paths = [app.getPath("desktop")];
  const publicDesktop = process.env.PUBLIC ? join(process.env.PUBLIC, "Desktop") : null;
  if (publicDesktop && publicDesktop.toLowerCase() !== paths[0].toLowerCase()) paths.push(publicDesktop);
  return paths;
}

function isVirtualDesktopIconVisible(clsids: string[], visibleByDefault: boolean) {
  let visibility: boolean | null = null;
  for (const key of [
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel",
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\ClassicStartMenu",
  ]) {
    for (const clsid of clsids) {
      try {
        const output = execFileSync("reg.exe", ["query", key, "/v", clsid], { encoding: "utf8", windowsHide: true });
        const match = output.match(/REG_DWORD\s+0x([0-9a-f]+)/i);
        if (match) visibility = parseInt(match[1], 16) === 0;
      } catch {}
    }
  }
  return visibility ?? visibleByDefault;
}

function collectDesktopItems(rootId: number) {
  const existing = listClassifications(rootId)
    .flatMap((classification) => list(false, classification.id))
    .filter((item) => item.data.desktopKey);
  const oldByKey = new Map(existing.map((item) => [item.data.desktopKey!, item]));
  const found = new Map<string, ReturnType<typeof newItem>>();
  const unclassified = defaultChild(rootId);
  if (!unclassified) return null;
  const desktopSettings = selectClassification(rootId)?.data;
  if (!desktopSettings) return null;

  for (const folder of desktopFolders()) {
    let names: string[];
    try {
      names = readdirSync(folder);
    } catch (error) {
      // Some Windows installations do not have a public desktop folder, or
      // redirect it to a location the current user cannot read. Keep scanning
      // the other desktop locations in that case.
      console.warn(`[desktop] Unable to read desktop folder: ${folder}`, error);
      continue;
    }
    for (const name of names) {
      try {
        const sourcePath = join(folder, name);
        const isTemporary = /^~\$/.test(name) || /\.(tmp|temp)$/i.test(name);
        if (isTemporary && !desktopSettings.showTemporaryFiles) continue;
        if (!desktopSettings.showHiddenFiles && global.addon.isHiddenOrSystemFile(sourcePath)) continue;
        const stats = statSync(sourcePath);
        const key = stats.ino
          ? `file:${stats.dev}:${stats.ino}`
          : `path:${sourcePath.toLowerCase()}`;
        const ext = name.toLowerCase().slice(name.lastIndexOf("."));
        const isShortcut = ext === ".lnk";
        let target = sourcePath;
        let params: string | null = null;
        if (isShortcut) {
          try {
            const shortcut = global.addon.getShortcutFileInfo(sourcePath);
            if (shortcut?.target) target = shortcut.target;
            if (shortcut?.arguments) params = shortcut.arguments;
          } catch (error) {
            console.warn(`[desktop] Unable to resolve shortcut: ${sourcePath}`, error);
          }
        }
        const oldItem = oldByKey.get(key);
        const item = oldItem ?? newItem({ classificationId: unclassified.id, type: stats.isDirectory() ? 1 : 0 });
        item.name = stats.isDirectory() ? name : (isShortcut || ext === ".url" ? deleteExtname(name) : name);
        item.type = stats.isDirectory() ? 1 : 0;
        item.data.target = target;
        item.data.params = params;
        // Shell icon extraction is synchronous and expensive. Reuse the stored
        // icon while the source path and resolved shortcut target are unchanged.
        if (!oldItem || oldItem.data.desktopSourcePath !== sourcePath || oldItem.data.target !== target) {
          item.data.icon = safeFileIcon(sourcePath, target);
        }
        item.data.desktopKey = key;
        item.data.desktopSourcePath = sourcePath;
        found.set(key, item);
      } catch (error) {
        // A single stale/broken desktop entry must not hide all other icons.
        console.warn(`[desktop] Unable to read desktop item: ${join(folder, name)}`, error);
      }
    }
  }

  for (const virtual of virtualDesktopItems) {
    const visibilityClsids = [virtual.clsid, ...(virtual.visibilityClsids ?? [])];
    if (!isVirtualDesktopIconVisible(visibilityClsids, virtual.visibleByDefault)) continue;
    const oldItem = oldByKey.get(virtual.key);
    const item = oldItem ?? newItem({ classificationId: unclassified.id, type: 3 });
    const languageKey = virtual.key === "shell:MyComputerFolder" ? "computer"
      : virtual.key === "shell:UsersFilesFolder" ? "userFiles"
      : virtual.key === "shell:ControlPanelFolder" ? "controlPanel"
      : virtual.key === "shell:NetworkPlacesFolder" ? "network"
      : "recycleBin";
    item.name = global.language[languageKey];
    item.type = 3;
    item.data.target = virtual.target;
    item.data.desktopKey = virtual.key;
    item.data.desktopSourcePath = virtual.target;
    if (!oldItem) item.data.icon = safeFileIcon(virtual.target);
    found.set(virtual.key, item);
  }
  return { existing, found };
}

function safeFileIcon(sourcePath: string, target?: string) {
  try {
    return global.addon.getFileIcon(sourcePath) ?? (target ? global.addon.getFileIcon(target) : null);
  } catch (error) {
    console.warn(`[desktop] Unable to read icon: ${sourcePath}`, error);
    return null;
  }
}

function reconcileDesktop(rootId: number) {
  const root = selectClassification(rootId);
  if (!root || root.type !== 3) return;
  const snapshot = collectDesktopItems(rootId);
  if (!snapshot) return;
  const existingByKey = new Map(snapshot.existing.map((item) => [item.data.desktopKey!, item]));
  const removedIds: number[] = [];
  const added: any[] = [];
  const changed: any[] = [];

  const priorityByKey = new Map(priorityDesktopKeys.map((key, index) => [key, index]));
  const desktopItems = Array.from(snapshot.found.entries()).sort(([leftKey], [rightKey]) => {
    const leftPriority = priorityByKey.get(leftKey) ?? priorityDesktopKeys.length;
    const rightPriority = priorityByKey.get(rightKey) ?? priorityDesktopKeys.length;
    return leftPriority - rightPriority;
  });

  for (const [key, item] of desktopItems) {
    const oldItem = existingByKey.get(key);
    if (oldItem) {
      item.id = oldItem.id;
      item.classificationId = oldItem.classificationId;
      item.order = oldItem.order;
      item.data.openNumber = oldItem.data.openNumber;
      item.data.lastOpen = oldItem.data.lastOpen;
      const isChanged = oldItem.name !== item.name || oldItem.type !== item.type ||
        oldItem.data.target !== item.data.target || oldItem.data.params !== item.data.params ||
        oldItem.data.icon !== item.data.icon || oldItem.data.desktopSourcePath !== item.data.desktopSourcePath;
      if (isChanged) {
        update(item);
        changed.push(item);
      }
    } else {
      const created = add(item);
      if (created) added.push(created);
    }
  }
  for (const [key, item] of existingByKey) {
    if (!snapshot.found.has(key)) {
      del(item.id);
      removedIds.push(item.id);
    }
  }
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    if (added.length) global.mainWindow.webContents.send("onAddItem", { itemList: added, clear: false, classificationId: null });
    for (const item of changed) global.mainWindow.webContents.send("onUpdateItem", { item });
    if (removedIds.length) global.mainWindow.webContents.send("onDeleteItem", removedIds);
  }
}

function refreshDesktopAssociation(rootId: number) {
  reconcileDesktop(rootId);
}

function startDesktopAssociation(rootId: number) {
  stopDesktopAssociation(rootId);
  const state = { handles: [] as FSWatcher[], debounce: null as NodeJS.Timeout | null };
  const schedule = () => {
    if (state.debounce) clearTimeout(state.debounce);
    state.debounce = setTimeout(() => reconcileDesktop(rootId), 500);
  };
  for (const folder of desktopFolders()) {
    try {
      state.handles.push(watch(folder, schedule));
    } catch {}
  }
  watchers.set(rootId, state);
  reconcileDesktop(rootId);
}

function stopDesktopAssociation(rootId: number) {
  const state = watchers.get(rootId);
  if (!state) return;
  for (const handle of state.handles) handle.close();
  if (state.debounce) clearTimeout(state.debounce);
  watchers.delete(rootId);
}

function initDesktopAssociations() {
  for (const classification of listClassifications(null)) {
    if (classification.type === 3) startDesktopAssociation(classification.id);
  }
}

export { startDesktopAssociation, stopDesktopAssociation, initDesktopAssociations, refreshDesktopAssociation };
