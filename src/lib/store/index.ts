// ==========================================================================
// Selector del store. Usa Google Sheets si hay credenciales; si no, memoria.
// Cada cuenta tiene su propio Store (sus datos están separados).
// ==========================================================================

import { MemoryAccountStore, SheetsAccountStore, type AccountStore } from "./accounts";
import { MemoryStore } from "./memory";
import { SheetsStore } from "./sheets";
import { sheetsConfigured } from "./sheets-client";
import type { Store } from "./types";

const instances = new Map<string, Store>();
let accountStore: AccountStore | null = null;

/** Store con los datos de una cuenta. Usar `requireStore()` en las API routes
 *  para sacar la cuenta de la sesión. */
export function getStore(accountId: string): Store {
  let store = instances.get(accountId);
  if (!store) {
    store = sheetsConfigured() ? new SheetsStore(accountId) : new MemoryStore(accountId);
    instances.set(accountId, store);
  }
  return store;
}

export function getAccountStore(): AccountStore {
  if (!accountStore) {
    accountStore = sheetsConfigured() ? new SheetsAccountStore() : new MemoryAccountStore();
  }
  return accountStore;
}

/** True si estamos usando el fallback en memoria (para avisar en la UI). */
export function isUsingMemoryStore(): boolean {
  return !sheetsConfigured();
}

export type { Store } from "./types";
export type { AccountStore } from "./accounts";
