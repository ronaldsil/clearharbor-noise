/**
 * Generic key-value storage interface
 */
export interface GenericStringStorage {
  getItem(key: string): string | Promise<string | null> | null;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * In-memory implementation of GenericStringStorage
 */
export class GenericStringInMemoryStorage implements GenericStringStorage {
  #store = new Map<string, string>();

  getItem(key: string): string | Promise<string | null> | null {
    return this.#store.has(key) ? this.#store.get(key)! : null;
  }
  setItem(key: string, value: string): void | Promise<void> {
    this.#store.set(key, value);
  }
  removeItem(key: string): void | Promise<void> {
    this.#store.delete(key);
  }
}

/**
 * LocalStorage-based implementation
 */
export class GenericStringLocalStorage implements GenericStringStorage {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  }
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  }
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  }
}

// Global singleton for decryption signature storage
let decryptionSignatureStorage: GenericStringStorage | null = null;

export function getDecryptionSignatureStorage(): GenericStringStorage {
  if (!decryptionSignatureStorage) {
    decryptionSignatureStorage = new GenericStringLocalStorage();
  }
  return decryptionSignatureStorage;
}

/**
 * Generic storage helpers for wallet persistence
 */
export function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

export function storageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

export function storageRemove(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

// Wallet persistence keys
export const WALLET_KEYS = {
  lastConnectorId: "wallet.lastConnectorId",
  lastAccounts: "wallet.lastAccounts",
  lastChainId: "wallet.lastChainId",
  connected: "wallet.connected",
} as const;

