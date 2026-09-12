// ==========================================================================
// Lógica central de balance. Funciones puras y testeables.
//
// Convención: el balance se expresa como un NETO POR PERSONA.
//   net > 0  => puso más de lo que le tocaba  => le deben
//   net < 0  => puso menos de lo que le tocaba => debe
//   La suma de todos los netos es 0.
//
// Un gasto le suma a quien lo pagó todo el total (puso esa plata) y le resta
// a cada persona su parte. Un movimiento de plata de X a Y (préstamo o
// devolución) le suma a X y le resta a Y: el efecto sobre el balance de
// cualquier movimiento es simplemente el flujo de la plata.
//
// Para saldar, `settleTransfers` arma los pagos mínimos (a lo sumo una
// transferencia menos que la cantidad de personas): se van cruzando el que
// más debe con el que más le deben.
//
// IMPORTANTE — dos cuentas separadas:
//   1. Balance de GASTOS: solo los gastos del período. Es lo que se salda al
//      cerrar (se pasan la plata y quedan en cero). Se resetea cada cierre.
//   2. Deuda de PRÉSTAMOS: la plata que alguien prestó y todavía no le
//      devolvieron. NO entra en el cierre: se arrastra entre períodos hasta
//      que aparezca una devolución. Por eso se calcula sobre TODOS los
//      préstamos, no solo los del período actual.
// ==========================================================================

import {
  EXPENSE_GROUPS,
  type Balance,
  type Expense,
  type GroupSummary,
  type Loan,
  type Period,
  type PeriodSummary,
  type Person,
  type PersonId,
  type PersonTotals,
  type Shares,
  type SplitType,
  type Transfer,
} from "./types";

/** Suma de las partes de un gasto. */
export function sumShares(shares: Shares): number {
  let total = 0;
  for (const v of Object.values(shares)) total += v;
  return total;
}

// --- Netos ------------------------------------------------------------------

/** Todos los ids que tienen que aparecer en un balance: las personas de la
 *  casa más cualquier id que aparezca en los datos (por ejemplo alguien que
 *  se sacó de la lista pero tiene gastos viejos). */
function idsInvolved(people: Person[], extra: Iterable<PersonId>): PersonId[] {
  const ids = people.map((p) => p.id);
  const seen = new Set(ids);
  for (const id of extra) {
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function emptyNets(ids: PersonId[]): Record<PersonId, number> {
  const nets: Record<PersonId, number> = {};
  for (const id of ids) nets[id] = 0;
  return nets;
}

/** Ids que aparecen en una lista de gastos (quién pagó y quién tiene parte). */
function expenseIds(expenses: Expense[]): PersonId[] {
  const ids: PersonId[] = [];
  for (const e of expenses) {
    ids.push(e.paid_by);
    ids.push(...Object.keys(e.shares ?? {}));
  }
  return ids;
}

/** Ids que aparecen en una lista de préstamos. */
function loanIds(loans: Loan[]): PersonId[] {
  const ids: PersonId[] = [];
  for (const l of loans) ids.push(l.from_person, l.to_person);
  return ids;
}

/** Neto de cada persona según los gastos (positivo = le deben). */
export function netsFromExpenses(expenses: Expense[], people: Person[]): Record<PersonId, number> {
  const nets = emptyNets(idsInvolved(people, expenseIds(expenses)));
  for (const e of expenses) {
    // Quien pagó puso el total de su bolsillo. (Si la fila no dice quién pagó
    // —dato roto en la hoja— el gasto solo resta las partes.)
    if (e.paid_by) nets[e.paid_by] = (nets[e.paid_by] ?? 0) + e.total;
    // A cada uno le corresponde su parte.
    for (const [id, share] of Object.entries(e.shares ?? {})) {
      nets[id] = (nets[id] ?? 0) - share;
    }
  }
  return roundNets(nets);
}

/** Neto de cada persona según los préstamos y devoluciones. */
export function netsFromLoans(loans: Loan[], people: Person[]): Record<PersonId, number> {
  const nets = emptyNets(idsInvolved(people, loanIds(loans)));
  for (const l of loans) {
    if (!l.from_person || !l.to_person) continue;
    // La plata sale de `from` y llega a `to`: `to` le queda debiendo a `from`.
    nets[l.from_person] = (nets[l.from_person] ?? 0) + l.amount;
    nets[l.to_person] = (nets[l.to_person] ?? 0) - l.amount;
  }
  return roundNets(nets);
}

function roundNets(nets: Record<PersonId, number>): Record<PersonId, number> {
  const out: Record<PersonId, number> = {};
  for (const [id, v] of Object.entries(nets)) out[id] = Math.round(v);
  return out;
}

// --- Transferencias para saldar ---------------------------------------------

/**
 * Pagos mínimos para que todos queden en cero. Se cruza al que más debe con
 * el que más le deben, y así bajando. Con N personas salen como máximo N-1
 * transferencias.
 */
export function settleTransfers(nets: Record<PersonId, number>): Transfer[] {
  // Copias ordenadas por monto para cruzar los más grandes primero.
  const debtors = Object.entries(nets)
    .filter(([, v]) => Math.round(v) < 0)
    .map(([id, v]) => ({ id, amount: -Math.round(v) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(nets)
    .filter(([, v]) => Math.round(v) > 0)
    .map(([id, v]) => ({ id, amount: Math.round(v) }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transfers;
}

/** Arma el Balance completo a partir de los netos por persona. */
export function balanceFromNets(nets: Record<PersonId, number>): Balance {
  const rounded = roundNets(nets);
  const transfers = settleTransfers(rounded);
  const amount = transfers.reduce((acc, t) => acc + t.amount, 0);
  return { nets: rounded, transfers, even: transfers.length === 0, amount };
}

/**
 * Balance SOLO de los gastos de un período. Es lo que se salda al cerrar.
 */
export function computeExpenseBalance(expenses: Expense[], people: Person[]): Balance {
  return balanceFromNets(netsFromExpenses(expenses, people));
}

/**
 * Deuda de préstamos: cuánta plata prestada falta devolver. Se calcula sobre
 * TODOS los préstamos/devoluciones (de todos los períodos), porque se arrastra
 * entre períodos y no se salda al cerrar.
 */
export function computeLoanBalance(loans: Loan[], people: Person[]): Balance {
  return balanceFromNets(netsFromLoans(loans, people));
}

// --- Resumen ----------------------------------------------------------------

/** Cuánto puso y cuánto le correspondía a cada persona. */
function totalsPerPerson(expenses: Expense[], people: Person[]): PersonTotals[] {
  const ids = idsInvolved(people, expenseIds(expenses));
  const pagado = emptyNets(ids);
  const corresponde = emptyNets(ids);
  for (const e of expenses) {
    if (e.paid_by) pagado[e.paid_by] = (pagado[e.paid_by] ?? 0) + e.total;
    for (const [id, share] of Object.entries(e.shares ?? {})) {
      corresponde[id] = (corresponde[id] ?? 0) + share;
    }
  }
  return ids.map((id) => ({
    person: id,
    pagado: Math.round(pagado[id] ?? 0),
    corresponde: Math.round(corresponde[id] ?? 0),
  }));
}

/**
 * Resumen del período. `expenses` son los gastos del período; `loans` son
 * TODOS los préstamos/devoluciones (la deuda de préstamos se arrastra y no se
 * limita al período actual).
 */
export function computeSummary(
  period: Period | null,
  expenses: Expense[],
  loans: Loan[],
  people: Person[]
): PeriodSummary {
  let totalGastado = 0;
  for (const e of expenses) totalGastado += e.total;

  return {
    period,
    totalGastado,
    porPersona: totalsPerPerson(expenses, people),
    groups: groupSummaries(expenses, people),
    gastosBalance: computeExpenseBalance(expenses, people),
    prestamosBalance: computeLoanBalance(loans, people),
    cantidadGastos: expenses.length,
    cantidadPrestamos: loans.length,
  };
}

/** Arma el desglose por grupo (día a día / tarjeta / fijos). Los gastos sin
 *  grupo cuentan como "día a día". */
export function groupSummaries(expenses: Expense[], people: Person[]): GroupSummary[] {
  return EXPENSE_GROUPS.map(({ value, label }) => {
    const items = expenses.filter((e) => (e.group ?? "dia_a_dia") === value);
    let totalGastado = 0;
    for (const e of items) totalGastado += e.total;
    return {
      group: value,
      label,
      totalGastado,
      porPersona: totalsPerPerson(items, people),
      balance: computeExpenseBalance(items, people),
      cantidad: items.length,
    };
  });
}

// --- División de un gasto ---------------------------------------------------

export interface SplitOptions {
  /** Para split_type = "single": quién se come todo el gasto. */
  single?: PersonId;
  /** Para split_type = "percent": porcentaje de cada persona (suma 100). */
  percents?: Record<PersonId, number>;
  /** Para split_type = "custom": monto de cada persona (suma el total). */
  shares?: Record<PersonId, number>;
}

/**
 * Calcula la parte de cada persona según el tipo de división. Devuelve
 * enteros que siempre suman `total` (el resto del redondeo se reparte entre
 * las primeras personas de la lista).
 *
 * `people` son las personas entre las que se divide (normalmente las activas).
 */
export function computeShares(
  total: number,
  splitType: SplitType,
  people: Person[],
  opts?: SplitOptions
): Shares {
  const t = Math.round(total);
  const ids = people.map((p) => p.id);
  if (ids.length === 0) return {};

  switch (splitType) {
    case "single": {
      const target = opts?.single && ids.includes(opts.single) ? opts.single : ids[0];
      const shares: Shares = {};
      for (const id of ids) shares[id] = id === target ? t : 0;
      return shares;
    }

    case "percent": {
      const percents = opts?.percents ?? {};
      const raw = ids.map((id) => Math.max(0, Number(percents[id]) || 0));
      const sum = raw.reduce((a, b) => a + b, 0);
      // Si los porcentajes no suman nada usable, caemos a partes iguales.
      if (sum <= 0) return equalShares(t, ids);
      const shares: Shares = {};
      let assigned = 0;
      ids.forEach((id, i) => {
        const value = Math.round((t * raw[i]) / sum);
        shares[id] = value;
        assigned += value;
      });
      // El redondeo puede dejar uno o dos pesos sueltos: se los damos a la
      // persona con la parte más grande.
      return fixDrift(shares, ids, t - assigned);
    }

    case "custom": {
      const given = opts?.shares ?? {};
      const shares: Shares = {};
      for (const id of ids) shares[id] = Math.max(0, Math.round(Number(given[id]) || 0));
      // Respetamos lo que puso el usuario tal cual (la validación se encarga
      // de que sume el total), pero sí sumamos las personas que falten en 0.
      for (const [id, value] of Object.entries(given)) {
        if (!(id in shares)) shares[id] = Math.max(0, Math.round(Number(value) || 0));
      }
      return shares;
    }

    case "equal":
    default:
      return equalShares(t, ids);
  }
}

/** Partes iguales sin perder pesos: el resto se reparte de a uno. */
function equalShares(total: number, ids: PersonId[]): Shares {
  const base = Math.floor(total / ids.length);
  let rest = total - base * ids.length;
  const shares: Shares = {};
  for (const id of ids) {
    shares[id] = base + (rest > 0 ? 1 : 0);
    if (rest > 0) rest--;
  }
  return shares;
}

/** Reparte los pesos sueltos del redondeo en la parte más grande. */
function fixDrift(shares: Shares, ids: PersonId[], drift: number): Shares {
  if (drift === 0) return shares;
  let target = ids[0];
  for (const id of ids) {
    if ((shares[id] ?? 0) > (shares[target] ?? 0)) target = id;
  }
  return { ...shares, [target]: Math.max(0, (shares[target] ?? 0) + drift) };
}

/** Porcentaje de cada persona dentro de un gasto ya guardado. Sirve para
 *  reabrir el formulario en modo "porcentaje" con los valores que tenía. */
export function percentsFromShares(shares: Shares, total: number): Record<PersonId, number> {
  const out: Record<PersonId, number> = {};
  if (total <= 0) return out;
  for (const [id, share] of Object.entries(shares)) {
    out[id] = Math.round((share / total) * 100);
  }
  return out;
}
