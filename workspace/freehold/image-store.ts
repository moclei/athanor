/**
 * IndexedDB-backed blob store for Freehold capture images.
 *
 * Keyed by captureId. Used by the service worker (on capture) and by the
 * gallery page (for display, export, migration). IndexedDB is per-origin,
 * so both contexts share a single database on the extension origin.
 *
 * Metadata stays in Crann state — this module only stores image bytes.
 */

const DB_NAME = 'freehold-images';
const DB_VERSION = 1;
const STORE_NAME = 'captures';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDb().then((db) => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(captureId: string, blob: Blob): Promise<void> {
  const store = await tx('readwrite');
  await wrap(store.put(blob, captureId));
}

export async function get(captureId: string): Promise<Blob | null> {
  const store = await tx('readonly');
  const result = await wrap(store.get(captureId));
  return (result as Blob | undefined) ?? null;
}

export async function has(captureId: string): Promise<boolean> {
  const store = await tx('readonly');
  const result = await wrap(store.count(captureId));
  return result > 0;
}

export async function remove(captureId: string): Promise<void> {
  const store = await tx('readwrite');
  await wrap(store.delete(captureId));
}

export async function removeMany(captureIds: string[]): Promise<void> {
  if (captureIds.length === 0) return;
  const store = await tx('readwrite');
  await Promise.all(captureIds.map((id) => wrap(store.delete(id))));
}

export async function listIds(): Promise<string[]> {
  const store = await tx('readonly');
  const keys = await wrap(store.getAllKeys());
  return keys as string[];
}
