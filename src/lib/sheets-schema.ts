// ==========================================================================
// Definición de las pestañas y columnas de Google Sheets.
// Fuente única de verdad usada por el SheetsStore y por el script de init.
// El ORDEN de las columnas importa: así se leen y escriben las filas.
// ==========================================================================

export const SHEETS = {
  Settings: ["key", "value"],
  Periods: ["id", "name", "start_date", "end_date", "status", "created_at"],
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
  ],
  AuditLog: ["id", "date", "action", "entity", "entity_id", "details"],
  PendingTickets: ["id", "period_id", "note", "image", "created_at"],
} as const;

export type SheetName = keyof typeof SHEETS;

export const SHEET_NAMES = Object.keys(SHEETS) as SheetName[];
