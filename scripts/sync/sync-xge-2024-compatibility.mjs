import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI = path.join(ROOT, "wiki");
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const XGE_TAG = "珊娜薩的萬事指南2017";
const OPTION_TYPES = new Set(["subclass", "spell", "feat"]);
const today = (() => {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
})();

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : entry.name.endsWith(".md") ? [target] : [];
  });
}

function readRecord(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  return { file, text, frontmatter: match[1], body: match[2], data: YAML.parse(match[1]) };
}

function entityType(entityId) {
  return entityId?.match(/^entry:XGE2017:([^:]+):/)?.[1];
}

function englishTitle(title) {
  return title?.match(/\(([^，()]+?)(?:，[^)]*)?\)$/)?.[1]?.trim();
}

function wikiTarget(record) {
  return path.relative(WIKI, record.file).replace(/\\/g, "/").replace(/\.md$/, "");
}

function addCompatibilitySource(frontmatter, source) {
  if (!source || frontmatter.includes(`file: "${source.file}"`)) return frontmatter;
  const block = `  - file: "${source.file}"\n    locator: "3 級：${source.className}子職"\n    authority: "${source.authority ?? "官方"}"\n    translation: "${source.translation ?? "community"}"\n`;
  return frontmatter.replace(/\nsource_type:/, `\n${block}source_type:`);
}

function updateFrontmatter(record, compatibility, replacement, compatibilitySource) {
  let frontmatter = record.frontmatter
    .replace(/^compatibility_2024:.*\r?\n/m, "")
    .replace(/^replacement_2024:.*\r?\n/m, "")
    .replace(/^updated: ".*"$/m, `updated: "${today}"`);
  frontmatter = frontmatter.replace(/^(status: ".*"\r?\n)/m, `$1compatibility_2024: "${compatibility}"\n`);
  if (replacement) frontmatter = frontmatter.replace(/^(compatibility_2024:.*\r?\n)/m, `$1replacement_2024: "${replacement}"\n`);
  return addCompatibilitySource(frontmatter, compatibilitySource);
}

function compatibilityCallout(record, replacement, compatibilitySource) {
  const pattern = /> \[!WARNING\] 2024 規則取代\n>[\s\S]*?(?=\n\n|$)|> \[!INFO\] 2024 相容性\n>[\s\S]*?(?=\n\n|$)\n?/;
  const legacyWarning = /> \[!WARNING\] 本條目為 2014 舊版規則(?:；2024 新版請參閱 \[\[[^\n]+\]\])?。\r?\n?/g;
  const subclassTiming = !replacement && entityType(record.data.entity_id) === "subclass"
    ? `\n> 採用 2024 [[${wikiTarget(compatibilitySource.record)}|${compatibilitySource.record.data.title}]] 時，子職於職業 3 級選擇；本 2014 子職原本在 1、2 或 3 級取得的特性，於該 3 級一併獲得；其後仍依原表所列職業等級取得。（來源：玩家手冊2024，3 級：${compatibilitySource.className}子職）`
    : "";
  const callout = replacement
    ? `> [!WARNING] 2024 規則取代\n> 本條目已由 [[${wikiTarget(replacement)}|${replacement.data.title}]] 取代；採用 2024 核心規則時請使用新版。`
    : `> [!INFO] 2024 相容性\n> 本條目未被《玩家手冊2024》同名條目取代，可與 2024 核心規則併用。${subclassTiming}`;
  return record.body.replace(pattern, "").replace(legacyWarning, "").replace(/^(\r?\n# .+\r?\n)/, `$1\n${callout}\n`);
}

function addBacklink(current, legacy) {
  const link = `[[${wikiTarget(legacy)}|${legacy.data.title}]]`;
  if (current.body.includes(link)) return current;
  const body = current.body.replace(/(## 🔗 相關連結\r?\n\r?\n)/, `$1- ${link}\n`);
  return { ...current, body };
}

const records = walk(WIKI).map(readRecord).filter(Boolean);
const currentByCategoryAndEnglish = new Map();
const currentClassByChinese = new Map();
for (const record of records) {
  if (record.data.version !== "2024-Core") continue;
  const english = englishTitle(record.data.title);
  if (english) currentByCategoryAndEnglish.set(`${record.data.category}:${english.toLowerCase()}`, record);
  if (record.data.category === "職業" && record.data.entry_type === "職業") {
    const chinese = record.data.title?.replace(/\s*\([^)]*\)$/, "");
    if (chinese) currentClassByChinese.set(chinese, record);
  }
}

let compatible = 0;
let superseded = 0;
const writes = new Map();
for (const record of records) {
  if (record.data.tags?.[0] !== XGE_TAG || !OPTION_TYPES.has(entityType(record.data.entity_id))) continue;
  const english = englishTitle(record.data.title);
  const replacement = english ? currentByCategoryAndEnglish.get(`${record.data.category}:${english.toLowerCase()}`) : undefined;
  const state = replacement ? "replaced" : "compatible";
  const parentClass = entityType(record.data.entity_id) === "subclass"
    ? currentClassByChinese.get(record.data.parent_class)
    : undefined;
  const parentSource = parentClass?.data.sources?.[0];
  const compatibilitySource = parentSource ? {
    ...parentSource,
    className: record.data.parent_class,
    record: parentClass,
  } : undefined;
  const next = {
    ...record,
    frontmatter: updateFrontmatter(record, state, replacement ? wikiTarget(replacement) : undefined, compatibilitySource),
    body: compatibilityCallout(record, replacement, compatibilitySource),
  };
  writes.set(record.file, next);
  if (replacement) {
    superseded += 1;
    writes.set(replacement.file, addBacklink(writes.get(replacement.file) ?? replacement, record));
  } else {
    compatible += 1;
  }
}

const pending = [...writes].flatMap(([file, record]) => {
  const before = fs.readFileSync(file, "utf8");
  const after = `---\n${record.frontmatter}\n---\n${record.body}`;
  return before === after ? [] : [candidateChange({
    destination: file, before, after, operation: "update", source: "XGE2017",
    locator: record.data?.title ?? path.relative(ROOT, file),
  })];
});
const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan({ ...plan, compatible, superseded }, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
console.log(`XGE 2024 相容性：可用 ${compatible} 項，已取代 ${superseded} 項，${options.apply ? "套用" : "候選"} ${plan.changes.length} 頁。`);
