// ==========================================================================
// Tipos centrales del dominio.
// ==========================================================================

/** Id de una persona. Los dos originales son "tony" y "sol" (por eso siguen
 *  leyéndose las filas viejas de la hoja); las que se agregan después llevan
 *  un id generado tipo "psn_ab12cd34ef56". */
export type PersonId = string;

/** Una persona de la casa. La lista vive en Configuración: se pueden agregar,
 *  renombrar y desactivar. Desactivar no borra nada del historial: la persona
 *  deja de aparecer en los formularios pero sus gastos viejos siguen contando. */
export interface Person {
  id: PersonId;
  name: string;
  /** Acento de color en la UI. Ver PERSON_COLORS en lib/people.ts. */
  color: string;
  active: boolean;
}

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

/** Formas de dividir un gasto entre las personas activas.
 *  - equal:   partes iguales entre todas
 *  - single:  se lo come una sola (la que tenga el total en `shares`)
 *  - percent: un porcentaje por persona
 *  - custom:  un monto por persona */
export type SplitType = "equal" | "single" | "percent" | "custom";

/** Valores viejos de split_type (cuando la app era de dos personas fijas). */
const LEGACY_SPLIT_TYPES: Record<string, SplitType> = {
  "50_50": "equal",
  "100_tony": "single",
  "100_sol": "single",
};

/** Normaliza un split_type leído de la hoja (acepta los valores viejos). */
export function parseSplitType(raw: string | undefined): SplitType {
  if (!raw) return "equal";
  if (raw === "equal" || raw === "single" || raw === "percent" || raw === "custom") return raw;
  return LEGACY_SPLIT_TYPES[raw] ?? "equal";
}

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

/** Cuánto le corresponde pagar a cada persona. Las claves son ids de persona
 *  y los valores enteros que suman `total`. */
export type Shares = Record<PersonId, number>;

export interface Expense {
  id: string;
  period_id: string;
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string;
  category: Category;
  group: ExpenseGroup; // día a día / tarjeta / fijos
  total: number; // ARS, entero
  paid_by: PersonId;
  split_type: SplitType;
  /** Parte de cada persona. Suma `total`. */
  shares: Shares;
  created_by: PersonId | "";
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

/** préstamo: alguien le presta plata a otra persona.
 *  devolucion: alguien le devuelve plata a otra persona. */
export type LoanType = "prestamo" | "devolucion";

export interface Loan {
  id: string;
  period_id: string;
  date: string; // YYYY-MM-DD
  type: LoanType;
  from_person: PersonId; // de quién sale la plata
  to_person: PersonId; // a quién le llega
  amount: number; // ARS, entero
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: string;
  period_id: string;
  date: string; // YYYY-MM-DD
  from_person: PersonId; // quién paga para saldar
  to_person: PersonId; // quién recibe
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
  /** Las personas de la casa, en el orden en que se muestran. */
  people: Person[];
}

// --- Cuentas -----------------------------------------------------------------

/** Cuenta invitada. Tiene sus propios gastos, préstamos, períodos y personas.
 *  La cuenta principal no se guarda acá: entra con APP_PIN. */
export interface Account {
  id: string;
  name: string;
  password_hash: string;
  invite_id: string;
  created_at: string;
}

/** Link de invitación generado desde la cuenta principal. El id es el token
 *  del link. Sirve una sola vez y vence. */
export interface Invite {
  id: string;
  created_at: string;
  expires_at: string;
  used_at: string; // vacío si todavía no se usó
  account_id: string; // cuenta creada con esta invitación
}

// --- Resultado del cálculo de balance ---------------------------------------

/** Una transferencia para saldar: `from` le pasa `amount` a `to`. */
export interface Transfer {
  from: PersonId;
  to: PersonId;
  amount: number;
}

/** Balance entre todas las personas.
 *
 *  `nets` es el neto de cada una: positivo = puso más de lo que le tocaba
 *  (le deben), negativo = puso menos (debe). La suma de todos los netos es 0.
 *  `transfers` son los pagos mínimos para volver a cero. */
export interface Balance {
  nets: Record<PersonId, number>;
  transfers: Transfer[];
  /** True si nadie le debe nada a nadie. */
  even: boolean;
  /** Plata total que tiene que cambiar de manos (suma de las transferencias). */
  amount: number;
}

/** Cuánto puso y cuánto le correspondía a una persona. */
export interface PersonTotals {
  person: PersonId;
  /** Plata que puso de su bolsillo. */
  pagado: number;
  /** Plata que le correspondía poner según la división. */
  corresponde: number;
}

/** Números de un grupo de gastos (día a día / tarjeta / fijos) por separado. */
export interface GroupSummary {
  group: ExpenseGroup;
  label: string;
  totalGastado: number;
  porPersona: PersonTotals[];
  /** Quién le debe a quién solo dentro de este grupo. */
  balance: Balance;
  cantidad: number;
}

export interface PeriodSummary {
  period: Period | null;
  totalGastado: number;
  /** Pagado y correspondido por persona, en el orden de la lista de personas. */
  porPersona: PersonTotals[];
  /** Desglose por grupo: día a día, tarjeta, fijos. */
  groups: GroupSummary[];
  /** Balance combinado de todos los gastos del período. Es lo que se salda al
   *  cerrar: quién le tiene que pasar cuánto a quién. */
  gastosBalance: Balance;
  /** Deuda de préstamos acumulada (se arrastra entre períodos, no se cierra). */
  prestamosBalance: Balance;
  cantidadGastos: number;
  cantidadPrestamos: number;
}
