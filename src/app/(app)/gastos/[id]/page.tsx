"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ExpenseForm, type ExpenseFormValue } from "@/components/ExpenseForm";
import { useToast } from "@/components/Providers";
import { api } from "@/lib/client";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { percentsFromShares } from "@/lib/balance";
import type { Expense, PersonId } from "@/lib/types";

/** Con split_type = "single", quién se hizo cargo de todo el gasto. */
function singlePersonOf(expense: Expense): PersonId | undefined {
  const entries = Object.entries(expense.shares ?? {});
  return entries.find(([, share]) => Math.round(share) === Math.round(expense.total))?.[0];
}

export default function EditarGastoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setExpense(await api.get<Expense>(`/api/expenses/${params.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se encontró el gasto");
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(value: ExpenseFormValue) {
    await api.put(`/api/expenses/${params.id}`, value);
    toast("Gasto actualizado", "success");
    router.push("/historial");
    router.refresh();
  }

  const initial: Partial<ExpenseFormValue> | undefined = expense
    ? {
        date: expense.date,
        description: expense.description,
        merchant: expense.merchant,
        category: expense.category,
        group: expense.group,
        total: expense.total,
        paid_by: expense.paid_by,
        split_type: expense.split_type,
        // Para "una sola persona": la que tiene toda la parte del gasto.
        single_person: singlePersonOf(expense),
        percents: percentsFromShares(expense.shares, expense.total),
        shares: expense.shares,
        notes: expense.notes,
        source: expense.source,
      }
    : undefined;

  return (
    <div>
      <PageHeader title="Editar gasto" back="/historial" />
      {error && <ErrorBlock message={error} onRetry={load} />}
      {!error && !expense && <LoadingBlock />}
      {expense && (
        <ExpenseForm
          initial={initial}
          submitLabel="Guardar cambios"
          onSubmit={save}
          onCancel={() => router.push("/historial")}
        />
      )}
    </div>
  );
}
