"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { computeShares } from "@/lib/balance";
import { formatMoney, todayISO } from "@/lib/format";
import {
  CATEGORIES,
  EXPENSE_GROUPS,
  type Category,
  type ExpenseGroup,
  type Person,
  type SplitType,
} from "@/lib/types";
import { useNames } from "@/components/Providers";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { PersonToggle } from "@/components/ui/PersonToggle";
import { cn } from "@/lib/cn";

export interface ExpenseFormValue {
  date: string;
  description: string;
  merchant: string;
  category: Category;
  group: ExpenseGroup;
  total: number;
  paid_by: Person;
  split_type: SplitType;
  percent_tony: number;
  share_tony: number;
  share_sol: number;
  notes: string;
  source: "manual" | "ticket";
}

export function emptyExpense(overrides?: Partial<ExpenseFormValue>): ExpenseFormValue {
  const base: ExpenseFormValue = {
    date: todayISO(),
    description: "",
    merchant: "",
    category: "Supermercado",
    group: "dia_a_dia",
    total: 0,
    paid_by: "tony",
    split_type: "50_50",
    percent_tony: 50,
    share_tony: 0,
    share_sol: 0,
    notes: "",
    source: "manual",
  };
  // Solo pisamos con overrides que tengan valor definido.
  for (const [k, val] of Object.entries(overrides ?? {})) {
    if (val !== undefined) (base as unknown as Record<string, unknown>)[k] = val;
  }
  return base;
}

const SPLIT_OPTIONS: { value: SplitType; label: (n: { tony: string; sol: string }) => string }[] = [
  { value: "50_50", label: () => "Mitad y mitad" },
  { value: "100_tony", label: (n) => `Todo ${n.tony}` },
  { value: "100_sol", label: (n) => `Todo ${n.sol}` },
  { value: "percent", label: () => "Porcentaje" },
  { value: "custom", label: () => "Montos" },
];

export function ExpenseForm({
  initial,
  submitLabel = "Guardar gasto",
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ExpenseFormValue>;
  submitLabel?: string;
  onSubmit: (value: ExpenseFormValue) => Promise<void>;
  onCancel?: () => void;
}) {
  const { names } = useNames();
  const [v, setV] = useState<ExpenseFormValue>(emptyExpense(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ExpenseFormValue>(key: K, val: ExpenseFormValue[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
  }

  // Vista previa de cuánto le corresponde a cada uno.
  const preview = useMemo(() => {
    return computeShares(v.total, v.split_type, {
      percentTony: v.percent_tony,
      shareTony: v.share_tony,
      shareSol: v.share_sol,
    });
  }, [v.total, v.split_type, v.percent_tony, v.share_tony, v.share_sol]);

  const customRemaining = v.total - (v.share_tony + v.share_sol);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (v.total <= 0) {
      setError("Ingresá un monto mayor a 0");
      return;
    }
    if (v.split_type === "custom" && Math.round(customRemaining) !== 0) {
      setError("Las partes tienen que sumar el total");
      return;
    }
    setSubmitting(true);
    try {
      // Para custom mandamos los shares tal cual; para el resto, los calculados.
      const value: ExpenseFormValue =
        v.split_type === "custom"
          ? v
          : { ...v, share_tony: preview.share_tony, share_sol: preview.share_sol };
      await onSubmit(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Monto: lo más importante, arriba y grande. */}
      <div className="rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Monto total</span>
        <MoneyInput value={v.total} onChange={(n) => set("total", n)} autoFocus={!initial?.total} />
      </div>

      <div className="rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
        <span className="mb-2 block text-sm font-medium text-slate-700">¿Quién pagó?</span>
        <PersonToggle value={v.paid_by} onChange={(p) => set("paid_by", p)} />
      </div>

      {/* Cuenta / grupo: separa el día a día de la tarjeta y los fijos. */}
      <div className="rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
        <span className="mb-2 block text-sm font-medium text-slate-700">¿A qué cuenta va?</span>
        <div className="grid grid-cols-3 gap-2">
          {EXPENSE_GROUPS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set("group", opt.value)}
              className={cn(
                "press rounded-2xl border-2 px-2 py-2.5 text-[13px] font-semibold transition-all duration-200",
                v.group === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-glow-sm"
                  : "border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* División */}
      <div className="rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
        <span className="mb-2 block text-sm font-medium text-slate-700">¿Cómo se divide?</span>
        <div className="grid grid-cols-3 gap-2">
          {SPLIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set("split_type", opt.value)}
              className={cn(
                "press rounded-2xl border-2 px-2 py-2.5 text-[13px] font-semibold transition-all duration-200",
                v.split_type === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-glow-sm"
                  : "border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300"
              )}
            >
              {opt.label(names)}
            </button>
          ))}
        </div>

        {v.split_type === "percent" && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm font-medium text-slate-600">
              <span>{names.tony}: {v.percent_tony}%</span>
              <span>{names.sol}: {100 - v.percent_tony}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={v.percent_tony}
              onChange={(e) => set("percent_tony", parseInt(e.target.value, 10))}
              className="w-full accent-brand-600"
            />
          </div>
        )}

        {v.split_type === "custom" && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Field label={names.tony}>
              <MoneyInput value={v.share_tony} onChange={(n) => set("share_tony", n)} />
            </Field>
            <Field label={names.sol}>
              <MoneyInput value={v.share_sol} onChange={(n) => set("share_sol", n)} />
            </Field>
            <p
              className={cn(
                "col-span-2 flex items-center gap-1 text-xs font-medium",
                Math.round(customRemaining) === 0 ? "text-emerald-600" : "text-amber-600"
              )}
            >
              {Math.round(customRemaining) === 0 ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Las partes suman el total
                </>
              ) : (
                `Falta asignar ${formatMoney(customRemaining)}`
              )}
            </p>
          </div>
        )}

        {/* Preview */}
        {v.total > 0 && v.split_type !== "custom" && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
            <span className="text-slate-500">Le toca a cada uno</span>
            <span className="font-semibold text-slate-700">
              {names.tony} {formatMoney(preview.share_tony)} · {names.sol} {formatMoney(preview.share_sol)}
            </span>
          </div>
        )}
      </div>

      {/* Detalles */}
      <div className="space-y-4 rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
        <Field label="Descripción">
          <Input
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Compra del súper"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Comercio">
            <Input
              value={v.merchant}
              onChange={(e) => set("merchant", e.target.value)}
              placeholder="Coto"
            />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
        </div>
        <Field label="Categoría">
          <Select value={v.category} onChange={(e) => set("category", e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nota (opcional)">
          <Textarea
            value={v.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Algo para recordar…"
          />
        </Field>
      </div>

      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" fullWidth onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
