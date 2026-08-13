import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "原始資料", "艾伯倫：從終末戰爭中崛起", "第三章");
const wikiRoot = path.join(root, "wiki", "戰役設定", "艾伯倫", "薩恩");
const publication = "艾伯倫從終末戰爭中崛起2019";
const sourcePrefix = "原始資料/艾伯倫：從終末戰爭中崛起/第三章";

const entries = [
  ["薩恩概況", "Sharn Overview", "薩恩概況", "城市概覽"],
  ["薩恩層區", "Sharn Levels", "薩恩層區", "城市結構"],
  ["城市導覽", "City Guide", "城市導覽", "城市運作"],
  ["執法力量", "Law Enforcement", "執法力量", "城市運作"],
  ["犯罪活動", "Crime", "犯罪活動", "城市運作"],
  ["中央高地", "Central Plateau", "中央高地", "大區"],
  ["北緣", "Northedge", "北緣", "大區"],
  ["塔維克泊地", "Tavick's Landing", "塔維克泊地", "大區"],
  ["孟西斯高地", "Menthis Plateau", "孟西斯高地", "大區"],
  ["杜拉", "Dura", "杜拉", "大區"],
  ["上天入地", "Above and Below", "上天入地", "大區"],
  ["薩恩地城", "Sharn Dungeons", "薩恩地城", "冒險地點"],
];

function sourceText(file) {
  return fs.readFileSync(path.join(sourceRoot, `${file}.md`), "utf8");
}

function sourcePath(file) {
  return `${sourcePrefix}/${file}.md`;
}

function idFor(file) {
  let hash = 2166136261;
  for (const char of `ERLW2019:sharn:${file}`) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeReports(text) {
  return text.replace(
    /^\*\*([^*\r\n]+)\*\*\r?\n(?:\*\*)?([^*\r\n]+)\*\*\r?\n(?:[ \t]*\r?\n)*\* \* \*\r?\n(?:[ \t]*\r?\n)*#\s+([^\r\n]+)$/gm,
    "# $1$2\n# $3",
  );
}

function structuredContent(file) {
  const lines = normalizeReports(sourceText(file).replace(/^#\s+[^\n]+\r?\n+/, "")).split(/\r?\n/);
  const result = [];
  let inReport = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\* \* \*$/.test(line.trim())) continue;
    const followsBlank = index > 0 && !lines[index - 1].trim();
    const plainSectionTitle = inReport && followsBlank && line.length <= 100 && !/[。！？!?]/.test(line) && /(?:\s+[A-Z][A-Za-z'’\- ]+)?$/.test(line);
    if (plainSectionTitle) {
      inReport = false;
      result.push(`### ${line.trim()}`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      const label = line.replace(/^#\s+/, "").trim();
      if (label === "第三章") continue;
      const nextHeading = lines.slice(index + 1).find((candidate) => /^#\s+/.test(candidate));
      if (nextHeading) {
        result.push(`> [!QUOTE]- ${label}：${nextHeading.replace(/^#\s+/, "").trim()}`);
        inReport = true;
        continue;
      }
      if (inReport || lines.slice(0, index).some((candidate) => /^#\s+/.test(candidate))) continue;
      result.push(`> [!QUOTE]- ${label}`);
      inReport = true;
      continue;
    }
    if (/^##\s+/.test(line)) {
      inReport = false;
      result.push(`### ${line.replace(/^##\s+/, "")}`);
      continue;
    }
    if (/^###\s+/.test(line)) {
      inReport = false;
      result.push(line);
      continue;
    }
    if (inReport && !line.trim()) {
      if (result[result.length - 1] !== ">") result.push(">");
      continue;
    }
    result.push(inReport ? `> ${line}` : line);
  }
  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function frontmatter(title, english, file, locator = title) {
  return `---
title: "${title} (${english})"
entity_id: "entry:ERLW2019:setting:${idFor(file)}"
concept_id: "concept:setting:${english.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}"
ruleset: "2014"
content_scope: "expansion"
status: "legacy"
category: "戰役設定"
version: "2014-Legacy"
tags:
  - "${publication}"
  - "戰役設定_艾伯倫"
sources:
  - file: "${sourcePath(file)}"
    locator: "標題：${locator}"
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

function entryPage([file, english, title, section]) {
  return `${frontmatter(title, english, file)}

# ${title} (${english})

## ${section}

${structuredContent(file)}

## 🔗 相關連結

- [[戰役設定/艾伯倫/薩恩/薩恩索引|薩恩索引 (Sharn Index)]]
- [[戰役設定/艾伯倫/艾伯倫索引|艾伯倫索引 (Eberron Index)]]
`;
}

function indexPage() {
  const intro = structuredContent("第三章：眾塔之城薩恩");
  const groups = [
    ["城市總覽與運作", entries.slice(0, 5)],
    ["薩恩大區", entries.slice(5, 11)],
    ["冒險地點", entries.slice(11)],
    ["冒險與執法", [["", "Adventures in Sharn", "薩恩的冒險"], ["", "Sharn Watch", "薩恩警衛"]]],
  ];
  const listing = groups.map(([heading, items]) => `### ${heading}\n\n${items.map(([, english, title]) => `- [[戰役設定/艾伯倫/薩恩/${title}|${title} (${english})]]`).join("\n")}`).join("\n\n");
  return `${frontmatter("薩恩索引", "Sharn Index", "第三章：眾塔之城薩恩", "第三章：眾塔之城薩恩")}

# 薩恩索引 (Sharn Index)

## 章節導覽

${listing}

## 眾塔之城薩恩

${intro}

## 🔗 相關連結

- [[戰役設定/艾伯倫/艾伯倫索引|艾伯倫索引 (Eberron Index)]]
`;
}

fs.mkdirSync(wikiRoot, { recursive: true });
for (const entry of entries) {
  fs.writeFileSync(path.join(wikiRoot, `${entry[2]}.md`), entryPage(entry), "utf8");
  console.log(`匯入：${path.relative(root, path.join(wikiRoot, `${entry[2]}.md`))}`);
}
fs.writeFileSync(path.join(wikiRoot, "薩恩索引.md"), indexPage(), "utf8");
console.log(`匯入：${path.relative(root, path.join(wikiRoot, "薩恩索引.md"))}`);
console.log(`完成：${entries.length} 個第三章設定條目與 1 個索引。`);
