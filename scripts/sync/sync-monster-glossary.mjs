import fs from "node:fs";
import path from "node:path";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = ROOT;
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用受管理資料變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const wikiRoot = path.join(root, "wiki", "怪物");
const glossaryPath = path.join(root, "附件", "翻譯詞彙表.md");
const start = "<!-- MONSTER-GLOSSARY:START -->";
const end = "<!-- MONSTER-GLOSSARY:END -->";

function sourceLocator(source, chinese) {
  const lines = fs.readFileSync(path.join(root, source), "utf8").split(/\r?\n/);
  const escaped = chinese.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = lines.findIndex((line) => new RegExp(`^#{1,2}\\s+${escaped}(?:\\s|[A-Za-z]|$)`).test(line));
  const line = match >= 0 ? match + 1 : 1;
  return `${source.replace("原始資料/怪物圖鑑2025/", "")} L${line} 標題：${chinese}`;
}

const entries = [];
for (const file of fs.readdirSync(wikiRoot, { recursive: true })) {
  if (!file.endsWith(".md")) continue;
  const absolute = path.join(wikiRoot, file);
  const raw = fs.readFileSync(absolute, "utf8");
  if (!/^\*\*AC\*\*/m.test(raw)) continue;
  const title = raw.match(/^title:\s*"(.+?)"\s*$/m)?.[1];
  const source = raw.match(/^\s*- file:\s*"(.+?)"\s*$/m)?.[1];
  const match = title?.match(/^(.+?) \((.+)\)$/);
  if (!match || !source?.startsWith("原始資料/怪物圖鑑2025/")) continue;
  entries.push({ english: match[2], chinese: match[1], source });
}

entries.sort((a, b) => a.english.localeCompare(b.english, "en"));

function canonicalMonsterName(entry) {
  const dragonPrefix = new Map([
    ["遠古", "Ancient "],
    ["成年", "Adult "],
    ["青年", "Young "],
    ["少年", "Juvenile "],
  ]);
  for (const [chinesePrefix, englishPrefix] of dragonPrefix) {
    if (entry.chinese.startsWith(chinesePrefix) && entry.english.startsWith(englishPrefix)) {
      const chinese = entry.chinese.slice(chinesePrefix.length);
      const english = entry.english.slice(englishPrefix.length);
      if (chinese.endsWith("龍") && english.endsWith(" Dragon")) return { ...entry, chinese, english, locatorChinese: entry.chinese };
    }
  }
  if (entry.chinese.endsWith("龍雛龍") && entry.english.endsWith(" Dragon Wyrmling")) {
    return { ...entry, chinese: entry.chinese.slice(0, -2), english: entry.english.slice(0, -9), locatorChinese: entry.chinese };
  }
  if (entry.chinese === "妖精龍成體" && entry.english === "Faerie Dragon Adult") {
    return { ...entry, chinese: "妖精龍", english: "Faerie Dragon", locatorChinese: entry.chinese };
  }
  if (entry.chinese === "妖精龍青年體" && entry.english === "Faerie Dragon Youth") {
    return { ...entry, chinese: "妖精龍", english: "Faerie Dragon", locatorChinese: entry.chinese };
  }
  return entry;
}

const normalizedEntries = [];
const seen = new Set();
for (const entry of entries) {
  const variant = entry.chinese.match(/^(.+)（[123]型）$/);
  const englishVariant = entry.english.match(/^(.+) \(Type [123]\)$/);
  let normalized = variant && englishVariant
    ? { ...entry, chinese: variant[1], english: englishVariant[1], locatorChinese: entry.chinese }
    : entry;
  normalized = canonicalMonsterName(normalized);
  if (normalized.english === "Yuan-ti Malisons" && normalized.chinese === "惡咒蛇人") continue;
  const key = `${normalized.english}\u0000${normalized.chinese}`;
  if (!seen.has(key)) {
    seen.add(key);
    normalizedEntries.push(normalized);
  }
}
normalizedEntries.sort((a, b) => a.english.localeCompare(b.english, "en"));
const duplicate = normalizedEntries.find((entry, index) => index && entry.english === normalizedEntries[index - 1].english && entry.chinese !== normalizedEntries[index - 1].chinese);
if (duplicate) throw new Error(`英文名稱對應多個譯名：${duplicate.english}`);

const rows = [
  "| 英文 | 本 Wiki 標準譯名 | 來源 ID | 定位 | 狀態 |",
  "| :--- | :--- | :--- | :--- | :--- |",
  ...normalizedEntries.map(({ english, chinese, source, locatorChinese = chinese }) => `| ${english} | ${chinese} | MM2025-CHM-MONSTERS | ${sourceLocator(source, locatorChinese)} | approved |`),
];
const glossary = fs.readFileSync(glossaryPath, "utf8");
const replacement = `${start}\n\n${rows.join("\n")}\n\n${end}`;
const expression = new RegExp(`${start}[\\s\\S]*?${end}`);
if (!expression.test(glossary)) throw new Error("找不到怪物譯名表標記。");
const after = glossary.replace(expression, replacement);
const changes = after === glossary ? [] : [candidateChange({ destination: glossaryPath, before: glossary, after, operation: "update", source: "wiki/怪物", locator: "MONSTER-GLOSSARY" })];
const lintManagedWiki = ({ files, overrides } = {}) => {
  const wikiFiles = (files ?? []).filter((file) => file.replaceAll("\\", "/").startsWith("wiki/"));
  const wikiOverrides = overrides ? new Map([...overrides].filter(([file]) => file.startsWith("wiki/"))) : undefined;
  return wikiFiles.length ? lintWiki({ files: wikiFiles, overrides: wikiOverrides }) : { errors: 0, warnings: 0, information: 0 };
};
const plan = planCandidateBatch(changes, { root, lint: lintManagedWiki });
writeCandidatePlan(plan, options.report, { root });
if (options.apply) applyCandidateBatch(plan, { root, lint: lintManagedWiki });
console.log(`${options.apply ? "已套用" : "預覽"} ${normalizedEntries.length} 筆怪物譯名對照；候選 ${plan.summary.ready}。`);
