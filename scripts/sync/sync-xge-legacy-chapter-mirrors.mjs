import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT = path.join(ROOT, "reports", "wiki-health-current.json");
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
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
const pending = [];
for (const entry of targets) {
  const file = path.join(ROOT, entry.file);
  if (!fs.existsSync(file)) { results.push({ file: entry.file, status: "missing_file" }); continue; }
  const before = fs.readFileSync(file, "utf8"); const after = update(before, entry); const changed = before !== after;
  if (changed) pending.push(candidateChange({ destination: file, before, after, operation: "update", source: MIRROR_ROOT, locator: entry.category }));
  results.push({ file: entry.file, category: entry.category, status: changed ? (options.apply ? "written" : "preview") : "unchanged" });
}
const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan({ ...plan, results }, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
const summary = results.reduce((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {});
process.stdout.write(`XGE2017 舊版章節鏡像同步${options.apply ? "套用" : "預覽"}：${JSON.stringify(summary)}\n`);
