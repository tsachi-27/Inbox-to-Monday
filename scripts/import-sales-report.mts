import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

// Reads the monthly Priority ERP sales export Tsachi drops in this folder
// (one .xlsx per month, named "YYYY-MM.xlsx") and upserts every row into
// SalesRecord, keyed by Order # so re-running on the same file is safe.
//
// Two file shapes are supported, auto-detected per file:
//  - Curated: row 1 has "Include" markers above the columns to keep, row 2
//    has the Hebrew headers, data starts row 3 (how the first, hand-edited
//    2026-07 report was built).
//  - Raw: row 1 IS the Hebrew headers directly (the full, unedited Priority
//    export - every field Priority has, ~100+ columns), data starts row 2.
//    This is the format going forward. Either way, only the columns whose
//    header matches HEADER_TO_FIELD are pulled - same 14 fields Tsachi
//    confirmed on the curated file, regardless of column position, which
//    shifts between the two shapes since the raw export has extra columns
//    interspersed.
const REPORTS_DIR = "C:\\Claud code\\Inbox to Monday\\Sales dashboard";
const SHEET_NAME = "DataSheet";

const HEADER_TO_FIELD: Record<string, string> = {
  "מס. לקוח": "customerNo",
  "שם לקוח": "customerName",
  תאריך: "date",
  הזמנה: "orderNo",
  "הז. פנקס": "orderBookRef",
  "הצעת מחיר": "quoteNo",
  פרטים: "details",
  "מחיר כולל": "totalPrice",
  'מע"מ': "vat",
  "מחיר כולל מע\"מ": "totalWithVat",
  מטבע: "currency",
  עלות: "cost",
  "רווח בפועל": "profit",
  "אחוז רווח": "profitPercent",
};

const NUMERIC_FIELDS = new Set(["totalPrice", "vat", "totalWithVat", "cost", "profit", "profitPercent"]);

const prisma = new PrismaClient();

function monthFromFilename(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  if (!/^\d{4}-\d{2}$/.test(base)) {
    throw new Error(`Expected filename like "2026-07.xlsx", got "${path.basename(filePath)}"`);
  }
  return base;
}

async function importFile(filePath: string) {
  const sourceMonth = monthFromFilename(filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found in ${filePath}`);

  // Detect shape: curated files have the literal string "Include" somewhere
  // in row 1; raw exports don't (row 1 is headers, not markers).
  const row1 = sheet.getRow(1);
  let isCurated = false;
  row1.eachCell((cell) => {
    if (String(cell.value).trim() === "Include") isCurated = true;
  });

  const headerRow = sheet.getRow(isCurated ? 2 : 1);
  const firstDataRow = isCurated ? 3 : 2;

  const fieldByColumn = new Map<number, string>();
  if (isCurated) {
    row1.eachCell((cell, colNumber) => {
      if (String(cell.value).trim() !== "Include") return;
      const header = String(headerRow.getCell(colNumber).value ?? "").trim();
      const field = HEADER_TO_FIELD[header];
      if (!field) {
        console.warn(`  skipping Include column with unrecognized header "${header}" (col ${colNumber})`);
        return;
      }
      fieldByColumn.set(colNumber, field);
    });
  } else {
    headerRow.eachCell((cell, colNumber) => {
      const header = String(cell.value ?? "").trim();
      const field = HEADER_TO_FIELD[header];
      if (field) fieldByColumn.set(colNumber, field);
    });
  }

  console.log(
    `${path.basename(filePath)}: ${isCurated ? "curated" : "raw"} format, reading fields [${Array.from(fieldByColumn.values()).join(", ")}]`
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let rowNumber = firstDataRow; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const record: Record<string, unknown> = {};
    for (const [colNumber, field] of fieldByColumn) {
      const cell = row.getCell(colNumber);
      let value: unknown = cell.value;
      if (value && typeof value === "object" && "result" in (value as object)) {
        value = (value as { result: unknown }).result; // formula cell
      }
      if (field === "date" && value instanceof Date) {
        record[field] = value;
      } else if (NUMERIC_FIELDS.has(field)) {
        record[field] = typeof value === "number" ? value : Number(value) || 0;
      } else {
        record[field] = value == null ? null : String(value).trim();
      }
    }

    if (!record.orderNo) {
      skipped++;
      continue; // total/summary rows, blank rows
    }

    const data = {
      orderNo: String(record.orderNo),
      customerNo: (record.customerNo as string) ?? "",
      customerName: (record.customerName as string) ?? "",
      date: (record.date as Date) ?? new Date(`${sourceMonth}-01`),
      orderBookRef: (record.orderBookRef as string) ?? null,
      quoteNo: (record.quoteNo as string) ?? null,
      details: (record.details as string) ?? null,
      totalPrice: (record.totalPrice as number) ?? 0,
      vat: (record.vat as number) ?? 0,
      totalWithVat: (record.totalWithVat as number) ?? 0,
      currency: (record.currency as string) ?? "ש\"ח",
      cost: (record.cost as number) ?? 0,
      profit: (record.profit as number) ?? 0,
      profitPercent: (record.profitPercent as number) ?? 0,
      sourceMonth,
    };

    const existing = await prisma.salesRecord.findUnique({ where: { orderNo: data.orderNo } });
    await prisma.salesRecord.upsert({
      where: { orderNo: data.orderNo },
      create: data,
      update: data,
    });
    if (existing) updated++;
    else created++;
  }

  console.log(`  ${created} created, ${updated} updated, ${skipped} skipped (no Order #)`);
}

const arg = process.argv[2];
const files = arg
  ? [arg]
  : fs
      .readdirSync(REPORTS_DIR)
      .filter((f) => f.endsWith(".xlsx") && !f.startsWith("~$"))
      .map((f) => path.join(REPORTS_DIR, f));

if (files.length === 0) {
  console.log(`No .xlsx files found in ${REPORTS_DIR}`);
}

for (const file of files) {
  await importFile(file);
}

await prisma.$disconnect();
