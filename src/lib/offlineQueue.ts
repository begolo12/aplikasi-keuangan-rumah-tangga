/**
 * IndexedDB offline queue manager for mutations made while offline.
 */

const DB_NAME = 'KasKeluargaOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'mutation_queue';

export interface OfflineMutation {
  id: string;
  userId: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a pending mutation to the offline queue.
 */
export async function enqueueOfflineMutation(mutation: Omit<OfflineMutation, 'id' | 'createdAt'>): Promise<string> {
  const db = await openDB();
  const id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const item: OfflineMutation = {
    ...mutation,
    id,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all queued mutations for a specific user.
 */
export async function getOfflineMutations(userId: string): Promise<OfflineMutation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('userId');
      const req = index.getAll(userId);
      req.onsuccess = () => {
        const items = (req.result as OfflineMutation[]).sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Remove a processed mutation from the queue.
 */
export async function removeOfflineMutation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Drain and sync the offline queue by sending all pending mutations to the server.
 */
export async function drainOfflineQueue(userId: string, onSuccessCallback?: () => void): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const items = await getOfflineMutations(userId);
  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        await removeOfflineMutation(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  if (synced > 0 && onSuccessCallback) {
    onSuccessCallback();
  }

  return { synced, failed };
}
