import { handleError, ok, readJson } from "@/lib/api";
import { getStore, isUsingMemoryStore } from "@/lib/store";
import { settingsInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = getStore();
    const settings = await store.getSettings();
    return ok({ settings, usingMemory: isUsingMemoryStore() });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const store = getStore();
    const body = await readJson(req);
    const input = settingsInputSchema.parse(body);
    const settings = await store.updateSettings(input);
    return ok({ settings });
  } catch (err) {
    return handleError(err);
  }
}
