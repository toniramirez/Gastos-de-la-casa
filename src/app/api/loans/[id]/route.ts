import { fail, handleError, ok, readJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { loanInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const store = getStore();
    const loan = await store.getLoan(params.id);
    if (!loan) return fail("No se encontró el movimiento", 404);
    return ok(loan);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const store = getStore();
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
    const store = getStore();
    const deleted = await store.deleteLoan(params.id);
    if (!deleted) return fail("No se encontró el movimiento", 404);
    return ok({ id: params.id });
  } catch (err) {
    return handleError(err);
  }
}
