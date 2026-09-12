// ==========================================================================
// Lista de personas: migración desde los dos nombres viejos y saneamiento
// de lo que viene de la hoja.
// ==========================================================================

import { describe, expect, it } from "vitest";
import {
  activePeople,
  colorOf,
  defaultPeople,
  nextFreeColor,
  parsePeople,
  peopleInBalance,
  personName,
  sanitizePeople,
  serializePeople,
  PERSON_COLORS,
} from "./people";
import type { Person } from "./types";

describe("parsePeople", () => {
  it("lee la lista guardada como JSON", () => {
    const people: Person[] = [
      { id: "tony", name: "Tony", color: "sky", active: true },
      { id: "psn_juli", name: "Juli", color: "violet", active: false },
    ];
    expect(parsePeople(serializePeople(people))).toEqual(people);
  });

  it("migra los dos nombres viejos cuando todavía no hay lista", () => {
    const people = parsePeople(undefined, { tony: "Antonio", sol: "Sole" });
    // Los ids tienen que seguir siendo "tony" y "sol": son los que ya están
    // escritos en las filas viejas de Expenses, Loans y Settlements.
    expect(people.map((p) => p.id)).toEqual(["tony", "sol"]);
    expect(people.map((p) => p.name)).toEqual(["Antonio", "Sole"]);
    expect(people.every((p) => p.active)).toBe(true);
  });

  it("usa los nombres por defecto si no hay nada guardado", () => {
    expect(parsePeople(undefined)).toEqual(defaultPeople("Tony", "Sol"));
  });

  it("si el JSON está roto cae a los nombres viejos", () => {
    const people = parsePeople("{no json", { tony: "Antonio" });
    expect(people.map((p) => p.name)).toEqual(["Antonio", "Sol"]);
  });

  it("una lista vacía no deja la app sin personas", () => {
    expect(parsePeople("[]").length).toBe(2);
  });
});

describe("sanitizePeople", () => {
  it("descarta lo que no tenga id o nombre y los ids repetidos", () => {
    const people = sanitizePeople([
      { id: "tony", name: "Tony" },
      { id: "", name: "Sin id" },
      { id: "x", name: "  " },
      { id: "tony", name: "Repetida" },
      { id: "psn_juli", name: " Juli ", active: false },
      "basura",
    ]);
    expect(people).toEqual([
      { id: "tony", name: "Tony", color: PERSON_COLORS[0].id, active: true },
      { id: "psn_juli", name: "Juli", color: PERSON_COLORS[1].id, active: false },
    ]);
  });

  it("un color desconocido se reemplaza por uno de la paleta", () => {
    const [p] = sanitizePeople([{ id: "a", name: "A", color: "fucsia-flúor" }]);
    expect(PERSON_COLORS.some((c) => c.id === p.color)).toBe(true);
  });
});

describe("colores", () => {
  it("nextFreeColor devuelve uno que no esté usado", () => {
    const people: Person[] = [
      { id: "a", name: "A", color: PERSON_COLORS[0].id, active: true },
      { id: "b", name: "B", color: PERSON_COLORS[1].id, active: true },
    ];
    expect(nextFreeColor(people)).toBe(PERSON_COLORS[2].id);
  });

  it("colorOf siempre devuelve una paleta válida", () => {
    expect(colorOf("no-existe")).toEqual(PERSON_COLORS[0]);
    expect(colorOf("pink").id).toBe("pink");
  });
});

describe("activePeople / peopleInBalance", () => {
  const people: Person[] = [
    { id: "tony", name: "Tony", color: "sky", active: true },
    { id: "sol", name: "Sol", color: "pink", active: true },
    { id: "psn_ex", name: "Ex", color: "violet", active: false },
  ];

  it("los gastos se dividen solo entre las activas", () => {
    expect(activePeople(people).map((p) => p.id)).toEqual(["tony", "sol"]);
  });

  it("si se desactivaron todas, valen todas (la app no queda sin personas)", () => {
    const ninguna = people.map((p) => ({ ...p, active: false }));
    expect(activePeople(ninguna)).toHaveLength(3);
  });

  it("en el balance aparece una persona inactiva si todavía debe o le deben", () => {
    expect(peopleInBalance(people, { tony: 5000, sol: 0, psn_ex: -5000 }).map((p) => p.id)).toEqual([
      "tony",
      "sol",
      "psn_ex",
    ]);
    expect(peopleInBalance(people, { tony: 0, sol: 0, psn_ex: 0 }).map((p) => p.id)).toEqual([
      "tony",
      "sol",
    ]);
  });

  it("personName no rompe con un id desconocido", () => {
    expect(personName(people, "tony")).toBe("Tony");
    expect(personName(people, "psn_nadie")).toBe("Alguien");
    expect(personName(people, "")).toBe("");
  });
});
