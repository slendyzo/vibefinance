// Flexible Importer for VibeFinance
// Handles various Excel/CSV formats with custom column mapping

import ExcelJS from "exceljs";
import { prisma } from "./db";
import { ExpenseType } from "@prisma/client";

// Keywords to identify SURVIVAL_FIXED vs SURVIVAL_VARIABLE
const FIXED_KEYWORDS = [
  "spotify", "netflix", "youtube", "hbo", "disney", "amazon", "prime",
  "ginásio", "ginasio", "gym", "renda", "aluguer", "rent", "seguro",
  "insurance", "mensalidade", "subscription", "assinatura", "nowo",
  "vodafone", "meo", "nos", "phone", "telemovel", "telemóvel",
  "duster", "prestação", "prestacao", "seg social", "contabilista",
  "manutenção", "manutencao", "conta"
];

const VARIABLE_KEYWORDS = [
  "luz", "água", "agua", "gás", "gas", "eletricidade", "electricity",
  "water", "edp", "galp", "endesa"
];

export type ColumnMapping = {
  dateColumn: number | null;
  nameColumn: number;
  amountColumn: number;
  headerRow: number;
  sheetsToImport: string[]; // Empty = all sheets
  projectSheets: string[]; // Sheets to tag as PROJECT type
};

export type ImporterResult = {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  stats: {
    survivalFixed: number;
    survivalVariable: number;
    lifestyle: number;
    project: number;
  };
  sheets: string[];
};

export type ParsedRow = {
  sheetName: string;
  rowNumber: number;
  date: Date | null;
  name: string;
  rawInput: string;
  amount: number;
  type: ExpenseType;
};

/**
 * Extract cell value, handling formulas
 */
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

/**
 * Parse Excel date (handles serial numbers and Date objects)
 */
function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const str = value.trim();
    if (!str || str.toLowerCase() === "total") return null;

    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }

    // Try ISO format
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Parse amount from various formats
 */
function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    return Math.abs(value);
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/[€$£R\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.abs(num);
  }

  return 0;
}

/**
 * Determine expense type based on keywords and whether it has a date
 */
function determineExpenseType(name: string, hasDate: boolean, isProjectSheet: boolean): ExpenseType {
  // Project sheets always return PROJECT type
  if (isProjectSheet) {
    return ExpenseType.PROJECT;
  }

  const lowerName = name.toLowerCase();

  // If it has a date, it's lifestyle spending
  if (hasDate) {
    return ExpenseType.LIFESTYLE;
  }

  // Check for variable keywords first (utilities)
  for (const keyword of VARIABLE_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      return ExpenseType.SURVIVAL_VARIABLE;
    }
  }

  // Check for fixed keywords
  for (const keyword of FIXED_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      return ExpenseType.SURVIVAL_FIXED;
    }
  }

  // Default: no date = survival fixed
  return ExpenseType.SURVIVAL_FIXED;
}

/**
 * Extract month/year from sheet name like "Dezembro 2025"
 */
function parseSheetDate(sheetName: string): Date | null {
  const months: Record<string, number> = {
    janeiro: 0, january: 0, jan: 0,
    fevereiro: 1, february: 1, feb: 1,
    março: 2, marco: 2, march: 2, mar: 2,
    abril: 3, april: 3, apr: 3,
    maio: 4, may: 4,
    junho: 5, june: 5, jun: 5,
    julho: 6, july: 6, jul: 6,
    agosto: 7, august: 7, aug: 7,
    setembro: 8, september: 8, sep: 8, set: 8,
    outubro: 9, october: 9, oct: 9, out: 9,
    novembro: 10, november: 10, nov: 10,
    dezembro: 11, december: 11, dec: 11, dez: 11
  };

  const match = sheetName.toLowerCase().match(/(\w+)\s+(\d{4})/);
  if (match) {
    const monthName = match[1];
    const year = parseInt(match[2]);
    const month = months[monthName];
    if (month !== undefined) {
      return new Date(year, month, 1);
    }
  }
  return null;
}

/**
 * Main importer function with custom column mapping
 */
export async function importExpensesFromExcel(
  buffer: Buffer,
  workspaceId: string,
  userId: string,
  fileName: string,
  mapping?: ColumnMapping
): Promise<ImporterResult> {
  const errors: string[] = [];
  const allParsedRows: ParsedRow[] = [];
  const stats = {
    survivalFixed: 0,
    survivalVariable: 0,
    lifestyle: 0,
    project: 0,
  };
  const processedSheets: string[] = [];

  // Default mapping (legacy format)
  const columnMapping: ColumnMapping = mapping || {
    dateColumn: 2,  // Column B
    nameColumn: 3,  // Column C
    amountColumn: 4, // Column D
    headerRow: 2,
    sheetsToImport: [],
    projectSheets: ["casa"],
  };

  try {
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error ExcelJS types don't match Node 22 Buffer types
    await workbook.xlsx.load(buffer);

    console.log(`Processing ${workbook.worksheets.length} worksheets...`);

    // Process each worksheet
    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;

      // Skip sheets not in import list (if specified)
      if (columnMapping.sheetsToImport.length > 0 &&
          !columnMapping.sheetsToImport.some(s => s.toLowerCase() === sheetName.toLowerCase())) {
        console.log(`Skipping sheet: "${sheetName}" (not in import list)`);
        continue;
      }

      const isProjectSheet = columnMapping.projectSheets.some(
        s => s.toLowerCase() === sheetName.toLowerCase()
      );
      const sheetDate = parseSheetDate(sheetName);

      console.log(`\nProcessing sheet: "${sheetName}" (isProject: ${isProjectSheet})`);
      processedSheets.push(sheetName);

      let rowsProcessed = 0;
      const startRow = columnMapping.headerRow + 1;

      worksheet.eachRow((row, rowNumber) => {
        // Skip header rows
        if (rowNumber <= columnMapping.headerRow) return;

        const nameCell = row.getCell(columnMapping.nameColumn);
        const amountCell = row.getCell(columnMapping.amountColumn);
        const dateCell = columnMapping.dateColumn ? row.getCell(columnMapping.dateColumn) : null;

        const rawName = String(getCellValue(nameCell) || "").trim();
        const rawAmount = getCellValue(amountCell);

        // Skip empty rows or total rows
        if (!rawName || rawName.toLowerCase() === "total") return;
        if (!rawAmount) return;

        const amount = parseAmount(rawAmount);
        if (amount === 0) {
          return; // Skip zero amounts silently
        }

        const dateValue = dateCell ? getCellValue(dateCell) : null;
        const parsedDate = parseExcelDate(dateValue);
        const hasDate = parsedDate !== null;

        // Determine expense type
        const type = determineExpenseType(rawName, hasDate, isProjectSheet);

        // Update stats
        if (type === ExpenseType.SURVIVAL_FIXED) stats.survivalFixed++;
        else if (type === ExpenseType.SURVIVAL_VARIABLE) stats.survivalVariable++;
        else if (type === ExpenseType.LIFESTYLE) stats.lifestyle++;
        else if (type === ExpenseType.PROJECT) stats.project++;

        // Use parsed date, or sheet date for survival items, or today
        let expenseDate = parsedDate;
        if (!expenseDate && sheetDate) {
          expenseDate = sheetDate;
        }
        if (!expenseDate) {
          expenseDate = new Date();
        }

        allParsedRows.push({
          sheetName,
          rowNumber,
          date: expenseDate,
          name: rawName,
          rawInput: `[${sheetName}] ${rawName}: ${amount}`,
          amount,
          type,
        });

        rowsProcessed++;
      });

      console.log(`  → Processed ${rowsProcessed} rows from "${sheetName}"`);
    }

    console.log(`\nTotal rows to import: ${allParsedRows.length}`);

    if (allParsedRows.length === 0) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: ["No valid expense rows found. Please check your column mapping."],
        stats,
        sheets: processedSheets,
      };
    }

    // Get or create default category
    let defaultCategory = await prisma.category.findFirst({
      where: { workspaceId, name: "Uncategorized" },
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { workspaceId, name: "Uncategorized", isSystem: true },
      });
    }

    // Get or create project for project-tagged expenses
    let project = null;
    if (stats.project > 0 && columnMapping.projectSheets.length > 0) {
      const projectName = columnMapping.projectSheets[0];
      project = await prisma.project.findFirst({
        where: { workspaceId, name: { equals: projectName, mode: "insensitive" } },
      });

      if (!project) {
        project = await prisma.project.create({
          data: { workspaceId, name: projectName.charAt(0).toUpperCase() + projectName.slice(1) },
        });
      }
    }

    // Insert expenses in batches
    const expenseData = allParsedRows.map((row) => ({
      workspaceId,
      categoryId: defaultCategory!.id,
      projectId: row.type === ExpenseType.PROJECT ? project?.id || null : null,
      name: row.name,
      rawInput: row.rawInput,
      type: row.type,
      status: "PAID" as const,
      amount: row.amount,
      currency: "EUR",
      amountEur: row.amount,
      date: row.date!,
    }));

    const result = await prisma.expense.createMany({
      data: expenseData,
    });

    // Log the import
    await prisma.importLog.create({
      data: {
        workspaceId,
        fileName,
        fileType: fileName.endsWith(".csv") ? "csv" : "xlsx",
        rowsTotal: allParsedRows.length,
        rowsSuccess: result.count,
        rowsFailed: errors.length,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    return {
      success: true,
      imported: result.count,
      failed: errors.length,
      errors: errors.slice(0, 20),
      stats,
      sheets: processedSheets,
    };
  } catch (error) {
    console.error("Import error:", error);
    errors.push(error instanceof Error ? error.message : "Unknown error");

    return {
      success: false,
      imported: 0,
      failed: allParsedRows.length,
      errors,
      stats,
      sheets: processedSheets,
    };
  }
}

/**
 * Import from CSV string
 */
export async function importExpensesFromCSV(
  csvContent: string,
  workspaceId: string,
  userId: string,
  fileName: string,
  mapping?: ColumnMapping
): Promise<ImporterResult> {
  const workbook = new ExcelJS.Workbook();
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

  const buffer = await workbook.xlsx.writeBuffer();
  return importExpensesFromExcel(Buffer.from(buffer), workspaceId, userId, fileName, mapping);
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
