// ==========================================================================
// Lógica de cuentas: login por contraseña, invitaciones y registro.
// Solo server-side (usa crypto de Node y el store).
// ==========================================================================

import { randomBytes } from "crypto";
import { checkPin, MAIN_ACCOUNT_ID } from "./auth";
import { HttpError } from "./api";
import { nowISO } from "./format";
import { makeId } from "./ids";
import { hashPassword, verifyPassword } from "./passwords";
import { getAccountStore, getStore } from "./store";
import type { Account, Invite } from "./types";

export const MAIN_ACCOUNT_NAME = "Cuenta principal";
const INVITE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const ACCOUNT_CACHE_MS = 60 * 1000;

// --- Cache de cuentas --------------------------------------------------------
// Cada pedido autenticado de una cuenta invitada chequea que la cuenta siga
// existiendo. Cacheamos la lista un rato para no leer la hoja en cada pedido.

let accountsCache: { at: number; accounts: Account[] } | null = null;

async function listAccountsCached(): Promise<Account[]> {
  if (accountsCache && Date.now() - accountsCache.at < ACCOUNT_CACHE_MS) {
    return accountsCache.accounts;
  }
  const accounts = await getAccountStore().listAccounts();
  accountsCache = { at: Date.now(), accounts };
  return accounts;
}

function invalidateAccountsCache(): void {
  accountsCache = null;
}

/** Nombre visible de una cuenta, o null si ya no existe. */
export async function getAccountName(accountId: string): Promise<string | null> {
  if (accountId === MAIN_ACCOUNT_ID) return MAIN_ACCOUNT_NAME;
  const found = (await listAccountsCached()).find((a) => a.id === accountId);
  return found?.name ?? null;
}

// --- Login -------------------------------------------------------------------

/** Busca la cuenta a la que corresponde una contraseña. Primero el PIN de la
 *  principal; después las invitadas. Devuelve el id o null. */
export async function findAccountByPassword(password: string): Promise<string | null> {
  if (checkPin(password)) return MAIN_ACCOUNT_ID;
  const accounts = await getAccountStore().listAccounts();
  const found = accounts.find((a) => verifyPassword(password, a.password_hash));
  return found?.id ?? null;
}

// --- Invitaciones ------------------------------------------------------------

export type InviteStatus = "valid" | "used" | "expired" | "missing";

export function inviteStatus(invite: Invite | null): InviteStatus {
  if (!invite) return "missing";
  if (invite.used_at) return "used";
  if (new Date(invite.expires_at).getTime() < Date.now()) return "expired";
  return "valid";
}

export async function createInvite(): Promise<Invite> {
  const now = Date.now();
  const invite: Invite = {
    id: randomBytes(18).toString("base64url"),
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + INVITE_DURATION_MS).toISOString(),
    used_at: "",
    account_id: "",
  };
  await getAccountStore().createInvite(invite);
  return invite;
}

/** Invitaciones que todavía se pueden usar (para mostrarlas en Configuración). */
export async function listPendingInvites(): Promise<Invite[]> {
  const invites = await getAccountStore().listInvites();
  return invites
    .filter((i) => inviteStatus(i) === "valid")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getInviteStatus(token: string): Promise<InviteStatus> {
  return inviteStatus(await getAccountStore().getInvite(token));
}

// --- Registro ----------------------------------------------------------------

/** Crea una cuenta nueva a partir de un link de invitación. Devuelve su id. */
export async function registerWithInvite(input: {
  token: string;
  name: string;
  password: string;
}): Promise<string> {
  const store = getAccountStore();
  const invite = await store.getInvite(input.token);
  const status = inviteStatus(invite);
  if (status === "missing") throw new HttpError("La invitación no existe.", 404);
  if (status === "used") throw new HttpError("Esta invitación ya se usó.", 410);
  if (status === "expired") throw new HttpError("La invitación venció. Pedí un link nuevo.", 410);

  // El login es solo con contraseña, así que no puede repetirse entre cuentas.
  if (await findAccountByPassword(input.password)) {
    throw new HttpError("Esa contraseña no está disponible. Elegí otra.", 409);
  }

  const account: Account = {
    id: makeId("acc"),
    name: input.name,
    password_hash: hashPassword(input.password),
    invite_id: invite!.id,
    created_at: nowISO(),
  };
  await store.createAccount(account);
  await store.updateInvite({ ...invite!, used_at: nowISO(), account_id: account.id });
  invalidateAccountsCache();

  // Nombres iniciales de la cuenta nueva (se pueden cambiar en Configuración).
  await getStore(account.id).updateSettings({ name_tony: input.name, name_sol: "Persona 2" });
  return account.id;
}

// --- Administración (solo cuenta principal) ----------------------------------

export async function listAccountsPublic(): Promise<Array<Pick<Account, "id" | "name" | "created_at">>> {
  const accounts = await getAccountStore().listAccounts();
  return accounts
    .map(({ id, name, created_at }) => ({ id, name, created_at }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Quita el acceso de una cuenta invitada. Sus datos quedan en la hoja. */
export async function deleteAccount(id: string): Promise<boolean> {
  const ok = await getAccountStore().deleteAccount(id);
  invalidateAccountsCache();
  return ok;
}
