// ==========================================================================
// Inicializa la hoja de cálculo que usamos como base de datos.
//
// Qué hace:
//   1. Se conecta con la service account (mismas credenciales que la app).
//   2. Crea las pestañas que falten (según sheets-schema.ts).
//   3. Escribe la fila de encabezados en cada pestaña.
//   4. Deja el encabezado fijo (freeze) y en negrita.
//
// Es idempotente: podés correrlo varias veces sin romper nada. No borra datos.
//
// Uso:  npm run init-sheets
// ==========================================================================

import "dotenv/config";
import { google } from "googleapis";
import { SHEETS, SHEET_NAMES, type SheetName } from "../src/lib/sheets-schema";

// dotenv/config lee .env por defecto; forzamos también .env.local si existe.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`\n❌ Falta la variable de entorno ${name}.`);
    console.error("   Copiá .env.example a .env.local y completá las credenciales de Google.\n");
    process.exit(1);
  }
  return v;
}

async function main() {
  const spreadsheetId = requireEnv("GOOGLE_SHEET_ID");
  const email = requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const rawKey = requireEnv("GOOGLE_PRIVATE_KEY");
  const key = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  console.log(`\n🔌 Conectando a la hoja ${spreadsheetId} ...`);

  // 1. Leer las pestañas que ya existen.
  let meta;
  try {
    meta = await sheets.spreadsheets.get({ spreadsheetId });
  } catch (err: any) {
    console.error("\n❌ No pude abrir la hoja. Revisá que:");
    console.error("   • GOOGLE_SHEET_ID sea el ID correcto (lo que va entre /d/ y /edit en la URL).");
    console.error("   • Hayas compartido la hoja con el email de la service account (como Editor).");
    console.error("   • La API de Google Sheets esté habilitada en el proyecto de Google Cloud.\n");
    console.error("Detalle:", err?.message ?? err);
    process.exit(1);
  }

  const existing = new Map<string, number>();
  for (const s of meta.data.sheets ?? []) {
    const title = s.properties?.title;
    const id = s.properties?.sheetId;
    if (title && typeof id === "number") existing.set(title, id);
  }

  // 2. Crear las pestañas que falten.
  const missing = SHEET_NAMES.filter((name) => !existing.has(name));
  if (missing.length > 0) {
    console.log(`➕ Creando pestañas: ${missing.join(", ")}`);
    const res = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
    for (const reply of res.data.replies ?? []) {
      const props = reply.addSheet?.properties;
      if (props?.title && typeof props.sheetId === "number") {
        existing.set(props.title, props.sheetId);
      }
    }
  } else {
    console.log("✓ Todas las pestañas ya existían.");
  }

  // 3. Escribir encabezados en cada pestaña.
  for (const name of SHEET_NAMES) {
    const headers = SHEETS[name as SheetName] as readonly string[];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${name}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers as string[]] },
    });
    console.log(`✓ ${name}: ${headers.length} columnas → ${headers.join(", ")}`);
  }

  // 4. Encabezado fijo + en negrita (cosmético, ayuda al editar a mano).
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: SHEET_NAMES.flatMap((name) => {
        const sheetId = existing.get(name);
        if (sheetId == null) return [];
        return [
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
        ];
      }),
    },
  });

  console.log("\n✅ Hoja inicializada. Ya podés arrancar la app con las credenciales cargadas.\n");
}

main().catch((err) => {
  console.error("\n❌ Error inesperado:", err?.message ?? err, "\n");
  process.exit(1);
});
