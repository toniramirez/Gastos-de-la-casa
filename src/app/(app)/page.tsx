"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Camera,
  HandCoins,
  Info,
  Plus,
  Scale,
  Undo2,
} from "lucide-react";
import type { SummaryResponse } from "@/lib/api-types";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/format";
import { useNames } from "@/components/Providers";
import { Card } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { cn } from "@/lib/cn";

export default function DashboardPage() {
  const { names } = useNames();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<SummaryResponse>("/api/summary"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm text-slate-400">
          {data?.summary.period?.name ?? "Período actual"}
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Gastos de la casa</h1>
      </header>

      {loading && !data && <LoadingBlock />}
      {error && !data && <ErrorBlock message={error} onRetry={load} />}

      {data && (
        <div className="space-y-4">
          {data.usingMemory && <MemoryBanner />}

          <BalanceCard data={data} />

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total gastado" value={formatMoney(data.summary.totalGastado)} />
            <StatCard label="Gastos cargados" value={String(data.summary.cantidadGastos)} />
            <StatCard
              label={`Pagó ${names.tony}`}
              value={formatMoney(data.summary.totalPagadoTony)}
              accent="tony"
            />
            <StatCard
              label={`Pagó ${names.sol}`}
              value={formatMoney(data.summary.totalPagadoSol)}
              accent="sol"
            />
          </div>

          <QuickActions />
        </div>
      )}
    </div>
  );
}

function BalanceCard({ data }: { data: SummaryResponse }) {
  const { names } = useNames();
  const { balance } = data.summary;
  const even = balance.debtor === "even";

  const debtorName = balance.debtor !== "even" ? names[balance.debtor] : "";
  const creditorName = balance.creditor !== "even" ? names[balance.creditor] : "";

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        even ? "bg-emerald-600" : "bg-brand-600",
        "text-white"
      )}
    >
      <p className="text-sm font-medium text-white/70">Balance del período</p>
      {even ? (
        <p className="mt-2 text-2xl font-bold">Están en cero 🎉</p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-bold">{formatMoney(balance.amount)}</p>
          <p className="mt-1 text-white/80">
            <span className="font-semibold text-white">{debtorName}</span> le debe a{" "}
            <span className="font-semibold text-white">{creditorName}</span>
          </p>
        </>
      )}
    </Card>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "tony" | "sol";
}) {
  return (
    <Card className="flex flex-col justify-between">
      <span
        className={cn(
          "text-xs font-medium",
          accent === "tony" ? "text-tony" : accent === "sol" ? "text-sol" : "text-slate-400"
        )}
      >
        {label}
      </span>
      <span className="mt-1 text-lg font-bold text-slate-900">{value}</span>
    </Card>
  );
}

const ACTIONS = [
  { href: "/gastos/nuevo", label: "Cargar gasto", icon: Plus, color: "bg-brand-600" },
  { href: "/ticket", label: "Escanear ticket", icon: Camera, color: "bg-violet-600" },
  { href: "/prestamos/nuevo?type=prestamo", label: "Registrar préstamo", icon: HandCoins, color: "bg-amber-500" },
  { href: "/prestamos/nuevo?type=devolucion", label: "Registrar devolución", icon: Undo2, color: "bg-teal-600" },
  { href: "/cierre", label: "Cerrar período", icon: Scale, color: "bg-slate-700" },
];

function QuickActions() {
  return (
    <div className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-slate-500">Acciones rápidas</h2>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ href, label, icon: Icon, color }, i) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card active:scale-[0.98] transition-transform",
              i === ACTIONS.length - 1 && ACTIONS.length % 2 === 1 && "col-span-2"
            )}
          >
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl text-white", color)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MemoryBanner() {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Modo demo: los datos se guardan en memoria y se pierden al reiniciar. Configurá Google
        Sheets para guardarlos de verdad.
      </span>
    </div>
  );
}
