// ==========================================================================
// Helpers compartidos por ambos stores para construir entidades desde inputs.
// Acá también se valida que las personas que llegan del formulario existan
// de verdad en la lista de la cuenta (los ids son texto libre, así que no
// alcanza con Zod).
// ==========================================================================

import { HttpError } from "../api";
import { computeShares } from "../balance";
import { nowISO } from "../format";
import { makeId } from "../ids";
import { activePeople } from "../people";
import type { Expense, Loan, Person } from "../types";
import type { ExpenseInput, LoanInput } from "../validation";

/** Chequea que un id de persona esté en la lista de la cuenta. */
function requirePerson(people: Person[], id: string, label: string): string {
  if (!people.some((p) => p.id === id)) {
    throw new HttpError(`${label} no está en la lista de personas.`, 400);
  }
  return id;
}

export function buildExpense(
  input: ExpenseInput & { period_id: string },
  people: Person[],
  existing?: Expense
): Expense {
  requirePerson(people, input.paid_by, "La persona que pagó");
  if (input.split_type === "single" && input.single_person) {
    requirePerson(people, input.single_person, "La persona que se hace cargo");
  }

  // Los gastos se dividen entre las personas activas. Para "single" usamos la
  // lista completa, así se puede dejar un gasto viejo a nombre de alguien que
  // ya salió de la casa.
  const splitAmong = input.split_type === "single" ? people : activePeople(people);
  const shares = computeShares(input.total, input.split_type, splitAmong, {
    single: input.single_person,
    percents: input.percents,
    shares: input.shares,
  });

  const now = nowISO();
  return {
    id: existing?.id ?? makeId("exp"),
    period_id: input.period_id,
    date: input.date,
    description: input.description ?? "",
    merchant: input.merchant ?? "",
    category: input.category,
    group: input.group ?? "dia_a_dia",
    total: Math.round(input.total),
    paid_by: input.paid_by,
    split_type: input.split_type,
    shares,
    created_by: existing?.created_by ?? "",
    source: input.source ?? "manual",
    notes: input.notes ?? "",
    ticket_image_url: existing?.ticket_image_url ?? "",
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

export function buildLoan(
  input: LoanInput & { period_id: string },
  people: Person[],
  existing?: Loan
): Loan {
  requirePerson(people, input.from_person, "Quien presta la plata");
  requirePerson(people, input.to_person, "Quien recibe la plata");

  const now = nowISO();
  return {
    id: existing?.id ?? makeId("loan"),
    period_id: input.period_id,
    date: input.date,
    type: input.type,
    from_person: input.from_person,
    to_person: input.to_person,
    amount: Math.round(input.amount),
    notes: input.notes ?? "",
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

let periodCounter = 0;
export function nextPeriodName(existingCount: number): string {
  periodCounter = existingCount + 1;
  return `Período ${periodCounter}`;
}
