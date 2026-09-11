import { fail, handleError, ok, readJson } from "@/lib/api";
import { getInviteStatus, registerWithInvite } from "@/lib/accounts";
import { createSessionToken } from "@/lib/auth";
import { clientKey, isBlocked, recordFailure } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ruta pública: estado de un link de invitación (?token=...). */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    if (!token) return ok({ status: "missing" });
    return ok({ status: await getInviteStatus(token) });
  } catch (err) {
    return handleError(err);
  }
}

/** Ruta pública: crea la cuenta con el link de invitación y deja la sesión iniciada. */
export async function POST(req: Request) {
  try {
    const key = clientKey(req);
    if (isBlocked(key)) {
      return fail("Demasiados intentos. Esperá unos minutos.", 429);
    }
    const body = await readJson(req);
    const input = registerSchema.parse(body);
    let accountId: string;
    try {
      accountId = await registerWithInvite(input);
    } catch (err) {
      // Probar contraseñas acá también cuenta como intento fallido.
      recordFailure(key);
      throw err;
    }
    setSessionCookie(await createSessionToken(accountId));
    return ok({ ok: true }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
