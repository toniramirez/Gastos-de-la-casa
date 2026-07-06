import { computeSummary, settlementDirection } from "@/lib/balance";
import { handleError, ok } from "@/lib/api";
import { getStore, isUsingMemoryStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = getStore();
    const [settings, period] = await Promise.all([store.getSettings(), store.getOpenPeriod()]);
    const [expenses, loans] = await Promise.all([
      store.listExpenses({ periodId: period.id }),
      store.listLoans({ periodId: period.id }),
    ]);
    const summary = computeSummary(period, expenses, loans);
    const settlement = settlementDirection(summary.balance);
    return ok({ settings, summary, settlement, usingMemory: isUsingMemoryStore() });
  } catch (err) {
    return handleError(err);
  }
}
