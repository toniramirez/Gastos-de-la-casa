// ==========================================================================
// Lógica central de balance. Función pura y testeable.
//
// Convención: `net` = cuánto le debe Sol a Tony.
//   net > 0  => Sol le debe a Tony
//   net < 0  => Tony le debe a Sol
//   net == 0 => están en cero
//
// Un gasto pagado por una persona hace que la otra le deba su parte.
// Un movimiento de plata de X a Y (préstamo o devolución) siempre significa
// que Y le debe más a X (o que X le debe menos a Y). Por eso el efecto sobre
// el balance de cualquier movimiento entre ellos es simplemente el flujo de
// plata: si la plata va de Tony a Sol, Sol le debe más a Tony.
//
// IMPORTANTE — dos cuentas separadas:
//   1. Balance de GASTOS: solo los gastos del período. Es lo que se salda al
//      cerrar (se pasan la plata y quedan en cero). Se resetea cada cierre.
//   2. Deuda de PRÉSTAMOS: la plata que uno le prestó al otro y todavía no le
//      devolvió. NO entra en el cierre: se arrastra entre períodos hasta que
//      aparezca una devolución. Por eso se calcula sobre TODOS los préstamos,
//      no solo los del período actual.
// ==========================================================================

import type {
  Balance,
  Expense,
  Loan,
  Period,
  PeriodSummary,
  Person,
} from "./types";

/** Delta que aporta un gasto al balance (positivo = Sol le debe a Tony). */
export function expenseDelta(expense: Pick<Expense, "paid_by" | "share_tony" | "share_sol">): number {
  if (expense.paid_by === "tony") {
    // Tony puso la plata; Sol le debe su parte.
    return expense.share_sol;
  }
  // Sol puso la plata; Tony le debe su parte => reduce lo que Sol le debe a Tony.
  return -expense.share_tony;
}

/** Delta que aporta un préstamo/devolución al balance (positivo = Sol le debe a Tony). */
export function loanDelta(loan: Pick<Loan, "from_person" | "amount">): number {
  // Plata que sale de Tony hacia Sol => Sol le debe más a Tony.
  return loan.from_person === "tony" ? loan.amount : -loan.amount;
}

/** Construye el objeto Balance a partir del neto (Sol le debe a Tony si > 0). */
export function balanceFromNet(net: number): Balance {
  const rounded = Math.round(net);
  if (rounded === 0) {
    return { net: 0, debtor: "even", creditor: "even", amount: 0 };
  }
  if (rounded > 0) {
    // Sol le debe a Tony.
    return { net: rounded, debtor: "sol", creditor: "tony", amount: rounded };
  }
  // Tony le debe a Sol.
  return { net: rounded, debtor: "tony", creditor: "sol", amount: -rounded };
}

/**
 * Balance SOLO de los gastos de un período. Es lo que se salda al cerrar.
 * (positivo = Sol le debe a Tony).
 */
export function computeExpenseBalance(expenses: Expense[]): Balance {
  let net = 0;
  for (const e of expenses) net += expenseDelta(e);
  return balanceFromNet(net);
}

/**
 * Deuda de préstamos: cuánta plata prestada falta devolver. Se calcula sobre
 * TODOS los préstamos/devoluciones (de todos los períodos), porque se arrastra
 * entre períodos y no se salda al cerrar (positivo = Sol le debe a Tony).
 */
export function computeLoanBalance(loans: Loan[]): Balance {
  let net = 0;
  for (const l of loans) net += loanDelta(l);
  return balanceFromNet(net);
}

/**
 * Resumen del período. `expenses` son los gastos del período; `loans` son
 * TODOS los préstamos/devoluciones (la deuda de préstamos se arrastra y no se
 * limita al período actual).
 */
export function computeSummary(
  period: Period | null,
  expenses: Expense[],
  loans: Loan[]
): PeriodSummary {
  let totalGastado = 0;
  let totalPagadoTony = 0;
  let totalPagadoSol = 0;
  let correspondeTony = 0;
  let correspondeSol = 0;

  for (const e of expenses) {
    totalGastado += e.total;
    if (e.paid_by === "tony") totalPagadoTony += e.total;
    else totalPagadoSol += e.total;
    correspondeTony += e.share_tony;
    correspondeSol += e.share_sol;
  }

  return {
    period,
    totalGastado,
    totalPagadoTony,
    totalPagadoSol,
    correspondeTony,
    correspondeSol,
    gastosBalance: computeExpenseBalance(expenses),
    prestamosBalance: computeLoanBalance(loans),
    cantidadGastos: expenses.length,
    cantidadPrestamos: loans.length,
  };
}

/**
 * Calcula las porciones (share_tony / share_sol) según el tipo de división.
 * Devuelve enteros que siempre suman `total` (el resto de redondeo va a Tony).
 */
export function computeShares(
  total: number,
  splitType: Expense["split_type"],
  opts?: { percentTony?: number; shareTony?: number; shareSol?: number }
): { share_tony: number; share_sol: number } {
  const t = Math.round(total);
  switch (splitType) {
    case "50_50": {
      const shareSol = Math.round(t / 2);
      return { share_tony: t - shareSol, share_sol: shareSol };
    }
    case "100_tony":
      return { share_tony: t, share_sol: 0 };
    case "100_sol":
      return { share_tony: 0, share_sol: t };
    case "percent": {
      const pct = clampPercent(opts?.percentTony ?? 50);
      const shareTony = Math.round((t * pct) / 100);
      return { share_tony: shareTony, share_sol: t - shareTony };
    }
    case "custom": {
      const shareTony = Math.round(opts?.shareTony ?? 0);
      const shareSol = Math.round(opts?.shareSol ?? 0);
      return { share_tony: shareTony, share_sol: shareSol };
    }
    default:
      return { share_tony: t - Math.round(t / 2), share_sol: Math.round(t / 2) };
  }
}

function clampPercent(p: number): number {
  if (Number.isNaN(p)) return 50;
  return Math.min(100, Math.max(0, p));
}

/** Devuelve quién debe pagarle a quién para saldar (o null si están en cero). */
export function settlementDirection(
  balance: Balance
): { from: Person; to: Person; amount: number } | null {
  if (balance.debtor === "even" || balance.amount === 0) return null;
  return {
    from: balance.debtor,
    to: balance.creditor as Person,
    amount: balance.amount,
  };
}
