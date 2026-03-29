/**
 * File history: stores timestamped snapshots of the score in IndexedDB.
 * Snapshots are taken on every auto-save. Accessed via command palette.
 */

import { getSettings } from "../settings";

const DB_NAME = "notation-history";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";

interface Snapshot {
  id?: number;
  timestamp: number;
  scoreJson: string;
  title: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save a snapshot of the current score. */
export async function saveSnapshot(scoreJson: string, title: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.add({
      timestamp: Date.now(),
      scoreJson,
      title,
    } as Snapshot);

    // Prune old snapshots beyond the cap
    const maxSnapshots = getSettings().historyMaxSnapshots;
    const countReq = store.count();
    countReq.onsuccess = () => {
      const total = countReq.result;
      if (total > maxSnapshots) {
        const idx = store.index("timestamp");
        const cursor = idx.openCursor();
        let toDelete = total - maxSnapshots;
        cursor.onsuccess = () => {
          if (toDelete > 0 && cursor.result) {
            cursor.result.delete();
            toDelete--;
            cursor.result.continue();
          }
        };
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch {
    // Silently fail — history is best-effort
  }
}

/** Get all snapshots, newest first. */
export async function getSnapshots(): Promise<Snapshot[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const results = req.result as Snapshot[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

/** Get a single snapshot by ID. */
export async function getSnapshot(id: number): Promise<Snapshot | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

/** Clear all history. */
export async function clearHistory(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();
  } catch {
    // ignore
  }
}
