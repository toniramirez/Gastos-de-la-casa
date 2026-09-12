// ==========================================================================
// Implementación del Store sobre Google Sheets.
// ==========================================================================

import { MAIN_ACCOUNT_ID } from "../auth";
import { nowISO, todayISO } from "../format";
import { makeId } from "../ids";
import { parsePeople, serializePeople } from "../people";
import {
  parseSplitType,
  type Category,
  type Expense,
  type ExpenseGroup,
  type ExpenseSource,
  type Loan,
  type LoanType,
  type PendingTicket,
  type Period,
  type PeriodStatus,
  type Person,
  type PersonId,
  type Settings,
  type Settlement,
  type Shares,
  type Transfer,
} from "../types";
import type { ExpenseInput, LoanInput } from "../validation";
import { buildExpense, buildLoan } from "./build";
import {
  appendRow,
  deleteRow,
  readTable,
  updateRow,
} from "./sheets-client";
import type { SheetName } from "../sheets-schema";
import type {
  CloseResult,
  ExpenseFilters,
  LoanFilters,
  Store,
} from "./types";

function num(v: string | undefined): number {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function personId(v: string | undefined): PersonId {
  return String(v ?? "").trim();
}

/** Partes de un gasto. La fuente de verdad es la columna "shares" (JSON); si
 *  la fila es vieja (de cuando eran dos personas fijas) se arma con las
 *  columnas share_tony / share_sol. Exportada para tests. */
export function parseShares(r: Record<string, string>): Shares {
  if (r.shares) {
    try {
      const parsed = JSON.parse(r.shares) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const shares: Shares = {};
        for (const [id, value] of Object.entries(parsed)) {
          if (id) shares[id] = Math.round(Number(value) || 0);
        }
        return shares;
      }
    } catch {
      // JSON roto: caemos a las columnas viejas.
    }
  }
  if (r.share_tony || r.share_sol) {
    return { tony: num(r.share_tony), sol: num(r.share_sol) };
  }
  return {};
}

/** Entidad -> fila. Guardamos las partes como JSON y además seguimos
 *  llenando share_tony / share_sol cuando esas personas participan, así la
 *  hoja se puede leer de un vistazo. Exportada para tests. */
export function expenseToRow(e: Expense): Record<string, unknown> {
  return {
    ...e,
    shares: JSON.stringify(e.shares ?? {}),
    share_tony: e.shares?.tony ?? "",
    share_sol: e.shares?.sol ?? "",
  };
}

// --- Parsers de fila -> entidad --------------------------------------------

function rowToPeriod(r: Record<string, string>): Period {
  return {
    id: r.id,
    name: r.name,
    start_date: r.start_date,
    end_date: r.end_date || null,
    status: (r.status as PeriodStatus) === "closed" ? "closed" : "open",
    created_at: r.created_at,
  };
}

function rowToExpense(r: Record<string, string>): Expense {
  return {
    id: r.id,
    period_id: r.period_id,
    date: r.date,
    description: r.description,
    merchant: r.merchant,
    category: (r.category as Category) || "Otros",
    group: (r.group as ExpenseGroup) || "dia_a_dia",
    total: num(r.total),
    paid_by: personId(r.paid_by),
    split_type: parseSplitType(r.split_type),
    shares: parseShares(r),
    created_by: personId(r.created_by),
    source: (r.source as ExpenseSource) || "manual",
    notes: r.notes,
    ticket_image_url: r.ticket_image_url || "",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function rowToLoan(r: Record<string, string>): Loan {
  return {
    id: r.id,
    period_id: r.period_id,
    date: r.date,
    type: (r.type as LoanType) === "devolucion" ? "devolucion" : "prestamo",
    from_person: personId(r.from_person),
    to_person: personId(r.to_person),
    amount: num(r.amount),
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function rowToPendingTicket(r: Record<string, string>): PendingTicket {
  return {
    id: r.id,
    period_id: r.period_id,
    note: r.note || "",
    image: r.image || "",
    created_at: r.created_at,
  };
}

function rowToSettlement(r: Record<string, string>): Settlement {
  return {
    id: r.id,
    period_id: r.period_id,
    date: r.date,
    from_person: personId(r.from_person),
    to_person: personId(r.to_person),
    amount: num(r.amount),
    notes: r.notes,
    created_at: r.created_at,
  };
}

// --- Filtros (mismos criterios que MemoryStore) ----------------------------

function matchesExpense(e: Expense, f?: ExpenseFilters): boolean {
  if (!f) return true;
  if (f.periodId && e.period_id !== f.periodId) return false;
  if (f.category && e.category !== f.category) return false;
  if (f.paidBy && e.paid_by !== f.paidBy) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    if (!`${e.description} ${e.merchant} ${e.notes}`.toLowerCase().includes(q)) return false;
  }
  return true;
}

function matchesLoan(l: Loan, f?: LoanFilters): boolean {
  if (!f) return true;
  if (f.periodId && l.period_id !== f.periodId) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    if (!`${l.notes}`.toLowerCase().includes(q)) return false;
  }
  return true;
}

/** Cuenta dueña de una fila. Vacío = principal (filas de antes de las cuentas). */
function rowAccount(r: Record<string, string>): string {
  return r.account_id || MAIN_ACCOUNT_ID;
}

/** Cada instancia ve y escribe solo los datos de una cuenta. */
export class SheetsStore implements Store {
  constructor(private readonly accountId: string) {}

  /** Filas de la pestaña que pertenecen a esta cuenta. */
  private async readOwn(sheetName: SheetName): Promise<Array<Record<string, string>>> {
    const rows = await readTable(sheetName);
    return rows.filter((r) => rowAccount(r) === this.accountId);
  }

  private append(sheetName: SheetName, obj: object): Promise<void> {
    return appendRow(sheetName, { ...obj, account_id: this.accountId });
  }

  /** Reemplaza la fila completa: siempre reescribimos el account_id para no
   *  "mover" la fila a otra cuenta por dejarlo vacío. */
  private update(sheetName: SheetName, id: string, obj: object): Promise<boolean> {
    return updateRow(sheetName, "id", id, { ...obj, account_id: this.accountId });
  }

  /** Clave en la pestaña Settings. La principal usa las claves de siempre;
   *  las invitadas llevan prefijo "<accountId>:". */
  private settingsKey(key: string): string {
    return this.accountId === MAIN_ACCOUNT_ID ? key : `${this.accountId}:${key}`;
  }

  async getSettings(): Promise<Settings> {
    const rows = await readTable("Settings");
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    // Si todavía no existe la clave "people", la lista se arma con los dos
    // nombres viejos (name_tony / name_sol).
    return {
      people: parsePeople(map[this.settingsKey("people")], {
        tony: map[this.settingsKey("name_tony")],
        sol: map[this.settingsKey("name_sol")],
      }),
    };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    if (patch.people) {
      const key = this.settingsKey("people");
      const value = serializePeople(patch.people);
      const existed = await updateRow("Settings", "key", key, { key, value });
      if (!existed) await appendRow("Settings", { key, value });
    }
    return this.getSettings();
  }

  /** Las personas de la cuenta (para validar y dividir los gastos). */
  private async people(): Promise<Person[]> {
    return (await this.getSettings()).people;
  }

  async listPeriods(): Promise<Period[]> {
    const rows = await this.readOwn("Periods");
    return rows.map(rowToPeriod).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getOpenPeriod(): Promise<Period> {
    const periods = await this.readOwn("Periods");
    const openRow = periods.find((p) => (p.status || "open") === "open");
    if (openRow) return rowToPeriod(openRow);

    const period: Period = {
      id: makeId("per"),
      name: `Período ${periods.length + 1}`,
      start_date: todayISO(),
      end_date: null,
      status: "open",
      created_at: nowISO(),
    };
    await this.append("Periods", period);
    return period;
  }

  async closePeriod(input: {
    transfers: Transfer[];
    notes: string;
    nextPeriodName?: string;
  }): Promise<CloseResult> {
    const open = await this.getOpenPeriod();
    const today = todayISO();

    const closedPeriod: Period = { ...open, status: "closed", end_date: today };
    await this.update("Periods", open.id, closedPeriod);

    // Un Settlement por pago: con tres o más personas puede haber varios.
    const settlements: Settlement[] = input.transfers
      .filter((t) => t.amount > 0)
      .map((t) => ({
        id: makeId("set"),
        period_id: open.id,
        date: today,
        from_person: t.from,
        to_person: t.to,
        amount: Math.round(t.amount),
        notes: input.notes,
        created_at: nowISO(),
      }));
    for (const settlement of settlements) {
      await this.append("Settlements", settlement);
    }

    const ownPeriods = await this.readOwn("Periods");
    const newPeriod: Period = {
      id: makeId("per"),
      name: input.nextPeriodName?.trim() || `Período ${ownPeriods.length + 1}`,
      start_date: today,
      end_date: null,
      status: "open",
      created_at: nowISO(),
    };
    await this.append("Periods", newPeriod);

    const totalSaldado = settlements.reduce((acc, s) => acc + s.amount, 0);
    await this.audit("close_period", "period", open.id, `settlements=${settlements.length} total=${totalSaldado}`);
    return { closedPeriod, newPeriod, settlements };
  }

  async listExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    const rows = await this.readOwn("Expenses");
    return rows
      .map(rowToExpense)
      .filter((e) => matchesExpense(e, filters))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }

  async getExpense(id: string): Promise<Expense | null> {
    const rows = await this.readOwn("Expenses");
    const found = rows.find((r) => r.id === id);
    return found ? rowToExpense(found) : null;
  }

  async createExpense(input: ExpenseInput & { period_id: string }): Promise<Expense> {
    const e = buildExpense(input, await this.people());
    await this.append("Expenses", expenseToRow(e));
    await this.audit("create", "expense", e.id, `${e.total}`);
    return e;
  }

  async updateExpense(id: string, input: ExpenseInput): Promise<Expense | null> {
    const existing = await this.getExpense(id);
    if (!existing) return null;
    const updated = buildExpense({ ...input, period_id: existing.period_id }, await this.people(), existing);
    const ok = await this.update("Expenses", id, expenseToRow(updated));
    if (!ok) return null;
    await this.audit("update", "expense", id, `${updated.total}`);
    return updated;
  }

  async deleteExpense(id: string): Promise<boolean> {
    if (!(await this.getExpense(id))) return false;
    const ok = await deleteRow("Expenses", "id", id);
    if (ok) await this.audit("delete", "expense", id, "");
    return ok;
  }

  async listLoans(filters?: LoanFilters): Promise<Loan[]> {
    const rows = await this.readOwn("Loans");
    return rows
      .map(rowToLoan)
      .filter((l) => matchesLoan(l, filters))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }

  async getLoan(id: string): Promise<Loan | null> {
    const rows = await this.readOwn("Loans");
    const found = rows.find((r) => r.id === id);
    return found ? rowToLoan(found) : null;
  }

  async createLoan(input: LoanInput & { period_id: string }): Promise<Loan> {
    const l = buildLoan(input, await this.people());
    await this.append("Loans", l);
    await this.audit("create", "loan", l.id, `${l.amount}`);
    return l;
  }

  async updateLoan(id: string, input: LoanInput): Promise<Loan | null> {
    const existing = await this.getLoan(id);
    if (!existing) return null;
    const updated = buildLoan({ ...input, period_id: existing.period_id }, await this.people(), existing);
    const ok = await this.update("Loans", id, updated);
    if (!ok) return null;
    await this.audit("update", "loan", id, `${updated.amount}`);
    return updated;
  }

  async deleteLoan(id: string): Promise<boolean> {
    if (!(await this.getLoan(id))) return false;
    const ok = await deleteRow("Loans", "id", id);
    if (ok) await this.audit("delete", "loan", id, "");
    return ok;
  }

  async listSettlements(periodId?: string): Promise<Settlement[]> {
    const rows = await this.readOwn("Settlements");
    return rows
      .map(rowToSettlement)
      .filter((s) => !periodId || s.period_id === periodId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listPendingTickets(): Promise<PendingTicket[]> {
    const rows = await this.readOwn("PendingTickets");
    return rows
      .map(rowToPendingTicket)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getPendingTicket(id: string): Promise<PendingTicket | null> {
    const rows = await this.readOwn("PendingTickets");
    const found = rows.find((r) => r.id === id);
    return found ? rowToPendingTicket(found) : null;
  }

  async createPendingTicket(input: {
    period_id: string;
    note: string;
    image: string;
  }): Promise<PendingTicket> {
    const p: PendingTicket = {
      id: makeId("pnd"),
      period_id: input.period_id,
      note: input.note,
      image: input.image,
      created_at: nowISO(),
    };
    await this.append("PendingTickets", p);
    await this.audit("create", "pending_ticket", p.id, "");
    return p;
  }

  async deletePendingTicket(id: string): Promise<boolean> {
    if (!(await this.getPendingTicket(id))) return false;
    const ok = await deleteRow("PendingTickets", "id", id);
    if (ok) await this.audit("delete", "pending_ticket", id, "");
    return ok;
  }

  private async audit(action: string, entity: string, entityId: string, details: string): Promise<void> {
    try {
      await this.append("AuditLog", {
        id: makeId("log"),
        date: nowISO(),
        action,
        entity,
        entity_id: entityId,
        details,
      });
    } catch {
      // El audit no debe romper la operación principal.
    }
  }
}
