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
  type PersonId,
  type SplitType,
} from "@/lib/types";
import { usePeople } from "@/components/Providers";
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
  paid_by: PersonId;
  split_type: SplitType;
  /** Para split_type = "single": quién se hace cargo de todo. */
  single_person: PersonId;
  /** Para split_type = "percent": porcentaje de cada persona. */
  percents: Record<PersonId, number>;
  /** Para split_type = "custom": monto de cada persona. */
  shares: Record<PersonId, number>;
  notes: string;
  source: "manual" | "ticket";
}

/** Valor inicial del formulario. `people` son las personas entre las que se
 *  divide (normalmente las activas): de ahí salen los valores por defecto. */
export function emptyExpense(
  people: Person[],
  overrides?: Partial<ExpenseFormValue>
): ExpenseFormValue {
  const first = people[0]?.id ?? "";
  const base: ExpenseFormValue = {
    date: todayISO(),
    description: "",
    merchant: "",
    category: "Supermercado",
    group: "dia_a_dia",
    total: 0,
    paid_by: first,
    split_type: "equal",
    single_person: first,
    percents: evenPercents(people),
    shares: {},
    notes: "",
    source: "manual",
  };
  // Solo pisamos con overrides que tengan valor definido.
  for (const [k, val] of Object.entries(overrides ?? {})) {
    if (val !== undefined) (base as unknown as Record<string, unknown>)[k] = val;
  }
  return base;
}

/** Porcentajes parejos (el resto va a la primera persona para que sume 100). */
function evenPercents(people: Person[]): Record<PersonId, number> {
  const out: Record<PersonId, number> = {};
  if (people.length === 0) return out;
  const each = Math.floor(100 / people.length);
  people.forEach((p) => (out[p.id] = each));
  out[people[0].id] = 100 - each * (people.length - 1);
  return out;
}

const SPLIT_OPTIONS: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Partes iguales" },
  { value: "single", label: "Una sola" },
  { value: "percent", label: "Porcentaje" },
  { value: "custom", label: "Montos" },
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
  const { people, active } = usePeople();

  // El gasto se divide entre las personas activas. Si estamos editando un
  // gasto viejo en el que participaba alguien que ya no está, esa persona
  // también entra (así no se le borra la parte sin querer).
  const splitPeople = useMemo(() => {
    const extra = people.filter(
      (p) =>
        !p.active &&
        ((initial?.shares?.[p.id] ?? 0) > 0 || initial?.paid_by === p.id || initial?.single_person === p.id)
    );
    return [...active, ...extra];
  }, [people, active, initial?.shares, initial?.paid_by, initial?.single_person]);

  const [v, setV] = useState<ExpenseFormValue>(() => emptyExpense(splitPeople, initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ExpenseFormValue>(key: K, val: ExpenseFormValue[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
  }

  function setPercent(id: PersonId, pct: number) {
    setV((prev) => ({ ...prev, percents: { ...prev.percents, [id]: pct } }));
  }

  function setShare(id: PersonId, amount: number) {
    setV((prev) => ({ ...prev, shares: { ...prev.shares, [id]: amount } }));
  }

  // Vista previa de cuánto le corresponde a cada uno.
  const preview = useMemo(
    () =>
      computeShares(v.total, v.split_type, splitPeople, {
        single: v.single_person,
        percents: v.percents,
        shares: v.shares,
      }),
    [v.total, v.split_type, v.single_person, v.percents, v.shares, splitPeople]
  );

  const percentSum = splitPeople.reduce((acc, p) => acc + (v.percents[p.id] ?? 0), 0);
  const sharesSum = splitPeople.reduce((acc, p) => acc + (v.shares[p.id] ?? 0), 0);
  const customRemaining = v.total - sharesSum;

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
    if (v.split_type === "percent" && percentSum <= 0) {
      setError("Poné al menos un porcentaje");
      return;
    }
    setSubmitting(true);
    try {
      // Mandamos solo las partes de las personas que participan; el server
      // recalcula igual desde split_type (no confía en el cliente).
      const shares: Record<PersonId, number> = {};
      for (const p of splitPeople) shares[p.id] = v.shares[p.id] ?? 0;
      await onSubmit({ ...v, shares });
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
        <PersonToggle value={v.paid_by} onChange={(p) => set("paid_by", p)} people={splitPeople} />
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
        <div className="grid grid-cols-2 gap-2">
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
              {opt.label}
            </button>
          ))}
        </div>

        {v.split_type === "single" && (
          <div className="mt-4">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              ¿Quién se hace cargo?
            </span>
            <PersonToggle
              value={v.single_person}
              onChange={(p) => set("single_person", p)}
              people={splitPeople}
            />
          </div>
        )}

        {v.split_type === "percent" && (
          <div className="mt-4 space-y-2">
            {splitPeople.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-600">
                  {p.name}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={v.percents[p.id] ?? 0}
                    onChange={(e) => setPercent(p.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-right text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                  />
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
            ))}
            <p
              className={cn(
                "text-xs font-medium",
                percentSum === 100 ? "text-emerald-600" : "text-amber-600"
              )}
            >
              {percentSum === 100
                ? "Los porcentajes suman 100%"
                : `Suman ${percentSum}%: se reparte en proporción`}
            </p>
          </div>
        )}

        {v.split_type === "custom" && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {splitPeople.map((p) => (
                <Field key={p.id} label={p.name}>
                  <MoneyInput value={v.shares[p.id] ?? 0} onChange={(n) => setShare(p.id, n)} />
                </Field>
              ))}
            </div>
            <p
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
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
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
            <p className="mb-1 text-slate-500">Le toca a cada uno</p>
            <ul className="space-y-0.5">
              {splitPeople.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="truncate text-slate-500">{p.name}</span>
                  <span className="font-semibold text-slate-700">
                    {formatMoney(preview[p.id] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
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
