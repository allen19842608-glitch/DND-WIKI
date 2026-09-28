import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = ROOT;
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const folders = [
  ["魔法物品/戒指", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["魔法物品/卷軸", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["魔法物品/奇物", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["魔法物品/武器", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["魔法物品/法杖", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["魔法物品/藥水", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["魔法物品/護甲", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["魔法物品/魔杖", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["魔法物品/權杖", "魔法物品", "魔法物品", "魔法物品/魔法物品索引"],
  ["冒險者聯盟/地下城主規則", "戰役設定", "冒險者聯盟", "冒險者聯盟/冒險者聯盟索引"],
  ["冒險者聯盟/玩家規則", "戰役設定", "冒險者聯盟", "冒險者聯盟/冒險者聯盟索引"],
  ["冒險者聯盟/冒險調整", "戰役設定", "冒險者聯盟", "冒險者聯盟/冒險者聯盟索引"],
];

function quoted(value) { return String(value).replaceAll('"', '\\"'); }
function sourceOf(text) {
  const file = text.match(/^\s{2}- file: "(.+)"$/m)?.[1] ?? "原始資料/待確認";
  const locator = text.match(/^\s{4}locator: "(.+)"$/m)?.[1] ?? "索引導覽";
  const authority = text.match(/^\s{4}authority: "(.+)"$/m)?.[1] ?? "官方";
  const translation = text.match(/^\s{4}translation: "(.+)"$/m)?.[1];
  return { file, locator, authority, translation };
}
function primaryTagOf(text) {
  return text.match(/^\s{2}- "(.+)"$/m)?.[1] ?? "待確認";
}
function versionOf(text) {
  return text.match(/^version:\s+"(.+?)"\s*$/m)?.[1] ?? null;
}

let outputCount = 0;
let backlinkCount = 0;
const pending = [];
for (const [relative, category, tag, parent] of folders) {
  const folder = path.join(root, "wiki", relative);
  const name = path.basename(folder);
  const indexName = `${name}索引.md`;
  const entries = fs.readdirSync(folder).filter((file) => file.endsWith(".md") && file !== indexName);
  if (!entries.length) continue;
  const first = fs.readFileSync(path.join(folder, entries[0]), "utf8");
  const versions = new Set(entries.map((entry) => versionOf(fs.readFileSync(path.join(folder, entry), "utf8"))));
  if (versions.has(null) || versions.size !== 1) throw new Error(`${relative} 的條目版本不一致，無法建立索引。`);
  const [version] = versions;
  const source = sourceOf(first);
  const primaryTag = primaryTagOf(first);
  const translation = source.translation ? `\n    translation: "${quoted(source.translation)}"` : "";
  const links = entries.map((file) => {
    const text = fs.readFileSync(path.join(folder, file), "utf8");
    const title = text.match(/^title:\s+"(.+?)"\s*$/m)?.[1] ?? path.basename(file, ".md");
    return `- [[${relative}/${path.basename(file, ".md")}|${title}]]`;
  }).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const content = `---\ntitle: "${name}索引"\ncategory: "${category}"\nversion: "2024-Core"\ntags:\n  - "${quoted(primaryTag)}"\n  - "${tag}_索引"\nsources:\n  - file: "${quoted(source.file)}"\n    locator: "${quoted(source.locator)}"\n    authority: "${quoted(source.authority)}"${translation}\nsource_type: "${source.authority === "官方" ? "official" : "mixed"}"\nconfidence: "confirmed"\nrules_sources:\n  - "${category === "魔法物品" ? "Dungeon Master's Guide (2024)" : "D&D Adventurers League"}"\nerrata: []\nupdated: "${updated}"\n---\n\n# ${name}索引\n\n此索引收錄本分類的正式條目。\n\n## 條目\n\n${links.join("\n")}\n\n## 🔗 相關連結\n\n- [[${parent}|${path.basename(parent)}]]\n`;
  const versionedContent = content.replace('version: "2024-Core"', `version: "${quoted(version)}"`);
  const target = path.join(folder, indexName);
  const indexBefore = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  // This historical template predates the required stable identity and
  // publication metadata.  Do not manufacture those values from a random
  // child page: retain an auditable proposal for editorial review instead.
  if (indexBefore !== versionedContent) pending.push(candidateChange({ destination: target, before: indexBefore, after: versionedContent, operation: indexBefore === null ? "create" : "update", source: relative, locator: indexName, status: "manual_review", review: ["索引模板缺少可安全推導的 entity_id、concept_id 與出版品 metadata。"] }));
  outputCount++;
  const backlink = `[[${relative}/${name}索引|${name}索引]]`;
  for (const entry of entries) {
    const file = path.join(folder, entry);
    const text = fs.readFileSync(file, "utf8");
    if (text.includes(backlink)) continue;
    const changed = text.includes("## 🔗 相關連結")
      ? text.replace(/(## 🔗 相關連結\r?\n)/, `$1\n- ${backlink}\n`)
      : `${text.trimEnd()}\n\n## 🔗 相關連結\n\n- ${backlink}\n`;
    pending.push(candidateChange({ destination: file, before: text, after: changed, operation: "link", source: relative, locator: entry, status: "manual_review", review: ["需待對應索引完成 metadata 人工覆核後，才可一併補入反向連結。"] }));
    backlinkCount++;
  }
}
const plan = planCandidateBatch(pending, { root, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root });
if (options.apply) applyCandidateBatch(plan, { root, lint: lintWiki });
console.log(`索引：${outputCount}`);
console.log(`反向連結：${backlinkCount}`);
