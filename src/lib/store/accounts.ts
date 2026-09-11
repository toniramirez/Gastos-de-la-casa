// ==========================================================================
// Almacenamiento de cuentas invitadas y links de invitación.
// Dos implementaciones, igual que el Store: Google Sheets y memoria.
// La cuenta principal no vive acá: entra con APP_PIN (ver lib/auth.ts).
// ==========================================================================

import type { Account, Invite } from "../types";
import { appendRow, deleteRow, readTable, updateRow } from "./sheets-client";

export interface AccountStore {
  listAccounts(): Promise<Account[]>;
  createAccount(account: Account): Promise<void>;
  deleteAccount(id: string): Promise<boolean>;

  listInvites(): Promise<Invite[]>;
  getInvite(id: string): Promise<Invite | null>;
  createInvite(invite: Invite): Promise<void>;
  updateInvite(invite: Invite): Promise<void>;
  deleteInvite(id: string): Promise<boolean>;
}

function rowToAccount(r: Record<string, string>): Account {
  return {
    id: r.id,
    name: r.name,
    password_hash: r.password_hash,
    invite_id: r.invite_id || "",
    created_at: r.created_at,
  };
}

function rowToInvite(r: Record<string, string>): Invite {
  return {
    id: r.id,
    created_at: r.created_at,
    expires_at: r.expires_at,
    used_at: r.used_at || "",
    account_id: r.account_id || "",
  };
}

export class SheetsAccountStore implements AccountStore {
  async listAccounts(): Promise<Account[]> {
    return (await readTable("Accounts")).map(rowToAccount);
  }

  async createAccount(account: Account): Promise<void> {
    await appendRow("Accounts", account);
  }

  deleteAccount(id: string): Promise<boolean> {
    return deleteRow("Accounts", "id", id);
  }

  async listInvites(): Promise<Invite[]> {
    return (await readTable("Invites")).map(rowToInvite);
  }

  async getInvite(id: string): Promise<Invite | null> {
    return (await this.listInvites()).find((i) => i.id === id) ?? null;
  }

  async createInvite(invite: Invite): Promise<void> {
    await appendRow("Invites", invite);
  }

  async updateInvite(invite: Invite): Promise<void> {
    await updateRow("Invites", "id", invite.id, invite);
  }

  deleteInvite(id: string): Promise<boolean> {
    return deleteRow("Invites", "id", id);
  }
}

interface MemoryAccountsDB {
  accounts: Account[];
  invites: Invite[];
}

const g = globalThis as unknown as { __gastosMemoryAccounts?: MemoryAccountsDB };

function mem(): MemoryAccountsDB {
  return (g.__gastosMemoryAccounts ??= { accounts: [], invites: [] });
}

export class MemoryAccountStore implements AccountStore {
  async listAccounts(): Promise<Account[]> {
    return mem().accounts.map((a) => ({ ...a }));
  }

  async createAccount(account: Account): Promise<void> {
    mem().accounts.push({ ...account });
  }

  async deleteAccount(id: string): Promise<boolean> {
    const d = mem();
    const before = d.accounts.length;
    d.accounts = d.accounts.filter((a) => a.id !== id);
    return d.accounts.length < before;
  }

  async listInvites(): Promise<Invite[]> {
    return mem().invites.map((i) => ({ ...i }));
  }

  async getInvite(id: string): Promise<Invite | null> {
    const found = mem().invites.find((i) => i.id === id);
    return found ? { ...found } : null;
  }

  async createInvite(invite: Invite): Promise<void> {
    mem().invites.push({ ...invite });
  }

  async updateInvite(invite: Invite): Promise<void> {
    const d = mem();
    d.invites = d.invites.map((i) => (i.id === invite.id ? { ...invite } : i));
  }

  async deleteInvite(id: string): Promise<boolean> {
    const d = mem();
    const before = d.invites.length;
    d.invites = d.invites.filter((i) => i.id !== id);
    return d.invites.length < before;
  }
}
