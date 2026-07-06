// ==========================================================================
// Helpers compartidos por ambos stores para construir entidades desde inputs.
// ==========================================================================

import { computeShares } from "../balance";
import { nowISO } from "../format";
import { makeId } from "../ids";
import type { Expense, Loan, Person } from "../types";
import type { ExpenseInput, LoanInput } from "../validation";

export function buildExpense(
  input: ExpenseInput & { period_id: string },
  existing?: Expense
): Expense {
  const { share_tony, share_sol } = computeShares(input.total, input.split_type, {
    percentTony: input.percent_tony,
    shareTony: input.share_tony,
    shareSol: input.share_sol,
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
    share_tony,
    share_sol,
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
  existing?: Loan
): Loan {
  const now = nowISO();
  return {
    id: existing?.id ?? makeId("loan"),
    period_id: input.period_id,
    date: input.date,
    type: input.type,
    from_person: input.from_person as Person,
    to_person: input.to_person as Person,
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
