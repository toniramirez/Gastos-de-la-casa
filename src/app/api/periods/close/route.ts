import { computeSummary, settlementDirection } from "@/lib/balance";
import { handleError, ok, readJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { closePeriodSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cierra el período abierto:
 *  - calcula el balance de GASTOS del período desde los datos reales (no confía
 *    en el cliente),
 *  - guarda un Settlement si hay deuda por gastos,
 *  - marca el período como cerrado y crea uno nuevo abierto.
 *
 * Los préstamos NO se saldan acá: la deuda de préstamos se arrastra al período
 * siguiente hasta que aparezca una devolución.
 */
export async function POST(req: Request) {
  try {
    const store = getStore();
    const body = await readJson(req);
    const { notes, next_period_name } = closePeriodSchema.parse(body);

    const period = await store.getOpenPeriod();
    // Gastos del período (lo que se salda) + todos los préstamos (deuda que se
    // arrastra, solo para mostrarla en el resumen; no entra en el settlement).
    const [expenses, loans] = await Promise.all([
      store.listExpenses({ periodId: period.id }),
      store.listLoans(),
    ]);
    const summary = computeSummary(period, expenses, loans);
    const direction = settlementDirection(summary.gastosBalance);

    const result = await store.closePeriod({
      from: direction?.from ?? null,
      to: direction?.to ?? null,
      amount: direction?.amount ?? 0,
      notes: notes ?? "",
      nextPeriodName: next_period_name,
    });

    return ok({
      closedPeriod: result.closedPeriod,
      newPeriod: result.newPeriod,
      settlement: result.settlement,
      summary,
    });
  } catch (err) {
    return handleError(err);
  }
}
