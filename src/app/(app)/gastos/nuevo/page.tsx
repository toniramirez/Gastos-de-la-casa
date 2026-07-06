"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ExpenseForm, type ExpenseFormValue } from "@/components/ExpenseForm";
import { useToast } from "@/components/Providers";
import { api } from "@/lib/client";

export default function NuevoGastoPage() {
  const router = useRouter();
  const { toast } = useToast();

  async function save(value: ExpenseFormValue) {
    await api.post("/api/expenses", value);
    toast("Gasto guardado", "success");
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Nuevo gasto" back="/" />
      <ExpenseForm onSubmit={save} />
    </div>
  );
}
