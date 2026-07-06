// ==========================================================================
// Esquemas Zod para validar todo lo que entra por las API routes.
// ==========================================================================

import { z } from "zod";
import { CATEGORIES } from "./types";

export const personSchema = z.enum(["tony", "sol"]);

export const splitTypeSchema = z.enum(["50_50", "100_tony", "100_sol", "percent", "custom"]);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

const amountSchema = z
  .number({ invalid_type_error: "El monto debe ser un número" })
  .finite()
  .nonnegative("El monto no puede ser negativo");

export const expenseInputSchema = z
  .object({
    date: dateSchema,
    description: z.string().trim().max(200).default(""),
    merchant: z.string().trim().max(120).default(""),
    category: z.enum(CATEGORIES),
    total: amountSchema.refine((v) => v > 0, "El total debe ser mayor a 0"),
    paid_by: personSchema,
    split_type: splitTypeSchema,
    // Solo para split_type = percent
    percent_tony: z.number().min(0).max(100).optional(),
    // Solo para split_type = custom
    share_tony: z.number().min(0).optional(),
    share_sol: z.number().min(0).optional(),
    notes: z.string().trim().max(500).default(""),
    source: z.enum(["manual", "ticket"]).default("manual"),
  })
  .superRefine((val, ctx) => {
    if (val.split_type === "percent" && val.percent_tony === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["percent_tony"], message: "Falta el porcentaje de Tony" });
    }
    if (val.split_type === "custom") {
      const st = val.share_tony ?? 0;
      const ss = val.share_sol ?? 0;
      if (Math.round(st + ss) !== Math.round(val.total)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["share_sol"],
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

export const settingsInputSchema = z.object({
  name_tony: z.string().trim().min(1, "El nombre no puede estar vacío").max(30),
  name_sol: z.string().trim().min(1, "El nombre no puede estar vacío").max(30),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;

export const closePeriodSchema = z.object({
  notes: z.string().trim().max(500).optional().default(""),
  // Nombre opcional para el nuevo período.
  next_period_name: z.string().trim().max(60).optional(),
});

export const loginSchema = z.object({
  pin: z.string().min(1, "Ingresá el PIN"),
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
