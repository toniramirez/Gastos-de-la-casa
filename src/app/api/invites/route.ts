import { handleError, ok } from "@/lib/api";
import { createInvite, listPendingInvites } from "@/lib/accounts";
import { requireMainAccount } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Invitaciones que todavía se pueden usar. Solo cuenta principal. */
export async function GET() {
  try {
    await requireMainAccount();
    return ok(await listPendingInvites());
  } catch (err) {
    return handleError(err);
  }
}

/** Genera un link de invitación nuevo. Solo cuenta principal. */
export async function POST() {
  try {
    await requireMainAccount();
    return ok(await createInvite(), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
