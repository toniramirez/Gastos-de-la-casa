import { handleError, ok, readJson } from "@/lib/api";
import { requireStore } from "@/lib/session";
import { loanInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { store } = await requireStore();
    const { searchParams } = new URL(req.url);
    let periodId = searchParams.get("periodId") ?? undefined;
    if (!periodId || periodId === "current") {
      const open = await store.getOpenPeriod();
      periodId = open.id;
    } else if (periodId === "all") {
      periodId = undefined;
    }
    const loans = await store.listLoans({
      periodId,
      search: searchParams.get("search") ?? undefined,
    });
    return ok(loans);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { store } = await requireStore();
    const body = await readJson(req);
    const input = loanInputSchema.parse(body);
    const period = await store.getOpenPeriod();
    const loan = await store.createLoan({ ...input, period_id: period.id });
    return ok(loan, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
