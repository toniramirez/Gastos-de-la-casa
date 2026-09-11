// ==========================================================================
// Definición de las pestañas y columnas de Google Sheets.
// Fuente única de verdad usada por el SheetsStore y por el script de init.
// El ORDEN de las columnas importa: así se leen y escriben las filas.
// Columnas nuevas SIEMPRE al final, así las filas viejas se siguen leyendo
// bien. `account_id` vacío = cuenta principal (datos de antes de las cuentas).
// ==========================================================================

export const SHEETS = {
  Settings: ["key", "value"],
  Periods: ["id", "name", "start_date", "end_date", "status", "created_at", "account_id"],
  Expenses: [
    "id",
    "period_id",
    "date",
    "description",
    "merchant",
    "category",
    "group",
    "total",
    "paid_by",
    "split_type",
    "share_tony",
    "share_sol",
    "created_by",
    "source",
    "notes",
    "ticket_image_url",
    "created_at",
    "updated_at",
    "account_id",
  ],
  Loans: [
    "id",
    "period_id",
    "date",
    "type",
    "from_person",
    "to_person",
    "amount",
    "notes",
    "created_at",
    "updated_at",
    "account_id",
  ],
  Settlements: [
    "id",
    "period_id",
    "date",
    "from_person",
    "to_person",
    "amount",
    "notes",
    "created_at",
    "account_id",
  ],
  AuditLog: ["id", "date", "action", "entity", "entity_id", "details", "account_id"],
  PendingTickets: ["id", "period_id", "note", "image", "created_at", "account_id"],
  // Cuentas invitadas. La principal no está acá: entra con APP_PIN.
  Accounts: ["id", "name", "password_hash", "invite_id", "created_at"],
  // Links de invitación (el id es el token del link). De un solo uso.
  Invites: ["id", "created_at", "expires_at", "used_at", "account_id"],
} as const;

export type SheetName = keyof typeof SHEETS;

export const SHEET_NAMES = Object.keys(SHEETS) as SheetName[];
