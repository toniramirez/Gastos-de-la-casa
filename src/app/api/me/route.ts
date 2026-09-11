import { handleError, ok } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cuenta con la que se está usando la app. */
export async function GET() {
  try {
    return ok(await requireSession());
  } catch (err) {
    return handleError(err);
  }
}
