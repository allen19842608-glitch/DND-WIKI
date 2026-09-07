import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT = path.join(ROOT, "reports", "wiki-health-current.json");
const APPLY = process.argv.includes("--apply");
const MIRROR_ROOT = "原始資料/外部來源鏡像/XGE2017";
const URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-xge.json";
const chapterByCategory = { 法術: ["04-Spells.md", "Chapter 04: Spells"], 背景: ["02-Character Options.md", "Chapter 02: Character Options > Backgrounds"], 職業: ["02-Character Options.md", "Chapter 02: Character Options > Classes and Subclasses"], 專長: ["02-Character Options.md", "Chapter 02: Character Options > Feats"] };
const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));
const targets = report.legacy_backlog.entries.filter((entry) => entry.publication === "XGE2017" && !entry.english_mirror && chapterByCategory[entry.category]);
function update(text, entry) {
  const [file, chapter] = chapterByCategory[entry.category];
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const source = [`  - file: "${MIRROR_ROOT}/chapters/${file}"`, `    locator: "Xanathar’s Guide to Everything (2017), ${chapter}；5e.tools 鏡像快照"`, `    url: "${URL}"`, `    authority: "官方"`, `    translation: "none"`, ""].join(eol);
  if (text.includes(`- file: "${MIRROR_ROOT}/chapters/${file}"`)) return text;
  let next = text.replace(/sources:\r?\n/, `sources:${eol}${source}`);
  next = next.replace(/^updated:\s*"[^"]+"$/m, `updated: "${new Date().toISOString().slice(0, 10)}"`);
  return next;
}
const results = [];
for (const entry of targets) {
  const file = path.join(ROOT, entry.file);
  if (!fs.existsSync(file)) { results.push({ file: entry.file, status: "missing_file" }); continue; }
  const before = fs.readFileSync(file, "utf8"); const after = update(before, entry); const changed = before !== after;
  if (APPLY && changed) fs.writeFileSync(file, after, "utf8");
  results.push({ file: entry.file, category: entry.category, status: changed ? (APPLY ? "written" : "preview") : "unchanged" });
}
const summary = results.reduce((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {});
process.stdout.write(`XGE2017 舊版章節鏡像同步${APPLY ? "套用" : "預覽"}：${JSON.stringify(summary)}\n`);
