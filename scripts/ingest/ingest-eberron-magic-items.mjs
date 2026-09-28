import fs from "node:fs";
import path from "node:path";
import {
  ROOT, applyCandidateBatch, candidateChange, frontmatter, parseOptions, planCandidateBatch,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const publicationId = "EBER2025";
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const publication = {
  ruleset: "2024",
  content_scope: "expansion",
  status: "current",
  wiki: { tag: "艾伯倫奇械鍛爐2025" },
  canonical_rules_source: "Eberron: Forge of the Artificer (2025)",
};
const source = "原始資料/艾伯倫：奇械鍛爐/附錄A：魔法物品.md";
const items = [
  ["奇物", "百變工具", "Manifold Tool", "普通", "需要", "工匠工具轉換", "以一個魔法動作觸碰此物品，將它轉換為你選擇的一套工匠工具；使用該工具時，你具有其熟練。"],
  ["奇物", "折返之靴", "Boots of the Winding Path", "非普通", "需要", "折返傳送", "著裝期間，以一個附贈動作傳送至多 15 呎至本回合曾佔據、且你可見的未佔據空間。"],
  ["奇物", "警覺之盔", "Helm of Awareness", "非普通", "不需要", "先攻優勢", "著裝期間，你的先攻檢定具有優勢。"],
  ["戒指", "思維砥戒", "Mind Sharpener", "非普通", "需要", "維持專注", "此戒指有 4 充能。當你維持專注的體質豁免失敗時，可用反應消耗 1 充能使其成功。", "每日黎明恢復 1d4 已消耗的充能。"],
  ["武器", "連射武器", "Repeating Shot", "非普通", "需要", "連射武器", "以此武器進行遠程攻擊時，攻擊檢定與傷害擲骰有 +1 加值，並無視裝填詞條；若武器沒有彈藥，攻擊時會創造一發魔法彈藥，命中或失手後消失。"],
  ["護甲", "斥力之盾", "Repulsion Shield", "非普通", "不需要", "斥力反擊", "持用時 AC 有 +1 加值。此盾牌有 4 充能；體型不超過大型的生物在 5 呎內以近戰攻擊命中你時，可用反應消耗 1 充能將其直線推離至多 15 呎。", "每日黎明恢復 1d4 已消耗的充能。"],
  ["武器", "回力武器", "Returning Weapon", "非普通", "不需要", "回力投擲", "以此武器進行攻擊的攻擊檢定與傷害擲骰有 +1 加值；以它進行遠程攻擊後，武器立即回到你手中。"],
  ["戒指", "法力恢復戒指", "Spell-Refueling Ring", "非普通", "需要（施法者）", "恢復法術位", "著裝期間，以一個附贈動作恢復一枚已消耗、至多三環的法術位。", "使用後直到下個黎明無法再次使用。"],
  ["武器", "眩目武器", "Dazzling Weapon", "珍稀", "需要", "眩目反擊", "以此武器進行攻擊的攻擊檢定與傷害擲骰有 +1 加值。以附贈動作令其發出 30 呎明亮光照與額外 30 呎微光，或熄滅光照。武器有 4 充能；被攻擊命中後，可用反應消耗 1 充能，迫使攻擊者進行 DC 15 體質豁免，失敗則目盲至其下個回合結束。", "每日黎明恢復 1d4 已消耗的充能。"],
];
const pending = [];
const staged = new Map();

function write(file, content) {
  const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (before === content || staged.get(file) === content) return;
  staged.set(file, content);
  const change = candidateChange({ destination: file, before, after: content, operation: before === null ? "create" : "update", source, locator: path.relative(ROOT, file) });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}

function insertSection(file, heading, content) {
  let text = fs.readFileSync(file, "utf8");
  const section = `## ${heading}\n\n${content}\n\n`;
  text = text.replace(new RegExp(`\\n## ${heading}[\\s\\S]*?(?=\\n## |$)`, "g"), "\n");
  text = text.replace("\n## 🔗 相關連結", `\n\n${section}## 🔗 相關連結`);
  write(file, text);
}

const grouped = new Map();
for (const [folder, zh, en, rarity, attunement, effectName, effect, limit] of items) {
  const locator = `標題：${zh}`;
  const output = path.join(ROOT, "wiki", "魔法物品", folder, `${zh}.md`);
  const activation = folder === "戒指" ? "佩戴期間。" : folder === "武器" ? "持握期間。" : folder === "護甲" ? "持用期間。" : "著裝或持用期間。";
  const page = `${frontmatter({ publicationId, publication, kind: "magic-item", concept: en, title: `${zh} (${en})`, category: "魔法物品", tag: `魔法物品_${folder}`, source, locator })}\n\n# ${zh} (${en})\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 物品資料\n\n| 項目 | 內容 |\n| :--- | :--- |\n| 類別 (Category) | ${folder === "護甲" ? "護甲（盾牌）" : folder} |\n| 稀有度 (Rarity) | ${rarity} |\n| 同調 (Attunement) | ${attunement} |\n| 消耗品 (Consumable) | 否 |\n\n### 物品效果\n\n- **${effectName}**：\n  - **啟用／觸發**：${activation}\n  - **效果**：${effect}${limit ? `\n  - **限制與恢復**：${limit}` : ""}\n\n## 🔗 相關連結\n\n- [[魔法物品/${folder}/${folder}索引|${folder}索引]]\n- [[魔法物品/魔法物品索引|魔法物品索引 (Magic Items Index)]]\n`;
  write(output, page);
  if (!grouped.has(folder)) grouped.set(folder, []);
  grouped.get(folder).push(`- [[魔法物品/${folder}/${zh}|${zh} (${en})]]`);
}

for (const [folder, links] of grouped) {
  insertSection(path.join(ROOT, "wiki", "魔法物品", folder, `${folder}索引.md`), "艾伯倫：奇械鍛爐", links.join("\n"));
}

console.log(`完成：${items.length} 件魔法物品。`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
if (options.report) {
  const reportPath = path.resolve(ROOT, options.report);
  if (!reportPath.startsWith(`${path.join(ROOT, "reports")}${path.sep}`)) throw new Error("報告只能輸出至 reports/。");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用 EBER2025 魔法物品：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽 EBER2025 魔法物品：${plan.changes.length} 個候選變更；加入 --apply 才會寫入。`);
}
