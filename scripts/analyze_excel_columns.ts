import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

function main() {
  const filePath = path.join(process.cwd(), "excel", "data_v1.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error("File not found");
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

  if (data.length === 0) {
    console.log("Empty sheet");
    return;
  }

  const headers = data[0] as string[];
  console.log("Headers:", headers);

  console.log("\nSample Rows:");
  for (let i = 1; i < Math.min(data.length, 6); i++) {
    // First 5 rows
    const row = data[i] as any[];
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx];
    });
    console.log(rowObj);
  }
}

main();
