import { fail, handleError, ok } from "@/lib/api";
import { deleteAccount } from "@/lib/accounts";
import { requireMainAccount } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quita el acceso de una cuenta invitada. Solo cuenta principal. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireMainAccount();
    const deleted = await deleteAccount(params.id);
    if (!deleted) return fail("No se encontró la cuenta", 404);
    return ok({ id: params.id });
  } catch (err) {
    return handleError(err);
  }
}
