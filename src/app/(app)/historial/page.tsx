"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePeople, useToast } from "@/components/Providers";
import { api } from "@/lib/client";
import { formatDate, formatMoney } from "@/lib/format";
import { CATEGORIES, type Expense, type Loan, type Period } from "@/lib/types";
import { Select } from "@/components/ui/Field";
import { ConfirmDialog, useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { cn } from "@/lib/cn";

type Tab = "gastos" | "prestamos";

export default function HistorialPage() {
  const router = useRouter();
  const { active } = usePeople();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>("gastos");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState<string>("current");
  const [category, setCategory] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<Period[]>("/api/periods").then(setPeriods).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("periodId", periodId);
      if (search.trim()) params.set("search", search.trim());
      if (tab === "gastos") {
        if (category) params.set("category", category);
        if (paidBy) params.set("paidBy", paidBy);
        setExpenses(await api.get<Expense[]>(`/api/expenses?${params}`));
      } else {
        setLoans(await api.get<Loan[]>(`/api/loans?${params}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [tab, periodId, category, paidBy, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function doDeleteExpense(id: string) {
    setDeleting(true);
    try {
      await api.del(`/api/expenses/${id}`);
      toast("Gasto eliminado", "success");
      confirm.close();
      void load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo eliminar", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function doDeleteLoan(id: string) {
    setDeleting(true);
    try {
      await api.del(`/api/loans/${id}`);
      toast("Movimiento eliminado", "success");
      confirm.close();
      void load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo eliminar", "error");
    } finally {
      setDeleting(false);
    }
  }

  const periodLabel = useMemo(() => {
    if (periodId === "current") return "Período actual";
    if (periodId === "all") return "Todos";
    return periods.find((p) => p.id === periodId)?.name ?? "Período";
  }, [periodId, periods]);

  return (
    <div>
      <PageHeader title="Historial" subtitle={periodLabel} />

      {/* Tabs */}
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/60 p-1 backdrop-blur-sm">
        {(["gastos", "prestamos"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-xl py-2 text-sm font-semibold transition-all duration-300",
              tab === t
                ? "bg-white text-brand-700 shadow-card"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "gastos" ? "Gastos" : "Préstamos"}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descripción o comercio…"
          className="w-full rounded-2xl border border-slate-200 bg-white/80 py-2.5 pl-11 pr-4 text-sm backdrop-blur-sm transition-all duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <Select
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="w-auto min-w-[8rem] py-2 text-sm"
        >
          <option value="current">Período actual</option>
          <option value="all">Todos los períodos</option>
          {periods
            .filter((p) => p.status === "closed")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </Select>

        {tab === "gastos" && (
          <>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-auto min-w-[8rem] py-2 text-sm"
            >
              <option value="">Toda categoría</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-auto min-w-[7rem] py-2 text-sm"
            >
              <option value="">Pagó cualquiera</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  Pagó {p.name}
                </option>
              ))}
            </Select>
          </>
        )}
      </div>

      {loading && <LoadingBlock />}
      {error && !loading && <ErrorBlock message={error} onRetry={load} />}

      {!loading && !error && tab === "gastos" && (
        expenses.length === 0 ? (
          <EmptyState title="Sin gastos" description="No hay gastos para estos filtros." />
        ) : (
          <ul className="space-y-2">
            {expenses.map((e, i) => (
              <ExpenseRow
                key={e.id}
                e={e}
                index={i}
                onEdit={() => router.push(`/gastos/${e.id}`)}
                onDelete={() =>
                  confirm.ask("¿Eliminar gasto?", () => doDeleteExpense(e.id), `${e.description || e.merchant} · ${formatMoney(e.total)}`)
                }
              />
            ))}
          </ul>
        )
      )}

      {!loading && !error && tab === "prestamos" && (
        loans.length === 0 ? (
          <EmptyState title="Sin movimientos" description="No hay préstamos ni devoluciones para estos filtros." />
        ) : (
          <ul className="space-y-2">
            {loans.map((l, i) => (
              <LoanRow
                key={l.id}
                l={l}
                index={i}
                onEdit={() => router.push(`/prestamos/${l.id}`)}
                onDelete={() =>
                  confirm.ask("¿Eliminar movimiento?", () => doDeleteLoan(l.id), formatMoney(l.amount))
                }
              />
            ))}
          </ul>
        )
      )}

      <ConfirmDialog
        open={confirm.state.open}
        title={confirm.state.title}
        message={confirm.state.message}
        loading={deleting}
        onConfirm={() => confirm.state.onConfirm?.()}
        onCancel={confirm.close}
      />
    </div>
  );
}

function ExpenseRow({
  e,
  index = 0,
  onEdit,
  onDelete,
}: {
  e: Expense;
  index?: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { nameOf, colorFor } = usePeople();
  return (
    <li
      className="flex animate-fade-up items-center gap-3 rounded-3xl bg-white/90 p-3.5 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm transition-shadow hover:shadow-soft"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onEdit} role="button">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-800">
            {e.description || e.merchant || e.category}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
          <span>{formatDate(e.date)}</span>
          <span>·</span>
          <span>{e.category}</span>
          <span>·</span>
          <span style={{ color: colorFor(e.paid_by).deep }}>pagó {nameOf(e.paid_by)}</span>
        </div>
      </div>
      <span className="shrink-0 font-bold text-slate-900">{formatMoney(e.total)}</span>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </li>
  );
}

function LoanRow({
  l,
  index = 0,
  onEdit,
  onDelete,
}: {
  l: Loan;
  index?: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { nameOf } = usePeople();
  const verb = l.type === "prestamo" ? "prestó a" : "devolvió a";
  return (
    <li
      className="flex animate-fade-up items-center gap-3 rounded-3xl bg-white/90 p-3.5 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm transition-shadow hover:shadow-soft"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onEdit} role="button">
        <span className="truncate font-semibold text-slate-800">
          {nameOf(l.from_person)} {verb} {nameOf(l.to_person)}
        </span>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
          <span>{formatDate(l.date)}</span>
          <span>·</span>
          <span className={l.type === "prestamo" ? "text-amber-600" : "text-teal-600"}>
            {l.type === "prestamo" ? "Préstamo" : "Devolución"}
          </span>
          {l.notes && (
            <>
              <span>·</span>
              <span className="truncate">{l.notes}</span>
            </>
          )}
        </div>
      </div>
      <span className="shrink-0 font-bold text-slate-900">{formatMoney(l.amount)}</span>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </li>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button onClick={onEdit} className="press flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="press flex h-8 w-8 items-center justify-center rounded-xl text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
