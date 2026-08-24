/**
 * IndexedDB offline queue manager for mutations made while offline.
 * Setiap mutasi POST /api/transactions otomatis diberi Idempotency-Key agar
 * replay yang terjadi setelah kehilangan respons tidak mencatat dua kali.
 */

const DB_NAME = 'KasKeluargaOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'mutation_queue';
const MAX_ATTEMPTS = 5;

export interface OfflineMutation {
  id: string;
  userId: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: unknown;
  /** UUID v4 untuk deduplikasi di server pada endpoint transaksi. */
  idempotencyKey?: string;
  /** Jumlah percobaan kirim yang sudah dilakukan. */
  attempts?: number;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>();
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
  return promise;
}

function putItem(db: IDBDatabase, item: OfflineMutation): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(item);
  tx.oncomplete = () => {
    db.close();
    resolve();
  };
  tx.onerror = () => {
    db.close();
    reject(tx.error);
  };
  return promise;
}

function deleteItem(db: IDBDatabase, id: string): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  tx.oncomplete = () => {
    db.close();
    resolve();
  };
  tx.onerror = () => {
    db.close();
    reject(tx.error);
  };
  return promise;
}

/**
 * Add a pending mutation to the offline queue.
 */
export async function enqueueOfflineMutation(
  mutation: Omit<OfflineMutation, 'id' | 'createdAt' | 'attempts'> & { id?: string; attempts?: number }
): Promise<string> {
  const db = await openDB();
  const id = mutation.id ?? `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const item: OfflineMutation = {
    ...mutation,
    idempotencyKey:
      mutation.idempotencyKey ??
      (mutation.method === 'POST' && mutation.endpoint === '/api/transactions'
        ? crypto.randomUUID()
        : undefined),
    attempts: mutation.attempts ?? 0,
    id,
    createdAt: Date.now(),
  };

  await putItem(db, item);
  return id;
}

/**
 * Get all queued mutations for a specific user, oldest first.
 */
export async function getOfflineMutations(userId: string): Promise<OfflineMutation[]> {
  const db = await openDB();
  const { promise, resolve, reject } = Promise.withResolvers<OfflineMutation[]>();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).getAll();
  req.onsuccess = () => {
    db.close();
    const items = (req.result as OfflineMutation[]).filter((m) => m.userId === userId);
    items.sort((a, b) => a.createdAt - b.createdAt);
    resolve(items);
  };
  req.onerror = () => {
    db.close();
    reject(req.error);
  };
  return promise;
}

/**
 * Remove a processed mutation from the queue.
 */
export async function removeOfflineMutation(id: string): Promise<void> {
  const db = await openDB();
  await deleteItem(db, id);
}

/** Hapus seluruh antrean milik satu user (dipakai saat logout). */
export async function clearOfflineQueue(userId: string): Promise<void> {
  const items = await getOfflineMutations(userId);
  for (const item of items) {
    await removeOfflineMutation(item.id);
  }
}

/**
 * Cat satu percobaan gagal: naikkan attempts, buang bila melewati batas retry.
 */
async function persistAttempt(item: OfflineMutation): Promise<OfflineMutation | null> {
  const attempts = (item.attempts ?? 0) + 1;
  await removeOfflineMutation(item.id);
  if (attempts >= MAX_ATTEMPTS) return null;
  const next: OfflineMutation = { ...item, attempts };
  const db = await openDB();
  await putItem(db, next);
  return next;
}

let drainInFlight = false;

export interface DrainResult {
  synced: number;
  failed: number;
  /** Item melewati batas retry dan dibuang dari antrean. */
  dead: number;
}

/**
 * Drain and sync the offline queue by sending all pending mutations to the server.
 * Hanya satu drain yang boleh berjalan; sukses berarti HTTP OK DAN body.success true.
 */
export async function drainOfflineQueue(
  userId: string,
  onSuccessCallback?: () => void
): Promise<DrainResult> {
  if (drainInFlight) return { synced: 0, failed: 0, dead: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0, dead: 0 };
  }
  drainInFlight = true;

  try {
    const items = await getOfflineMutations(userId);
    if (items.length === 0) return { synced: 0, failed: 0, dead: 0 };

    let synced = 0;
    let failed = 0;
    let dead = 0;

    for (const item of items) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (item.idempotencyKey) headers['Idempotency-Key'] = item.idempotencyKey;

        const res = await fetch(item.endpoint, {
          method: item.method,
          headers,
          body: JSON.stringify(item.payload),
        });

        let bodySuccess = false;
        try {
          const json = await res.json();
          bodySuccess = Boolean(json?.success);
        } catch {
          // respons non-JSON dianggap gagal
        }

        if (res.ok && bodySuccess) {
          await removeOfflineMutation(item.id);
          synced++;
        } else {
          const survived = await persistAttempt(item);
          if (survived) failed++;
          else dead++;
        }
      } catch {
        const survived = await persistAttempt(item);
        if (survived) failed++;
        else dead++;
      }
    }

    if (synced > 0 && onSuccessCallback) {
      onSuccessCallback();
    }

    return { synced, failed, dead };
  } finally {
    drainInFlight = false;
  }
}
