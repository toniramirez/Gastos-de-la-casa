"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HandCoins, PartyPopper, Scale } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { NetsList, TransferList } from "@/components/BalanceSummary";
import { usePeople, useToast } from "@/components/Providers";
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
  const { nameOf } = usePeople();
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
  const transfers = data.transfers;
  // Con más de dos personas puede haber más de un pago para saldar.
  const haySaldo = transfers.length > 0;

  return (
    <div>
      <PageHeader title="Cierre de período" subtitle={s.period?.name} back="/" />

      {/* Resultado principal */}
      <div
        className={cn(
          "relative animate-fade-up overflow-hidden rounded-3xl p-5 text-white shadow-glow",
          haySaldo ? "bg-brand-mesh" : "bg-emerald-gradient"
        )}
        style={{ backgroundSize: "180% 180%" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl animate-pulse-glow" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80">
            <Scale className="h-4 w-4" />
            <span className="text-sm font-medium">Resultado de gastos</span>
          </div>
          {haySaldo ? (
            <div className="mt-2">
              <p className="animate-count-in text-4xl font-bold tracking-tight">
                {formatMoney(s.gastosBalance.amount)}
              </p>
              <p className="mb-2 mt-1.5 text-sm text-white/80">
                {transfers.length === 1
                  ? "Para saldar los gastos del período"
                  : "Para saldar los gastos del período, estos pagos"}
              </p>
              <TransferList transfers={transfers} tone="onDark" />
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
                  <div className="max-w-[55%] text-right">
                    {g.balance.even ? (
                      <span className="text-sm font-semibold text-emerald-600">En cero</span>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-800">{formatMoney(g.balance.amount)}</p>
                        {g.balance.transfers.map((t, i) => (
                          <p key={`${t.from}-${t.to}-${i}`} className="text-[11px] text-slate-400">
                            {nameOf(t.from)} → {nameOf(t.to)} {formatMoney(t.amount)}
                          </p>
                        ))}
                      </>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {/* Detalle */}
      <Card className="mt-4 animate-fade-up delay-2">
        <div className="divide-y divide-slate-100">
          <SummaryRow label="Total de gastos" value={formatMoney(s.totalGastado)} />
          {s.porPersona.map((t) => (
            <SummaryRow
              key={t.person}
              label={`Pagó ${nameOf(t.person)}`}
              value={formatMoney(t.pagado)}
              hint={`le correspondía ${formatMoney(t.corresponde)}`}
            />
          ))}
        </div>
        <NetsList balance={s.gastosBalance} className="mt-2 border-t border-slate-100 pt-1" />
      </Card>

      {/* Préstamos: no se saldan acá, se arrastran al próximo período. */}
      {!s.prestamosBalance.even && (
        <Card className="mt-4 flex animate-fade-up items-start gap-3 border-amber-200/70 bg-amber-50/70">
          <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1 text-sm text-amber-900">
            <p className="font-semibold">Préstamos pendientes: {formatMoney(s.prestamosBalance.amount)}</p>
            <TransferList transfers={s.prestamosBalance.transfers} className="mt-1.5" />
            <p className="mt-1.5 text-amber-700">
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
          variant={haySaldo ? "primary" : "success"}
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
          haySaldo
            ? `Confirmá que ya se hicieron estos pagos por los gastos: ${transfers
                .map((t) => `${nameOf(t.from)} → ${nameOf(t.to)} ${formatMoney(t.amount)}`)
                .join("; ")}. Se cerrará este período y arrancará uno nuevo. Los préstamos pendientes se mantienen.`
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

function SummaryRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <span className="min-w-0 truncate text-sm text-slate-500">{label}</span>
      <span className="shrink-0 text-right">
        <span className="block font-semibold text-slate-800">{value}</span>
        {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
    </div>
  );
}

