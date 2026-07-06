// ==========================================================================
// Autenticación simple con PIN. Sesión firmada guardada en cookie httpOnly.
// Compatible con el edge runtime (usa jose).
// ==========================================================================

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "gastos_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 días

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

/** Crea un token de sesión firmado. */
export async function createSessionToken(): Promise<string> {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

/** Verifica un token de sesión. Devuelve true si es válido. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE = SESSION_DURATION_SECONDS;
