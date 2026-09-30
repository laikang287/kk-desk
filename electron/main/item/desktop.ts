import { app, shell, utilityProcess, UtilityProcess } from "electron";
import { existsSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { newItem } from "../../../commons/utils/common";
import { list as listClassifications, selectById as selectClassification } from "../classification/data";
import { add, del, list, update } from "./data";
import { parsePath } from "../../commons/utils";

type DesktopWorkerEntry = {
  key: string;
  name: string;
  type: number;
  target: string;
  params: string | null;
  icon: string | null;
  sourcePath: string;
};

type DesktopWorkerState = { process: UtilityProcess; rootId: number };
const workers = new Map<number, DesktopWorkerState>();

function defaultChild(rootId: number) {
  return listClassifications(rootId).find((item) => item.data.desktopUncategorized) ?? null;
}

function desktopFolders() {
  const paths = [app.getPath("desktop")];
  const publicDesktop = process.env.PUBLIC ? join(process.env.PUBLIC, "Desktop") : null;
  if (publicDesktop && publicDesktop.toLowerCase() !== paths[0].toLowerCase()) paths.push(publicDesktop);
  return paths;
}

function getDesktopItemsByKey(rootId: number) {
  const items = listClassifications(rootId)
    .flatMap((classification) => list(false, classification.id))
    .filter((item) => item.data.desktopKey);
  return new Map(items.map((item) => [item.data.desktopKey!, item]));
}

function reconcileDesktopSnapshot(
  rootId: number,
  entries: DesktopWorkerEntry[],
  options: { full: boolean; complete: boolean; removedPaths: string[] },
  durationMs: number
) {
  const root = selectClassification(rootId);
  const unclassified = defaultChild(rootId);
  if (!root || root.type !== 3 || !unclassified) return;
  const itemsByKey = getDesktopItemsByKey(rootId);
  const changed: ReturnType<typeof newItem>[] = [];
  const added: ReturnType<typeof newItem>[] = [];
  const removedIds: number[] = [];
  const updatedKeys = new Set<string>();

  for (const entry of entries) {
    updatedKeys.add(entry.key);
    const oldItem = itemsByKey.get(entry.key);
    const item = oldItem
      ? { ...oldItem, data: { ...oldItem.data } }
      : newItem({ classificationId: unclassified.id, type: entry.type });
    item.name = entry.name;
    item.type = entry.type;
    item.data.target = entry.target;
    item.data.params = entry.params;
    item.data.icon = entry.icon;
    item.data.desktopKey = entry.key;
    item.data.desktopSourcePath = entry.sourcePath;
    if (oldItem) {
      item.id = oldItem.id;
      item.classificationId = oldItem.classificationId;
      item.order = oldItem.order;
      const differs = oldItem.name !== item.name || oldItem.type !== item.type ||
        oldItem.data.target !== item.data.target || oldItem.data.params !== item.data.params ||
        oldItem.data.icon !== item.data.icon || oldItem.data.desktopSourcePath !== item.data.desktopSourcePath;
      if (differs) {
        update(item);
        changed.push(item);
      }
    } else {
      const created = add(item);
      if (created) added.push(created);
    }
  }

  const removedPaths = new Set(options.removedPaths.map((path) => path.toLowerCase()));
  for (const [key, item] of itemsByKey) {
    const removed = options.full
      ? options.complete && !updatedKeys.has(key)
      : !!item.data.desktopSourcePath && removedPaths.has(item.data.desktopSourcePath.toLowerCase()) && !updatedKeys.has(key);
    if (removed) {
      del(item.id);
      removedIds.push(item.id);
    }
  }

  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    if (added.length) global.mainWindow.webContents.send("onAddItem", { itemList: added, clear: false, classificationId: null });
    for (const item of changed) global.mainWindow.webContents.send("onUpdateItem", { item });
    if (removedIds.length) global.mainWindow.webContents.send("onDeleteItem", removedIds);
  }
  console.info(`[desktop] SQLite sync root=${rootId}: mode=${options.full ? "full" : "delta"}, entries=${entries.length}, added=${added.length}, changed=${changed.length}, removed=${removedIds.length}, complete=${options.complete}, worker=${durationMs}ms`);
}

function workerConfig(rootId: number) {
  const classification = selectClassification(rootId);
  if (!classification || classification.type !== 3) return null;
  // Keep the utility-process payload to simple structured-clone-safe values.
  // The full language object can gain non-cloneable fields as the app evolves.
  const languageKeys = ["computer", "userFiles", "controlPanel", "network", "recycleBin"] as const;
  const language = Object.fromEntries(languageKeys.map((key) => [key, String(global.language[key] ?? key)]));
  return {
    rootId,
    folders: desktopFolders().map(String),
    settings: {
      showHiddenFiles: Boolean(classification.data.showHiddenFiles),
      showTemporaryFiles: Boolean(classification.data.showTemporaryFiles),
    },
    language,
  };
}

function postWorkerMessage(worker: UtilityProcess, message: Record<string, unknown>) {
  // Round-trip through JSON so Electron never receives proxies, custom
  // prototypes, functions, or other values that structured clone cannot copy.
  const payload = JSON.parse(JSON.stringify(message));
  worker.postMessage(payload);
}

function startDesktopAssociation(rootId: number) {
  stopDesktopAssociation(rootId);
  const config = workerConfig(rootId);
  if (!config) return;
  const worker = utilityProcess.fork(join(__dirname, "desktopWorker.js"), [], { serviceName: `KK Desk desktop sync ${rootId}` });
  const state = { process: worker, rootId };
  workers.set(rootId, state);
  worker.on("message", (event: any) => {
    const message = event?.data ?? event;
    if (message?.type === "snapshot") {
      reconcileDesktopSnapshot(message.rootId, message.items, {
        full: message.full,
        complete: message.complete,
        removedPaths: message.removedPaths ?? [],
      }, message.durationMs);
    }
  });
  worker.on("exit", (code) => {
    if (workers.get(rootId) === state) workers.delete(rootId);
    if (code !== 0) console.warn(`[desktop] Sync worker exited root=${rootId}, code=${code}`);
  });
  postWorkerMessage(worker, { type: "start", ...config });
}

function refreshDesktopAssociation(rootId: number) {
  const state = workers.get(rootId);
  const config = workerConfig(rootId);
  if (!config) return;
  if (state) postWorkerMessage(state.process, { type: "refresh", settings: config.settings, language: config.language });
  else startDesktopAssociation(rootId);
}

function associatedDesktopRoot(classificationId: number) {
  const classification = selectClassification(classificationId);
  if (!classification?.parentId) return null;
  const parent = selectClassification(classification.parentId);
  return parent?.type === 3 ? parent.id : null;
}

function uniqueDesktopPath(folder: string, baseName: string) {
  const cleanName = baseName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "Shortcut";
  let path = join(folder, `${cleanName}.lnk`);
  let suffix = 2;
  while (existsSync(path)) path = join(folder, `${cleanName} (${suffix++}).lnk`);
  return path;
}

function queueDesktopItemToOS(item: ReturnType<typeof newItem>, previousItem?: ReturnType<typeof newItem> | null) {
  const rootId = associatedDesktopRoot(item.classificationId);
  if (!rootId || ![0, 1, 2, 3, 4].includes(item.type) || !item.data.target) return;
  const state = workers.get(rootId);
  const old = previousItem ?? item;
  const oldPath = old.data.desktopSourcePath && !old.data.desktopSourcePath.startsWith("shell:")
    ? old.data.desktopSourcePath
    : null;
  const folder = oldPath ? join(oldPath, "..").replace(/[\\/]$/, "") : desktopFolders()[0];
  const originalItem = previousItem ? { ...previousItem, data: { ...previousItem.data } } : null;
  if (oldPath && !oldPath.toLowerCase().endsWith(".lnk") && old.data.target !== item.data.target) {
    console.warn(`[desktop] Ignoring target edits for non-shortcut desktop entry ${item.id}`);
    update(old);
    return;
  }
  if (oldPath && old.name === item.name && old.type === item.type && old.data.target === item.data.target && old.data.params === item.data.params) {
    return;
  }
  let attemptedDestination: string | null = oldPath;
  const operation = () => {
    try {
      let destination = oldPath ?? uniqueDesktopPath(folder, item.name ?? "Shortcut");
      attemptedDestination = destination;
      if (oldPath && old.name !== item.name) {
        const extension = oldPath.slice(oldPath.lastIndexOf("."));
        const wanted = join(folder, `${(item.name ?? "Shortcut").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")}${extension}`);
        if (wanted.toLowerCase() !== oldPath.toLowerCase()) {
          if (existsSync(wanted)) throw new Error(`Desktop entry already exists: ${wanted}`);
          renameSync(oldPath, wanted);
          destination = wanted;
          attemptedDestination = wanted;
        }
      }
      if (destination.toLowerCase().endsWith(".lnk")) {
        const target = item.type === 0 || item.type === 1 ? parsePath(item.data.target) : item.data.target;
        const success = shell.writeShortcutLink(destination, oldPath ? "update" : "create", {
          target,
          args: item.data.params ?? "",
          description: item.name ?? "",
        });
        if (!success) throw new Error(`Unable to write shortcut: ${destination}`);
      } else if (!oldPath) {
        throw new Error(`Unsupported desktop entry type: ${item.type}`);
      } else if (old.data.target === oldPath && destination !== oldPath) {
        item.data.target = destination;
      }
      if (!oldPath) item.name = destination.slice(destination.lastIndexOf("\\") + 1, -4);
      const stats = statSync(destination);
      const key = stats.ino ? `file:${stats.dev}:${stats.ino}` : `path:${destination.toLowerCase()}`;
      item.data.desktopKey = key;
      item.data.desktopSourcePath = destination;
      update(item);
      if (state && workers.get(rootId) === state) postWorkerMessage(state.process, { type: "syncPath", path: destination });
      if (global.mainWindow && !global.mainWindow.isDestroyed()) global.mainWindow.webContents.send("onUpdateItem", { item });
    } catch (error) {
      if (oldPath && attemptedDestination && attemptedDestination !== oldPath && existsSync(attemptedDestination) && !existsSync(oldPath)) {
        try { renameSync(attemptedDestination, oldPath); } catch {}
      }
      if (originalItem) {
        update(originalItem);
        if (global.mainWindow && !global.mainWindow.isDestroyed()) global.mainWindow.webContents.send("onUpdateItem", { item: originalItem });
      } else {
        del(item.id);
        if (global.mainWindow && !global.mainWindow.isDestroyed()) global.mainWindow.webContents.send("onDeleteItem", [item.id]);
      }
      console.error(`[desktop] Unable to sync item ${item.id} to desktop:`, error);
    }
  };
  setImmediate(operation);
}

async function trashDesktopItem(item: ReturnType<typeof newItem>) {
  if (!item.data.desktopKey) return false;
  const sourcePath = item.data.desktopSourcePath;
  if (!sourcePath || sourcePath.startsWith("shell:")) return false;
  await shell.trashItem(sourcePath);
  return true;
}

function stopDesktopAssociation(rootId: number) {
  const state = workers.get(rootId);
  if (state) {
    workers.delete(rootId);
    postWorkerMessage(state.process, { type: "stop" });
    setTimeout(() => {
      if (state.process) state.process.kill();
    }, 1500).unref();
  }
}

function initDesktopAssociations() {
  for (const classification of listClassifications(null)) {
    if (classification.type === 3) startDesktopAssociation(classification.id);
  }
}

app.on("before-quit", () => {
  for (const rootId of Array.from(workers.keys())) stopDesktopAssociation(rootId);
});

export {
  startDesktopAssociation,
  stopDesktopAssociation,
  initDesktopAssociations,
  refreshDesktopAssociation,
  queueDesktopItemToOS,
  trashDesktopItem,
};
