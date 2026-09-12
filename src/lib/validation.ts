// ==========================================================================
// Esquemas Zod para validar todo lo que entra por las API routes.
// ==========================================================================

import { z } from "zod";
import { CATEGORIES, parseSplitType } from "./types";

/** Máximo de personas por cuenta. Es un tope de sentido común: la UI (y la
 *  paleta de colores) están pensadas para una casa, no para un consorcio. */
export const MAX_PEOPLE = 10;

/** Id de persona. No validamos contra la lista acá (eso necesita leer la
 *  configuración); lo hace el store al construir el gasto o el préstamo. */
export const personSchema = z.string().trim().min(1, "Falta la persona");

/** Acepta los tipos nuevos y los viejos ("50_50", "100_tony", "100_sol"). */
export const splitTypeSchema = z
  .enum(["equal", "single", "percent", "custom", "50_50", "100_tony", "100_sol"])
  .transform((v) => parseSplitType(v));

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

const amountSchema = z
  .number({ invalid_type_error: "El monto debe ser un número" })
  .finite()
  .nonnegative("El monto no puede ser negativo");

/** Mapa persona -> número (partes o porcentajes). */
const perPersonNumbers = z.record(z.string(), z.number().finite().min(0));

function sumValues(map: Record<string, number> | undefined): number {
  if (!map) return 0;
  return Object.values(map).reduce((a, b) => a + b, 0);
}

export const expenseInputSchema = z
  .object({
    date: dateSchema,
    description: z.string().trim().max(200).default(""),
    merchant: z.string().trim().max(120).default(""),
    category: z.enum(CATEGORIES),
    group: z.enum(["dia_a_dia", "tarjeta", "fijos"]).default("dia_a_dia"),
    total: amountSchema.refine((v) => v > 0, "El total debe ser mayor a 0"),
    paid_by: personSchema,
    split_type: splitTypeSchema,
    // Solo para split_type = single: quién se come todo el gasto.
    single_person: personSchema.optional(),
    // Solo para split_type = percent: porcentaje de cada persona.
    percents: perPersonNumbers.optional(),
    // Solo para split_type = custom: monto de cada persona.
    shares: perPersonNumbers.optional(),
    notes: z.string().trim().max(500).default(""),
    source: z.enum(["manual", "ticket"]).default("manual"),
  })
  .superRefine((val, ctx) => {
    if (val.split_type === "single" && !val.single_person) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["single_person"],
        message: "Elegí quién se hace cargo del gasto",
      });
    }
    if (val.split_type === "percent" && sumValues(val.percents) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percents"],
        message: "Faltan los porcentajes",
      });
    }
    if (val.split_type === "custom") {
      if (Math.round(sumValues(val.shares)) !== Math.round(val.total)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["shares"],
          message: "Las partes personalizadas deben sumar el total",
        });
      }
    }
  });

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const loanInputSchema = z
  .object({
    date: dateSchema,
    type: z.enum(["prestamo", "devolucion"]),
    from_person: personSchema,
    to_person: personSchema,
    amount: amountSchema.refine((v) => v > 0, "El monto debe ser mayor a 0"),
    notes: z.string().trim().max(500).default(""),
  })
  .refine((v) => v.from_person !== v.to_person, {
    message: "El origen y el destino no pueden ser la misma persona",
    path: ["to_person"],
  });

export type LoanInput = z.infer<typeof loanInputSchema>;

/** Una persona tal como llega del formulario de Configuración. Sin `id` = es
 *  nueva y el server le genera uno. */
export const personInputSchema = z.object({
  id: z.string().trim().max(60).optional(),
  name: z.string().trim().min(1, "El nombre no puede estar vacío").max(30, "El nombre es muy largo"),
  color: z.string().trim().max(20).optional(),
  active: z.boolean().optional(),
});

export const settingsInputSchema = z.object({
  people: z
    .array(personInputSchema)
    .min(1, "Tiene que haber al menos una persona")
    .max(MAX_PEOPLE, `No se pueden cargar más de ${MAX_PEOPLE} personas`)
    .refine(
      (people) => people.filter((p) => p.active !== false).length >= 2,
      "Tienen que quedar al menos dos personas activas"
    ),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;

export const closePeriodSchema = z.object({
  notes: z.string().trim().max(500).optional().default(""),
  // Nombre opcional para el nuevo período.
  next_period_name: z.string().trim().max(60).optional(),
});

export const loginSchema = z.object({
  // Se llama "pin" por compatibilidad: es el PIN de la principal o la
  // contraseña de una cuenta invitada.
  pin: z.string().min(1, "Ingresá la contraseña"),
});

export const registerSchema = z.object({
  token: z.string().min(1, "Falta la invitación"),
  name: z.string().trim().min(1, "Poné un nombre").max(30, "El nombre es muy largo"),
  password: z
    .string()
    .min(4, "La contraseña tiene que tener al menos 4 caracteres")
    .max(100, "La contraseña es muy larga"),
});

// Esquema con el que validamos lo que devuelve OpenAI al leer un ticket.
export const ticketResultSchema = z.object({
  merchant: z.string().nullable().default(null),
  date: z.string().nullable().default(null),
  total: z.number().nullable().default(null),
  currency: z.string().default("ARS"),
  category: z.enum(CATEGORIES).default("Otros"),
  items: z
    .array(
      z.object({
        name: z.string().default(""),
        quantity: z.number().nullable().default(null),
        unit_price: z.number().nullable().default(null),
        total_price: z.number().nullable().default(null),
      })
    )
    .default([]),
  confidence: z.number().min(0).max(1).default(0),
  warnings: z.array(z.string()).default([]),
  raw_notes: z.string().default(""),
});

export type TicketResult = z.infer<typeof ticketResultSchema>;
