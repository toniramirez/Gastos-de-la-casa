import { handleError, ok, readJson } from "@/lib/api";
import { requireStore } from "@/lib/session";
import { expenseInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { store } = await requireStore();
    const { searchParams } = new URL(req.url);
    let periodId = searchParams.get("periodId") ?? undefined;
    // "current" => período abierto.
    if (!periodId || periodId === "current") {
      const open = await store.getOpenPeriod();
      periodId = open.id;
    } else if (periodId === "all") {
      periodId = undefined;
    }
    const expenses = await store.listExpenses({
      periodId,
      category: searchParams.get("category") ?? undefined,
      paidBy: searchParams.get("paidBy") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return ok(expenses);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { store } = await requireStore();
    const body = await readJson(req);
    const input = expenseInputSchema.parse(body);
    const period = await store.getOpenPeriod();
    const expense = await store.createExpense({ ...input, period_id: period.id });
    return ok(expense, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
