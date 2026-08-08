/**
 * mockPersistence.ts — Client-side localStorage persistence layer.
 *
 * NOTE: This is a temporary local-only persistence shim for development and
 * demo purposes. It will be replaced by real API/database calls when the
 * AWS backend is built.
 */

export const mockStorage = {
  /**
   * Retrieves an item from localStorage and parses it.
   * Returns fallback if the key is not present or an error occurs.
   */
  getItem<T>(key: string, fallback: T): T {
    try {
      const data = window.localStorage.getItem(key);
      if (data === null) {
        return fallback;
      }
      return JSON.parse(data) as T;
    } catch (e) {
      console.warn(`[MockPersistence] Failed to read key "${key}" from localStorage:`, e);
      return fallback;
    }
  },

  /**
   * Serializes and writes an item to localStorage.
   * Fails gracefully without crashing if quota is exceeded or storage is unavailable.
   */
  setItem<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[MockPersistence] Failed to write key "${key}" to localStorage:`, e);
    }
  },

  /**
   * Removes an item from localStorage.
   */
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.error(`[MockPersistence] Failed to remove key "${key}" from localStorage:`, e);
    }
  },

  /**
   * Clears the persistence layer keys.
   */
  clear(): void {
    try {
      window.localStorage.clear();
    } catch (e) {
      console.error("[MockPersistence] Failed to clear localStorage:", e);
    }
  },
};
