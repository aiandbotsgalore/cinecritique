/**
 * IndexedDB Cache Service
 * Provides persistent browser caching for video analyses
 */

import { CritiqueAnalysis } from '../types';

interface CacheEntry {
  key: string;
  value: CritiqueAnalysis;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  videoHash: string;
  videoSize: number;
}

class IndexedDBCache {
  private dbName = 'CineCritiqueCache';
  private storeName = 'analyses';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'key' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('videoHash', 'videoHash', { unique: false });
        }
      };
    });
  }

  /**
   * Generate cache key from video file
   */
  async generateKey(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `video:${hashHex}`;
  }

  /**
   * Get cached analysis
   */
  async get(key: string): Promise<CritiqueAnalysis | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check if expired
        const now = Date.now();
        if (entry.ttl > 0 && now - entry.timestamp > entry.ttl) {
          // Expired, delete and return null
          this.delete(key);
          resolve(null);
          return;
        }

        console.log(`[Cache] Hit for ${key.substring(0, 16)}...`);
        resolve(entry.value);
      };
    });
  }

  /**
   * Set cache entry
   */
  async set(
    key: string,
    value: CritiqueAnalysis,
    videoHash: string,
    videoSize: number,
    ttl: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const entry: CacheEntry = {
        key,
        value,
        timestamp: Date.now(),
        ttl,
        videoHash,
        videoSize
      };

      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[Cache] Stored ${key.substring(0, 16)}...`);
        resolve();
      };
    });
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[Cache] Cleared all entries');
        resolve();
      };
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    entries: number;
    totalSize: number;
    oldestEntry: number | null;
  }> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const totalSize = entries.reduce((sum, entry) => sum + entry.videoSize, 0);
        const oldestEntry = entries.length > 0
          ? Math.min(...entries.map(e => e.timestamp))
          : null;

        resolve({
          entries: entries.length,
          totalSize,
          oldestEntry
        });
      };
    });
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const now = Date.now();
        let deletedCount = 0;

        entries.forEach(entry => {
          if (entry.ttl > 0 && now - entry.timestamp > entry.ttl) {
            objectStore.delete(entry.key);
            deletedCount++;
          }
        });

        console.log(`[Cache] Cleaned ${deletedCount} expired entries`);
        resolve(deletedCount);
      };
    });
  }
}

// Singleton instance
export const cacheService = new IndexedDBCache();
