import { fail, handleError, ok } from "@/lib/api";
import { requireMainAccount } from "@/lib/session";
import { getAccountStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Anula un link de invitación. Solo cuenta principal. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireMainAccount();
    const deleted = await getAccountStore().deleteInvite(params.id);
    if (!deleted) return fail("No se encontró la invitación", 404);
    return ok({ id: params.id });
  } catch (err) {
    return handleError(err);
  }
}
