import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

function main() {
  const filePath = path.join(process.cwd(), "excel", "data_v1.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = XLSX.utils.sheet_to_json<any>(sheet);

  const statusSet = new Set<string>();
  const paymentSet = new Set<string>();

  data.forEach((row) => {
    if (row["Ghi chú học thử"]) statusSet.add(row["Ghi chú học thử"]);
    if (row["Đóng học phí"]) paymentSet.add(row["Đóng học phí"]);
  });

  console.log("Unique 'Ghi chú học thử':", Array.from(statusSet));
  console.log("Unique 'Đóng học phí':", Array.from(paymentSet));
}

main();
