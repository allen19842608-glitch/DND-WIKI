import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
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
const pending = [];
for (const item of entries) {
  const file = path.join(ROOT, "wiki", "專長", item.dir, item.file);
  if (!fs.existsSync(file)) { results.push({ ...item, status: "missing_file" }); continue; }
  const before = fs.readFileSync(file, "utf8"); const after = update(before, item); const changed = before !== after;
  if (changed) pending.push(candidateChange({ destination: file, before, after, operation: "update", source: MIRROR, locator: item.english }));
  results.push({ ...item, status: changed ? (options.apply ? "written" : "preview") : "unchanged" });
}
const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan({ ...plan, results }, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
process.stdout.write(`EBER2025 專長名稱與鏡像同步${options.apply ? "套用" : "預覽"}：${JSON.stringify(results.map(({ chinese, status }) => ({ chinese, status })))}\n`);
