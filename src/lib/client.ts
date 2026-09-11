// ==========================================================================
// Helper de fetch para el frontend. Todas las respuestas tienen forma
// { ok: true, data } | { ok: false, error }.
// ==========================================================================

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const PUBLIC_PAGES = ["/login", "/invitacion"];

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No hay conexión. Revisá tu internet.", 0);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // sin cuerpo
  }

  const payload = json as { ok?: boolean; data?: T; error?: string } | null;

  // Sesión vencida o cuenta eliminada: volvemos al login. En las páginas
  // públicas no, porque ahí un 401 es normal (y redirigir las recarga en loop).
  if (res.status === 401 && typeof window !== "undefined" && !isPublicPage(window.location.pathname)) {
    window.location.href = "/login";
  }

  if (!res.ok || !payload?.ok) {
    const message = payload?.error || `Error ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
