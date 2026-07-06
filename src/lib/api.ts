// ==========================================================================
// Helpers para respuestas JSON consistentes en las API routes.
// ==========================================================================

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: unknown): NextResponse {
  return NextResponse.json({ ok: false, error: message, details: extra }, { status });
}

/** Convierte errores conocidos en respuestas JSON legibles para el usuario. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    const first = err.errors[0];
    return fail(first?.message ?? "Datos inválidos", 400, err.flatten());
  }
  const message = err instanceof Error ? err.message : "Error inesperado";
  // Errores de Google Sheets suelen incluir pistas útiles.
  console.error("[api] error:", err);
  return fail(message, 500);
}

/** Lee y parsea el body JSON de un Request, con error claro si falla. */
export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("El cuerpo del pedido no es un JSON válido");
  }
}
