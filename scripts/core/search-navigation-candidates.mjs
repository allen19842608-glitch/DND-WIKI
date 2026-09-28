import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./ingest-publication-utils.mjs";
import { readWikiPages, isNavigationPage } from "./wiki-records.mjs";

const ITEM_DIRECTORY = "wiki/魔法物品";
const ITEM_INDEX = `${ITEM_DIRECTORY}/魔法物品索引.md`;
const RARITY_INDEX = `${ITEM_DIRECTORY}/稀有度索引.md`;
const QUICK_PAGE = "wiki/規則/快速查找.md";
const HABITAT_PAGE = "wiki/怪物/棲息地分組.md";
const MARKER = "<!-- dnd-wiki-navigation:rarity -->";
const RARITIES = ["普通", "非普通", "珍稀", "極珍稀", "傳說", "神器"];
const VERSIONS = ["2024-Core", "2014-Legacy"];

function tableValues(body, field) {
  const pattern = new RegExp(`^\\|\\s*${field}(?:\\s*\\([A-Za-z]+\\))?\\s*\\|\\s*([^|\\n]+?)\\s*\\|\\s*$`, "gm");
  return [...body.matchAll(pattern)].map((match) => match[1].trim());
}

function cell(value) {
  return String(value ?? "未知").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function wikiLink(file) {
  return `[[${file.replace(/\.md$/, "")}\\|${path.posix.basename(file, ".md")}]]`;
}

export function magicItemRarityInventory({ root = ROOT } = {}) {
  const items = readWikiPages(root, { directory: ITEM_DIRECTORY })
    .filter((page) => page.data?.category === "魔法物品" && !isNavigationPage(page)
      && /^### 物品資料\s*$/m.test(page.body))
    .map((page) => {
      const types = tableValues(page.body, "類別");
      if (types.length !== 1) return null; // Rule and index pages are not item cards.
      const values = tableValues(page.body, "稀有度");
      const rarity = values.length === 1 && RARITIES.includes(values[0]) ? values[0] : "待整理";
      return {
        file: page.file,
        version: VERSIONS.includes(page.data.version) ? page.data.version : "版本待確認",
        rarity,
        original_rarity: values.length === 1 ? values[0] : values.length ? "多個稀有度欄位" : "欄位缺漏",
        type: types[0],
      };
    })
    .filter(Boolean);
  items.sort((left, right) => `${left.version}\0${left.rarity}\0${left.file}`.localeCompare(`${right.version}\0${right.rarity}\0${right.file}`, "zh-Hant"));
  return {
    items,
    counts: {
      total: items.length,
      single: items.filter((item) => item.rarity !== "待整理").length,
      unresolved: items.filter((item) => item.rarity === "待整理").length,
    },
  };
}

function renderRarityIndex(inventory, updated) {
  const versions = [...VERSIONS, ...new Set(inventory.items.map((item) => item.version).filter((version) => !VERSIONS.includes(version)))];
  const sections = versions.filter((version) => inventory.items.some((item) => item.version === version))
    .map((version) => {
      const items = inventory.items.filter((item) => item.version === version);
      const groups = [...RARITIES, "待整理"].filter((rarity) => items.some((item) => item.rarity === rarity))
        .map((rarity) => {
          const rows = items.filter((item) => item.rarity === rarity)
            .map((item) => `| ${wikiLink(item.file)} | ${cell(item.type)} | ${cell(item.original_rarity)} |`).join("\n");
          return `### ${rarity}（${items.filter((item) => item.rarity === rarity).length}）\n\n| 物品 | 類型 | 條目明列稀有度 |\n| :--- | :--- | :--- |\n${rows}`;
        }).join("\n\n");
      return `## ${version}（${items.length}）\n\n${groups}`;
    }).join("\n\n");
  return `---
title: "魔法物品稀有度索引 (Magic Items by Rarity)"
entity_id: "entry:DMG2024:entry:magic-item-rarity-index"
concept_id: "concept:entry:magic-item-rarity-index"
ruleset: "2024"
content_scope: "core"
status: "current"
category: "魔法物品"
version: "2024-Core"
index_scope: "curated"
tags:
  - "地下城主指南2024"
  - "魔法物品_索引"
sources:
  - file: "原始資料/地下城主指南2024/第七章_寶藏"
    locator: "魔法物品詳述；各物品的精確來源見所連條目"
    authority: "官方"
    translation: "community"
source_type: "official"
confidence: "confirmed"
rules_sources:
  - "Dungeon Master's Guide (2024)"
errata: []
updated: "${updated}"
---

# 魔法物品稀有度索引 (Magic Items by Rarity)

${MARKER}

本頁只依既有物品條目「稀有度 (Rarity)」欄位與版本分組，不從名稱或類型推測。多種稀有度、欄位缺漏與版本未核定者保留待整理；各物品的規則與來源以所連條目為準。

共 ${inventory.counts.total} 件；單一稀有度 ${inventory.counts.single} 件、待整理 ${inventory.counts.unresolved} 件。

${sections}

## 🔗 相關連結

- [[魔法物品/魔法物品索引|魔法物品索引]]
- [[規則/快速查找|快速查找]]
`;
}

function updatedDate(before) {
  const previous = String(before ?? "").match(/^updated: "(\d{4}-\d{2}-\d{2})"$/m)?.[1];
  if (previous) return previous;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function candidate(target, before, after, source) {
  if (before === after) return null;
  return { target, before, after, operation: before === null ? "create" : "update", source, status: "ready" };
}

export function searchNavigationCandidates({ root = ROOT } = {}) {
  const itemIndexPath = path.join(root, ITEM_INDEX);
  const quickPath = path.join(root, QUICK_PAGE);
  if (!fs.existsSync(itemIndexPath) || !fs.existsSync(quickPath)) return [];
  const inventory = magicItemRarityInventory({ root });
  const rarityPath = path.join(root, RARITY_INDEX);
  const rarityBefore = fs.existsSync(rarityPath) ? fs.readFileSync(rarityPath, "utf8") : null;
  if (rarityBefore !== null && !rarityBefore.includes(MARKER)) throw new Error(`${RARITY_INDEX} 不屬於自動導覽，停止覆寫。`);
  const today = updatedDate(null);
  const stableRarity = renderRarityIndex(inventory, updatedDate(rarityBefore));
  const rarityAfter = rarityBefore === stableRarity ? stableRarity : renderRarityIndex(inventory, today);
  const changes = [candidate(RARITY_INDEX, rarityBefore, rarityAfter, "rarity-navigation")];

  const indexBefore = fs.readFileSync(itemIndexPath, "utf8");
  if (!indexBefore.includes("[[魔法物品/稀有度索引|稀有度索引]]")) {
    const anchor = "## 取得與主持";
    if (!indexBefore.includes(anchor)) throw new Error(`${ITEM_INDEX} 缺少稀有度導覽插入位置。`);
    const after = indexBefore.replace(anchor, "## 稀有度導覽\n\n- [[魔法物品/稀有度索引|稀有度索引]]：依條目明列稀有度與版本查找；多種稀有度保留待整理。\n\n" + anchor);
    changes.push(candidate(ITEM_INDEX, indexBefore, after, "rarity-navigation"));
  }

  const quickBefore = fs.readFileSync(quickPath, "utf8");
  const itemLine = "- **魔法物品類型／稀有度**：[[魔法物品/魔法物品索引|魔法物品索引]]提供類型入口；[[魔法物品/稀有度索引|稀有度索引]]依各條目明列的稀有度與版本分組，變體及缺值列待整理。";
  const habitatLine = "- **怪物 CR／環境**：[[怪物/挑戰等級分組|挑戰等級分組]]提供 CR 入口；[[怪物/棲息地分組|棲息地分組]]依《怪物圖鑑 2025》附錄查找環境。未列於附錄的怪物不推測棲息地。";
  let quickAfter = quickBefore.replace(/^- \*\*魔法物品類型／稀有度\*\*：.*$/m, itemLine);
  if (fs.existsSync(path.join(root, HABITAT_PAGE))) quickAfter = quickAfter.replace(/^- \*\*怪物 CR／環境\*\*：.*$/m, habitatLine);
  if (!quickAfter.includes(itemLine)) throw new Error(`${QUICK_PAGE} 缺少魔法物品查找列。`);
  if (fs.existsSync(path.join(root, HABITAT_PAGE)) && !quickAfter.includes(habitatLine)) throw new Error(`${QUICK_PAGE} 缺少怪物查找列。`);
  changes.push(candidate(QUICK_PAGE, quickBefore, quickAfter, "search-navigation"));
  return changes.filter(Boolean);
}
