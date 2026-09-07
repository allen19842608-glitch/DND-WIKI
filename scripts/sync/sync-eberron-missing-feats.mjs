import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY = process.argv.includes("--apply");
const TODAY = new Date().toISOString().slice(0, 10);
const MIRROR = "原始資料/外部來源鏡像/EBER2025/book-efa.json";
const URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-efa.json";
const entries = [
  { dir: "龍紋專長", file: "異種龍紋.md", chinese: "異種龍紋", english: "Aberrant Dragonmark", page: 39 },
  { dir: "通用專長", file: "高等畜牧龍紋.md", chinese: "高等畜牧龍紋", english: "Greater Mark of Handling", page: 43 },
];
const esc = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function update(text, item) {
  const title = `${item.chinese} (${item.english})`;
  let next = text.replace(/^title:\s*"[^"]+"$/m, `title: "${title}"`);
  next = next.replace(new RegExp(`^#\\s+${esc(item.chinese)}(?: \\([^\\n]+\\))?$`, "m"), `# ${title}`);
  next = next.replace(/^concept_id:\s*"[^"]+"$/m, `concept_id: "concept:feat:${item.english.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}"`);
  if (!next.includes(`- file: "${MIRROR}"`)) {
    const source = `  - file: "${MIRROR}"\n    locator: "Eberron: Forge of the Artificer (2025), p. ${item.page}：Feats > ${item.dir === "龍紋專長" ? "Dragonmark Feats" : "General Feats"} > ${item.english} > ${item.english}；5e.tools 鏡像快照"\n    url: "${URL}"\n    authority: "官方"\n    translation: "none"\n`;
    next = next.replace(/sources:\r?\n/, `sources:\n${source}`);
  }
  next = next.replace(/^updated:\s*"[^"]+"$/m, `updated: "${TODAY}"`);
  return next;
}
const results = [];
for (const item of entries) {
  const file = path.join(ROOT, "wiki", "專長", item.dir, item.file);
  if (!fs.existsSync(file)) { results.push({ ...item, status: "missing_file" }); continue; }
  const before = fs.readFileSync(file, "utf8"); const after = update(before, item); const changed = before !== after;
  if (APPLY && changed) fs.writeFileSync(file, after, "utf8");
  results.push({ ...item, status: changed ? (APPLY ? "written" : "preview") : "unchanged" });
}
process.stdout.write(`EBER2025 專長名稱與鏡像同步${APPLY ? "套用" : "預覽"}：${JSON.stringify(results.map(({ chinese, status }) => ({ chinese, status })))}\n`);
