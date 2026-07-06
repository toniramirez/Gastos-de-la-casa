"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PartyPopper, Scale } from "lucide-react";
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
            <span className="text-sm font-medium">Resultado final</span>
          </div>
          {settlement ? (
            <div className="mt-2">
              <p className="animate-count-in text-4xl font-bold tracking-tight">
                {formatMoney(settlement.amount)}
              </p>
              <p className="mt-1.5 text-white/90">
                Para dejar la cuenta en cero,{" "}
                <span className="font-semibold">{names[settlement.from]}</span> le tiene que pagar a{" "}
                <span className="font-semibold">{names[settlement.to]}</span>.
              </p>
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
              <PartyPopper className="h-6 w-6" /> Están en cero
            </p>
          )}
        </div>
      </div>

      {/* Detalle */}
      <Card className="mt-4 animate-fade-up divide-y divide-slate-100 delay-1">
        <SummaryRow label="Total de gastos" value={formatMoney(s.totalGastado)} />
        <SummaryRow label={`Pagó ${names.tony}`} value={formatMoney(s.totalPagadoTony)} />
        <SummaryRow label={`Pagó ${names.sol}`} value={formatMoney(s.totalPagadoSol)} />
        <SummaryRow label={`Le correspondía a ${names.tony}`} value={formatMoney(s.correspondeTony)} />
        <SummaryRow label={`Le correspondía a ${names.sol}`} value={formatMoney(s.correspondeSol)} />
        <SummaryRow
          label="Préstamos netos"
          value={prestamoLabel(s.prestamosNetos, names)}
        />
      </Card>

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
          Se guarda el cierre, se pone la cuenta en cero y arranca un período nuevo.
        </p>
      </div>

      <ConfirmDialog
        open={confirming}
        danger={false}
        title="¿Cerrar el período?"
        message={
          settlement
            ? `Confirmá que ${names[settlement.from]} ya le pagó ${formatMoney(settlement.amount)} a ${names[settlement.to]}. Se cerrará este período y arrancará uno nuevo en cero.`
            : "Se cerrará este período y arrancará uno nuevo en cero."
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

function prestamoLabel(net: number, names: { tony: string; sol: string }): string {
  if (net === 0) return "—";
  // net > 0 => plata neta que fue de Tony a Sol => Sol le debe a Tony por préstamos.
  const who = net > 0 ? names.sol : names.tony;
  const to = net > 0 ? names.tony : names.sol;
  return `${who} → ${to} ${formatMoney(Math.abs(net))}`;
}
