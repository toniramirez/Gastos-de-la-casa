// ==========================================================================
// Autenticación simple. Sesión firmada guardada en cookie httpOnly.
// La cuenta principal entra con el PIN (APP_PIN); las cuentas invitadas con
// su propia contraseña. El token lleva el id de la cuenta.
// Compatible con el edge runtime (usa jose).
// ==========================================================================

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "gastos_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 días

/** Id de la cuenta principal (la que existía antes de las invitaciones). Las
 *  filas viejas de la hoja, sin account_id, pertenecen a esta cuenta. */
export const MAIN_ACCOUNT_ID = "main";

function getSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.APP_PIN ||
    "dev-secret-cambiar-en-produccion";
  return new TextEncoder().encode(secret);
}

/** PIN configurado. En dev, si no se setea, es 1234. */
export function getConfiguredPin(): string {
  return process.env.APP_PIN || "1234";
}

/** Compara el PIN ingresado con el configurado (comparación de tiempo constante). */
export function checkPin(pin: string): boolean {
  const expected = getConfiguredPin();
  if (pin.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= pin.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Crea un token de sesión firmado para una cuenta. */
export async function createSessionToken(accountId: string): Promise<string> {
  return new SignJWT({ ok: true, acc: accountId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

/** Verifica un token de sesión. Devuelve el id de la cuenta o null si no es
 *  válido. Los tokens viejos (sin `acc`) son de la cuenta principal, así las
 *  sesiones abiertas antes de este cambio siguen funcionando. */
export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.acc === "string" && payload.acc ? payload.acc : MAIN_ACCOUNT_ID;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DURATION_SECONDS;
