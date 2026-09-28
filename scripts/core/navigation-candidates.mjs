import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { withIndexEffects } from "./index-candidates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TARGET = "wiki/索引.md";
const QUICK_TARGET = "wiki/規則/快速查找.md";
const RULES_INDEX = "wiki/規則/規則索引.md";
const UPDATES_TARGET = "wiki/規則/近期更新.md";
const MARKER = "<!-- dnd-wiki-navigation:quick-find -->";
const NAVIGATION_SOURCES = new Set([
  "navigation-candidates", "maintenance-navigation", "maintenance-navigation:index",
  "rarity-navigation", "search-navigation", "search-navigation:index",
]);

const QUICK_FIND = `${MARKER}
## 快速查找

- [[規則/快速查找|快速查找]]：版本、職業法術、魔法物品、怪物與冒險者聯盟的原生導覽入口。
`;

const QUICK_PAGE = `---
title: "快速查找 (Quick Find)"
entity_id: "entry:PHB2024:entry:quick-find"
concept_id: "concept:entry:quick-find"
ruleset: "2024"
content_scope: "core"
status: "current"
category: "規則機制"
version: "2024-Core"
tags:
  - "玩家手冊2024"
  - "索引_快速查找"
sources:
  - file: "原始資料/SRD_CC_v5.2.1.pdf"
    locator: "p. 2（目錄）"
    authority: "官方"
    translation: "none"
source_type: "official"
confidence: "confirmed"
rules_sources:
  - "Player’s Handbook (2024)"
errata: []
updated: "2026-09-22"
---

# 快速查找 (Quick Find)

- **版本與相容性**：[[規則/勘誤與版本/2014至2024/2014至2024索引|2014／2024 版本導覽]]與各分類的「2024 相容」索引。
- **職業法術**：先由[[職業/職業索引|職業索引]]選擇職業，再進入[[法術/法術索引|法術索引]]依環階查找；未有可靠結構化職業欄位的條目不以名稱猜測。
- **魔法物品類型／稀有度**：[[魔法物品/魔法物品索引|魔法物品索引]]提供類型入口；稀有度以[[魔法物品/魔法物品規則|魔法物品規則]]為準，尚未形成全庫可靠欄位的項目列為待整理。
- **怪物 CR／環境**：[[怪物/挑戰等級分組|挑戰等級分組]]提供 CR 入口；[[怪物/怪物索引|怪物索引]]提供既有分類。環境資料尚未全庫結構化，暫不產生推測式篩選。
- **冒險者聯盟戰役**：[[冒險者聯盟/冒險者聯盟索引|冒險者聯盟索引]]與[[規則/勘誤與版本/2014至2024/2024與冒險者聯盟相容性總覽索引|2024／AL 相容性總覽]]分開呈現規則版本與 AL 適用性。

## 🔗 相關連結

- [[規則/規則索引|規則索引 (Rules Index)]]
`;

export function navigationCandidates({ root = ROOT } = {}) {
  const absolute = path.join(root, TARGET);
  const before = fs.readFileSync(absolute, "utf8");
  if (before.includes(MARKER) || fs.existsSync(path.join(root, QUICK_TARGET))) return [];
  const anchor = "## 世界與戰役";
  const index = before.indexOf(anchor);
  if (index < 0) throw new Error(`${TARGET} 缺少快速查找插入位置。`);
  const after = `${before.slice(0, index)}${QUICK_FIND}\n${before.slice(index)}`;
  const rulesBefore = fs.readFileSync(path.join(root, RULES_INDEX), "utf8");
  const rulesAnchor = "## 使用原則";
  const rulesIndex = rulesBefore.indexOf(rulesAnchor);
  if (rulesIndex < 0) throw new Error(`${RULES_INDEX} 缺少快速查找插入位置。`);
  const rulesAfter = `${rulesBefore.slice(0, rulesIndex)}| [[規則/快速查找\\|快速查找]] | 版本、職業法術、物品、怪物與 AL 的交叉查找入口 |\n\n${rulesBefore.slice(rulesIndex)}`;
  return [
    { target: TARGET, before, after, operation: "update", source: "navigation-candidates", status: "ready" },
    { target: RULES_INDEX, before: rulesBefore, after: rulesAfter, operation: "update", source: "navigation-candidates", status: "ready" },
    { target: QUICK_TARGET, before: null, after: QUICK_PAGE, operation: "create", source: "navigation-candidates", status: "ready" },
  ];
}

function body(text) {
  const value = String(text ?? "");
  const match = value.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  return match ? value.slice(match[0].length) : value;
}

function frontmatter(text) {
  const match = String(text ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  try { return YAML.parse(match[1]) ?? {}; } catch { return {}; }
}

function readableBody(text) {
  return body(text).replace(/\r\n/g, "\n")
    .replace(/(^|\n)\s*#{1,6}\s+/g, "$1")
    .replace(/(^|\n)\s*(?:[-+*]|\d+\.)\s+/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ").trim();
}

function substantiveChange(change) {
  if (change.after == null) return false; // Deleted pages cannot be navigation targets.
  if (change.before == null) return true;
  if (readableBody(change.before) !== readableBody(change.after)) return true;
  const before = frontmatter(change.before);
  const after = frontmatter(change.after);
  return ["sources", "rules_sources", "errata", "version", "ruleset", "status", "content_scope"]
    .some((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}

function updateDate(change) {
  return String(change.after ?? "").match(/^updated:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$/m)?.[1] ?? "日期未記錄";
}

/** Only completed, meaningful candidate plans qualify.  A diff consisting of
 * an updated timestamp is excluded, and navigation plans never self-list. */
export function successfulUpdateEntries({ root = ROOT } = {}) {
  const reports = path.join(root, "reports");
  if (!fs.existsSync(reports)) return [];
  return fs.readdirSync(reports, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith("-plan.json"))
    .flatMap((entry) => {
      let plan;
      try { plan = JSON.parse(fs.readFileSync(path.join(reports, entry.name), "utf8")); } catch { return []; }
      if (plan.mode !== "apply" || !Array.isArray(plan.applied)) return [];
      return (plan.changes ?? []).filter((change) => plan.applied.includes(change.target))
        .filter((change) => change.target !== UPDATES_TARGET && !NAVIGATION_SOURCES.has(change.source))
        .filter(substantiveChange)
        .map((change) => ({ target: change.target, date: updateDate(change), source: change.source, plan: entry.name }));
    })
    .sort((left, right) => `${right.date}\0${left.target}`.localeCompare(`${left.date}\0${right.target}`, "zh-Hant"));
}

function link(target) {
  return target.replace(/^wiki\//, "").replace(/\.md$/, "");
}

export function maintenanceNavigationCandidates({ root = ROOT } = {}) {
  const entries = successfulUpdateEntries({ root });
  const target = path.join(root, UPDATES_TARGET);
  const before = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  const rows = entries.length
    ? entries.map((entry) => `- **${entry.date}**：[[${link(entry.target)}]] — 已成功套用的來源／勘誤更新（計畫：\`${entry.plan}\`）。`).join("\n")
    : "- 尚無可列入的已套用實質更新。";
  const after = `---
title: "近期更新 (Recent Updates)"
entity_id: "entry:PHB2024:entry:recent-updates"
concept_id: "concept:entry:recent-updates"
ruleset: "2024"
content_scope: "core"
status: "current"
category: "規則機制"
version: "2024-Core"
tags:
  - "玩家手冊2024"
  - "索引_近期更新"
sources:
  - file: "原始資料/SRD_CC_v5.2.1.pdf"
    locator: "p. 2（目錄）"
    authority: "官方"
    translation: "none"
source_type: "official"
confidence: "confirmed"
rules_sources:
  - "Player’s Handbook (2024)"
errata: []
updated: "2026-09-22"
---

# 近期更新 (Recent Updates)

只列出已成功套用的來源、勘誤或規則正文更新；純格式與單純日期重寫不列入。

${rows}

## 🔗 相關連結

- [[規則/規則索引|規則索引 (Rules Index)]]

- [[規則/快速查找|快速查找 (Quick Find)]]
`;
  const changes = [];
  if (before !== after) changes.push({ target: UPDATES_TARGET, before, after, operation: before === null ? "create" : "update", source: "maintenance-navigation", status: "ready" });
  const quick = path.join(root, QUICK_TARGET);
  if (fs.existsSync(quick)) {
    const quickBefore = fs.readFileSync(quick, "utf8");
    const bullet = "- **近期勘誤／更新**：[[規則/近期更新|近期更新]]只列已成功套用的實質變更。\n";
    if (!quickBefore.includes("[[規則/近期更新|近期更新]]")) {
      const marker = "## 🔗 相關連結";
      const position = quickBefore.indexOf(marker);
      if (position < 0) throw new Error(`${QUICK_TARGET} 缺少相關連結插入位置。`);
      changes.push({ target: QUICK_TARGET, before: quickBefore, after: `${quickBefore.slice(0, position)}${bullet}\n${quickBefore.slice(position)}`, operation: "update", source: "maintenance-navigation", status: "ready" });
    }
  }
  return withIndexEffects(changes, { root, source: "maintenance-navigation:index" });
}
