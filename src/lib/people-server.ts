// ==========================================================================
// Resolución de la lista de personas que llega del formulario de
// Configuración. Solo server-side: genera ids nuevos (usa crypto de Node).
// ==========================================================================

import { makeId } from "./ids";
import { colorOf, nextFreeColor } from "./people";
import type { Person } from "./types";
import type { SettingsInput } from "./validation";

type PersonInput = SettingsInput["people"][number];

/**
 * Convierte lo que manda el formulario en la lista definitiva de personas.
 *
 *  - Las que traen un id conocido se actualizan (nombre, color, activa).
 *  - Las que vienen sin id (o con un id que no existe) son nuevas y se les
 *    genera un id propio y un color libre.
 *  - Las que ya existían y NO vienen en el pedido se conservan desactivadas:
 *    nunca borramos una persona que puede tener gastos viejos a su nombre.
 */
export function resolvePeople(input: PersonInput[], existing: Person[]): Person[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const people: Person[] = [];

  for (const item of input) {
    const found = item.id ? byId.get(item.id) : undefined;
    if (found) byId.delete(found.id);
    const color = item.color ? colorOf(item.color).id : found?.color ?? nextFreeColor(people);
    people.push({
      id: found?.id ?? makeId("psn"),
      name: item.name,
      color,
      active: item.active ?? found?.active ?? true,
    });
  }

  // Las que quedaron afuera del pedido siguen existiendo, pero desactivadas.
  for (const left of byId.values()) {
    people.push({ ...left, active: false });
  }

  return people;
}
