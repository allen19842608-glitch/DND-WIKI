import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CATEGORIES = ["職業", "種族", "背景", "專長"];
const REPLACED_SPECIES = new Set(["人類", "半身人", "侏儒", "寶石龍裔", "提夫林", "矮人", "精靈", "色彩龍裔", "金屬龍裔", "龍裔"]);
const COMPATIBLE_SPECIES = new Set(["半精靈", "半獸人"]);
const CONDITIONAL_BACKGROUNDS = new Set(["巨人養子", "符文雕刻者"]);
const SUBCLASS_COMPATIBILITY_OVERRIDES = new Map([
  ["野蠻人|巨人道途", "compatible"],
]);
const FEAT_COMPATIBILITY_OVERRIDES = new Map([
  ["Fey Touched", "replaced"],
]);
const APPLICABLE_BOOK_TITLES = new Map([
  ["玩家手冊2014", "《玩家手冊 2014》"],
  ["珊娜薩的萬事指南2017", "《珊娜薩的萬事指南》"],
  ["畢格比鉅獻巨人之榮耀2023", "《畢格比鉅獻：巨人之榮耀》"],
]);
const COMPATIBILITY_INDEXES = {
  職業: { file: "wiki/職業/2024相容子職索引.md", title: "2024 相容子職索引", id: "legacy-compatible-subclasses", tag: "職業_索引" },
  種族: { file: "wiki/種族/2024相容種族索引.md", title: "2024 相容種族索引", id: "legacy-compatible-species", tag: "種族_索引" },
  背景: { file: "wiki/背景/2024相容背景索引.md", title: "2024 相容背景索引", id: "legacy-compatible-backgrounds", tag: "背景_索引" },
  專長: { file: "wiki/專長/2024相容專長索引.md", title: "2024 相容專長索引", id: "legacy-compatible-feats", tag: "專長_索引" },
};

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : entry.name.endsWith(".md") ? [absolute] : [];
  });
}

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return { text, data: match ? YAML.parse(match[1]) ?? {} : {} };
}

function english(title) {
  const matched = String(title ?? "").match(/\((.*?)\)$/)?.[1] ?? "";
  return matched.replace(/，2014 Legacy$/, "");
}

function setCompatibility(text, value) {
  if (/^compatibility_2024:/m.test(text)) return text.replace(/^compatibility_2024:.*$/m, `compatibility_2024: "${value}"`);
  return text.replace(/^(status:\s+"legacy"\r?\n)/m, `$1compatibility_2024: "${value}"\n`);
}

function wikiLink(file, title) {
  const target = path.relative(path.join(ROOT, "wiki"), file).replaceAll("\\", "/").replace(/\.md$/, "");
  return `[[${target}\\|${title}]]`;
}

function featPrerequisite(text) {
  const match = text.match(/^- \*\*前置條件 \(Prerequisite\)\*\*：(.+)$/m);
  return match ? `先決條件：${match[1].trim()}` : "保留本頁列出的先決條件。";
}

function applicableBook(data) {
  return APPLICABLE_BOOK_TITLES.get(data.tags?.[0]) ?? data.rules_sources?.[0] ?? "待確認";
}

function compatibilityIndex(category, rows) {
  const metadata = COMPATIBILITY_INDEXES[category];
  const compatible = rows.filter(({ data }) => data.compatibility_2024 === "compatible");
  const conditional = rows.filter(({ data }) => data.compatibility_2024 === "conditional");
  const header = [
    "---",
    `title: \"${metadata.title}\"`,
    `entity_id: \"entry:PHB2024:compatibility-index:${metadata.id}\"`,
    `concept_id: \"concept:compatibility-index:${metadata.id}\"`,
    "ruleset: \"2024\"",
    "content_scope: \"core\"",
    "status: \"current\"",
    "index_scope: \"curated\"",
    `category: \"${category}\"`,
    "version: \"2024-Core\"",
    "tags:",
    "  - \"玩家手冊2024\"",
    `  - \"${metadata.tag}\"`,
    "sources:",
    "  - file: \"原始資料/玩家手冊2024/創建角色/第三步：確定屬性值.md\"",
    "    locator: \"L45 邊欄：來自舊書的背景和種族\"",
    "    authority: \"官方\"",
    "    translation: \"community\"",
    "  - file: \"原始資料/Updates in the Player’s Handbook (2024).md\"",
    "    locator: \"Using This Book with Older Books\"",
    "    authority: \"官方\"",
    "    translation: \"none\"",
    "source_type: \"official\"",
    "confidence: \"interpreted\"",
    "rules_sources:",
    "  - \"Player’s Handbook (2024)\"",
    "  - \"Player’s Handbook (2014)\"",
    "errata: []",
    "updated: \"2026-08-24\"",
    "---",
    "",
    `# ${metadata.title}`,
    "",
    "> 2024 規則為角色主體。可相容項目的本體均未有 2024 對應條目；只要已有 2024 對應條目，即標為 `replaced`，不列入角色建立清單。",
  ];
  const render = (row, restriction) => `| ${wikiLink(row.file, row.data.title)} | ${applicableBook(row.data)} | ${restriction} |`;
  const sections = [];
  if (compatible.length) {
    const rowsText = compatible.map((row) => {
      const restriction = category === "種族" ? "忽略舊版屬性值提升；改用 2024 背景提供的屬性值提升。" : category === "專長" ? featPrerequisite(row.text) : `搭配 2024 ${wikiLink(path.join(ROOT, "wiki", "職業", `${row.data.parent_class}.md`), row.data.parent_class)}；原於 1、2 級取得的子職特性，於 3 級選擇子職時一併取得。`;
      return render(row, restriction);
    });
    sections.push("## 可選的 2014／2024 相容選項", "", "| 選項 | 適用書名 | 限制／替換 |", "| :--- | :--- | :--- |", ...rowsText);
  }
  if (conditional.length) {
    const rowsText = conditional.map((row) => render(row, "自行配置 +2／+1 或三項各 +1；若舊背景未提供專長，改選一項起源專長。"));
    sections.push("## 條件式相容選項", "", "| 選項 | 適用書名 | 限制／替換 |", "| :--- | :--- | :--- |", ...rowsText);
  }
  const rootIndex = `${category}索引`;
  sections.push("## 🔗 相關連結", "", `- [[${rootIndex}\\|${rootIndex}]]`, "- [[規則/角色建立與成長/屬性值與角色細節\\|屬性值與角色細節 (Ability Scores and Character Details)]]", "- [[規則/勘誤與版本/2014至2024/2014至2024版本差異導覽\\|2014 至 2024 版本差異導覽]]");
  return `${[...header, "", ...sections].join("\n").replace(/\n(?=## )/g, "\n\n")}\n`;
}

const currentSubclasses = walk(path.join(ROOT, "wiki", "職業"))
  .map((file) => ({ file, ...parse(file) }))
  .filter(({ data }) => data.ruleset === "2024" && data.status === "current" && data.entry_type === "子職");
const currentFeats = walk(path.join(ROOT, "wiki", "專長"))
  .map((file) => ({ file, ...parse(file) }))
  .filter(({ data }) => data.ruleset === "2024" && data.status === "current" && data.category === "專長");

function subclassStatus(data) {
  const override = SUBCLASS_COMPATIBILITY_OVERRIDES.get(`${data.parent_class}|${String(data.title).replace(/ \(.*$/, "")}`);
  if (override) return override;
  const hasCurrentReplacement = currentSubclasses.some((candidate) => candidate.data.parent_class === data.parent_class && english(candidate.data.title) === english(data.title));
  if (hasCurrentReplacement) return "replaced";
  if (data.compatibility_2024 === "compatible" || data.compatibility_2024 === "replaced") return data.compatibility_2024;
  if (data.compatibility_2024 === "superseded") return "replaced";
  if (data.compatibility_2024 === "no-direct-equivalent") return "review";
  return "review";
}

function featStatus(data) {
  if (data.tags?.[0] === "畢格比鉅獻巨人之榮耀2023") return "compatible";
  const override = FEAT_COMPATIBILITY_OVERRIDES.get(english(data.title));
  if (override) return override;
  const hasCurrentReplacement = currentFeats.some((candidate) => english(candidate.data.title) === english(data.title));
  if (hasCurrentReplacement) return "replaced";
  if (data.compatibility_2024 === "compatible" || data.compatibility_2024 === "replaced") return data.compatibility_2024;
  if (data.compatibility_2024 === "superseded") return "replaced";
  if (data.compatibility_2024 === "no-direct-equivalent") return "review";
  return "review";
}

function statusFor(category, data, file) {
  const basename = path.basename(file, ".md");
  if (category === "種族") {
    if (REPLACED_SPECIES.has(basename)) return "replaced";
    if (COMPATIBLE_SPECIES.has(basename)) return "compatible";
    return "review";
  }
  if (category === "背景") return CONDITIONAL_BACKGROUNDS.has(basename) ? "conditional" : "review";
  if (category === "職業") {
    if (data.entry_type === "子職") return subclassStatus(data);
    if (data.entry_type === "職業") return "replaced";
    return null;
  }
  if (category === "專長") return featStatus(data);
  return null;
}

const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const updates = [];
const legacyRows = new Map(CATEGORIES.map((category) => [category, []]));
for (const category of CATEGORIES) {
  for (const file of walk(path.join(ROOT, "wiki", category, "2014"))) {
    const { text, data } = parse(file);
    if (data.ruleset !== "2014" || data.status !== "legacy" || String(data.title ?? "").includes("索引")) continue;
    const compatibility = statusFor(category, data, file);
    if (!compatibility) continue;
    const next = setCompatibility(text, compatibility);
    if (next !== text) updates.push({ file, compatibility, next });
    legacyRows.get(category).push({ file, text, data: { ...data, compatibility_2024: compatibility } });
  }
}

for (const update of updates) {
  process.stdout.write(`${path.relative(ROOT, update.file).replaceAll("\\", "/")} -> ${update.compatibility}\n`);
}
const plan = planCandidateBatch(updates.map((update) => candidateChange({ destination: update.file, before: fs.readFileSync(update.file, "utf8"), after: update.next, operation: "update", source: "2014-compatibility", locator: update.compatibility })), { root: ROOT, lint: lintWiki });
writeCandidatePlan({ ...plan, legacy_rows: Object.fromEntries([...legacyRows].map(([category, rows]) => [category, rows.map((row) => path.relative(ROOT, row.file).replaceAll("\\", "/"))])) }, options.report, { root: ROOT });
if (options.apply) {
  applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  process.stdout.write("2024／AL 雙狀態索引請以 migrate:sync-al-availability -- --apply 重建。\n");
}
process.stdout.write(`${options.apply ? "已更新" : "預覽"}：${updates.length} 個 Legacy 條目。\n`);
