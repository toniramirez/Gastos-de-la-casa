// ==========================================================================
// Formas de respuesta compartidas entre API routes y frontend.
// ==========================================================================

import type { PeriodSummary, Person, Settings } from "./types";

export interface SummaryResponse {
  settings: Settings;
  summary: PeriodSummary;
  settlement: { from: Person; to: Person; amount: number } | null;
  usingMemory: boolean;
}

/** Cuenta con sesión iniciada (GET /api/me). */
export interface MeResponse {
  accountId: string;
  name: string;
  isMain: boolean;
}

/** Cuenta invitada tal como la ve la principal (sin contraseña). */
export interface AccountInfo {
  id: string;
  name: string;
  created_at: string;
}

export interface SettingsResponse {
  settings: Settings;
  usingMemory?: boolean;
}
