import { fail, handleError, ok, readJson } from "@/lib/api";
import { analyzeTicket, openaiConfigured, TicketAnalysisError } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  image?: string; // data URL base64
}

export async function POST(req: Request) {
  try {
    if (!openaiConfigured()) {
      return fail(
        "La lectura de tickets no está disponible: falta configurar OPENAI_API_KEY.",
        503
      );
    }
    const body = await readJson<Body>(req);
    const image = body.image;
    if (!image || !image.startsWith("data:image/")) {
      return fail("Enviá una imagen válida del ticket.", 400);
    }
    const result = await analyzeTicket(image);
    return ok(result);
  } catch (err) {
    if (err instanceof TicketAnalysisError) {
      return fail(err.message, 502);
    }
    return handleError(err);
  }
}
