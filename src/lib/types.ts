// ==========================================================================
// Tipos centrales del dominio.
// ==========================================================================

/** Las dos personas de la casa. Internamente se identifican como A/B; los
 *  nombres visibles (Tony / Sol) son editables desde Configuración. */
export type Person = "tony" | "sol";

export const PEOPLE: Person[] = ["tony", "sol"];

/** Categorías sugeridas para los gastos. */
export const CATEGORIES = [
  "Supermercado",
  "Comida",
  "Limpieza",
  "Farmacia",
  "Servicios",
  "Alquiler",
  "Mascotas",
  "Transporte",
  "Arreglos casa",
  "Otros",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Formas de dividir un gasto entre los dos. */
export type SplitType =
  | "50_50"
  | "100_tony"
  | "100_sol"
  | "percent"
  | "custom";

/** Origen de un gasto: cargado a mano o leído de un ticket. */
export type ExpenseSource = "manual" | "ticket";

/** Grupo/cuenta al que pertenece un gasto. Sirve para hacer los números por
 *  partes: primero el día a día, después la tarjeta y los fijos. */
export type ExpenseGroup = "dia_a_dia" | "tarjeta" | "fijos";

export const EXPENSE_GROUPS: { value: ExpenseGroup; label: string }[] = [
  { value: "dia_a_dia", label: "Día a día" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "fijos", label: "Fijos" },
];

export function groupLabel(group: ExpenseGroup): string {
  return EXPENSE_GROUPS.find((g) => g.value === group)?.label ?? group;
}

export type PeriodStatus = "open" | "closed";

export interface Period {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD cuando se cierra
  status: PeriodStatus;
  created_at: string;
}

export interface Expense {
  id: string;
  period_id: string;
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string;
  category: Category;
  group: ExpenseGroup; // día a día / tarjeta / fijos
  total: number; // ARS, entero
  paid_by: Person;
  split_type: SplitType;
  share_tony: number; // cuánto le corresponde pagar a Tony
  share_sol: number; // cuánto le corresponde pagar a Sol
  created_by: Person | "";
  source: ExpenseSource;
  notes: string;
  ticket_image_url: string; // reservado para el futuro; hoy queda vacío
  created_at: string;
  updated_at: string;
}

/** Ticket sacado en "modo rápido": solo la foto guardada para confirmar
 *  más tarde. No es un gasto todavía; al confirmarlo se crea el gasto y
 *  este pendiente se borra. La imagen viaja como data URL (comprimida para
 *  entrar en una celda de Google Sheets). */
export interface PendingTicket {
  id: string;
  period_id: string;
  note: string;
  image: string; // data URL base64 (comprimida)
  created_at: string;
}

/** préstamo: alguien le presta plata al otro.
 *  devolucion: alguien le devuelve plata al otro. */
export type LoanType = "prestamo" | "devolucion";

export interface Loan {
  id: string;
  period_id: string;
  date: string; // YYYY-MM-DD
  type: LoanType;
  from_person: Person; // de quién sale la plata
  to_person: Person; // a quién le llega
  amount: number; // ARS, entero
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: string;
  period_id: string;
  date: string; // YYYY-MM-DD
  from_person: Person; // quién paga para saldar
  to_person: Person; // quién recibe
  amount: number;
  notes: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  date: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
}

export interface Settings {
  name_tony: string;
  name_sol: string;
}

// --- Resultado del cálculo de balance ---------------------------------------

/** Signo de la deuda. `balance` está expresado como "cuánto le debe Sol a Tony".
 *  Positivo => Sol le debe a Tony. Negativo => Tony le debe a Sol. */
export interface Balance {
  /** Cuánto le debe Sol a Tony (positivo) o Tony a Sol (negativo). */
  net: number;
  /** Quién debe: "tony" (Tony debe), "sol" (Sol debe) o "even". */
  debtor: Person | "even";
  /** Quién cobra. Vacío si están en cero. */
  creditor: Person | "even";
  /** Monto absoluto de la deuda. */
  amount: number;
}

/** Números de un grupo de gastos (día a día / tarjeta / fijos) por separado. */
export interface GroupSummary {
  group: ExpenseGroup;
  label: string;
  totalGastado: number;
  totalPagadoTony: number;
  totalPagadoSol: number;
  /** Quién le debe a quién solo dentro de este grupo. */
  balance: Balance;
  cantidad: number;
}

export interface PeriodSummary {
  period: Period | null;
  totalGastado: number;
  totalPagadoTony: number;
  totalPagadoSol: number;
  correspondeTony: number;
  correspondeSol: number;
  /** Desglose por grupo: día a día, tarjeta, fijos. */
  groups: GroupSummary[];
  /** Balance combinado de todos los gastos del período. Es el total que se
   *  salda al cerrar: cuánto le tiene que dar uno al otro. */
  gastosBalance: Balance;
  /** Deuda de préstamos acumulada (se arrastra entre períodos, no se cierra). */
  prestamosBalance: Balance;
  cantidadGastos: number;
  cantidadPrestamos: number;
}
