import { describe, expect, it } from "vitest";
import {
  balanceFromNets,
  computeExpenseBalance,
  computeLoanBalance,
  computeShares,
  computeSummary,
  netsFromExpenses,
  netsFromLoans,
  percentsFromShares,
  settleTransfers,
  sumShares,
} from "./balance";
import { defaultPeople } from "./people";
import { parseSplitType, type Expense, type Loan, type Person, type Shares } from "./types";

/** Las dos de siempre. */
const DOS: Person[] = defaultPeople("Tony", "Sol");

/** Tres personas: los ids viejos más una nueva. */
const TRES: Person[] = [
  ...DOS,
  { id: "psn_juli", name: "Juli", color: "violet", active: true },
];

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
    split_type: "equal",
    shares: {},
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
  it("divide en partes iguales entre dos sin perder pesos", () => {
    expect(computeShares(10000, "equal", DOS)).toEqual({ tony: 5000, sol: 5000 });
    // impar: el peso que sobra va a la primera persona
    expect(computeShares(10001, "equal", DOS)).toEqual({ tony: 5001, sol: 5000 });
  });

  it("divide en partes iguales entre tres sin perder pesos", () => {
    const shares = computeShares(10000, "equal", TRES);
    expect(shares).toEqual({ tony: 3334, sol: 3333, psn_juli: 3333 });
    expect(sumShares(shares)).toBe(10000);
  });

  it("una sola persona se hace cargo de todo", () => {
    expect(computeShares(8000, "single", TRES, { single: "psn_juli" })).toEqual({
      tony: 0,
      sol: 0,
      psn_juli: 8000,
    });
  });

  it("porcentajes por persona", () => {
    const shares = computeShares(10000, "percent", TRES, {
      percents: { tony: 50, sol: 30, psn_juli: 20 },
    });
    expect(shares).toEqual({ tony: 5000, sol: 3000, psn_juli: 2000 });
    expect(sumShares(shares)).toBe(10000);
  });

  it("porcentajes que no suman 100 se reparten en proporción y no pierden pesos", () => {
    const shares = computeShares(9000, "percent", TRES, {
      percents: { tony: 1, sol: 1, psn_juli: 1 },
    });
    expect(sumShares(shares)).toBe(9000);
  });

  it("montos personalizados", () => {
    expect(
      computeShares(10000, "custom", TRES, {
        shares: { tony: 3000, sol: 5000, psn_juli: 2000 },
      })
    ).toEqual({ tony: 3000, sol: 5000, psn_juli: 2000 });
  });

  it("acepta los tipos de división viejos de dos personas", () => {
    expect(parseSplitType("50_50")).toBe("equal");
    expect(parseSplitType("100_tony")).toBe("single");
    expect(computeShares(10000, parseSplitType("50_50"), DOS)).toEqual({ tony: 5000, sol: 5000 });
  });
});

describe("netsFromExpenses", () => {
  it("quien paga queda a favor por lo que pusieron los demás", () => {
    const e = makeExpense({ total: 10000, paid_by: "tony", shares: { tony: 5000, sol: 5000 } });
    expect(netsFromExpenses([e], DOS)).toEqual({ tony: 5000, sol: -5000 });
  });

  it("gasto que paga uno y es 100% de otro", () => {
    const e = makeExpense({ total: 4000, paid_by: "tony", shares: { tony: 0, sol: 4000 } });
    expect(netsFromExpenses([e], DOS)).toEqual({ tony: 4000, sol: -4000 });
  });

  it("con tres personas, los netos suman cero", () => {
    const e = makeExpense({
      total: 9000,
      paid_by: "psn_juli",
      shares: { tony: 3000, sol: 3000, psn_juli: 3000 },
    });
    const nets = netsFromExpenses([e], TRES);
    expect(nets).toEqual({ tony: -3000, sol: -3000, psn_juli: 6000 });
    expect(Object.values(nets).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("cuenta también a alguien que ya no está en la lista", () => {
    const e = makeExpense({
      total: 6000,
      paid_by: "tony",
      shares: { tony: 3000, psn_ex: 3000 },
    });
    expect(netsFromExpenses([e], DOS)).toEqual({ tony: 3000, sol: 0, psn_ex: -3000 });
  });
});

describe("settleTransfers", () => {
  it("un solo pago cuando son dos", () => {
    expect(settleTransfers({ tony: 5000, sol: -5000 })).toEqual([
      { from: "sol", to: "tony", amount: 5000 },
    ]);
  });

  it("con tres personas salen a lo sumo dos pagos", () => {
    const transfers = settleTransfers({ tony: 12400, sol: -8200, psn_juli: -4200 });
    expect(transfers).toHaveLength(2);
    expect(transfers).toEqual([
      { from: "sol", to: "tony", amount: 8200 },
      { from: "psn_juli", to: "tony", amount: 4200 },
    ]);
    // Lo que se paga es exactamente lo que se debe.
    expect(transfers.reduce((acc, t) => acc + t.amount, 0)).toBe(12400);
  });

  it("cruza al que más debe con el que más le deben", () => {
    const transfers = settleTransfers({ a: 10000, b: 2000, c: -9000, d: -3000 });
    expect(transfers).toEqual([
      { from: "c", to: "a", amount: 9000 },
      { from: "d", to: "a", amount: 1000 },
      { from: "d", to: "b", amount: 2000 },
    ]);
  });

  it("sin deudas no hay pagos", () => {
    expect(settleTransfers({ tony: 0, sol: 0 })).toEqual([]);
  });
});

describe("balanceFromNets", () => {
  it("marca 'even' cuando no hay nada que pasarse", () => {
    const b = balanceFromNets({ tony: 0, sol: 0 });
    expect(b.even).toBe(true);
    expect(b.amount).toBe(0);
  });

  it("el monto es la plata que cambia de manos", () => {
    const b = balanceFromNets({ tony: 12400, sol: -8200, psn_juli: -4200 });
    expect(b.even).toBe(false);
    expect(b.amount).toBe(12400);
    expect(b.transfers).toHaveLength(2);
  });
});

describe("computeExpenseBalance (solo gastos, es lo que se salda al cerrar)", () => {
  it("no mezcla préstamos: solo neto de gastos", () => {
    const expenses = [
      // Tony paga 10000 mitad y mitad => +5000 / -5000
      makeExpense({ total: 10000, paid_by: "tony", shares: { tony: 5000, sol: 5000 } }),
      // Sol paga 6000 mitad y mitad => -3000 / +3000
      makeExpense({ total: 6000, paid_by: "sol", shares: { tony: 3000, sol: 3000 } }),
    ];
    const b = computeExpenseBalance(expenses, DOS);
    expect(b.nets).toEqual({ tony: 2000, sol: -2000 });
    expect(b.transfers).toEqual([{ from: "sol", to: "tony", amount: 2000 }]);
  });

  it("tres personas, cada una paga algo", () => {
    const expenses = [
      makeExpense({
        total: 9000,
        paid_by: "tony",
        shares: { tony: 3000, sol: 3000, psn_juli: 3000 },
      }),
      makeExpense({
        total: 3000,
        paid_by: "sol",
        shares: { tony: 1000, sol: 1000, psn_juli: 1000 },
      }),
    ];
    const b = computeExpenseBalance(expenses, TRES);
    expect(b.nets).toEqual({ tony: 5000, sol: -1000, psn_juli: -4000 });
    expect(b.amount).toBe(5000);
  });
});

describe("computeLoanBalance (deuda de préstamos que se arrastra)", () => {
  it("préstamo menos devolución", () => {
    const loans = [
      makeLoan({ from_person: "tony", to_person: "sol", amount: 20000 }),
      makeLoan({ type: "devolucion", from_person: "sol", to_person: "tony", amount: 10000 }),
    ];
    const b = computeLoanBalance(loans, DOS);
    expect(b.nets).toEqual({ tony: 10000, sol: -10000 });
    expect(b.transfers).toEqual([{ from: "sol", to: "tony", amount: 10000 }]);
  });

  it("queda en cero cuando devolvió todo", () => {
    const loans = [
      makeLoan({ from_person: "tony", to_person: "sol", amount: 5000 }),
      makeLoan({ type: "devolucion", from_person: "sol", to_person: "tony", amount: 5000 }),
    ];
    expect(computeLoanBalance(loans, DOS).even).toBe(true);
  });

  it("préstamos entre tres personas", () => {
    const loans = [
      makeLoan({ from_person: "tony", to_person: "psn_juli", amount: 15000 }),
      makeLoan({ from_person: "sol", to_person: "psn_juli", amount: 5000 }),
    ];
    expect(netsFromLoans(loans, TRES)).toEqual({ tony: 15000, sol: 5000, psn_juli: -20000 });
  });
});

describe("computeSummary", () => {
  it("separa balance de gastos y deuda de préstamos", () => {
    const expenses = [
      makeExpense({ total: 10000, paid_by: "tony", shares: { tony: 5000, sol: 5000 } }),
      makeExpense({ total: 6000, paid_by: "sol", shares: { tony: 3000, sol: 3000 } }),
    ];
    const loans = [makeLoan({ from_person: "tony", to_person: "sol", amount: 2000 })];
    const s = computeSummary(null, expenses, loans, DOS);

    expect(s.totalGastado).toBe(16000);
    expect(s.porPersona).toEqual([
      { person: "tony", pagado: 10000, corresponde: 8000 },
      { person: "sol", pagado: 6000, corresponde: 8000 },
    ]);
    expect(s.cantidadGastos).toBe(2);
    expect(s.cantidadPrestamos).toBe(1);
    // Gastos: esto se salda al cerrar.
    expect(s.gastosBalance.nets).toEqual({ tony: 2000, sol: -2000 });
    // Préstamos: esto se arrastra, va aparte.
    expect(s.prestamosBalance.nets).toEqual({ tony: 2000, sol: -2000 });
  });

  it("desglosa por grupo y la suma de los netos por grupo cuadra con el total", () => {
    const expenses = [
      makeExpense({
        group: "dia_a_dia",
        total: 9000,
        paid_by: "tony",
        shares: { tony: 3000, sol: 3000, psn_juli: 3000 },
      }),
      makeExpense({
        group: "tarjeta",
        total: 6000,
        paid_by: "sol",
        shares: { tony: 2000, sol: 2000, psn_juli: 2000 },
      }),
      makeExpense({
        group: "fijos",
        total: 30000,
        paid_by: "psn_juli",
        shares: { tony: 10000, sol: 10000, psn_juli: 10000 },
      }),
    ];
    const s = computeSummary(null, expenses, [], TRES);

    const dia = s.groups.find((g) => g.group === "dia_a_dia")!;
    const tarjeta = s.groups.find((g) => g.group === "tarjeta")!;
    const fijos = s.groups.find((g) => g.group === "fijos")!;

    expect(dia.balance.nets).toEqual({ tony: 6000, sol: -3000, psn_juli: -3000 });
    expect(tarjeta.balance.nets).toEqual({ tony: -2000, sol: 4000, psn_juli: -2000 });
    expect(fijos.balance.nets).toEqual({ tony: -10000, sol: -10000, psn_juli: 20000 });

    // El neto combinado es la suma de los netos de cada grupo, persona por persona.
    for (const p of TRES) {
      const suma = s.groups.reduce((acc, g) => acc + (g.balance.nets[p.id] ?? 0), 0);
      expect(suma).toBe(s.gastosBalance.nets[p.id]);
    }
    expect(s.gastosBalance.nets).toEqual({ tony: -6000, sol: -9000, psn_juli: 15000 });
  });
});

describe("percentsFromShares", () => {
  it("reconstruye los porcentajes de un gasto guardado", () => {
    const shares: Shares = { tony: 5000, sol: 3000, psn_juli: 2000 };
    expect(percentsFromShares(shares, 10000)).toEqual({ tony: 50, sol: 30, psn_juli: 20 });
  });

  it("no explota con total 0", () => {
    expect(percentsFromShares({ tony: 0 }, 0)).toEqual({});
  });
});
