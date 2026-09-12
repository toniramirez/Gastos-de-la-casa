// ==========================================================================
// Almacenamiento en memoria para desarrollo sin credenciales.
// Los datos viven en un objeto global para sobrevivir al hot-reload de Next.
// Se pierden al reiniciar el server. NO usar en producción.
// ==========================================================================

import { nowISO, todayISO } from "../format";
import { makeId } from "../ids";
import { defaultPeople } from "../people";
import type {
  Expense,
  Loan,
  PendingTicket,
  Period,
  Settings,
  Settlement,
  Transfer,
} from "../types";
import type { ExpenseInput, LoanInput } from "../validation";
import { buildExpense, buildLoan } from "./build";
import type {
  CloseResult,
  ExpenseFilters,
  LoanFilters,
  Store,
} from "./types";

interface MemoryDB {
  settings: Settings;
  periods: Period[];
  expenses: Expense[];
  loans: Loan[];
  settlements: Settlement[];
  pendingTickets: PendingTicket[];
  seeded: boolean;
}

// Persistimos entre recompilaciones de Next en dev. Una "base" por cuenta.
const g = globalThis as unknown as { __gastosMemoryDBs?: Record<string, MemoryDB> };

function dbFor(accountId: string): MemoryDB {
  const all = (g.__gastosMemoryDBs ??= {});
  if (!all[accountId]) {
    all[accountId] = {
      settings: { people: defaultPeople("Tony", "Sol") },
      periods: [],
      expenses: [],
      loans: [],
      settlements: [],
      pendingTickets: [],
      seeded: false,
    };
  }
  return all[accountId];
}

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

export class MemoryStore implements Store {
  constructor(private readonly accountId: string) {}

  private db(): MemoryDB {
    return dbFor(this.accountId);
  }

  async getSettings(): Promise<Settings> {
    return { ...this.db().settings };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const d = this.db();
    d.settings = { ...d.settings, ...patch };
    return { ...d.settings };
  }

  async listPeriods(): Promise<Period[]> {
    return [...this.db().periods].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getOpenPeriod(): Promise<Period> {
    const d = this.db();
    let open = d.periods.find((p) => p.status === "open");
    if (!open) {
      open = {
        id: makeId("per"),
        name: `Período ${d.periods.length + 1}`,
        start_date: todayISO(),
        end_date: null,
        status: "open",
        created_at: nowISO(),
      };
      d.periods.push(open);
    }
    return { ...open };
  }

  async closePeriod(input: {
    transfers: Transfer[];
    notes: string;
    nextPeriodName?: string;
  }): Promise<CloseResult> {
    const d = this.db();
    const open = await this.getOpenPeriod();
    const idx = d.periods.findIndex((p) => p.id === open.id);
    const today = todayISO();

    d.periods[idx] = { ...d.periods[idx], status: "closed", end_date: today };

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
    d.settlements.push(...settlements);

    const newPeriod: Period = {
      id: makeId("per"),
      name: input.nextPeriodName?.trim() || `Período ${d.periods.length + 1}`,
      start_date: today,
      end_date: null,
      status: "open",
      created_at: nowISO(),
    };
    d.periods.push(newPeriod);

    return { closedPeriod: d.periods[idx], newPeriod, settlements };
  }

  async listExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    return this.db()
      .expenses.filter((e) => matchesExpense(e, filters))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }

  async getExpense(id: string): Promise<Expense | null> {
    return this.db().expenses.find((e) => e.id === id) ?? null;
  }

  async createExpense(input: ExpenseInput & { period_id: string }): Promise<Expense> {
    const e = buildExpense(input, this.db().settings.people);
    this.db().expenses.push(e);
    return { ...e };
  }

  async updateExpense(id: string, input: ExpenseInput): Promise<Expense | null> {
    const d = this.db();
    const idx = d.expenses.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const updated = buildExpense(
      { ...input, period_id: d.expenses[idx].period_id },
      d.settings.people,
      d.expenses[idx]
    );
    d.expenses[idx] = updated;
    return { ...updated };
  }

  async deleteExpense(id: string): Promise<boolean> {
    const d = this.db();
    const before = d.expenses.length;
    d.expenses = d.expenses.filter((e) => e.id !== id);
    return d.expenses.length < before;
  }

  async listLoans(filters?: LoanFilters): Promise<Loan[]> {
    return this.db()
      .loans.filter((l) => matchesLoan(l, filters))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }

  async getLoan(id: string): Promise<Loan | null> {
    return this.db().loans.find((l) => l.id === id) ?? null;
  }

  async createLoan(input: LoanInput & { period_id: string }): Promise<Loan> {
    const l = buildLoan(input, this.db().settings.people);
    this.db().loans.push(l);
    return { ...l };
  }

  async updateLoan(id: string, input: LoanInput): Promise<Loan | null> {
    const d = this.db();
    const idx = d.loans.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const updated = buildLoan(
      { ...input, period_id: d.loans[idx].period_id },
      d.settings.people,
      d.loans[idx]
    );
    d.loans[idx] = updated;
    return { ...updated };
  }

  async deleteLoan(id: string): Promise<boolean> {
    const d = this.db();
    const before = d.loans.length;
    d.loans = d.loans.filter((l) => l.id !== id);
    return d.loans.length < before;
  }

  async listSettlements(periodId?: string): Promise<Settlement[]> {
    return this.db()
      .settlements.filter((s) => !periodId || s.period_id === periodId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listPendingTickets(): Promise<PendingTicket[]> {
    return [...this.db().pendingTickets].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
  }

  async getPendingTicket(id: string): Promise<PendingTicket | null> {
    return this.db().pendingTickets.find((p) => p.id === id) ?? null;
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
    this.db().pendingTickets.push(p);
    return { ...p };
  }

  async deletePendingTicket(id: string): Promise<boolean> {
    const d = this.db();
    const before = d.pendingTickets.length;
    d.pendingTickets = d.pendingTickets.filter((p) => p.id !== id);
    return d.pendingTickets.length < before;
  }
}
