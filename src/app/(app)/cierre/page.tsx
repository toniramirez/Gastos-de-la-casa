"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HandCoins, PartyPopper, Scale } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useNames, useToast } from "@/components/Providers";
import { api } from "@/lib/client";
import type { SummaryResponse } from "@/lib/api-types";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { cn } from "@/lib/cn";

export default function CierrePage() {
  const router = useRouter();
  const { names } = useNames();
  const { toast } = useToast();

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextName, setNextName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.get<SummaryResponse>("/api/summary"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function close() {
    setClosing(true);
    try {
      await api.post("/api/periods/close", { next_period_name: nextName.trim() || undefined });
      toast("Período cerrado. Arrancás de cero", "success");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo cerrar", "error");
      setClosing(false);
      setConfirming(false);
    }
  }

  if (error && !data) {
    return (
      <div>
        <PageHeader title="Cierre de período" back="/" />
        <ErrorBlock message={error} onRetry={load} />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Cierre de período" back="/" />
        <LoadingBlock />
      </div>
    );
  }

  const s = data.summary;
  const settlement = data.settlement;

  return (
    <div>
      <PageHeader title="Cierre de período" subtitle={s.period?.name} back="/" />

      {/* Resultado principal */}
      <div
        className={cn(
          "relative animate-fade-up overflow-hidden rounded-3xl p-5 text-white shadow-glow",
          settlement ? "bg-brand-mesh" : "bg-emerald-gradient"
        )}
        style={{ backgroundSize: "180% 180%" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl animate-pulse-glow" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80">
            <Scale className="h-4 w-4" />
            <span className="text-sm font-medium">Resultado de gastos</span>
          </div>
          {settlement ? (
            <div className="mt-2">
              <p className="animate-count-in text-4xl font-bold tracking-tight">
                {formatMoney(settlement.amount)}
              </p>
              <p className="mt-1.5 text-white/90">
                Para saldar los gastos del período,{" "}
                <span className="font-semibold">{names[settlement.from]}</span> le tiene que pagar a{" "}
                <span className="font-semibold">{names[settlement.to]}</span>.
              </p>
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
              <PartyPopper className="h-6 w-6" /> Gastos en cero
            </p>
          )}
        </div>
      </div>

      {/* Desglose por cuenta: así arman los números, por partes. */}
      {s.groups.some((g) => g.cantidad > 0) && (
        <Card className="mt-4 animate-fade-up delay-1">
          <p className="mb-1 text-sm font-semibold text-slate-700">Cómo se compone</p>
          <ul className="divide-y divide-slate-100">
            {s.groups
              .filter((g) => g.cantidad > 0)
              .map((g) => (
                <li key={g.group} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{g.label}</p>
                    <p className="text-xs text-slate-400">
                      {g.cantidad} {g.cantidad === 1 ? "gasto" : "gastos"} · {formatMoney(g.totalGastado)}
                    </p>
                  </div>
                  <div className="text-right">
                    {g.balance.debtor === "even" ? (
                      <span className="text-sm font-semibold text-emerald-600">En cero</span>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-800">{formatMoney(g.balance.amount)}</p>
                        <p className="text-[11px] text-slate-400">
                          {names[g.balance.debtor]} → {names[g.balance.creditor as "tony" | "sol"]}
                        </p>
                      </>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {/* Detalle */}
      <Card className="mt-4 animate-fade-up divide-y divide-slate-100 delay-2">
        <SummaryRow label="Total de gastos" value={formatMoney(s.totalGastado)} />
        <SummaryRow label={`Pagó ${names.tony}`} value={formatMoney(s.totalPagadoTony)} />
        <SummaryRow label={`Pagó ${names.sol}`} value={formatMoney(s.totalPagadoSol)} />
        <SummaryRow label={`Le correspondía a ${names.tony}`} value={formatMoney(s.correspondeTony)} />
        <SummaryRow label={`Le correspondía a ${names.sol}`} value={formatMoney(s.correspondeSol)} />
      </Card>

      {/* Préstamos: no se saldan acá, se arrastran al próximo período. */}
      {s.prestamosBalance.debtor !== "even" && (
        <Card className="mt-4 flex animate-fade-up items-start gap-3 border-amber-200/70 bg-amber-50/70">
          <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Préstamos pendientes: {formatMoney(s.prestamosBalance.amount)}</p>
            <p className="mt-0.5 text-amber-700">
              <span className="font-semibold">{names[s.prestamosBalance.debtor]}</span> le debe a{" "}
              <span className="font-semibold">{names[s.prestamosBalance.creditor as "tony" | "sol"]}</span>.
              Esto <span className="font-semibold">no se salda en el cierre</span>: se arrastra al
              próximo período hasta que se registre la devolución.
            </p>
          </div>
        </Card>
      )}

      <Card className="mt-4 animate-fade-up delay-2">
        <Field label="Nombre del próximo período (opcional)" hint="Si lo dejás vacío, se numera solo.">
          <Input
            value={nextName}
            onChange={(e) => setNextName(e.target.value)}
            placeholder={`Período ${(s.period ? 2 : 1)}`}
          />
        </Field>
      </Card>

      <div className="mt-4 animate-fade-up delay-3">
        <Button
          size="lg"
          fullWidth
          variant={settlement ? "primary" : "success"}
          onClick={() => setConfirming(true)}
        >
          <CheckCircle2 className="h-5 w-5" />
          Marcar como pagado y cerrar período
        </Button>
        <p className="mt-2 px-2 text-center text-xs text-slate-400">
          Se salda la cuenta de gastos y arranca un período nuevo. Los préstamos pendientes se
          mantienen.
        </p>
      </div>

      <ConfirmDialog
        open={confirming}
        danger={false}
        title="¿Cerrar el período?"
        message={
          settlement
            ? `Confirmá que ${names[settlement.from]} ya le pagó ${formatMoney(settlement.amount)} a ${names[settlement.to]} por los gastos. Se cerrará este período y arrancará uno nuevo. Los préstamos pendientes se mantienen.`
            : "Se cerrará este período y arrancará uno nuevo. Los préstamos pendientes se mantienen."
        }
        confirmLabel="Sí, cerrar"
        loading={closing}
        onConfirm={close}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

