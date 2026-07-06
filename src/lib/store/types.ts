// ==========================================================================
// Interfaz del almacenamiento. Dos implementaciones: Google Sheets y memoria.
// ==========================================================================

import type {
  Expense,
  Loan,
  PendingTicket,
  Period,
  Settings,
  Settlement,
} from "../types";
import type { ExpenseInput, LoanInput } from "../validation";

export interface ExpenseFilters {
  periodId?: string;
  category?: string;
  paidBy?: string;
  search?: string;
}

export interface LoanFilters {
  periodId?: string;
  search?: string;
}

export interface CloseResult {
  closedPeriod: Period;
  newPeriod: Period;
  settlement: Settlement | null;
}

export interface Store {
  // --- Settings ---
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  // --- Periods ---
  listPeriods(): Promise<Period[]>;
  /** Devuelve el período abierto; si no hay ninguno, crea uno. */
  getOpenPeriod(): Promise<Period>;
  closePeriod(input: {
    from: "tony" | "sol" | null;
    to: "tony" | "sol" | null;
    amount: number;
    notes: string;
    nextPeriodName?: string;
  }): Promise<CloseResult>;

  // --- Expenses ---
  listExpenses(filters?: ExpenseFilters): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | null>;
  createExpense(input: ExpenseInput & { period_id: string }): Promise<Expense>;
  updateExpense(id: string, input: ExpenseInput): Promise<Expense | null>;
  deleteExpense(id: string): Promise<boolean>;

  // --- Loans ---
  listLoans(filters?: LoanFilters): Promise<Loan[]>;
  getLoan(id: string): Promise<Loan | null>;
  createLoan(input: LoanInput & { period_id: string }): Promise<Loan>;
  updateLoan(id: string, input: LoanInput): Promise<Loan | null>;
  deleteLoan(id: string): Promise<boolean>;

  // --- Settlements (solo lectura por ahora) ---
  listSettlements(periodId?: string): Promise<Settlement[]>;

  // --- Pending tickets (modo rápido: foto guardada para confirmar después) ---
  listPendingTickets(): Promise<PendingTicket[]>;
  getPendingTicket(id: string): Promise<PendingTicket | null>;
  createPendingTicket(input: {
    period_id: string;
    note: string;
    image: string;
  }): Promise<PendingTicket>;
  deletePendingTicket(id: string): Promise<boolean>;
}
