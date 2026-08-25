import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "D:/EMICP-interactive-prototype";

async function buildTemplate(fileName, title, category, sampleCode, sampleName) {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("Materials");
  sheet.showGridLines = false;
  sheet.getRange("A1:C1").merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A2:C2").merge();
  sheet.getRange("A2").values = [["أدخل الكود واسم المادة فقط. النوع محدد تلقائيًا بحسب شاشة الاستيراد."]];
  sheet.getRange("A4:C5").values = [["code", "name", "category"], [sampleCode, sampleName, category]];
  sheet.getRange("A1:C1").format = { fill: "#103F4A", font: { bold: true, color: "#FFFFFF", size: 14 }, horizontalAlignment: "center" };
  sheet.getRange("A2:C2").format = { fill: "#E8F2F3", font: { color: "#103F4A" }, wrapText: true };
  sheet.getRange("A4:C4").format = { fill: "#1D6B78", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", borders: { preset: "all", style: "thin", color: "#B9D6DA" } };
  sheet.getRange("A5:C5").format = { borders: { preset: "all", style: "thin", color: "#D9E5E7" } };
  sheet.getRange("A:A").format.columnWidth = 18;
  sheet.getRange("B:B").format.columnWidth = 32;
  sheet.getRange("C:C").format.columnWidth = 18;
  sheet.freezePanes.freezeRows(4);
  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(`${outputDir}/${fileName}`);
  const preview = await workbook.render({ sheetName: "Materials", range: "A1:C5", scale: 2, format: "png" });
  await fs.writeFile(`${outputDir}/${fileName}.png`, new Uint8Array(await preview.arrayBuffer()));
}

await buildTemplate("EMICP-raw-materials-template.xlsx", "قالب تعريف المواد الأولية", "raw", "RM-001", "مثال: سكر");
await buildTemplate("EMICP-packaging-materials-template.xlsx", "قالب تعريف مواد التغليف", "packing", "PK-001", "مثال: عبوة");
