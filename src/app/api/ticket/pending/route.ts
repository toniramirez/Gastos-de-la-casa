import { fail, handleError, ok, readJson } from "@/lib/api";
import { requireStore } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  image?: string; // data URL base64 (ya comprimida en el cliente)
  note?: string;
}

export async function GET() {
  try {
    const { store } = await requireStore();
    const pending = await store.listPendingTickets();
    return ok(pending);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { store } = await requireStore();
    const body = await readJson<Body>(req);
    const image = body.image;
    if (!image || !image.startsWith("data:image/")) {
      return fail("Enviá una imagen válida del ticket.", 400);
    }
    const period = await store.getOpenPeriod();
    const pending = await store.createPendingTicket({
      period_id: period.id,
      note: (body.note ?? "").trim(),
      image,
    });
    return ok(pending, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
