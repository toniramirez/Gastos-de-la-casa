import { fail, handleError, ok, readJson } from "@/lib/api";
import { findAccountByPassword } from "@/lib/accounts";
import { createSessionToken } from "@/lib/auth";
import { clearFailures, clientKey, isBlocked, recordFailure } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const key = clientKey(req);
    if (isBlocked(key)) {
      return fail("Demasiados intentos. Esperá unos minutos.", 429);
    }
    const body = await readJson(req);
    const { pin } = loginSchema.parse(body);
    const accountId = await findAccountByPassword(pin);
    if (!accountId) {
      recordFailure(key);
      return fail("Contraseña incorrecta", 401);
    }
    clearFailures(key);
    setSessionCookie(await createSessionToken(accountId));
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
