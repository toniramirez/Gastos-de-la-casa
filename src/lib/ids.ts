// ==========================================================================
// Generación de IDs cortos y únicos (sin dependencias externas).
// ==========================================================================

import { randomUUID } from "crypto";

/** ID corto con prefijo, ej: exp_l3k2j9x1. */
export function makeId(prefix: string): string {
  const uuid = randomUUID().replace(/-/g, "");
  return `${prefix}_${uuid.slice(0, 12)}`;
}
