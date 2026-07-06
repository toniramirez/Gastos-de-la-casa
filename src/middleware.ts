// ==========================================================================
// Protege todas las rutas excepto el login. Verifica la cookie de sesión.
// Corre en el edge runtime (jose es compatible).
// ==========================================================================

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Rutas públicas (no requieren sesión).
const PUBLIC_PATHS = ["/login", "/api/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);
  if (valid) return NextResponse.next();

  // API => 401 JSON. Páginas => redirect al login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Excluimos estáticos y assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|apple-icon.png).*)"],
};
