"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { LoanForm, type LoanFormValue } from "@/components/LoanForm";
import { useToast } from "@/components/Providers";
import { api } from "@/lib/client";
import type { LoanType } from "@/lib/types";

function NuevoPrestamoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const type: LoanType = searchParams.get("type") === "devolucion" ? "devolucion" : "prestamo";

  async function save(value: LoanFormValue) {
    await api.post("/api/loans", value);
    toast(value.type === "prestamo" ? "Préstamo registrado" : "Devolución registrada", "success");
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title={type === "prestamo" ? "Nuevo préstamo" : "Nueva devolución"} back="/" />
      <LoanForm initial={{ type }} onSubmit={save} />
    </div>
  );
}

export default function NuevoPrestamoPage() {
  return (
    <Suspense fallback={null}>
      <NuevoPrestamoInner />
    </Suspense>
  );
}
