// ==========================================================================
// Helpers de formato. Pesos argentinos, sin decimales si no hace falta.
// ==========================================================================

/** Formatea un monto en ARS con separador de miles: 12000 -> "$ 12.000". */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const formatted = abs.toLocaleString("es-AR", { maximumFractionDigits: 0 });
  return `${rounded < 0 ? "-" : ""}$ ${formatted}`;
}

/** Igual que formatMoney pero sin el signo $ (para inputs). */
export function formatNumber(amount: number): string {
  return Math.round(amount).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

/** Parsea un texto tipeado por el usuario ("$ 12.000", "12000", "12.000,50") a número. */
export function parseMoney(input: string): number {
  if (!input) return 0;
  // Sacamos todo lo que no sea dígito, coma, punto o signo.
  let clean = input.replace(/[^\d.,-]/g, "").trim();
  // Formato es-AR: punto = miles, coma = decimal. Sacamos puntos, coma -> punto.
  clean = clean.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

/** Fecha de hoy en formato YYYY-MM-DD (zona local). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formatea "2026-07-06" -> "6 jul 2026". */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]} ${y}`;
}

/** ISO timestamp actual. */
export function nowISO(): string {
  return new Date().toISOString();
}
