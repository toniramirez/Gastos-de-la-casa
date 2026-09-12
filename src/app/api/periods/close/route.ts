import { computeSummary } from "@/lib/balance";
import { handleError, ok, readJson } from "@/lib/api";
import { requireStore } from "@/lib/session";
import { closePeriodSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cierra el período abierto:
 *  - calcula el balance de GASTOS del período desde los datos reales (no confía
 *    en el cliente),
 *  - guarda un Settlement por cada pago que haga falta para saldar (con más de
 *    dos personas pueden ser varios),
 *  - marca el período como cerrado y crea uno nuevo abierto.
 *
 * Los préstamos NO se saldan acá: la deuda de préstamos se arrastra al período
 * siguiente hasta que aparezca una devolución.
 */
export async function POST(req: Request) {
  try {
    const { store } = await requireStore();
    const body = await readJson(req);
    const { notes, next_period_name } = closePeriodSchema.parse(body);

    const [settings, period] = await Promise.all([store.getSettings(), store.getOpenPeriod()]);
    // Gastos del período (lo que se salda) + todos los préstamos (deuda que se
    // arrastra, solo para mostrarla en el resumen; no entra en los pagos).
    const [expenses, loans] = await Promise.all([
      store.listExpenses({ periodId: period.id }),
      store.listLoans(),
    ]);
    const summary = computeSummary(period, expenses, loans, settings.people);

    const result = await store.closePeriod({
      transfers: summary.gastosBalance.transfers,
      notes: notes ?? "",
      nextPeriodName: next_period_name,
    });

    return ok({
      closedPeriod: result.closedPeriod,
      newPeriod: result.newPeriod,
      settlements: result.settlements,
      summary,
    });
  } catch (err) {
    return handleError(err);
  }
}
