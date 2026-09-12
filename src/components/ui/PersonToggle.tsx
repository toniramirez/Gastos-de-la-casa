"use client";

import { usePeople } from "@/components/Providers";
import { colorOf } from "@/lib/people";
import { cn } from "@/lib/cn";
import type { Person, PersonId } from "@/lib/types";

/** Selector de persona. Muestra un botón por persona activa y se acomoda a
 *  cuántas haya (dos al lado de la otra, tres o más en varias filas). */
export function PersonToggle({
  value,
  onChange,
  people,
  className,
}: {
  value: PersonId;
  onChange: (id: PersonId) => void;
  /** Por defecto, las personas activas de la cuenta. */
  people?: Person[];
  className?: string;
}) {
  const { active } = usePeople();
  const options = people ?? active;
  return (
    <div
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${options.length > 2 ? "6rem" : "7rem"}, 1fr))` }}
    >
      {options.map((p) => (
        <PersonOption key={p.id} person={p} active={value === p.id} onClick={() => onChange(p.id)} />
      ))}
    </div>
  );
}

function PersonOption({
  person,
  active,
  onClick,
}: {
  person: Person;
  active: boolean;
  onClick: () => void;
}) {
  const color = colorOf(person.color);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press h-12 truncate rounded-2xl border-2 px-2 font-semibold transition-all duration-200",
        active
          ? "scale-[1.02]"
          : "border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:bg-white"
      )}
      style={
        active
          ? {
              borderColor: color.base,
              backgroundColor: color.soft,
              color: color.deep,
              boxShadow: `0 8px 20px -8px ${color.base}80`,
            }
          : undefined
      }
    >
      {person.name}
    </button>
  );
}

/** Puntito con el color de una persona, para las listas. */
export function PersonDot({ id, className }: { id: PersonId; className?: string }) {
  const { colorFor } = usePeople();
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: colorFor(id).base }}
    />
  );
}

/** Nombre de una persona con su color. */
export function PersonName({ id, className }: { id: PersonId; className?: string }) {
  const { nameOf, colorFor } = usePeople();
  return (
    <span className={cn("font-semibold", className)} style={{ color: colorFor(id).deep }}>
      {nameOf(id)}
    </span>
  );
}
