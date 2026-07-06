// ==========================================================================
// Cliente de bajo nivel para Google Sheets. Autenticación con service account.
// Operaciones genéricas sobre "tablas" (una pestaña = una tabla con headers).
// ==========================================================================

import { google, type sheets_v4 } from "googleapis";
import { SHEETS, type SheetName } from "../sheets-schema";

let cachedSheets: sheets_v4.Sheets | null = null;
let cachedSheetIds: Record<string, number> | null = null;

export function sheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Falta GOOGLE_SHEET_ID");
  return id;
}

function getClient(): sheets_v4.Sheets {
  if (cachedSheets) return cachedSheets;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error("Faltan credenciales de la service account");

  // Vercel/entornos guardan la clave con \n escapados: los volvemos saltos reales.
  const key = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedSheets = google.sheets({ version: "v4", auth });
  return cachedSheets;
}

/** Devuelve el sheetId numérico de cada pestaña (necesario para borrar filas). */
async function getSheetIds(): Promise<Record<string, number>> {
  if (cachedSheetIds) return cachedSheetIds;
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  const map: Record<string, number> = {};
  for (const s of meta.data.sheets ?? []) {
    const title = s.properties?.title;
    const sheetId = s.properties?.sheetId;
    if (title && typeof sheetId === "number") map[title] = sheetId;
  }
  cachedSheetIds = map;
  return map;
}

/** Lee todas las filas de datos (sin el header) como objetos por columna. */
export async function readTable(
  sheetName: SheetName
): Promise<Array<Record<string, string>>> {
  const sheets = getClient();
  const headers = SHEETS[sheetName] as readonly string[];
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A2:Z`,
  });
  const rows = res.data.values ?? [];
  return rows
    .filter((r) => r.some((c) => c !== "" && c != null))
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] != null ? String(row[i]) : "";
      });
      return obj;
    });
}

function toRow(sheetName: SheetName, obj: object): unknown[] {
  const headers = SHEETS[sheetName] as readonly string[];
  const rec = obj as Record<string, unknown>;
  return headers.map((h) => {
    const v = rec[h];
    if (v == null) return "";
    return v;
  });
}

/** Agrega una fila al final de la pestaña. */
export async function appendRow(sheetName: SheetName, obj: object): Promise<void> {
  const sheets = getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [toRow(sheetName, obj)] },
  });
}

/** Encuentra el número de fila (1-based, incluyendo header) donde keyCol == keyVal. */
async function findRowNumber(
  sheetName: SheetName,
  keyCol: string,
  keyVal: string
): Promise<number | null> {
  const headers = SHEETS[sheetName] as readonly string[];
  const colIndex = headers.indexOf(keyCol);
  if (colIndex === -1) return null;
  const sheets = getClient();
  const colLetter = String.fromCharCode(65 + colIndex);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!${colLetter}2:${colLetter}`,
  });
  const vals = res.data.values ?? [];
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0] ?? "") === keyVal) {
      return i + 2; // +2: fila 1 es header, y el array arranca en fila 2
    }
  }
  return null;
}

/** Actualiza (reemplaza) la fila cuyo keyCol == keyVal. Devuelve true si existía. */
export async function updateRow(
  sheetName: SheetName,
  keyCol: string,
  keyVal: string,
  obj: object
): Promise<boolean> {
  const rowNumber = await findRowNumber(sheetName, keyCol, keyVal);
  if (rowNumber == null) return false;
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [toRow(sheetName, obj)] },
  });
  return true;
}

/** Borra físicamente la fila cuyo keyCol == keyVal. Devuelve true si existía. */
export async function deleteRow(
  sheetName: SheetName,
  keyCol: string,
  keyVal: string
): Promise<boolean> {
  const rowNumber = await findRowNumber(sheetName, keyCol, keyVal);
  if (rowNumber == null) return false;
  const sheets = getClient();
  const sheetIds = await getSheetIds();
  const sheetId = sheetIds[sheetName];
  if (sheetId == null) return false;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1, // 0-based
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
  return true;
}

/** Resetea las cachés (útil en tests / scripts). */
export function resetSheetsCache(): void {
  cachedSheets = null;
  cachedSheetIds = null;
}
