import { handleError, ok } from "@/lib/api";
import { requireStore } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { store } = await requireStore();
    // Aseguramos que siempre haya un período abierto.
    await store.getOpenPeriod();
    const periods = await store.listPeriods();
    return ok(periods);
  } catch (err) {
    return handleError(err);
  }
}
