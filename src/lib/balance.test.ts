import { describe, expect, it } from "vitest";
import {
  balanceFromNet,
  computeExpenseBalance,
  computeLoanBalance,
  computeShares,
  computeSummary,
  expenseDelta,
  loanDelta,
  settlementDirection,
} from "./balance";
import type { Expense, Loan } from "./types";

function makeExpense(partial: Partial<Expense>): Expense {
  return {
    id: "e",
    period_id: "p",
    date: "2026-07-01",
    description: "",
    merchant: "",
    category: "Otros",
    group: "dia_a_dia",
    total: 0,
    paid_by: "tony",
    split_type: "50_50",
    share_tony: 0,
    share_sol: 0,
    created_by: "",
    source: "manual",
    notes: "",
    ticket_image_url: "",
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

function makeLoan(partial: Partial<Loan>): Loan {
  return {
    id: "l",
    period_id: "p",
    date: "2026-07-01",
    type: "prestamo",
    from_person: "tony",
    to_person: "sol",
    amount: 0,
    notes: "",
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("computeShares", () => {
  it("divide 50/50 sin perder pesos", () => {
    expect(computeShares(10000, "50_50")).toEqual({ share_tony: 5000, share_sol: 5000 });
    // impar: el resto queda para Tony
    expect(computeShares(10001, "50_50")).toEqual({ share_tony: 5000, share_sol: 5001 });
  });

  it("100% a cada uno", () => {
    expect(computeShares(8000, "100_tony")).toEqual({ share_tony: 8000, share_sol: 0 });
    expect(computeShares(8000, "100_sol")).toEqual({ share_tony: 0, share_sol: 8000 });
  });

  it("porcentaje personalizado", () => {
    expect(computeShares(10000, "percent", { percentTony: 70 })).toEqual({
      share_tony: 7000,
      share_sol: 3000,
    });
  });

  it("montos personalizados", () => {
    expect(computeShares(10000, "custom", { shareTony: 3000, shareSol: 7000 })).toEqual({
      share_tony: 3000,
      share_sol: 7000,
    });
  });
});

describe("expenseDelta", () => {
  it("si Tony paga 10000 dividido 50/50, Sol le debe 5000", () => {
    const e = makeExpense({ total: 10000, paid_by: "tony", share_tony: 5000, share_sol: 5000 });
    expect(expenseDelta(e)).toBe(5000);
  });

  it("si Sol paga 10000 dividido 50/50, Tony le debe 5000 (net negativo)", () => {
    const e = makeExpense({ total: 10000, paid_by: "sol", share_tony: 5000, share_sol: 5000 });
    expect(expenseDelta(e)).toBe(-5000);
  });

  it("gasto 100% de quien no pagó", () => {
    // Tony paga algo que es 100% de Sol => Sol le debe todo.
    const e = makeExpense({ total: 4000, paid_by: "tony", share_tony: 0, share_sol: 4000 });
    expect(expenseDelta(e)).toBe(4000);
  });
});

describe("loanDelta", () => {
  it("Tony le presta a Sol => Sol le debe a Tony", () => {
    expect(loanDelta(makeLoan({ from_person: "tony", amount: 20000 }))).toBe(20000);
  });
  it("Sol le presta a Tony => Tony le debe a Sol", () => {
    expect(loanDelta(makeLoan({ from_person: "sol", amount: 20000 }))).toBe(-20000);
  });
  it("Sol le devuelve a Tony reduce lo que Sol debe", () => {
    expect(loanDelta(makeLoan({ type: "devolucion", from_person: "sol", to_person: "tony", amount: 10000 }))).toBe(-10000);
  });
});

describe("balanceFromNet", () => {
  it("net positivo => Sol le debe a Tony", () => {
    const b = balanceFromNet(5000);
    expect(b).toMatchObject({ debtor: "sol", creditor: "tony", amount: 5000 });
  });
  it("net negativo => Tony le debe a Sol", () => {
    const b = balanceFromNet(-3000);
    expect(b).toMatchObject({ debtor: "tony", creditor: "sol", amount: 3000 });
  });
  it("net cero => están en cero", () => {
    const b = balanceFromNet(0);
    expect(b).toMatchObject({ debtor: "even", creditor: "even", amount: 0 });
  });
});

describe("computeExpenseBalance (solo gastos, es lo que se salda al cerrar)", () => {
  it("no mezcla préstamos: solo neto de gastos", () => {
    const expenses = [
      // Tony paga 10000 50/50 => +5000
      makeExpense({ total: 10000, paid_by: "tony", share_tony: 5000, share_sol: 5000 }),
      // Sol paga 6000 50/50 => -3000
      makeExpense({ total: 6000, paid_by: "sol", share_tony: 3000, share_sol: 3000 }),
    ];
    // net = 5000 - 3000 = 2000 => Sol le debe a Tony 2000 (los préstamos no cuentan)
    const b = computeExpenseBalance(expenses);
    expect(b).toMatchObject({ net: 2000, debtor: "sol", creditor: "tony", amount: 2000 });
  });
});

describe("computeLoanBalance (deuda de préstamos que se arrastra)", () => {
  it("préstamo menos devolución", () => {
    const loans = [
      // Tony le presta 20000 a Sol => +20000
      makeLoan({ from_person: "tony", to_person: "sol", amount: 20000 }),
      // Sol le devuelve 10000 a Tony => -10000
      makeLoan({ type: "devolucion", from_person: "sol", to_person: "tony", amount: 10000 }),
    ];
    // net = 20000 - 10000 = 10000 => Sol todavía le debe 10000 a Tony
    const b = computeLoanBalance(loans);
    expect(b).toMatchObject({ net: 10000, debtor: "sol", creditor: "tony", amount: 10000 });
  });

  it("queda en cero cuando devolvió todo", () => {
    const loans = [
      makeLoan({ from_person: "tony", to_person: "sol", amount: 5000 }),
      makeLoan({ type: "devolucion", from_person: "sol", to_person: "tony", amount: 5000 }),
    ];
    expect(computeLoanBalance(loans)).toMatchObject({ debtor: "even", amount: 0 });
  });
});

describe("computeSummary", () => {
  it("separa balance de gastos y deuda de préstamos", () => {
    const expenses = [
      makeExpense({ total: 10000, paid_by: "tony", share_tony: 5000, share_sol: 5000 }),
      makeExpense({ total: 6000, paid_by: "sol", share_tony: 3000, share_sol: 3000 }),
    ];
    const loans = [makeLoan({ from_person: "tony", amount: 2000 })];
    const s = computeSummary(null, expenses, loans);
    expect(s.totalGastado).toBe(16000);
    expect(s.totalPagadoTony).toBe(10000);
    expect(s.totalPagadoSol).toBe(6000);
    expect(s.correspondeTony).toBe(8000);
    expect(s.correspondeSol).toBe(8000);
    expect(s.cantidadGastos).toBe(2);
    expect(s.cantidadPrestamos).toBe(1);
    // Gastos: 5000 - 3000 = 2000 (esto se salda al cerrar)
    expect(s.gastosBalance.net).toBe(2000);
    // Préstamos: 2000 aparte (esto se arrastra)
    expect(s.prestamosBalance.net).toBe(2000);
  });

  it("desglosa el balance por grupo y el total combinado cuadra", () => {
    const expenses = [
      // Día a día: Tony paga 10000 50/50 => +5000 (Sol le debe 5000)
      makeExpense({ group: "dia_a_dia", total: 10000, paid_by: "tony", share_tony: 5000, share_sol: 5000 }),
      // Tarjeta (la paga Sol): 8000, mitad de Tony => Tony le debe 4000 => -4000
      makeExpense({ group: "tarjeta", total: 8000, paid_by: "sol", share_tony: 4000, share_sol: 4000 }),
      // Fijos: alquiler 30000 que paga Sol, 50/50 => Tony le debe 15000 => -15000
      makeExpense({ group: "fijos", total: 30000, paid_by: "sol", share_tony: 15000, share_sol: 15000 }),
    ];
    const s = computeSummary(null, expenses, []);

    const dia = s.groups.find((g) => g.group === "dia_a_dia")!;
    const tarjeta = s.groups.find((g) => g.group === "tarjeta")!;
    const fijos = s.groups.find((g) => g.group === "fijos")!;

    expect(dia.balance).toMatchObject({ debtor: "sol", creditor: "tony", amount: 5000 });
    expect(tarjeta.balance).toMatchObject({ debtor: "tony", creditor: "sol", amount: 4000 });
    expect(fijos.balance).toMatchObject({ debtor: "tony", creditor: "sol", amount: 15000 });

    // Combinado: 5000 - 4000 - 15000 = -14000 => Tony le debe 14000 a Sol
    expect(s.gastosBalance).toMatchObject({ net: -14000, debtor: "tony", creditor: "sol", amount: 14000 });
    // La suma de los netos por grupo debe igualar el total.
    const sumaGrupos = s.groups.reduce((acc, g) => acc + g.balance.net, 0);
    expect(sumaGrupos).toBe(s.gastosBalance.net);
  });
});

describe("settlementDirection", () => {
  it("Sol paga a Tony cuando Sol debe", () => {
    expect(settlementDirection(balanceFromNet(4000))).toEqual({ from: "sol", to: "tony", amount: 4000 });
  });
  it("null si están en cero", () => {
    expect(settlementDirection(balanceFromNet(0))).toBeNull();
  });
});
