import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { ROOT } from "./notion-wiki.mjs";
import { TARGET_SOURCE, stableHash, readAppliedPageMap } from "./character-rules.mjs";

const WEAPONS = "原始資料/玩家手冊2024/裝備/武器.md";
const ARMOR = "原始資料/玩家手冊2024/裝備/護甲.md";
const AL_NOTE = "現行《玩家手冊》的一般裝備；依角色創建起始裝備或合法購買途徑取得。";

function cells(line) { return line.split("|").slice(1, -1).map(value => value.trim()); }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""); }
function splitName(value) {
  const match = value.match(/^(.*?)\s+([A-Za-z][A-Za-z' -]+)$/u);
  if (!match) throw new Error(`無法分離裝備中英文名稱：${value}`);
  return { name: match[1].trim(), englishName: match[2].trim() };
}
function sourceText(root, relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8").replaceAll("\r\n", "\n"); }
function itemContent(item) {
  const details = item.damage
    ? `- **武器類型**：${item.subcategory}\n- **傷害**：${item.damage}\n- **特性**：${item.traits}\n- **武器精通**：${item.mastery}`
    : `- **類別**：${item.subcategory}\n- **護甲等級**：${item.ac}\n- **力量需求**：${item.strength}\n- **隱匿**：${item.stealth}`;
  return `## 規則條文\n${details}\n\n## AL 取得與使用\n- ${AL_NOTE}\n\n## 來源\n- ${item.source}`;
}
function properties(item, content) {
  return {
    "名稱": item.name, "英文名稱": item.englishName, "類別": "裝備", "子類別": item.subcategory,
    "原出版／版本": "PHB2024／2024-Core", "規則版本": "2024-Core", "適用戰役": ["FR", "DL", "EB", "RV", "CR"],
    "AL 可用性": "可用", "AL 條件": AL_NOTE, "收錄狀態": "可選", "同調需求": "不需要", "使用後是否消耗": false,
    "價格": item.price, "重量": item.weight, "規則識別": item.entityId,
    "內容雜湊": stableHash({ formatVersion: 1, item, content }), "同步狀態": "已同步", "正文狀態": "完整", "資料狀態": "已確認",
    "來源": item.source, "來源定位": item.source.match(/p\. \d+/u)?.[0] ?? "", "受同步管理": true,
  };
}
function weaponItems(root) {
  const items = []; let subcategory = "";
  for (const line of sourceText(root, WEAPONS).split("\n")) {
    if (!line.startsWith("|")) continue;
    const row = cells(line);
    if (row[0].startsWith("---") || row[0].startsWith("**名稱")) continue;
    if (/^_.*Weapons_$/u.test(row[0])) { subcategory = row[0].replace(/^_|_$/gu, "").replace(/\s+(Simple|Martial) (Melee|Ranged) Weapons$/u, "").trim(); continue; }
    if (row.length !== 6 || !row[0]) continue;
    const names = splitName(row[0]);
    items.push({ ...names, entityId: `entry:PHB2024:equipment:${slug(names.englishName)}`, subcategory,
      damage: row[1], traits: row[2], mastery: row[3], weight: row[4], price: row[5], source: "《玩家手冊 2024》，p. 215：Weapons", sourceFile: WEAPONS });
  }
  return items;
}
function armorItems(root) {
  const items = []; let subcategory = "";
  for (const line of sourceText(root, ARMOR).split("\n")) {
    if (!line.startsWith("|")) continue;
    const row = cells(line);
    if (row[0].startsWith("---") || row[0].startsWith("**護甲")) continue;
    if (/^_.*Armor.*_$|^_.*Shield.*_$/u.test(row[0])) { const label = row[0].replace(/^_|_$/gu, ""); subcategory = label.includes("Light") ? "輕甲" : label.includes("Medium") ? "中甲" : label.includes("Heavy") ? "重甲" : "盾牌"; continue; }
    if (row.length !== 6 || !row[0]) continue;
    const names = splitName(row[0]);
    items.push({ ...names, entityId: `entry:PHB2024:equipment:${slug(names.englishName)}`, subcategory,
      ac: row[1], strength: row[2], stealth: row[3], weight: row[4], price: row[5], source: "《玩家手冊 2024》，p. 219：Armor Table", sourceFile: ARMOR });
  }
  return items;
}
export function compileEquipmentCandidates({ root = ROOT, appliedPageMap = readAppliedPageMap(root) } = {}) {
  const sourceHashes = Object.fromEntries([WEAPONS, ARMOR].map(file => [file, crypto.createHash("sha256").update(sourceText(root, file)).digest("hex")]));
  const entries = [...weaponItems(root), ...armorItems(root)].map(item => {
    const content = itemContent(item); const pageUrl = appliedPageMap.get(item.entityId) ?? null;
    return { ...item, sourceHash: sourceHashes[item.sourceFile], targetSource: TARGET_SOURCE, pageUrl, content,
      properties: properties(item, content), executionDisposition: pageUrl ? "已有且不變" : "待新增或待配對" };
  });
  return { formatVersion: 1, sourceHashes, entries, planId: stableHash(entries.map(entry => ({ id: entry.entityId, sourceHash: entry.sourceHash, contentHash: entry.properties["內容雜湊"], pageUrl: entry.pageUrl }))) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const plan = compileEquipmentCandidates();
  const filename = path.join(ROOT, ".tmp", "character-rules", "equipment-plan.json");
  fs.writeFileSync(filename, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(JSON.stringify({ planId: plan.planId, total: plan.entries.length, unchanged: plan.entries.filter(entry => entry.executionDisposition === "已有且不變").length }, null, 2));
}
