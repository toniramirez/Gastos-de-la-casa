"use client";

import { useMemo, useState } from "react";
import { formatMoney, todayISO } from "@/lib/format";
import type { LoanType, PersonId } from "@/lib/types";
import { usePeople } from "@/components/Providers";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { PersonToggle } from "@/components/ui/PersonToggle";
import { cn } from "@/lib/cn";

export interface LoanFormValue {
  date: string;
  type: LoanType;
  from_person: PersonId;
  to_person: PersonId;
  amount: number;
  notes: string;
}

export function emptyLoan(
  from: PersonId,
  to: PersonId,
  overrides?: Partial<LoanFormValue>
): LoanFormValue {
  return {
    date: todayISO(),
    type: "prestamo",
    from_person: from,
    to_person: to,
    amount: 0,
    notes: "",
    ...overrides,
  };
}

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
  const { people, active, nameOf } = usePeople();

  // Para editar un movimiento viejo también dejamos elegir a quien ya no está.
  const options = useMemo(() => {
    const extra = people.filter(
      (p) => !p.active && (initial?.from_person === p.id || initial?.to_person === p.id)
    );
    return [...active, ...extra];
  }, [people, active, initial?.from_person, initial?.to_person]);

  const [v, setV] = useState<LoanFormValue>(() =>
    emptyLoan(options[0]?.id ?? "", options[1]?.id ?? options[0]?.id ?? "", initial)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Al cambiar el origen, si coincide con el destino movemos el destino. */
  function setFrom(from: PersonId) {
    setV((prev) => ({
      ...prev,
      from_person: from,
      to_person: prev.to_person === from ? options.find((p) => p.id !== from)?.id ?? "" : prev.to_person,
    }));
  }

  function setTo(to: PersonId) {
    setV((prev) => ({
      ...prev,
      to_person: to,
      from_person: prev.from_person === to ? options.find((p) => p.id !== to)?.id ?? "" : prev.from_person,
    }));
  }

  const verb = v.type === "prestamo" ? "le presta a" : "le devuelve a";
  const sentence =
    v.amount > 0
      ? `${nameOf(v.from_person)} ${verb} ${nameOf(v.to_person)} ${formatMoney(v.amount)}`
      : `${nameOf(v.from_person)} ${verb} ${nameOf(v.to_person)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (v.amount <= 0) {
      setError("Ingresá un monto mayor a 0");
      return;
    }
    if (!v.from_person || !v.to_person || v.from_person === v.to_person) {
      setError("Elegí dos personas distintas");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
        <span className="mb-2 block text-sm font-medium text-slate-700">Tipo de movimiento</span>
        <div className="grid grid-cols-2 gap-2">
          {(["prestamo", "devolucion"] as LoanType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setV((prev) => ({ ...prev, type: t }))}
              className={cn(
                "press h-12 rounded-2xl border-2 font-semibold transition-all duration-200",
                v.type === t
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-glow-sm"
                  : "border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300"
              )}
            >
              {t === "prestamo" ? "Préstamo" : "Devolución"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            ¿Quién {v.type === "prestamo" ? "presta" : "devuelve"}?
          </span>
          <PersonToggle value={v.from_person} onChange={setFrom} people={options} />
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">¿A quién?</span>
          <PersonToggle
            value={v.to_person}
            onChange={setTo}
            people={options.filter((p) => p.id !== v.from_person)}
          />
        </div>
        <p className="rounded-2xl bg-slate-50 px-4 py-2.5 text-center text-sm font-medium text-slate-600">
          {sentence}
        </p>
      </div>

      <div className="rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Monto</span>
        <MoneyInput value={v.amount} onChange={(n) => setV((prev) => ({ ...prev, amount: n }))} autoFocus />
      </div>

      <div className="space-y-4 rounded-3xl bg-white/90 p-4 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm">
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
