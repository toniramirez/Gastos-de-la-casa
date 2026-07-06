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

export interface PeriodSummary {
  period: Period | null;
  totalGastado: number;
  totalPagadoTony: number;
  totalPagadoSol: number;
  correspondeTony: number;
  correspondeSol: number;
  /** Efecto neto de los préstamos sobre el balance (positivo hacia Tony). */
  prestamosNetos: number;
  balance: Balance;
  cantidadGastos: number;
  cantidadPrestamos: number;
}
