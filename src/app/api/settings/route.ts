import { handleError, ok, readJson } from "@/lib/api";
import { resolvePeople } from "@/lib/people-server";
import { isUsingMemoryStore } from "@/lib/store";
import { requireStore } from "@/lib/session";
import { settingsInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { store } = await requireStore();
    const settings = await store.getSettings();
    return ok({ settings, usingMemory: isUsingMemoryStore() });
  } catch (err) {
    return handleError(err);
  }
}

/** Guarda la lista de personas: nombres, colores, altas y bajas. Las personas
 *  nuevas (sin id) reciben uno acá; las que se sacan quedan desactivadas para
 *  no romper el historial. */
export async function PUT(req: Request) {
  try {
    const { store } = await requireStore();
    const body = await readJson(req);
    const input = settingsInputSchema.parse(body);
    const current = await store.getSettings();
    const settings = await store.updateSettings({
      people: resolvePeople(input.people, current.people),
    });
    return ok({ settings });
  } catch (err) {
    return handleError(err);
  }
}
