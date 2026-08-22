import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../core/ingest-publication-utils.mjs";

const entries = [
  ["3環", "妖精召喚術", "3環.md", "妖精靈魄 Fey Spirit"],
  ["3環", "亡靈召喚術", "3環.md", "亡靈靈魄 Undead Spirit"],
  ["5環", "天界召喚術", "5環.md", "天界靈魄 Celestial Spirit"],
  ["5環", "龍類召喚術", "5環.md", "巨龍靈魄 Draconic Spirit"],
  ["4環", "異怪召喚術", "4環.md", "異怪靈魄 Aberrant Spirit"],
  ["4環", "元素召喚術", "4環.md", "元素靈魄 Elemental Spirit"],
];
function formatCard(raw) {
  const table = raw.match(/\| 屬性 \| 數值 \| 調整 \| 豁免 \|\r?\n\|[^\n]+\|\r?\n((?:\|[^\n]+\|\r?\n){6})/);
  if (!table) throw new Error("資料卡缺少屬性表");
  const values = [...table[1].matchAll(/\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/g)]
    .map((m) => ({ name: m[1].trim(), value: m[2].trim(), mod: m[3].trim(), save: m[4].trim() }));
  const paired = [values.slice(0, 3), values.slice(3, 6)].map((row) => `| ${row.map((v) => `**${v.name}** | ${v.value} | ${v.mod} | ${v.save}`).join(" | ")} |`).join("\n");
  const attributes = `|  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |\n| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |\n${paired}`;
  let text = raw.replace(table[0], attributes).replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎")
    .replace(/^### 特質 Traits$/m, "### 特性 (Traits)")
    .replace(/^### 動作 Actions$/m, "### 動作 (Actions)")
    .replace(/^### 附贈動作 Bonus Actions$/m, "### 附贈動作 (Bonus Actions)")
    .replace(/^### 反應 Reactions$/m, "### 反應 (Reactions)")
    .replace(/^\*\*抗性\*\*/m, "**傷害抗性**")
    .replace(/^\*\*免疫\*\*/m, "**傷害／狀態免疫**");
  const sections = text.split(/(?=^### )/m);
  return sections.map((section, index) => index === 0 ? section : section.replace(/^\*\*([^*]+?)\*\*\s*/gm, "- **$1**：")).join("").trim();
}
for (const [level, spell, sourceFile, spirit] of entries) {
  const source = fs.readFileSync(path.join(ROOT, "原始資料", "玩家手冊2024", "法術詳述", sourceFile), "utf8");
  const start = source.indexOf(`## ${spirit}`); const end = source.indexOf("\n#### ", start);
  if (start < 0 || end < 0) throw new Error(`找不到資料卡：${spirit}`);
  const raw = formatCard(source.slice(start, end).replace(/^## .+\r?\n/, "").trim());
  const page = path.join(ROOT, "wiki", "法術", level, `${spell}.md`); let text = fs.readFileSync(page, "utf8");
  text = text.replace(/^\- \*\*豁免／法術攻擊\*\*：無\r?\n/m, "");
  const section = `## ${spirit.split(" ")[0]}資料\n\n${raw}\n\n`;
  const existing = new RegExp(`\\n## ${spirit.split(" ")[0]}資料[\\s\\S]*?(?=\\n## (?:來源衝突與適用範圍|💡 實戰應用與裁量)|$)`);
  if (existing.test(text)) text = text.replace(existing, `\n${section.trimEnd()}`);
  else if (/\n## 來源衝突與適用範圍/.test(text)) text = text.replace(/\n## 來源衝突與適用範圍/, `\n\n${section}## 來源衝突與適用範圍`);
  else text = text.replace(/\n## 💡 實戰應用與裁量/, `\n\n${section}## 💡 實戰應用與裁量`);
  fs.writeFileSync(page, text, "utf8"); console.log(`已補齊：${spell}`);
}
