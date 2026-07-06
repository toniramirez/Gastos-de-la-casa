import { computeSummary, settlementDirection } from "@/lib/balance";
import { handleError, ok } from "@/lib/api";
import { getStore, isUsingMemoryStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = getStore();
    const [settings, period] = await Promise.all([store.getSettings(), store.getOpenPeriod()]);
    // Gastos: solo del período actual. Préstamos: TODOS (la deuda se arrastra
    // entre períodos y no se salda al cerrar).
    const [expenses, loans] = await Promise.all([
      store.listExpenses({ periodId: period.id }),
      store.listLoans(),
    ]);
    const summary = computeSummary(period, expenses, loans);
    // El settlement del período es solo por gastos; los préstamos van aparte.
    const settlement = settlementDirection(summary.gastosBalance);
    return ok({ settings, summary, settlement, usingMemory: isUsingMemoryStore() });
  } catch (err) {
    return handleError(err);
  }
}
