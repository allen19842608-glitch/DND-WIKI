import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(ROOT, "原始資料", "艾伯倫：奇械鍛爐", "第二章");

function headings(file, pattern) {
  const lines = fs.readFileSync(path.join(SOURCE, file), "utf8").split(/\r?\n/);
  return lines.flatMap((line, index) => {
    const match = line.match(pattern);
    return match ? [{ name: match[1].trim(), line: index + 1, source_file: file }] : [];
  });
}

const backgrounds = fs.readdirSync(path.join(SOURCE, "背景"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .flatMap((entry) => headings(path.join("背景", entry.name), /^#\s+(.+)$/));
const featFiles = ["龍紋專長.md", "通用專長.md", "傳奇恩惠.md"];
const feats = featFiles.flatMap((file) => headings(file, /^\*\*([^*]+?)\s+[A-Za-z][A-Za-z '\-]+\*\*/));

const candidates = [
  ...backgrounds.map((item) => ({ category: "背景", title: item.name, source_line: item.line, target: `wiki/背景/${item.name}.md` })),
  ...feats.map((item) => ({ category: "專長", title: item.name, source_line: item.line, target: `wiki/專長/${item.name}.md` })),
].map((item) => ({
  ...item,
  source: { file: "原始資料/外部來源鏡像/EBER2025/book-efa.json", locator: `Chapter 02: Character Options > ${item.category} > ${item.title}` },
  status: fs.existsSync(path.join(ROOT, item.target)) ? "exists" : "missing",
}));

const report = {
  schema_version: 1,
  mode: "preview",
  publication: "EBER2025",
  generated_at: new Date().toISOString(),
  summary: {
    total: candidates.length,
    exists: candidates.filter((item) => item.status === "exists").length,
    missing: candidates.filter((item) => item.status === "missing").length,
  },
  candidates,
};
const output = process.argv.includes("--json") ? JSON.stringify(report, null, 2) : `EBER2025 預覽：${report.summary.total} 筆；既有 ${report.summary.exists}；待建立 ${report.summary.missing}。\n`;
process.stdout.write(`${output}\n`);
