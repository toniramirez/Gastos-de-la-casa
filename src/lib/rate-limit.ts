// ==========================================================================
// Límite simple de intentos fallidos (en memoria, por instancia del server).
// Como el login es solo con contraseña, frena el probar contraseñas a mano.
// ==========================================================================

const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_FAILURES = 10;

const failures = new Map<string, { count: number; since: number }>();

export function isBlocked(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) {
    failures.set(key, { count: 1, since: Date.now() });
  } else {
    entry.count++;
  }
}

export function clearFailures(key: string): void {
  failures.delete(key);
}

/** IP del cliente (Vercel la manda en x-forwarded-for). */
export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
