import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const DEFAULT_TTL = 14400; // 4 hours in seconds

interface CacheItem<T> {
  value: T;
  expiry: number; // millisecond timestamp
}

/**
 * Generates a clean hash of the query to use as the cache filename
 */
function getCacheFilePath(query: string): string {
  const normalized = query.trim().toLowerCase();
  const hash = crypto.createHash("sha256").update(normalized).digest("hex");
  return path.join(CACHE_DIR, `${hash}.json`);
}

export const fileCache = {
  /**
   * Retrieves a value from the file cache if it exists and hasn't expired.
   */
  async get<T>(query: string): Promise<T | null> {
    try {
      const filePath = getCacheFilePath(query);
      const data = await fs.readFile(filePath, "utf-8");
      const item: CacheItem<T> = JSON.parse(data);

      if (Date.now() > item.expiry) {
        // Expired cache, delete in background
        fs.unlink(filePath).catch(() => {});
        return null;
      }

      return item.value;
    } catch {
      // File doesn't exist or is corrupted
      return null;
    }
  },

  /**
   * Saves a value to the file cache with the specified TTL (in seconds).
   */
  async set<T>(query: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.mkdir(CACHE_DIR, { recursive: true });

      const filePath = getCacheFilePath(query);
      const item: CacheItem<T> = {
        value,
        expiry: Date.now() + ttlSeconds * 1000,
      };

      await fs.writeFile(filePath, JSON.stringify(item), "utf-8");
    } catch (error) {
      console.error("[FileCache] Failed to write cache:", error);
    }
  },

  /**
   * Cleans up expired cache files manually if needed
   */
  async cleanExpired(): Promise<void> {
    try {
      const files = await fs.readdir(CACHE_DIR);
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(CACHE_DIR, file);
        try {
          const data = await fs.readFile(filePath, "utf-8");
          const item: CacheItem<unknown> = JSON.parse(data);
          if (now > item.expiry) {
            await fs.unlink(filePath);
          }
        } catch {
          // If unparseable or error, delete it
          await fs.unlink(filePath).catch(() => {});
        }
      }
    } catch {
      // Cache directory might not exist yet
    }
  },
};
