import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT, applyCandidateBatch, candidateChange, loadPublication, parseOptions, planCandidateBatch, today, writeCandidatePlan,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const publicationId = "XGE2017";
const publication = loadPublication(publicationId);
const options = parseOptions(process.argv.slice(2));
if (options.apply) throw new Error("舊匯入入口已退役，不再直接寫入 Wiki；請使用 wiki:preview 建立候選計畫，再以 wiki:apply 套用。");
const source = "原始資料/珊娜薩的萬事指南/角色選項/種族專長.md";
const sourcePath = path.join(ROOT, source);
const sourcePdf = "原始資料/珊娜薩的萬事指南/Xanathars_Guide_to_Everything.pdf";
const output = path.join(ROOT, "wiki", "專長", "2014", "種族專長");
const converterRoot = process.env.XGE_OPENCC_PATH ?? "C:\\Users\\Owner\\AppData\\Local\\Temp\\dnd-wiki-xge-opencc";
const python = process.env.XGE_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const pending = [];
const staged = new Map();

function convert(text) {
  if (!fs.existsSync(converterRoot)) throw new Error(`找不到 OpenCC：${converterRoot}。請設定 XGE_OPENCC_PATH。`);
  return execFileSync(python, ["-c", program, converterRoot], { input: text, encoding: "utf8" })
    .replace(/(\d+)\s*尺/g, "$1 呎").replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2").replaceAll("尺", "呎").replaceAll("型別", "類型")
    .replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function quote(value) { return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"'); }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function tidy(lines) { return lines.join("\n").trim().replace(/^·\s*/gm, "- "); }
function prerequisite(lines) { return lines.find((line) => /^_先決/.test(line.trim()))?.replace(/^_|_$/g, "").replace(/^先決(?:條件)?[：:]/, "").trim() ?? "無"; }
function ability(lines) { return lines.find((line) => /[力量敏捷體質智力感知魅力].*\+1/.test(line))?.replace(/^·\s*/, "") ?? undefined; }
function queueWrite(destination, content, locator) {
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === content || staged.get(destination) === content) return;
  staged.set(destination, content);
  const change = candidateChange({ destination, before, after: content, operation: before === null ? "create" : "update", source, locator });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}

const lines = convert(fs.readFileSync(sourcePath, "utf8")).split(/\r?\n/);
const headings = lines.flatMap((line, index) => {
  const match = line.match(/^\*\*([^*]+?)\s+([A-Z][A-Za-z'’\- ]+)\*\*$/);
  return match && match[1] !== "種族專長" ? [{ index, chinese: match[1].trim(), english: match[2].trim() }] : [];
});
const entries = [];
for (const [position, feat] of headings.entries()) {
  const end = headings[position + 1]?.index ?? lines.length;
  const body = lines.slice(feat.index + 1, end).filter((line) => line.trim());
  const title = `${feat.chinese} (${feat.english}，2014 Legacy)`;
  const content = `---\ntitle: "${quote(title)}"\nentity_id: "entry:${publicationId}:feat:${slug(feat.english)}"\nconcept_id: "concept:feat:${slug(feat.english)}"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "專長"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "專長_種族"\nsources:\n  - file: "${source}"\n    locator: "**${feat.chinese} ${feat.english}**"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options；${feat.english}"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# ${title}\n\n> [!WARNING] 本條目為 2014 舊版專長；不取代現行 2024 專長與種族規則。\n\n- **前置條件 (Prerequisite)**：${prerequisite(body)}\n${ability(body) ? `- **屬性提升 (Ability Score Increase)**：${ability(body)}\n` : ""}\n## 🌟 專長效果描述\n\n- **專長效果**：\n  ${tidy(body.filter((line) => !/^_先決/.test(line.trim()))).replace(/\n/g, "\n  ")}\n\n## 🔗 相關連結\n\n- [[專長/2014/種族專長/種族專長索引|種族專長索引 (XGE 2014 Legacy)]]\n- [[專長索引|專長索引 (Feats Index)]]\n`;
  queueWrite(path.join(output, `${feat.chinese}.md`), content, `**${feat.chinese} ${feat.english}**`);
  entries.push(feat);
}
const index = `---\ntitle: "種族專長索引 (XGE 2014 Legacy)"\nentity_id: "entry:${publicationId}:feat-index:racial"\nconcept_id: "concept:feat-index:racial-xge-2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "專長"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "專長_索引"\nsources:\n  - file: "${source}"\n    locator: "**種族專長 Racial Feats**"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options；Racial Feats"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# 種族專長索引 (XGE 2014 Legacy)\n\n> 收錄《${publication.title_zh}》的 15 項 2014 種族專長。\n\n${entries.map((feat) => `- [[${feat.chinese}|${feat.chinese} (${feat.english}，2014 Legacy)]]`).join("\n")}\n\n## 🔗 相關連結\n\n- [[專長/2014/專長索引|專長索引 (2014 Legacy)]]\n- [[專長索引|專長索引 (Feats Index)]]\n`;
queueWrite(path.join(output, "種族專長索引.md"), index, "**種族專長 Racial Feats**");
const root = `---\ntitle: "專長索引 (2014 Legacy)"\nentity_id: "entry:${publicationId}:feat-index:2014"\nconcept_id: "concept:feat-index:2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "專長"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "專長_索引"\nsources:\n  - file: "${source}"\n    locator: "Chapter 1: Character Options；Racial Feats"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# 專長索引 (2014 Legacy)\n\n- [[專長/2014/種族專長/種族專長索引|種族專長索引 (XGE 2014 Legacy)]]\n\n## 🔗 相關連結\n\n- [[專長索引|專長索引 (Feats Index)]]\n`;
queueWrite(path.join(ROOT, "wiki", "專長", "2014", "專長索引.md"), root, "Chapter 1: Character Options；Racial Feats");
const glossaryPath = path.join(ROOT, "附件", "翻譯詞彙表.md");
let glossary = fs.readFileSync(glossaryPath, "utf8");
const sectionStart = glossary.indexOf("## 珊娜薩的萬事指南");
const sectionEnd = glossary.indexOf("## 艾伯倫戰役設定", sectionStart);
const existing = glossary.slice(sectionStart, sectionEnd);
const additions = entries.filter((feat) => !existing.includes(`| ${feat.english} |`)).map((feat) => `| ${feat.english} | ${feat.chinese} | XGE2017 | 簡轉繁；角色選項/種族專長.md；**${feat.chinese} ${feat.english}** | approved |`).join("\n");
if (additions) glossary = `${glossary.slice(0, sectionEnd).trimEnd()}\n${additions}\n\n${glossary.slice(sectionEnd)}`;
queueWrite(glossaryPath, glossary, "珊娜薩的萬事指南譯名表");
console.log(`完成：${entries.length} 項 XGE 2014 種族專長。`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
if (options.report) {
  writeCandidatePlan(plan, options.report, { root: ROOT });
}
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用 XGE 種族專長：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽 XGE 種族專長：${plan.changes.length} 個候選變更；請以 wiki:apply 套用已儲存計畫。`);
}
