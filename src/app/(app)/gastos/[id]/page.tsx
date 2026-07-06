"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ExpenseForm, type ExpenseFormValue } from "@/components/ExpenseForm";
import { useToast } from "@/components/Providers";
import { api } from "@/lib/client";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import type { Expense } from "@/lib/types";

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
        percent_tony:
          expense.total > 0 ? Math.round((expense.share_tony / expense.total) * 100) : 50,
        share_tony: expense.share_tony,
        share_sol: expense.share_sol,
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
