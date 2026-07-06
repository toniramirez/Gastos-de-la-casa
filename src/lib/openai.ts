// ==========================================================================
// Helper de OpenAI para leer tickets. Usa salida estructurada (JSON schema).
// Server-side únicamente: nunca exponer OPENAI_API_KEY al frontend.
// ==========================================================================

import OpenAI from "openai";
import { CATEGORIES } from "./types";
import { ticketResultSchema, type TicketResult } from "./validation";

export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

const SYSTEM_PROMPT = `Sos un asistente que lee tickets y facturas de Argentina: supermercados, almacenes, verdulerías, farmacias, restaurantes, ferreterías y compras generales.

Tu tarea es extraer los datos del ticket de la foto y devolverlos en el formato JSON pedido.

Reglas importantes:
- Los montos son en pesos argentinos (ARS). En Argentina el punto separa miles y la coma separa decimales (ej: "1.234,56" son 1234.56 pesos). Devolvé los montos como número (ej: 1234.56).
- El dato MÁS IMPORTANTE es el TOTAL del ticket. Buscá la palabra "TOTAL". No confundas el total con subtotales, vueltos, "SU PAGO", "EFECTIVO" o descuentos.
- NO inventes montos ni datos. Si un dato no se puede leer con seguridad, devolvé null y explicá el motivo en "warnings".
- La fecha debe ir en formato YYYY-MM-DD. Si no la ves clara, devolvé null.
- Elegí la categoría más apropiada entre: ${CATEGORIES.join(", ")}. Si no encaja ninguna, usá "Otros".
- "confidence" es un número entre 0 y 1 que refleja qué tan seguro estás de la lectura (sobre todo del total).
- En "items" listá los productos que puedas leer con su cantidad y precio. Si el ticket es ilegible o no tiene items claros, dejá la lista vacía.
- En "raw_notes" podés dejar cualquier observación útil (ej: "ticket cortado", "foto borrosa en la parte del total").`;

// JSON Schema para structured outputs (strict).
const TICKET_JSON_SCHEMA = {
  name: "ticket_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      merchant: { type: ["string", "null"] },
      date: { type: ["string", "null"], description: "Formato YYYY-MM-DD o null" },
      total: { type: ["number", "null"] },
      currency: { type: "string" },
      category: { type: "string", enum: [...CATEGORIES] },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            quantity: { type: ["number", "null"] },
            unit_price: { type: ["number", "null"] },
            total_price: { type: ["number", "null"] },
          },
          required: ["name", "quantity", "unit_price", "total_price"],
        },
      },
      confidence: { type: "number" },
      warnings: { type: "array", items: { type: "string" } },
      raw_notes: { type: "string" },
    },
    required: [
      "merchant",
      "date",
      "total",
      "currency",
      "category",
      "items",
      "confidence",
      "warnings",
      "raw_notes",
    ],
  },
} as const;

export class TicketAnalysisError extends Error {}

/**
 * Analiza la imagen de un ticket (data URL base64) y devuelve datos estructurados.
 * No guarda nada: solo lee.
 */
export async function analyzeTicket(imageDataUrl: string): Promise<TicketResult> {
  if (!openaiConfigured()) {
    throw new TicketAnalysisError(
      "OpenAI no está configurado. Falta la variable OPENAI_API_KEY."
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: getModel(),
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Leé este ticket y devolvé los datos en el formato pedido. El total es lo más importante.",
            },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: TICKET_JSON_SCHEMA,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    throw new TicketAnalysisError(`No se pudo analizar el ticket: ${message}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new TicketAnalysisError("La IA no devolvió ningún dato.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TicketAnalysisError("La IA devolvió una respuesta que no se pudo leer.");
  }

  const result = ticketResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new TicketAnalysisError("La IA devolvió datos con un formato inesperado.");
  }

  // Normalizamos moneda.
  result.data.currency = "ARS";
  return result.data;
}
