import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT, applyCandidateBatch, candidateChange, loadPublication, parseOptions, planCandidateBatch, today,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const publicationId = "XGE2017";
const publication = loadPublication(publicationId);
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const pending = [];
const sourceBook = "原始資料/珊娜薩的萬事指南";
const sourcePdf = `${sourceBook}/Xanathars_Guide_to_Everything.pdf`;
const converterRoot = process.env.XGE_OPENCC_PATH ?? "C:\\Users\\Owner\\AppData\\Local\\Temp\\dnd-wiki-xge-opencc";
const python = process.env.XGE_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const entries = [
  {
    source: "角色選項/邪術師/魔能祈喚.md", destination: "施法規則/魔能祈喚選項-XGE.md",
    title: "魔能祈喚選項（XGE，2014 Legacy）", concept: "eldritch-invocation-options-xge-2014",
    locator: "# 魔能祈喚選項（XGE）", english: "Eldritch Invocations", related: "[[規則/施法規則/魔能祈喚選項|魔能祈喚選項 (Eldritch Invocation Options)]]",
  },
  {
    source: "角色選項/德魯伊/學習野獸形態.md", destination: "角色建立與成長/學習野獸形態.md",
    title: "學習野獸形態 (Learning Beast Shapes，2014 Legacy)", concept: "learning-beast-shapes",
    locator: "# 學習野獸形態", english: "Learning Beast Shapes", related: "[[職業/德魯伊|德魯伊 (Druid)]]",
  },
];
function convert(text) {
  if (!fs.existsSync(converterRoot)) throw new Error(`找不到 OpenCC：${converterRoot}。請設定 XGE_OPENCC_PATH。`);
  return execFileSync(python, ["-c", program, converterRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .replace(/^!\[\]\([^\n]+\)\s*$/gm, "")
    .replace(/(\d+)\s*尺/g, "$1 呎")
    .replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replaceAll("尺", "呎").replaceAll("型別", "類型")
    .replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function quote(value) { return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"'); }
function queueWrite(destination, content, locator) {
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === content) return;
  const change = candidateChange({ destination, before, after: content, operation: before === null ? "create" : "update", source: sourceBook, locator });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}
for (const entry of entries) {
  const source = `${sourceBook}/${entry.source}`;
  const sourcePath = path.join(ROOT, source);
  const body = convert(fs.readFileSync(sourcePath, "utf8")).replace(/^# .+\r?\n+/, "").trim();
  const content = `---\ntitle: "${quote(entry.title)}"\nentity_id: "entry:${publicationId}:rule:${entry.concept}"\nconcept_id: "concept:rule:${entry.concept}"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "規則機制"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "規則_角色選項"\nsources:\n  - file: "${source}"\n    locator: "${entry.locator}"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options；${entry.english}"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# ${entry.title}\n\n> [!WARNING] 本條目為《珊娜薩的萬事指南》的 2014 舊版選項；不取代現行 2024 規則。\n\n${body}\n\n## 🔗 相關連結\n\n- ${entry.related}\n- [[規則/2014/XGE規則索引|XGE 規則索引 (2014 Legacy)]]\n`;
  const destination = path.join(ROOT, "wiki", "規則", "2014", entry.destination);
  queueWrite(destination, content, entry.locator);
}
const index = `---\ntitle: "XGE 規則索引 (2014 Legacy)"\nentity_id: "entry:${publicationId}:rule-index:character-options"\nconcept_id: "concept:rule-index:xge-character-options-2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "規則機制"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "規則_索引"\nsources:\n  - file: "${sourceBook}/角色選項"\n    locator: "Chapter 1: Character Options"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# XGE 規則索引 (2014 Legacy)\n\n## 角色選項\n\n- [[職業/2014/職業索引|職業索引 (2014 Legacy)]]\n- [[專長/2014/專長索引|專長索引 (2014 Legacy)]]\n- [[規則/2014/施法規則/魔能祈喚選項-XGE|魔能祈喚選項（XGE，2014 Legacy）]]\n- [[規則/2014/角色建立與成長/學習野獸形態|學習野獸形態 (Learning Beast Shapes，2014 Legacy)]]\n\n## 法術\n\n- [[法術/2014/珊娜薩法術索引|珊娜薩法術索引 (XGE 2014 Legacy)]]\n\n## 🔗 相關連結\n\n- [[規則索引|規則索引 (Rules Index)]]\n`;
queueWrite(path.join(ROOT, "wiki", "規則", "2014", "XGE規則索引.md"), index, "Chapter 1: Character Options");
console.log(`完成：${entries.length} 個 XGE 角色規則頁。`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
if (options.report) {
  const reportPath = path.resolve(ROOT, options.report);
  if (!reportPath.startsWith(`${path.resolve(ROOT, "reports")}${path.sep}`)) throw new Error("報告只能輸出至 reports/。");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用 XGE 角色規則：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽 XGE 角色規則：${plan.changes.length} 個候選變更；加入 --apply 才會寫入。`);
}
