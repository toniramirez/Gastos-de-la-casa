// ==========================================================================
// Personas de la casa: paleta de colores, defaults y serialización.
//
// La lista de personas se guarda en la pestaña Settings, en una sola celda
// con JSON (clave "people"). Es una lista chica y así no hace falta una
// pestaña nueva ni migrar la hoja.
//
// Compatibilidad: antes había dos personas fijas con los nombres en las claves
// "name_tony" y "name_sol". Si todavía no existe la clave "people", la lista
// se arma con esos dos nombres y los ids "tony" / "sol" — los mismos ids que
// ya están escritos en las filas viejas de Expenses, Loans y Settlements.
//
// Sin dependencias de Node: este módulo también se usa en el cliente.
// ==========================================================================

import type { Person, PersonId } from "./types";

/** Acentos de color disponibles para las personas. Se aplican con `style`
 *  (no con clases de Tailwind) porque la cantidad de personas es dinámica. */
export const PERSON_COLORS = [
  { id: "sky", soft: "#e0f2fe", base: "#0ea5e9", deep: "#0369a1" },
  { id: "pink", soft: "#fce7f3", base: "#ec4899", deep: "#be185d" },
  { id: "violet", soft: "#ede9fe", base: "#8b5cf6", deep: "#6d28d9" },
  { id: "emerald", soft: "#d1fae5", base: "#10b981", deep: "#047857" },
  { id: "amber", soft: "#fef3c7", base: "#f59e0b", deep: "#b45309" },
  { id: "teal", soft: "#ccfbf1", base: "#14b8a6", deep: "#0f766e" },
  { id: "rose", soft: "#ffe4e6", base: "#f43f5e", deep: "#be123c" },
  { id: "indigo", soft: "#e0e7ff", base: "#6366f1", deep: "#4338ca" },
] as const;

export type PersonColor = (typeof PERSON_COLORS)[number];

export const DEFAULT_COLOR: PersonColor = PERSON_COLORS[0];

/** Devuelve la paleta de un color por id (o la primera si no existe). */
export function colorOf(colorId: string): PersonColor {
  return PERSON_COLORS.find((c) => c.id === colorId) ?? DEFAULT_COLOR;
}

/** Color de una persona por su id. */
export function personColor(people: Person[], id: PersonId): PersonColor {
  const found = people.find((p) => p.id === id);
  return found ? colorOf(found.color) : DEFAULT_COLOR;
}

/** El primer color que no esté usado (o vuelve a empezar si ya se usaron todos). */
export function nextFreeColor(people: Person[]): string {
  const used = new Set(people.map((p) => p.color));
  return (PERSON_COLORS.find((c) => !used.has(c.id)) ?? PERSON_COLORS[people.length % PERSON_COLORS.length]).id;
}

/** Lista inicial cuando una cuenta todavía no configuró nada. */
export function defaultPeople(firstName = "Persona 1", secondName = "Persona 2"): Person[] {
  return [
    { id: "tony", name: firstName, color: PERSON_COLORS[0].id, active: true },
    { id: "sol", name: secondName, color: PERSON_COLORS[1].id, active: true },
  ];
}

/** Nombre visible de una persona. Si el id no está en la lista (por ejemplo un
 *  gasto viejo de alguien borrado a mano de la hoja), mostramos algo legible. */
export function personName(people: Person[], id: PersonId | ""): string {
  if (!id) return "";
  return people.find((p) => p.id === id)?.name ?? "Alguien";
}

/** Solo las personas que hoy participan de los gastos. */
export function activePeople(people: Person[]): Person[] {
  const active = people.filter((p) => p.active);
  // Nunca dejamos la app sin personas: si se desactivaron todas, valen todas.
  return active.length > 0 ? active : people;
}

/** Personas que hay que mostrar en un balance: las activas más cualquier
 *  inactiva que todavía tenga plata a favor o en contra. */
export function peopleInBalance(people: Person[], nets: Record<PersonId, number>): Person[] {
  return people.filter((p) => p.active || Math.round(nets[p.id] ?? 0) !== 0);
}

// --- Serialización (hoja Settings) ------------------------------------------

/** Limpia una lista leída de afuera: descarta lo que no tenga id o nombre y
 *  completa los campos que falten. */
export function sanitizePeople(raw: unknown): Person[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const people: Person[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    people.push({
      id,
      name,
      color: typeof o.color === "string" && o.color ? colorOf(o.color).id : PERSON_COLORS[people.length % PERSON_COLORS.length].id,
      active: o.active === undefined ? true : Boolean(o.active),
    });
  }
  return people;
}

/** Lee la lista de personas de la hoja. `raw` es el JSON de la clave "people";
 *  si está vacío, se cae a los nombres viejos (name_tony / name_sol). */
export function parsePeople(raw: string | undefined, legacy?: { tony?: string; sol?: string }): Person[] {
  if (raw) {
    try {
      const people = sanitizePeople(JSON.parse(raw));
      if (people.length > 0) return people;
    } catch {
      // JSON roto: seguimos con el fallback de abajo.
    }
  }
  return defaultPeople(legacy?.tony || "Tony", legacy?.sol || "Sol");
}

export function serializePeople(people: Person[]): string {
  return JSON.stringify(people);
}
