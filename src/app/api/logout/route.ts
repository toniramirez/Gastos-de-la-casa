import { cookies } from "next/headers";
import { ok } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  cookies().delete(SESSION_COOKIE);
  return ok({ ok: true });
}
