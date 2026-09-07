/** 將已由材料欄完整承接的 M 成分改為簡潔的 V／S／M 標記。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPELL_ROOT = path.join(ROOT, "wiki", "法術");
const apply = process.argv.includes("--apply");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  });
}

export function normalizeMaterialComponents(source) {
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/u);
  const componentIndex = lines.findIndex((line) => /^- \*\*法術成分 \(Components\)\*\*：.*\bM（.+）$/u.test(line));
  const materialIndex = lines.findIndex((line) => /^- \*\*材料成本與消耗\*\*：\S/u.test(line));
  if (componentIndex < 0) return { changed: false, source };
  const match = /^(- \*\*法術成分 \(Components\)\*\*：.*\bM)（(.+)）$/u.exec(lines[componentIndex]);
  if (!match) return { changed: false, source };
  lines[componentIndex] = match[1].replace(/,\s*/gu, "、");
  if (materialIndex < 0) lines.splice(componentIndex + 1, 0, `- **材料成本與消耗**：${match[2]}`);
  return { changed: true, source: lines.join(eol) };
}

let candidates = 0;
let changed = 0;
for (const file of walk(SPELL_ROOT).filter((file) => !path.basename(file).includes("索引"))) {
  const source = fs.readFileSync(file, "utf8");
  const result = normalizeMaterialComponents(source);
  if (!result.changed) continue;
  candidates += 1;
  if (apply) fs.writeFileSync(file, result.source, "utf8");
  changed += apply ? 1 : 0;
}
console.log(`${apply ? "已套用" : "預覽"}：${candidates} 頁可簡化；${changed} 頁已修改。`);
