"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { LoanForm, type LoanFormValue } from "@/components/LoanForm";
import { useToast } from "@/components/Providers";
import { api } from "@/lib/client";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import type { Loan } from "@/lib/types";

export default function EditarPrestamoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLoan(await api.get<Loan>(`/api/loans/${params.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se encontró el movimiento");
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(value: LoanFormValue) {
    await api.put(`/api/loans/${params.id}`, value);
    toast("Movimiento actualizado", "success");
    router.push("/historial");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Editar movimiento" back="/historial" />
      {error && <ErrorBlock message={error} onRetry={load} />}
      {!error && !loan && <LoadingBlock />}
      {loan && (
        <LoanForm
          initial={{
            date: loan.date,
            type: loan.type,
            from_person: loan.from_person,
            to_person: loan.to_person,
            amount: loan.amount,
            notes: loan.notes,
          }}
          submitLabel="Guardar cambios"
          onSubmit={save}
          onCancel={() => router.push("/historial")}
        />
      )}
    </div>
  );
}
