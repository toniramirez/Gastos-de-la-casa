import { handleError, ok } from "@/lib/api";
import { listAccountsPublic } from "@/lib/accounts";
import { requireMainAccount } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cuentas invitadas (sin contraseñas). Solo cuenta principal. */
export async function GET() {
  try {
    await requireMainAccount();
    return ok(await listAccountsPublic());
  } catch (err) {
    return handleError(err);
  }
}
