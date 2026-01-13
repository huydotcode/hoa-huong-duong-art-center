import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

function normalizePhone(phone: string | undefined): string {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "");
}

function normalizeName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function main() {
  const filePath = path.join(process.cwd(), "excel", "data_v1.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error("File not found");
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(sheet);

  console.log(`Analyzing ${rows.length} rows for duplicates...`);

  const seen = new Map<string, number[]>(); // Key -> Array of Row Indices (1-based because of header?)

  // Rows are 0-indexed in array, but 2-indexed in Excel (Header is 1).
  rows.forEach((row, idx) => {
    const name = row["Họ Tên"];
    if (!name) return;

    // Key: Name + Phone
    // If duplicates mean "Same person enrolled twice" or "Same person in different classes"?
    // User asked "row học sinh trùng nhau" -> duplicate rows?
    // Or duplicate PEOPLE?
    // Usually duplicate people.
    // Let's use Name + Phone as identity.

    const key = `${normalizeName(name)}|${normalizePhone(row["SĐT"])}`;

    if (!seen.has(key)) {
      seen.set(key, [idx + 2]); // +2 to match Excel row number approx
    } else {
      seen.get(key)!.push(idx + 2);
    }
  });

  let duplicateCount = 0;
  console.log("\n--- Duplicate Students (Name + Phone) ---");

  for (const [key, rowData] of seen.entries()) {
    if (rowData.length > 1) {
      const [n, p] = key.split("|");
      console.log(
        `Student: "${n}" (Phone: ${p || "N/A"}) - Rows: ${rowData.join(", ")}`
      );
      duplicateCount++;
    }
  }

  console.log(`\nFound ${duplicateCount} students appearing in multiple rows.`);
}

main();
