/**
 * Two-tier cache: in-memory Map + IndexedDB.
 *
 * - Memory is checked first (fastest).
 * - Falls back to IndexedDB for persistence across page reloads.
 * - Both tiers share the same TTL and key format.
 * - Auto-cleanup runs every 5 minutes to evict expired entries.
 */

const DB_NAME = "moonsway-cache";
const DB_VERSION = 1;
const STORE_NAME = "responses";

const DEFAULT_TTL_MS = 1000 * 60 * 30; // 30 minutes
const MAX_MEMORY_ENTRIES = 200;
const CLEANUP_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes

interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
}

function buildKey(type: string, params: string): string {
  return `${type}:${params}`;
}

class CacheManager {
  private memory = new Map<string, CacheEntry>();
  private dbPromise: Promise<IDBDatabase> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private ttl: number;

  constructor(ttl = DEFAULT_TTL_MS) {
    this.ttl = ttl;
    this.startCleanup();
  }

  // -- Public API --

  async get<T = unknown>(type: string, params: string): Promise<T | null> {
    const key = buildKey(type, params);
    const now = Date.now();

    // Tier 1: memory
    const memEntry = this.memory.get(key);
    if (memEntry && now - memEntry.timestamp < this.ttl) {
      return memEntry.data as T;
    }

    // Stale memory entry -- remove it
    if (memEntry) {
      this.memory.delete(key);
    }

    // Tier 2: IndexedDB
    const dbEntry = await this.getFromDB(key);
    if (dbEntry && now - dbEntry.timestamp < this.ttl) {
      // Re-populate memory
      this.setMemory(key, dbEntry);
      return dbEntry.data as T;
    }

    // Stale DB entry -- remove it
    if (dbEntry) {
      this.deleteFromDB(key);
    }

    return null;
  }

  async set(type: string, params: string, data: unknown): Promise<void> {
    const key = buildKey(type, params);
    const entry: CacheEntry = { key, data, timestamp: Date.now() };

    this.setMemory(key, entry);
    await this.setInDB(entry);
  }

  async clear(): Promise<void> {
    this.memory.clear();

    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearExpired(): Promise<void> {
    const now = Date.now();
    const cutoff = now - this.ttl;

    // Memory cleanup
    for (const [key, entry] of this.memory) {
      if (entry.timestamp < cutoff) {
        this.memory.delete(key);
      }
    }

    // IndexedDB cleanup
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.memory.clear();
  }

  // -- Private helpers --

  private setMemory(key: string, entry: CacheEntry): void {
    // FIFO eviction when at capacity
    if (this.memory.size >= MAX_MEMORY_ENTRIES && !this.memory.has(key)) {
      const oldest = this.memory.keys().next().value;
      if (oldest !== undefined) {
        this.memory.delete(oldest);
      }
    }
    this.memory.set(key, entry);
  }

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async getFromDB(key: string): Promise<CacheEntry | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  private async setInDB(entry: CacheEntry): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // IndexedDB write failures are non-critical
    }
  }

  private async deleteFromDB(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Non-critical
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.clearExpired().catch((err) => {
        console.warn("[Moonsway] Cache cleanup failed:", err);
      });
    }, CLEANUP_INTERVAL_MS);
  }
}

/** Singleton cache instance for the entire app. */
export const cache = new CacheManager();
