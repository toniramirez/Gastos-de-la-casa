// ==========================================================================
// Lectura y escritura de las partes de un gasto en la hoja. Lo importante acá
// es la compatibilidad: las filas escritas cuando la app era de dos personas
// fijas (solo con share_tony / share_sol) tienen que seguir leyéndose bien.
// ==========================================================================

import { describe, expect, it } from "vitest";
import { expenseToRow, parseShares } from "./sheets";
import type { Expense } from "../types";

function row(partial: Record<string, string>): Record<string, string> {
  return { shares: "", share_tony: "", share_sol: "", ...partial };
}

describe("parseShares", () => {
  it("lee la columna nueva con el JSON de partes", () => {
    expect(parseShares(row({ shares: '{"tony":5000,"sol":3000,"psn_juli":2000}' }))).toEqual({
      tony: 5000,
      sol: 3000,
      psn_juli: 2000,
    });
  });

  it("lee una fila vieja de dos personas (share_tony / share_sol)", () => {
    expect(parseShares(row({ share_tony: "5000", share_sol: "5000" }))).toEqual({
      tony: 5000,
      sol: 5000,
    });
  });

  it("lee una fila vieja con una sola parte cargada", () => {
    expect(parseShares(row({ share_tony: "4000", share_sol: "" }))).toEqual({
      tony: 4000,
      sol: 0,
    });
  });

  it("la columna nueva gana sobre las viejas", () => {
    const shares = parseShares(
      row({ shares: '{"tony":1000,"sol":9000}', share_tony: "5000", share_sol: "5000" })
    );
    expect(shares).toEqual({ tony: 1000, sol: 9000 });
  });

  it("si el JSON está roto cae a las columnas viejas", () => {
    expect(parseShares(row({ shares: "{no json", share_tony: "700", share_sol: "300" }))).toEqual({
      tony: 700,
      sol: 300,
    });
  });

  it("una fila sin ninguna parte no rompe", () => {
    expect(parseShares(row({}))).toEqual({});
  });
});

describe("expenseToRow", () => {
  const base: Expense = {
    id: "e",
    period_id: "p",
    date: "2026-09-12",
    description: "",
    merchant: "",
    category: "Otros",
    group: "dia_a_dia",
    total: 10000,
    paid_by: "tony",
    split_type: "equal",
    shares: { tony: 3334, sol: 3333, psn_juli: 3333 },
    created_by: "",
    source: "manual",
    notes: "",
    ticket_image_url: "",
    created_at: "",
    updated_at: "",
  };

  it("guarda las partes como JSON y además llena las columnas viejas", () => {
    const r = expenseToRow(base);
    expect(r.shares).toBe('{"tony":3334,"sol":3333,"psn_juli":3333}');
    expect(r.share_tony).toBe(3334);
    expect(r.share_sol).toBe(3333);
  });

  it("deja vacías las columnas viejas si esas personas no participan", () => {
    const r = expenseToRow({ ...base, shares: { psn_juli: 10000 } });
    expect(r.share_tony).toBe("");
    expect(r.share_sol).toBe("");
    expect(r.shares).toBe('{"psn_juli":10000}');
  });

  it("lo que escribe se vuelve a leer igual", () => {
    const r = expenseToRow(base) as Record<string, string>;
    expect(parseShares({ ...r, shares: String(r.shares) })).toEqual(base.shares);
  });
});
