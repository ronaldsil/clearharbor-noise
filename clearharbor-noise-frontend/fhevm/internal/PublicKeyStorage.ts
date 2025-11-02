import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface FhevmDB extends DBSchema {
  publicKeys: {
    key: string;
    value: {
      publicKey: string;
      publicParams: string;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FhevmDB>> | null = null;

function getDB(): Promise<IDBPDatabase<FhevmDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FhevmDB>("fhevm-storage", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("publicKeys")) {
          db.createObjectStore("publicKeys");
        }
      },
    });
  }
  return dbPromise;
}

export async function publicKeyStorageSet(
  aclAddress: string,
  publicKey: string,
  publicParams: string
): Promise<void> {
  const db = await getDB();
  await db.put("publicKeys", {
    publicKey,
    publicParams,
    timestamp: Date.now(),
  }, aclAddress);
}

export async function publicKeyStorageGet(
  aclAddress: string
): Promise<{ publicKey: string; publicParams: string }> {
  const db = await getDB();
  const stored = await db.get("publicKeys", aclAddress);
  
  if (stored) {
    return {
      publicKey: stored.publicKey,
      publicParams: stored.publicParams,
    };
  }
  
  // Return empty strings if not found (will be fetched from network)
  return {
    publicKey: "",
    publicParams: "",
  };
}

