// ==========================================================================
// Formas de respuesta compartidas entre API routes y frontend.
// ==========================================================================

import type { PeriodSummary, Settings, Transfer } from "./types";

export interface SummaryResponse {
  settings: Settings;
  summary: PeriodSummary;
  /** Pagos que hacen falta para saldar los gastos del período (puede estar
   *  vacío si están en cero). Con más de dos personas puede haber varios. */
  transfers: Transfer[];
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
