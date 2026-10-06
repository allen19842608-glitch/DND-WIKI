import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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
const sourceBook = "原始資料/珊娜薩的萬事指南";
const sourceRoot = path.join(ROOT, sourceBook);
const sourcePdf = `${sourceBook}/Xanathars_Guide_to_Everything.pdf`;
const outputRoot = path.join(ROOT, "wiki", "規則", "2014");
const converterRoot = process.env.XGE_OPENCC_PATH ?? "C:\\Users\\Owner\\AppData\\Local\\Temp\\dnd-wiki-xge-opencc";
const python = process.env.XGE_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const groups = [
  { source: "地下城主工具", output: "地下城主工具", index: "地下城主工具索引", pdf: "Chapter 2: Dungeon Master's Tools" },
  { source: "共享戰役", output: "共享戰役", index: "共享戰役索引", pdf: "Chapter 2: Dungeon Master's Tools；Shared Campaigns" },
  { source: "核心規則", output: "核心規則", index: "核心規則索引", pdf: "Introduction；Core Rules" },
];
const pending = [];
const staged = new Map();

function convert(text) {
  if (!fs.existsSync(converterRoot)) throw new Error(`找不到 OpenCC：${converterRoot}。請設定 XGE_OPENCC_PATH。`);
  return execFileSync(python, ["-c", program, converterRoot], { input: text, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .replace(/^!\[\]\([^\n]+\)\s*$/gm, "")
    .replace(/(\d+)\s*尺/g, "$1 呎")
    .replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replace(/(\d+)\s*gp\b/gi, "$1 GP")
    .replaceAll("尺", "呎").replaceAll("型別", "類型")
    .replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(root, item.name);
    return item.isDirectory() ? walk(target) : item.isFile() && item.name.endsWith(".md") ? [target] : [];
  });
}
function quote(value) { return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"'); }
function slug(value) { return crypto.createHash("sha1").update(value).digest("hex").slice(0, 16); }
function relative(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function queueWrite(destination, content, locator) {
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === content || staged.get(destination) === content) return;
  staged.set(destination, content);
  const change = candidateChange({ destination, before, after: content, operation: before === null ? "create" : "update", source: sourceBook, locator });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}
function readWorking(file) { return staged.has(file) ? staged.get(file) : fs.readFileSync(file, "utf8"); }
function titleFrom(text, fallback) { return text.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() ?? fallback; }
function bodyFrom(text) {
  let previousLevel = 1;
  return text.replace(/^#\s+.+?\r?\n+/, "").trim().replace(/^(#{1,6})\s+(.+)$/gm, (_, marks, heading) => {
    const desired = Math.max(2, marks.length);
    const level = Math.min(desired, previousLevel + 1);
    previousLevel = level;
    return `${"#".repeat(level)} ${heading}`;
  });
}
function page({ title, source, pdf, body, destination, indexLink }) {
  const concept = slug(source.replace(sourceBook, ""));
  return `---\ntitle: "${quote(`${title} (2014 Legacy)`)}"\nentity_id: "entry:${publicationId}:reference:${concept}"\nconcept_id: "concept:reference:${concept}"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "規則機制"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "規則_XGE參考"\nsources:\n  - file: "${source}"\n    locator: "L1 標題：${quote(title)}"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "${pdf}"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# ${title} (2014 Legacy)\n\n> [!WARNING] 本頁保留《珊娜薩的萬事指南》的 2014 條文與表格；如與現行規則衝突，以採用的規則版本為準。\n\n${body}\n\n## 🔗 相關連結\n\n- ${indexLink}\n- [[規則/2014/XGE規則索引|XGE 規則索引 (2014 Legacy)]]\n`;
}

const groupIndexes = [];
for (const group of groups) {
  const input = path.join(sourceRoot, group.source);
  const entries = [];
  for (const file of walk(input)) {
    if (group.source === "地下城主工具" && path.relative(input, file).replaceAll("\\", "/") === "獎勵魔法物品/普通魔法物品.md") continue;
    const text = convert(fs.readFileSync(file, "utf8"));
    const title = titleFrom(text, path.basename(file, ".md"));
    const local = path.relative(input, file);
    const target = path.join(outputRoot, group.output, local);
    const relativeTarget = path.relative(outputRoot, target).split(path.sep).join("/").replace(/\.md$/, "");
    const indexLink = `[[規則/2014/${group.output}/${group.index}|${group.index} (2014 Legacy)]]`;
    queueWrite(target, page({ title, source: relative(file), pdf: group.pdf, body: bodyFrom(text), destination: target, indexLink }), `L1 標題：${title}`);
    entries.push({ title, target: relativeTarget });
  }
  entries.sort((a, b) => a.target.localeCompare(b.target, "zh-Hant"));
  const index = `---\ntitle: "${group.index} (2014 Legacy)"\nentity_id: "entry:${publicationId}:reference-index:${slug(group.output)}"\nconcept_id: "concept:reference-index:${slug(group.output)}-2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "規則機制"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "規則_索引"\nsources:\n  - file: "${sourceBook}/${group.source}"\n    locator: "${group.pdf}"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "${group.pdf}"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# ${group.index} (2014 Legacy)\n\n> 收錄《${publication.title_zh}》的 ${group.source} 條文與表格，共 ${entries.length} 頁。\n\n${entries.map((entry) => `- [[規則/2014/${entry.target}|${entry.title}]]`).join("\n")}\n\n## 🔗 相關連結\n\n- [[規則/2014/XGE規則索引|XGE 規則索引 (2014 Legacy)]]\n`;
  const indexPath = path.join(outputRoot, group.output, `${group.index}.md`);
  queueWrite(indexPath, index, group.pdf);
  groupIndexes.push({ group, count: entries.length });
}

const biographySource = `${sourceBook}/角色選項/構建角色生平.md`;
const biographyText = convert(fs.readFileSync(path.join(ROOT, biographySource), "utf8"));
const biographyTitle = titleFrom(biographyText, "構建角色生平");
const biographyTarget = path.join(outputRoot, "角色建立與成長", "構建角色生平-XGE.md");
queueWrite(biographyTarget, page({
  title: biographyTitle, source: biographySource, pdf: "Chapter 1: Character Options；This Is Your Life", body: bodyFrom(biographyText), destination: biographyTarget,
  indexLink: "[[規則/2014/XGE規則索引|XGE 規則索引 (2014 Legacy)]]",
}), "Chapter 1: Character Options；This Is Your Life");

const classNames = new Map([["聖武士", "聖騎士"], ["邪術師", "契術師"]]);
const classRoot = path.join(sourceRoot, "角色選項");
const classFiles = fs.readdirSync(classRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && !["構建角色生平.md", "種族專長.md"].includes(entry.name));
const classEntries = [];
for (const file of classFiles) {
  const sourcePath = path.join(classRoot, file.name);
  const rawName = path.basename(file.name, ".md");
  const canonicalName = classNames.get(rawName) ?? rawName;
  const source = relative(sourcePath);
  const text = convert(fs.readFileSync(sourcePath, "utf8"));
  const title = `${canonicalName}角色扮演指引`;
  const target = path.join(outputRoot, "角色建立與成長", "職業建議", `${canonicalName}.md`);
  queueWrite(target, page({
    title, source, pdf: `Chapter 1: Character Options；${canonicalName}`, body: bodyFrom(text), destination: target,
    indexLink: "[[規則/2014/角色建立與成長/職業角色扮演指引索引|職業角色扮演指引索引 (2014 Legacy)]]",
  }), `Chapter 1: Character Options；${canonicalName}`);
  classEntries.push({ canonicalName, title });
}
classEntries.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, "zh-Hant"));
const classIndex = `---\ntitle: "職業角色扮演指引索引 (2014 Legacy)"\nentity_id: "entry:${publicationId}:reference-index:class-guidance"\nconcept_id: "concept:reference-index:class-guidance-xge-2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "規則機制"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "規則_角色建立"\nsources:\n  - file: "${sourceBook}/角色選項"\n    locator: "Chapter 1: Character Options；Class Guidance"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# 職業角色扮演指引索引 (2014 Legacy)\n\n> 收錄《${publication.title_zh}》的各職業扮演、背景與表格建議，不變更職業本身的 2014 規則。\n\n${classEntries.map((entry) => `- [[規則/2014/角色建立與成長/職業建議/${entry.canonicalName}|${entry.title}]]`).join("\n")}\n\n## 🔗 相關連結\n\n- [[職業/2014/職業索引|職業索引 (2014 Legacy)]]\n- [[規則/2014/XGE規則索引|XGE 規則索引 (2014 Legacy)]]\n`;
queueWrite(path.join(outputRoot, "角色建立與成長", "職業角色扮演指引索引.md"), classIndex, "Chapter 1: Character Options；Class Guidance");

const nameRoot = path.join(sourceRoot, "角色姓名");
const nameFiles = walk(nameRoot);
const names = nameFiles.map((file) => {
  const text = convert(fs.readFileSync(file, "utf8"));
  return { source: relative(file), title: titleFrom(text, path.basename(file, ".md")), body: bodyFrom(text) };
});
const nameSources = names.map((entry) => `  - file: "${entry.source}"\n    locator: "L1 標題：${quote(entry.title)}"\n    authority: "官方"\n    translation: "community"`).join("\n");
const namesPage = `---\ntitle: "角色姓名表（XGE，2014 Legacy）"\nentity_id: "entry:${publicationId}:reference:character-names"\nconcept_id: "concept:reference:character-names-xge-2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "規則機制"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "規則_角色建立"\nsources:\n${nameSources}\n  - file: "${sourcePdf}"\n    locator: "Appendix B: Character Names"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# 角色姓名表（XGE，2014 Legacy）\n\n> 將來源的姓名表合併為單頁，以便選擇與搜尋；各表仍保留其可定位原始來源。\n\n${names.map((entry) => `## ${entry.title}\n\n${entry.body}`).join("\n\n")}\n\n## 🔗 相關連結\n\n- [[規則/2014/XGE規則索引|XGE 規則索引 (2014 Legacy)]]\n`;
const namesTarget = path.join(outputRoot, "角色建立與成長", "角色姓名表-XGE.md");
queueWrite(namesTarget, namesPage, "Appendix B: Character Names");

const xgeIndexPath = path.join(outputRoot, "XGE規則索引.md");
let xgeIndex = readWorking(xgeIndexPath);
const additions = `## 指引、表格與工具

- [[規則/2014/角色建立與成長/構建角色生平-XGE|${biographyTitle} (2014 Legacy)]]
- [[規則/2014/角色建立與成長/角色姓名表-XGE|角色姓名表（XGE，2014 Legacy）]]
- [[規則/2014/角色建立與成長/職業角色扮演指引索引|職業角色扮演指引索引 (2014 Legacy)]]
${groupIndexes.map(({ group }) => `- [[規則/2014/${group.output}/${group.index}|${group.index} (2014 Legacy)]]`).join("\n")}`;
if (!xgeIndex.includes("## 指引、表格與工具")) {
  xgeIndex = xgeIndex.replace(/\n## 🔗 相關連結/, `\n${additions}\n\n## 🔗 相關連結`);
  queueWrite(xgeIndexPath, xgeIndex, "指引、表格與工具");
}
console.log(`完成：${groupIndexes.reduce((sum, entry) => sum + entry.count, 0)} 頁規則參考、1 頁角色生平與 ${names.length} 份姓名表彙整。`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
if (options.report) {
  writeCandidatePlan(plan, options.report, { root: ROOT });
}
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用 XGE 參考章節：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽 XGE 參考章節：${plan.changes.length} 個候選變更；請以 wiki:apply 套用已儲存計畫。`);
}
