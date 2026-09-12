"use client";

// ==========================================================================
// Editor de las personas de la casa: agregar, renombrar, cambiar el color y
// sacar (desactivar) personas.
//
// Sacar a alguien NO borra nada: la persona queda desactivada, sus gastos
// viejos siguen contando en los períodos cerrados y se puede reactivar.
// Siempre tienen que quedar al menos dos personas activas.
// ==========================================================================

import { useEffect, useState } from "react";
import { Plus, RotateCcw, UserMinus, X } from "lucide-react";
import { usePeople, useToast } from "@/components/Providers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import { colorOf, nextFreeColor, PERSON_COLORS } from "@/lib/people";
import type { Person } from "@/lib/types";
import { MAX_PEOPLE } from "@/lib/validation";

/** Fila del editor. Sin `id` = persona nueva que todavía no se guardó. */
interface Row {
  id?: string;
  name: string;
  color: string;
  active: boolean;
  /** Clave estable para React (los ids nuevos todavía no existen). */
  key: string;
}

let rowKey = 0;

function toRows(people: Person[]): Row[] {
  return people.map((p) => ({ ...p, key: `p-${p.id}` }));
}

export function PeopleCard() {
  const { people, refreshPeople } = usePeople();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>(() => toRows(people));
  const [saving, setSaving] = useState(false);

  // Si las personas cambian por fuera (otra pestaña), tomamos la lista nueva
  // salvo que estemos en medio de una edición sin guardar.
  useEffect(() => {
    setRows((prev) => (prev.some((r) => !r.id) ? prev : toRows(people)));
  }, [people]);

  const activeRows = rows.filter((r) => r.active);
  const inactiveRows = rows.filter((r) => !r.active);
  const canAdd = rows.length < MAX_PEOPLE;
  const canSave = rows.every((r) => r.name.trim().length > 0) && activeRows.length >= 2;

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function add() {
    setRows((prev) => [
      ...prev,
      {
        name: "",
        color: nextFreeColor(prev.map((r) => ({ ...r, id: r.id ?? "" }) as Person)),
        active: true,
        key: `new-${++rowKey}`,
      },
    ]);
  }

  /** Pasa al siguiente color de la paleta. */
  function cycleColor(row: Row) {
    const i = PERSON_COLORS.findIndex((c) => c.id === row.color);
    update(row.key, { color: PERSON_COLORS[(i + 1) % PERSON_COLORS.length].id });
  }

  async function save() {
    setSaving(true);
    try {
      await api.put("/api/settings", {
        people: rows.map((r) => ({
          id: r.id,
          name: r.name.trim(),
          color: r.color,
          active: r.active,
        })),
      });
      await refreshPeople();
      toast("Personas guardadas", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="animate-fade-up space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Personas</h2>
        <p className="mt-1 text-xs text-slate-400">
          Los gastos se dividen entre las personas activas. Tocá el círculo para cambiarle el color.
        </p>
      </div>

      <ul className="space-y-2">
        {activeRows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cycleColor(row)}
              aria-label="Cambiar color"
              className="press h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-card"
              style={{ backgroundColor: colorOf(row.color).base }}
            />
            <Input
              value={row.name}
              onChange={(e) => update(row.key, { name: e.target.value })}
              placeholder="Nombre"
              maxLength={30}
              className="py-2.5"
            />
            {row.id ? (
              <button
                type="button"
                onClick={() => update(row.key, { active: false })}
                disabled={activeRows.length <= 2}
                title={
                  activeRows.length <= 2
                    ? "Tienen que quedar al menos dos personas"
                    : "Sacar de los gastos"
                }
                className={cn(
                  "press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  activeRows.length <= 2
                    ? "text-slate-300"
                    : "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                )}
              >
                <UserMinus className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                title="Descartar"
                className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={add}
        disabled={!canAdd}
        className={cn(
          "press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-sm font-semibold transition-colors",
          canAdd
            ? "border-slate-200 text-slate-500 hover:border-brand-400 hover:text-brand-600"
            : "border-slate-100 text-slate-300"
        )}
      >
        <Plus className="h-4 w-4" />
        {canAdd ? "Agregar persona" : `Máximo ${MAX_PEOPLE} personas`}
      </button>

      {inactiveRows.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Fuera de los gastos
          </p>
          <ul className="space-y-2">
            {inactiveRows.map((row) => (
              <li key={row.key} className="flex items-center gap-2">
                <span
                  className="h-7 w-7 shrink-0 rounded-full opacity-40"
                  style={{ backgroundColor: colorOf(row.color).base }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-500">{row.name}</span>
                <button
                  type="button"
                  onClick={() => update(row.key, { active: true })}
                  className="press flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reactivar
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400">
            Sus gastos viejos siguen contando en los períodos donde estaban.
          </p>
        </div>
      )}

      <Button fullWidth onClick={save} loading={saving} disabled={!canSave}>
        Guardar personas
      </Button>
      {!canSave && (
        <p className="text-xs font-medium text-amber-600">
          {activeRows.length < 2
            ? "Tienen que quedar al menos dos personas activas."
            : "Completá el nombre de todas las personas."}
        </p>
      )}
    </Card>
  );
}
