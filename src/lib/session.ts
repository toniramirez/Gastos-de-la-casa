// ==========================================================================
// Sesión del lado del servidor: qué cuenta hizo el pedido.
// El middleware ya validó la firma; acá sacamos el id de la cuenta, chequeamos
// que siga existiendo y devolvemos su Store.
// ==========================================================================

import { cookies } from "next/headers";
import { getAccountName } from "./accounts";
import { HttpError } from "./api";
import { MAIN_ACCOUNT_ID, SESSION_COOKIE, SESSION_MAX_AGE, verifySessionToken } from "./auth";
import { getStore, type Store } from "./store";

export interface Session {
  accountId: string;
  name: string;
  isMain: boolean;
}

/** Sesión actual, o null si no hay (o la cuenta fue eliminada). */
export async function getSession(): Promise<Session | null> {
  const accountId = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!accountId) return null;
  const name = await getAccountName(accountId);
  if (!name) return null;
  return { accountId, name, isMain: accountId === MAIN_ACCOUNT_ID };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new HttpError("No autorizado", 401);
  return session;
}

/** Store de la cuenta que hizo el pedido. */
export async function requireStore(): Promise<{ session: Session; store: Store }> {
  const session = await requireSession();
  return { session, store: getStore(session.accountId) };
}

/** Para acciones que solo puede hacer la cuenta principal (invitar, etc). */
export async function requireMainAccount(): Promise<Session> {
  const session = await requireSession();
  if (!session.isMain) throw new HttpError("Solo la cuenta principal puede hacer esto", 403);
  return session;
}

export function setSessionCookie(token: string): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}
