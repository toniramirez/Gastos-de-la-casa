import { fail, handleError, ok, readJson } from "@/lib/api";
import { requireStore } from "@/lib/session";
import { expenseInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { store } = await requireStore();
    const expense = await store.getExpense(params.id);
    if (!expense) return fail("No se encontró el gasto", 404);
    return ok(expense);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { store } = await requireStore();
    const body = await readJson(req);
    const input = expenseInputSchema.parse(body);
    const updated = await store.updateExpense(params.id, input);
    if (!updated) return fail("No se encontró el gasto", 404);
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { store } = await requireStore();
    const deleted = await store.deleteExpense(params.id);
    if (!deleted) return fail("No se encontró el gasto", 404);
    return ok({ id: params.id });
  } catch (err) {
    return handleError(err);
  }
}
