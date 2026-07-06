// ==========================================================================
// Selector del store. Usa Google Sheets si hay credenciales; si no, memoria.
// ==========================================================================

import { MemoryStore } from "./memory";
import { SheetsStore } from "./sheets";
import { sheetsConfigured } from "./sheets-client";
import type { Store } from "./types";

let instance: Store | null = null;

export function getStore(): Store {
  if (instance) return instance;
  instance = sheetsConfigured() ? new SheetsStore() : new MemoryStore();
  return instance;
}

/** True si estamos usando el fallback en memoria (para avisar en la UI). */
export function isUsingMemoryStore(): boolean {
  return !sheetsConfigured();
}

export type { Store } from "./types";
