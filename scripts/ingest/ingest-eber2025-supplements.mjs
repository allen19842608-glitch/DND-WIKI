import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = options.publicationId ?? "EBER2025"; const publication = loadPublication(publicationId);
const root = path.join(ROOT, "原始資料", "艾伯倫：奇械鍛爐");
const pages = [
  ["嶄新工具箱.md", ["wiki","戰役設定","艾伯倫"], "奇械鍛爐工具箱", "奇械鍛爐工具箱", "艾伯倫索引"],
  ["第三章/第三章：科瓦雷的據點.md", ["wiki","規則","角色建立與成長","艾伯倫奇械鍛爐"], "科瓦雷據點選項", "科瓦雷據點選項", "角色建立與成長索引"],
  ["第三章/特色設施.md", ["wiki","規則","角色建立與成長","艾伯倫奇械鍛爐"], "艾伯倫特色設施", "特色設施", "角色建立與成長索引"],
  ["第三章/機動據點.md", ["wiki","規則","角色建立與成長","艾伯倫奇械鍛爐"], "機動據點", "機動據點", "角色建立與成長索引"],
  ["第二章/第二章：角色選項.md", ["wiki","規則","角色建立與成長","艾伯倫奇械鍛爐"], "艾伯倫角色選項", "艾伯倫角色選項", "角色建立與成長索引"],
  ["第二章/種族詳述.md", ["wiki","種族"], "艾伯倫種族選項", "艾伯倫種族選項", "種族索引"],
];
function rel(file) { return `原始資料/艾伯倫：奇械鍛爐/${file}`; }
function body(raw) { return raw.replace(/^#\s+.+(?:\r?\n|$)/, "").trim().replace(/^#\s+/gm, "## ").replace(/^###\s+/gm, "## ").replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎"); }
for (const [sourceFile, directory, filename, heading, index] of pages) {
  const raw = fs.readFileSync(path.join(root, sourceFile), "utf8");
  const category = directory.includes("種族") ? "種族" : directory.includes("戰役設定") ? "戰役設定" : "規則機制";
  const tag = category === "種族" ? "種族_索引" : category === "戰役設定" ? "艾伯倫" : "規則_角色成長";
  const content = `${frontmatter({ publicationId, publication, kind: category === "戰役設定" ? "setting" : "entry", concept: heading, title: heading, category, tag, source: rel(sourceFile), locator: `# ${heading}` })}\n\n# ${heading}\n\n${body(raw)}\n\n## 🔗 相關連結\n\n- [[${index}|${index}]]\n`;
  writableCandidate({ destination: path.join(ROOT, ...directory, `${filename}.md`), content, options });
}
console.log(`艾伯倫奇械鍛爐補充頁：${pages.length} 頁。`);
