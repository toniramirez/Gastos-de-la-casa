import { computeSummary } from "@/lib/balance";
import { handleError, ok } from "@/lib/api";
import { isUsingMemoryStore } from "@/lib/store";
import { requireStore } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { store } = await requireStore();
    const [settings, period] = await Promise.all([store.getSettings(), store.getOpenPeriod()]);
    // Gastos: solo del período actual. Préstamos: TODOS (la deuda se arrastra
    // entre períodos y no se salda al cerrar).
    const [expenses, loans] = await Promise.all([
      store.listExpenses({ periodId: period.id }),
      store.listLoans(),
    ]);
    const summary = computeSummary(period, expenses, loans, settings.people);
    // Los pagos del período son solo por gastos; los préstamos van aparte.
    return ok({
      settings,
      summary,
      transfers: summary.gastosBalance.transfers,
      usingMemory: isUsingMemoryStore(),
    });
  } catch (err) {
    return handleError(err);
  }
}
