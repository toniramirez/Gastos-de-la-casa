import { fail, handleError, ok } from "@/lib/api";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const store = getStore();
    const pending = await store.getPendingTicket(params.id);
    if (!pending) return fail("No se encontró el ticket pendiente", 404);
    return ok(pending);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const store = getStore();
    const deleted = await store.deletePendingTicket(params.id);
    if (!deleted) return fail("No se encontró el ticket pendiente", 404);
    return ok({ id: params.id });
  } catch (err) {
    return handleError(err);
  }
}
