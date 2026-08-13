import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadPublication, today } from "./ingest-publication-utils.mjs";

const publicationId = "XGE2017";
const publication = loadPublication(publicationId);
const source = "原始資料/珊娜薩的萬事指南/地下城主工具/獎勵魔法物品/普通魔法物品.md";
const sourcePdf = "原始資料/珊娜薩的萬事指南/Xanathars_Guide_to_Everything.pdf";
const sourcePath = path.join(ROOT, source);
const outputRoot = path.join(ROOT, "wiki", "魔法物品", "2014");
const referencePath = path.join(ROOT, "wiki", "規則", "2014", "地下城主工具", "獎勵魔法物品", "普通魔法物品.md");
const converterRoot = process.env.XGE_OPENCC_PATH ?? "C:\\Users\\Owner\\AppData\\Local\\Temp\\dnd-wiki-xge-opencc";
const python = process.env.XGE_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const titleOverrides = new Map([["Sheild of Expression", "Shield of Expression"]]);
const chineseOverrides = new Map([["Pipe of Smoke Monsters", "怪物菸斗"]]);

function convert(text) {
  if (!fs.existsSync(converterRoot)) throw new Error(`找不到 OpenCC：${converterRoot}。請設定 XGE_OPENCC_PATH。`);
  return execFileSync(python, ["-c", program, converterRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .replace(/(\d+)\s*尺/g, "$1 呎")
    .replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replace(/(\d+)\s*gp\b/gi, "$1 GP")
    .replaceAll("尺", "呎").replaceAll("型別", "類型")
    .replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function quote(value) { return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"'); }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function safeName(value) { return value.replace(/[\\/:*?"<>|]/g, "-").trim(); }
function wikiTarget(file) { return path.relative(path.join(ROOT, "wiki"), file).replaceAll("\\", "/").replace(/\.md$/, ""); }
function compact(value) { return value.split(/\r?\n/).map((line) => line.trim().replace(/^[-·]\s*/, "")).filter(Boolean).join(" "); }

function parseItems(text) {
  const lines = text.split(/\r?\n/);
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^######\s+(.+?)\s+([A-Z][A-Za-z' -]+)$/);
    if (match) {
      const english = titleOverrides.get(match[2].trim()) ?? match[2].trim();
      headings.push({ index, chinese: chineseOverrides.get(english) ?? match[1].trim(), english });
    }
  }
  return headings.map((heading, index) => {
    const end = headings[index + 1]?.index ?? lines.length;
    const metadata = lines.slice(heading.index + 1, end).find((line) => /^_.+_$/.test(line.trim()))?.trim().replace(/^_|_$/g, "") ?? "奇物，普通";
    const bodyStart = lines.findIndex((line, lineIndex) => lineIndex > heading.index && /^_.+_$/.test(line.trim()));
    const body = compact(lines.slice(bodyStart + 1, end).join("\n"));
    const type = ["護甲", "武器", "法杖", "魔杖", "奇物"].find((candidate) => metadata.startsWith(candidate)) ?? "奇物";
    const attunement = metadata.match(/需(.+?)同調/)?.[1];
    return { ...heading, metadata, body, type, attunement };
  });
}

function currentItems() {
  const root = path.join(ROOT, "wiki", "魔法物品");
  const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : entry.name.endsWith(".md") ? [target] : [];
  });
  const map = new Map();
  for (const file of walk(root)) {
    if (file.includes(`${path.sep}2014${path.sep}`)) continue;
    const title = fs.readFileSync(file, "utf8").match(/^title:\s*"(.+?)"$/m)?.[1] ?? "";
    const english = title.match(/\(([^()]+)\)$/)?.[1]?.trim();
    if (english) map.set(english.toLowerCase(), { file, title });
  }
  return map;
}

function itemPage(item, counterpart) {
  const destination = path.join(outputRoot, item.type, `${safeName(item.chinese)}.md`);
  const metadataCategory = item.metadata.replace(/，\s*普通.*$/, "");
  const attunement = item.attunement ? `需要；${item.attunement}` : "不需要";
  const indexLink = "[[魔法物品/2014/普通魔法物品索引|普通魔法物品索引 (2014 Legacy)]]";
  const counterpartLink = counterpart ? `- [[${wikiTarget(counterpart.file)}|${counterpart.title}]]\n` : "";
  const body = `# ${item.chinese} (${item.english}，2014 Legacy)\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 物品資料\n\n| 項目 | 內容 |\n| :--- | :--- |\n| 類別 (Category) | ${metadataCategory} |\n| 稀有度 (Rarity) | 普通 |\n| 同調 (Attunement) | ${attunement} |\n| 消耗品 (Consumable) | 否 |\n\n### 物品效果\n\n- **${item.chinese}**：\n  - **效果**：${item.body}\n\n## 🔗 相關連結\n\n- ${indexLink}\n${counterpartLink}`;
  const content = `---\ntitle: "${quote(`${item.chinese} (${item.english}，2014 Legacy)`)}"\nentity_id: "entry:${publicationId}:magic-item:${slug(item.english)}"\nconcept_id: "concept:magic-item:${slug(item.english)}"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "魔法物品"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "魔法物品_${item.type}"\nsources:\n  - file: "${source}"\n    locator: "${quote(`###### ${item.chinese} ${item.english}`)}"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 2: Dungeon Master's Tools；Common Magic Items；${quote(item.english)}"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n${body}`;
  return { destination, content };
}

function addBacklink(counterpart, legacyTarget, legacyTitle) {
  let text = fs.readFileSync(counterpart.file, "utf8");
  const link = `[[${legacyTarget}|${legacyTitle}]]`;
  if (text.includes(link)) return;
  text = text.replace(/(## 🔗 相關連結\r?\n\r?\n)/, `$1- ${link}\n`);
  fs.writeFileSync(counterpart.file, text, "utf8");
}

const items = parseItems(convert(fs.readFileSync(sourcePath, "utf8")));
const current = currentItems();
const byType = new Map();
for (const item of items) {
  const counterpart = current.get(item.english.toLowerCase());
  const { destination, content } = itemPage(item, counterpart);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content, "utf8");
  if (counterpart) addBacklink(counterpart, wikiTarget(destination), `${item.chinese} (${item.english}，2014 Legacy)`);
  byType.set(item.type, [...(byType.get(item.type) ?? []), { item, destination }]);
}

const indexLists = [...byType.entries()].map(([type, entries]) => `## ${type}\n\n${entries.sort((a, b) => a.item.chinese.localeCompare(b.item.chinese, "zh-Hant")).map(({ item, destination }) => `- [[${wikiTarget(destination)}|${item.chinese} (${item.english}，2014 Legacy)]]`).join("\n")}`).join("\n\n");
const index = `---\ntitle: "普通魔法物品索引 (2014 Legacy)"\nentity_id: "entry:${publicationId}:magic-item-index:common"\nconcept_id: "concept:magic-item-index:common-xge-2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "魔法物品"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "魔法物品_索引"\nsources:\n  - file: "${source}"\n    locator: "L1 新普通魔法物品；Common Magic Items"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 2: Dungeon Master's Tools；Common Magic Items"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# 普通魔法物品索引 (2014 Legacy)\n\n> 收錄《珊娜薩的萬事指南》新增的 48 件普通魔法物品；各項物品依類別分頁。\n\n${indexLists}\n\n## 🔗 相關連結\n\n- [[規則/2014/地下城主工具/獎勵魔法物品/普通魔法物品|新普通魔法物品 (2014 Legacy)]]\n- [[魔法物品/魔法物品索引|魔法物品索引 (Magic Item Index)]]\n`;
fs.writeFileSync(path.join(outputRoot, "普通魔法物品索引.md"), index, "utf8");

let reference = fs.readFileSync(referencePath, "utf8");
const frontmatterEnd = reference.indexOf("---", 4);
const prefix = reference.slice(0, frontmatterEnd + 3);
const guide = `\n\n# 新普通魔法物品 (2014 Legacy)\n\n> [!WARNING] 本頁保留《珊娜薩的萬事指南》的 2014 指引；如與現行規則衝突，以採用的規則版本為準。\n\n## 普通魔法物品\n\n《城主指南》中包含各種稀有度的魔法物品，但普通魔法物品數量很少。本節新增的物品主要用於角色扮演、趣味與情境發揮；完整物品說明依類別移至 [[魔法物品/2014/普通魔法物品索引|普通魔法物品索引 (2014 Legacy)]]。\n\n> [!NOTE] 設計更多普通魔法物品\n> 《城主指南》第七章的特殊特性可作為設計靈感，例如賦予語言、在邪魔附近發光，或把使用者聲音傳至遠處。這是 DM 設計指引，不是新增既有物品的規則。\n\n## 🔗 相關連結\n\n- [[魔法物品/2014/普通魔法物品索引|普通魔法物品索引 (2014 Legacy)]]\n- [[規則/2014/地下城主工具/地下城主工具索引|地下城主工具索引 (2014 Legacy)]]\n- [[規則/2014/XGE規則索引|XGE 規則索引 (2014 Legacy)]]\n`;
fs.writeFileSync(referencePath, `${prefix}${guide}`, "utf8");
console.log(`XGE 普通魔法物品：已歸類 ${items.length} 件；其中 ${items.filter((item) => current.has(item.english.toLowerCase())).length} 件建立現行版本雙向連結。`);
