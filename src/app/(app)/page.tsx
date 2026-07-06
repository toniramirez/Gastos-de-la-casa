"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera,
  HandCoins,
  Info,
  PartyPopper,
  Plus,
  Receipt,
  Scale,
  Undo2,
  Wallet,
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
      <header className="mb-5 animate-fade-up">
        <p className="text-sm font-medium text-slate-400">
          {data?.summary.period?.name ?? "Período actual"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gastos de la casa</h1>
      </header>

      {loading && !data && <LoadingBlock />}
      {error && !data && <ErrorBlock message={error} onRetry={load} />}

      {data && (
        <div className="space-y-4">
          {data.usingMemory && <MemoryBanner />}

          <BalanceCard data={data} />

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total gastado"
              value={formatMoney(data.summary.totalGastado)}
              icon={<Wallet className="h-4 w-4" />}
              delay="delay-1"
            />
            <StatCard
              label="Gastos cargados"
              value={String(data.summary.cantidadGastos)}
              icon={<Receipt className="h-4 w-4" />}
              delay="delay-2"
            />
            <StatCard
              label={`Pagó ${names.tony}`}
              value={formatMoney(data.summary.totalPagadoTony)}
              accent="tony"
              delay="delay-3"
            />
            <StatCard
              label={`Pagó ${names.sol}`}
              value={formatMoney(data.summary.totalPagadoSol)}
              accent="sol"
              delay="delay-4"
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
    <div
      className={cn(
        "relative animate-fade-up overflow-hidden rounded-3xl p-5 text-white shadow-glow",
        even ? "bg-emerald-gradient" : "bg-brand-mesh"
      )}
      style={{ backgroundSize: "180% 180%" }}
    >
      {/* Glows decorativos flotantes */}
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl animate-pulse-glow" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-white/75">
          <Scale className="h-4 w-4" />
          <p className="text-sm font-medium">Balance del período</p>
        </div>
        {even ? (
          <p className="mt-3 flex items-center gap-2 text-2xl font-bold">
            <PartyPopper className="h-6 w-6" /> Están en cero
          </p>
        ) : (
          <>
            <p className="mt-2 animate-count-in text-4xl font-bold tracking-tight">
              {formatMoney(balance.amount)}
            </p>
            <p className="mt-1.5 text-white/85">
              <span className="font-semibold text-white">{debtorName}</span> le debe a{" "}
              <span className="font-semibold text-white">{creditorName}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
  delay,
}: {
  label: string;
  value: string;
  accent?: "tony" | "sol";
  icon?: React.ReactNode;
  delay?: string;
}) {
  return (
    <Card className={cn("flex animate-fade-up flex-col justify-between", delay)}>
      <div className="flex items-center gap-1.5">
        {icon && (
          <span
            className={cn(
              accent === "tony" ? "text-tony" : accent === "sol" ? "text-sol" : "text-slate-400"
            )}
          >
            {icon}
          </span>
        )}
        <span
          className={cn(
            "text-xs font-medium",
            accent === "tony" ? "text-tony" : accent === "sol" ? "text-sol" : "text-slate-400"
          )}
        >
          {label}
        </span>
      </div>
      <span className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">{value}</span>
    </Card>
  );
}

const ACTIONS = [
  { href: "/gastos/nuevo", label: "Cargar gasto", icon: Plus, color: "from-brand-500 to-brand-700" },
  { href: "/ticket", label: "Escanear ticket", icon: Camera, color: "from-violet-500 to-fuchsia-600" },
  {
    href: "/prestamos/nuevo?type=prestamo",
    label: "Registrar préstamo",
    icon: HandCoins,
    color: "from-amber-400 to-orange-500",
  },
  {
    href: "/prestamos/nuevo?type=devolucion",
    label: "Registrar devolución",
    icon: Undo2,
    color: "from-teal-400 to-emerald-600",
  },
  { href: "/cierre", label: "Cerrar período", icon: Scale, color: "from-slate-600 to-slate-800" },
];

function QuickActions() {
  return (
    <div className="animate-fade-up space-y-2 delay-5">
      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Acciones rápidas
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ href, label, icon: Icon, color }, i) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "press group flex items-center gap-3 rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm hover:shadow-soft",
              i === ACTIONS.length - 1 && ACTIONS.length % 2 === 1 && "col-span-2"
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-glow-sm transition-transform duration-300 group-hover:scale-110 group-active:scale-95",
                color
              )}
            >
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
    <div className="flex animate-fade-up items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 backdrop-blur-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Modo demo: los datos se guardan en memoria y se pierden al reiniciar. Configurá Google
        Sheets para guardarlos de verdad.
      </span>
    </div>
  );
}
