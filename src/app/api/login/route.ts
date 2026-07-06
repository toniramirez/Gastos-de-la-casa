import { cookies } from "next/headers";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { checkPin, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { pin } = loginSchema.parse(body);
    if (!checkPin(pin)) {
      return fail("PIN incorrecto", 401);
    }
    const token = await createSessionToken();
    cookies().set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
