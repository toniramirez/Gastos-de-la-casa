import { fail, handleError, ok, readJson } from "@/lib/api";
import { requireStore } from "@/lib/session";
import { loanInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { store } = await requireStore();
    const loan = await store.getLoan(params.id);
    if (!loan) return fail("No se encontró el movimiento", 404);
    return ok(loan);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { store } = await requireStore();
    const body = await readJson(req);
    const input = loanInputSchema.parse(body);
    const updated = await store.updateLoan(params.id, input);
    if (!updated) return fail("No se encontró el movimiento", 404);
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { store } = await requireStore();
    const deleted = await store.deleteLoan(params.id);
    if (!deleted) return fail("No se encontró el movimiento", 404);
    return ok({ id: params.id });
  } catch (err) {
    return handleError(err);
  }
}
