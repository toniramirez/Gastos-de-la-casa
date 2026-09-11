import { handleError, ok, readJson } from "@/lib/api";
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

export async function PUT(req: Request) {
  try {
    const { store } = await requireStore();
    const body = await readJson(req);
    const input = settingsInputSchema.parse(body);
    const settings = await store.updateSettings(input);
    return ok({ settings });
  } catch (err) {
    return handleError(err);
  }
}
