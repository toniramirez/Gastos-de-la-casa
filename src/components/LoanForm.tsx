"use client";

import { useState } from "react";
import { formatMoney, todayISO } from "@/lib/format";
import type { LoanType, Person } from "@/lib/types";
import { useNames } from "@/components/Providers";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { PersonToggle } from "@/components/ui/PersonToggle";
import { cn } from "@/lib/cn";

export interface LoanFormValue {
  date: string;
  type: LoanType;
  from_person: Person;
  to_person: Person;
  amount: number;
  notes: string;
}

export function emptyLoan(overrides?: Partial<LoanFormValue>): LoanFormValue {
  return {
    date: todayISO(),
    type: "prestamo",
    from_person: "tony",
    to_person: "sol",
    amount: 0,
    notes: "",
    ...overrides,
  };
}

const other = (p: Person): Person => (p === "tony" ? "sol" : "tony");

export function LoanForm({
  initial,
  submitLabel = "Guardar",
  onSubmit,
  onCancel,
}: {
  initial?: Partial<LoanFormValue>;
  submitLabel?: string;
  onSubmit: (value: LoanFormValue) => Promise<void>;
  onCancel?: () => void;
}) {
  const { names } = useNames();
  const [v, setV] = useState<LoanFormValue>(emptyLoan(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setFrom(from: Person) {
    setV((prev) => ({ ...prev, from_person: from, to_person: other(from) }));
  }

  const verb = v.type === "prestamo" ? "le presta a" : "le devuelve a";
  const sentence =
    v.amount > 0
      ? `${names[v.from_person]} ${verb} ${names[v.to_person]} ${formatMoney(v.amount)}`
      : `${names[v.from_person]} ${verb} ${names[v.to_person]}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (v.amount <= 0) {
      setError("Ingresá un monto mayor a 0");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ ...v, to_person: other(v.from_person) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-card">
        <span className="mb-2 block text-sm font-medium text-slate-700">Tipo de movimiento</span>
        <div className="grid grid-cols-2 gap-2">
          {(["prestamo", "devolucion"] as LoanType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setV((prev) => ({ ...prev, type: t }))}
              className={cn(
                "h-12 rounded-2xl border-2 font-semibold transition-colors",
                v.type === t
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-500"
              )}
            >
              {t === "prestamo" ? "Préstamo" : "Devolución"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-card">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          ¿Quién {v.type === "prestamo" ? "presta" : "devuelve"}?
        </span>
        <PersonToggle value={v.from_person} onChange={setFrom} />
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-2.5 text-center text-sm font-medium text-slate-600">
          {sentence}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-card">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Monto</span>
        <MoneyInput value={v.amount} onChange={(n) => setV((prev) => ({ ...prev, amount: n }))} autoFocus />
      </div>

      <div className="space-y-4 rounded-3xl bg-white p-4 shadow-card">
        <Field label="Fecha">
          <Input type="date" value={v.date} onChange={(e) => setV((prev) => ({ ...prev, date: e.target.value }))} />
        </Field>
        <Field label="Nota (opcional)">
          <Textarea
            value={v.notes}
            onChange={(e) => setV((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Motivo…"
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
