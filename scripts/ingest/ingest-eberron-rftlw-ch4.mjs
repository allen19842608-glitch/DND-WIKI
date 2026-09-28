import fs from "node:fs";
import path from "node:path";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = ROOT;
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const sourceRoot = path.join(root, "原始資料", "艾伯倫：從終末戰爭中崛起", "第四章");
const base = path.join(root, "wiki", "戰役設定", "艾伯倫");
const sourcePrefix = "原始資料/艾伯倫：從終末戰爭中崛起/第四章";
const publication = "艾伯倫從終末戰爭中崛起2019";
const pending = [];
const staged = new Map();

const entries = [
  ["冒險主題", "Adventure Themes", "冒險主題", "冒險與勢力", "冒險設計"],
  ["刀鋒領主", "Lord of Blades", "刀鋒領主", "冒險與勢力", "勢力"],
  ["哀傷故地", "Mournland", "哀傷故地", "冒險與勢力", "地區與冒險"],
  ["塔卡南家族", "House Tarkanan", "塔卡南家族", "冒險與勢力", "勢力"],
  ["塵主", "Lords of Dust", "塵主", "冒險與勢力", "勢力"],
  ["存在位面", "Planes of Eberron", "存在位面", "冒險與勢力", "世界觀"],
  ["巨龍", "Dragons", "巨龍", "冒險與勢力", "勢力"],
  ["旅行", "Travel in Eberron", "艾伯倫旅行", "冒險與勢力", "旅行"],
  ["暴君會", "Tyrants", "暴君會", "冒險與勢力", "勢力"],
  ["波羅馬氏族", "Boromar Clan", "波羅馬氏族", "冒險與勢力", "勢力"],
  ["終末戰爭", "Last War", "終末戰爭", "冒險與勢力", "世界觀"],
  ["翡翠利爪教團", "Order of the Emerald Claw", "翡翠利爪教團", "冒險與勢力", "勢力"],
  ["黑暗夢境", "Dreaming Dark", "黑暗夢境", "冒險與勢力", "勢力"],
  ["護門者", "Gatekeepers", "護門者", "冒險與勢力", "勢力"],
  ["達斯克", "Daask", "達斯克", "冒險與勢力", "勢力"],
  ["金權會", "Aurum", "金權會", "冒險與勢力", "勢力"],
  ["類地精（達坎後裔）", "Goblinoids (Heirs of Dhakaan)", "類地精-達坎後裔", "冒險與勢力", "勢力"],
  ["龍紋家族", "Dragonmarked Houses", "龍紋家族", "冒險與勢力", "勢力"],
  ["薩恩的冒險", "Adventures in Sharn", "薩恩的冒險", "薩恩", "冒險設計"],
  ["薩恩警衛", "Sharn Watch", "薩恩警衛", "薩恩", "勢力"],
];

const supplements = [
  ["卓姆", path.join(base, "科瓦雷", "卓姆.md"), "卓姆冒險"],
  ["黃泉巨龍邪教", path.join(base, "信仰", "黃泉巨龍邪教.md"), "黃泉巨龍邪教冒險"],
  ["薩恩的犯罪", path.join(base, "薩恩", "犯罪活動.md"), "薩恩犯罪"],
];

function raw(file) { return fs.readFileSync(path.join(sourceRoot, `${file}.md`), "utf8"); }
function sourcePath(file) { return `${sourcePrefix}/${file}.md`; }
function slug(english) { return english.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function id(file) { let n = 2166136261; for (const char of `ERLW2019:ch4:${file}`) { n ^= char.codePointAt(0); n = Math.imul(n, 16777619); } return (n >>> 0).toString(16).padStart(8, "0"); }

function content(file) {
  const normalized = raw(file)
    .replace(/^#\s+[^\n]+\r?\n+/, "")
    .replace(/^\*\*([^*\r\n]+)\*\*\r?\n(?:\*\*)?([^*\r\n]+)\*\*\r?\n(?:[ \t]*\r?\n)*\* \* \*\r?\n(?:[ \t]*\r?\n)*#\s+([^\r\n]+)$/gm, "# $1$2\n# $3");
  const lines = normalized.split(/\r?\n/);
  const output = [];
  let quote = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\* \* \*$/.test(line.trim())) continue;
    const followsBlank = index > 0 && !lines[index - 1].trim();
    const plainSectionTitle = quote && followsBlank && line.length <= 100 && !/[。！？!?]/.test(line) && /(?:\s+[A-Z][A-Za-z'’\- ]+)?$/.test(line);
    if (plainSectionTitle) {
      quote = false;
      output.push(`### ${line.trim()}`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      const label = line.replace(/^#\s+/, "").trim();
      if (label === "第四章") continue;
      const nextHeading = lines.slice(index + 1).find((candidate) => /^#\s+/.test(candidate));
      if (nextHeading) {
        output.push(`> [!QUOTE]- ${label}：${nextHeading.replace(/^#\s+/, "").trim()}`);
        quote = true;
        continue;
      }
      if (quote || lines.slice(0, index).some((candidate) => /^#\s+/.test(candidate))) continue;
      output.push(`> [!QUOTE]- ${label}`);
      quote = true;
      continue;
    }
    if (/^##\s+/.test(line)) { quote = false; output.push(`### ${line.replace(/^##\s+/, "")}`); continue; }
    if (/^###\s+/.test(line)) { quote = false; output.push(line); continue; }
    if (quote && !line.trim()) { if (output.at(-1) !== ">") output.push(">"); continue; }
    output.push(quote ? `> ${line}` : line);
  }
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function frontmatter(title, english, source) {
  return `---
title: "${title} (${english})"
entity_id: "entry:ERLW2019:setting:${id(source)}"
concept_id: "concept:setting:${slug(english)}"
ruleset: "2014"
content_scope: "expansion"
status: "legacy"
category: "戰役設定"
version: "2014-Legacy"
tags:
  - "${publication}"
  - "戰役設定_艾伯倫"
sources:
  - file: "${sourcePath(source)}"
    locator: "標題：${source}"
    authority: "官方"
    translation: "community"
source_type: "official"
confidence: "interpreted"
rules_sources:
  - "Eberron: Rising from the Last War (2019)"
errata: []
updated: "2026-08-13"
---`;
}

function queueWrite(destination, text, locator) {
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === text || staged.get(destination) === text) return;
  staged.set(destination, text);
  const change = candidateChange({ destination, before, after: text, operation: before === null ? "create" : "update", source: sourcePrefix, locator });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}

function page([source, english, title, folder, section]) {
  const dir = path.join(base, folder);
  const indexFolder = "冒險與勢力";
  const localIndex = folder === "薩恩" ? "- [[戰役設定/艾伯倫/薩恩/薩恩索引|薩恩索引 (Sharn Index)]]\n" : "";
  const text = `${frontmatter(title, english, source)}

# ${title} (${english})

## ${section}

${content(source)}

## 🔗 相關連結

- [[戰役設定/艾伯倫/${indexFolder}/冒險與勢力索引|冒險與勢力索引 (Adventure and Factions Index)]]
${localIndex}- [[戰役設定/艾伯倫/艾伯倫索引|艾伯倫索引 (Eberron Index)]]
`;
  const target = path.join(dir, `${title}.md`);
  queueWrite(target, text, `標題：${source}`);
  console.log(`匯入：${path.relative(root, target)}`);
}

function supplement(source, target, heading) {
  let text = staged.get(target) ?? fs.readFileSync(target, "utf8");
  const legacyHeading = `第四章補充：${heading}`;
  if (text.includes(`## ${legacyHeading}`)) text = text.replace(`## ${legacyHeading}`, `## ${heading}`);
  const marker = `## ${heading}`;
  const addition = `${marker}\n\n${content(source)}\n\n`;
  text = text.includes(marker) ? text.replace(new RegExp(`${marker}[\\s\\S]*?(?=\\n## 🔗 相關連結)`), addition.trimEnd()) : text.replace("## 🔗 相關連結", `${addition}## 🔗 相關連結`);
  const sourceRecord = `  - file: "${sourcePath(source)}"\n    locator: "標題：${source}"\n    authority: "官方"\n    translation: "community"\n`;
  if (!text.includes(`file: "${sourcePath(source)}"`)) text = text.replace("source_type:", `${sourceRecord}source_type:`);
  const adventureIndex = "- [[戰役設定/艾伯倫/冒險與勢力/冒險與勢力索引|冒險與勢力索引 (Adventure and Factions Index)]]";
  if (!text.includes("|冒險與勢力索引")) text = text.replace("## 🔗 相關連結", `## 🔗 相關連結\n\n${adventureIndex}`);
  queueWrite(target, text, `標題：${source}`);
  console.log(`補充：${path.relative(root, target)}`);
}

for (const entry of entries) page(entry);
for (const item of supplements) supplement(...item);

const indexDir = path.join(base, "冒險與勢力");
const groups = [["冒險與世界觀", entries.filter((e) => ["冒險設計", "地區與冒險", "世界觀", "旅行"].includes(e[4]))], ["勢力", entries.filter((e) => e[4] === "勢力")]];
const listing = groups.map(([name, items]) => {
  const links = items.map(([, english, title]) => `- [[戰役設定/艾伯倫/${entries.find((e) => e[2] === title)[3]}/${title}|${title} (${english})]]`);
  if (name === "勢力") {
    links.push(
      "- [[戰役設定/艾伯倫/科瓦雷/卓姆|卓姆 (Droaam)]]",
      "- [[戰役設定/艾伯倫/信仰/黃泉巨龍邪教|黃泉巨龍邪教 (Cults of the Dragon Below)]]",
      "- [[戰役設定/艾伯倫/薩恩/犯罪活動|薩恩的犯罪組織 (Criminal Organizations in Sharn)]]",
    );
  }
  return `### ${name}\n\n${links.join("\n")}`;
}).join("\n\n");
const index = `${frontmatter("冒險與勢力索引", "Adventure and Factions Index", "第四章：構建艾伯倫冒險")}

# 冒險與勢力索引 (Adventure and Factions Index)

## 導覽

${listing}

## 構建艾伯倫冒險

${content("第四章：構建艾伯倫冒險")}

## 🔗 相關連結

- [[戰役設定/艾伯倫/艾伯倫索引|艾伯倫索引 (Eberron Index)]]
`;
queueWrite(path.join(indexDir, "冒險與勢力索引.md"), index, "第四章：構建艾伯倫冒險");
console.log(`匯入：${path.relative(root, path.join(indexDir, "冒險與勢力索引.md"))}`);
console.log(`完成：${entries.length} 個第四章條目、3 個既有條目補充與 1 個索引。`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
if (options.report) {
  const reportPath = path.resolve(ROOT, options.report);
  if (!reportPath.startsWith(`${path.join(ROOT, "reports")}${path.sep}`)) throw new Error("報告只能輸出至 reports/。");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用 Eberron 第四章：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽 Eberron 第四章：${plan.changes.length} 個候選變更；加入 --apply 才會寫入。`);
}
