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

export interface SettingsResponse {
  settings: Settings;
  usingMemory?: boolean;
}
