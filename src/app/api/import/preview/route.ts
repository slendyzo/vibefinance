// Preview Excel/CSV file structure for column mapping
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

export type SheetPreview = {
  name: string;
  headers: { column: number; value: string }[];
  sampleRows: Record<number, unknown>[];
  rowCount: number;
};

export type PreviewResponse = {
  success: boolean;
  sheets: SheetPreview[];
  suggestedMapping: {
    dateColumn: number | null;
    nameColumn: number | null;
    amountColumn: number | null;
    headerRow: number;
  };
  error?: string;
};

// Keywords to detect column types
const DATE_KEYWORDS = ["data", "date", "dia", "day", "when", "quando"];
const NAME_KEYWORDS = ["tipo", "type", "name", "nome", "description", "descricao", "descrição", "custo", "expense", "item", "merchant"];
const AMOUNT_KEYWORDS = ["valor", "value", "amount", "custo", "cost", "price", "preço", "preco", "total", "€", "eur"];

function detectColumnType(value: string): "date" | "name" | "amount" | null {
  const lower = value.toLowerCase().trim();

  if (DATE_KEYWORDS.some(k => lower.includes(k))) return "date";
  if (AMOUNT_KEYWORDS.some(k => lower.includes(k))) return "amount";
  if (NAME_KEYWORDS.some(k => lower.includes(k))) return "name";

  return null;
}

function getCellValue(cell: ExcelJS.Cell): unknown {
  if (!cell || cell.value === null || cell.value === undefined) {
    return null;
  }

  const value = cell.value;

  // Handle formula cells - extract the result
  if (typeof value === "object" && value !== null && "result" in value) {
    return (value as { result: unknown }).result;
  }

  return value;
}

function formatCellForPreview(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();

    // Handle CSV vs Excel
    if (file.name.endsWith(".csv")) {
      const csvContent = buffer.toString("utf-8");
      const worksheet = workbook.addWorksheet("Sheet1");
      const lines = csvContent.trim().split("\n");
      const delimiter = lines[0].includes(";") ? ";" : ",";

      lines.forEach((line, index) => {
        const values = parseCsvLine(line, delimiter);
        const row = worksheet.getRow(index + 1);
        values.forEach((val, colIndex) => {
          row.getCell(colIndex + 1).value = val;
        });
      });
    } else {
      await workbook.xlsx.load(buffer);
    }

    const sheets: SheetPreview[] = [];
    let suggestedMapping = {
      dateColumn: null as number | null,
      nameColumn: null as number | null,
      amountColumn: null as number | null,
      headerRow: 1,
    };

    for (const worksheet of workbook.worksheets) {
      const headers: { column: number; value: string }[] = [];
      const sampleRows: Record<number, unknown>[] = [];

      // Scan first 5 rows to find headers (they might not be on row 1)
      let headerRowNum = 1;
      let maxHeadersFound = 0;

      for (let rowNum = 1; rowNum <= Math.min(5, worksheet.rowCount); rowNum++) {
        const row = worksheet.getRow(rowNum);
        let headersInRow = 0;

        row.eachCell({ includeEmpty: false }, (cell) => {
          const val = getCellValue(cell);
          if (typeof val === "string" && val.trim().length > 0) {
            headersInRow++;
          }
        });

        if (headersInRow > maxHeadersFound) {
          maxHeadersFound = headersInRow;
          headerRowNum = rowNum;
        }
      }

      // Extract headers from detected row
      const headerRow = worksheet.getRow(headerRowNum);
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const val = getCellValue(cell);
        if (val !== null && val !== undefined) {
          const strVal = String(val).trim();
          if (strVal.length > 0) {
            headers.push({ column: colNumber, value: strVal });

            // Try to auto-detect column types for first sheet
            if (sheets.length === 0) {
              const colType = detectColumnType(strVal);
              if (colType === "date" && !suggestedMapping.dateColumn) {
                suggestedMapping.dateColumn = colNumber;
              } else if (colType === "name" && !suggestedMapping.nameColumn) {
                suggestedMapping.nameColumn = colNumber;
              } else if (colType === "amount" && !suggestedMapping.amountColumn) {
                suggestedMapping.amountColumn = colNumber;
              }
            }
          }
        }
      });

      if (sheets.length === 0) {
        suggestedMapping.headerRow = headerRowNum;
      }

      // Get sample data rows (skip header, get next 5 rows with data)
      let samplesCollected = 0;
      for (let rowNum = headerRowNum + 1; rowNum <= worksheet.rowCount && samplesCollected < 5; rowNum++) {
        const row = worksheet.getRow(rowNum);
        const rowData: Record<number, unknown> = {};
        let hasData = false;

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const val = getCellValue(cell);
          if (val !== null && val !== undefined) {
            rowData[colNumber] = formatCellForPreview(val);
            hasData = true;
          }
        });

        if (hasData) {
          // Skip "total" rows
          const values = Object.values(rowData);
          const isTotal = values.some(v =>
            typeof v === "string" && v.toLowerCase().includes("total")
          );
          if (!isTotal) {
            sampleRows.push(rowData);
            samplesCollected++;
          }
        }
      }

      sheets.push({
        name: worksheet.name,
        headers,
        sampleRows,
        rowCount: worksheet.rowCount,
      });
    }

    const response: PreviewResponse = {
      success: true,
      sheets,
      suggestedMapping,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to preview file",
        sheets: [],
        suggestedMapping: { dateColumn: null, nameColumn: null, amountColumn: null, headerRow: 1 }
      },
      { status: 500 }
    );
  }
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
