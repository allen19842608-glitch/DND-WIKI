import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = process.argv.includes("--publication") ? options.publicationId : "EBER2025";
const publication = loadPublication(publicationId); const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, "原始資料", "艾伯倫：奇械鍛爐", "數據卡");
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function typeOf(body) {
  const match = body.match(/^\*[^\n]*?(類人|構裝|異怪|野獸|怪獸|妖精|元素|邪魔|亡靈|龍類|巨人|天族|植物|泥怪)/m);
  return match?.[1] ?? "類人";
}
const titleOverrides = new Map([["梅丹妮探事員", "梅丹尼探事員"]]);
function normalizeAbilityTable(body) {
  const table = /\| 屬性 \| 數值 \| 調整 \| 豁免 \|\r?\n\|[-| :]+\|\r?\n((?:\|[^\n]+\|\r?\n?){6})/.exec(body);
  if (!table) return body;
  const values = [...table[1].matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)].map((row) => row.slice(1).map((cell) => cell.trim()));
  if (values.length !== 6) return body;
  const row = (left, right, third) => `| **${left[0]}** | ${left[1]} | ${left[2]} | ${left[3]} | **${right[0]}** | ${right[1]} | ${right[2]} | ${right[3]} | **${third[0]}** | ${third[1]} | ${third[2]} | ${third[3]} |`;
  const replacement = [
    "|  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |",
    "| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |",
    row(values[0], values[1], values[2]),
    row(values[3], values[4], values[5]),
  ].join("\n");
  return body.replace(table[0], `${replacement}\n`);
}
function normalizeSections(body) {
  let seenActions = false;
  let section = "";
  const lines = body.split(/\r?\n/).map((line) => {
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      const name = heading[1].trim();
      if (/^動作 Actions$/.test(name)) { seenActions = true; section = "actions"; return "## 動作 (Actions)"; }
      if (/^附贈動作 (?:Bonus )?Actions$/.test(name)) { section = "bonus"; return "## 附贈動作 (Bonus Actions)"; }
      if (/^反應 Reactions?$/.test(name)) { section = "reactions"; return "## 反應 (Reactions)"; }
      if (/^(?:特質 Trait|特性 Traits)$/.test(name)) {
        section = seenActions ? "reactions" : "traits";
        return seenActions ? "## 反應 (Reactions)" : "## 特性 (Traits)";
      }
    }
    if (section && /^\*\*[^*].*\*\*/.test(line)) {
      const item = line.replace(/^\*\*(.+?)\s+([A-Za-z][^。]*?)。\*\*(.*)$/, "**$1（$2）**：$3").replace(/^\*\*(.+?)。\*\*(.*)$/, "**$1**：$2");
      return `- ${item}`;
    }
    return line;
  });
  return lines.join("\n");
}
function titleAndBody(text, fallback) {
  const sourceTitle = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
  const title = titleOverrides.get(sourceTitle) ?? sourceTitle;
  let body = text.replace(/^#\s+.+(?:\r?\n|$)/, "").trim().replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎");
  body = body.replace(/^\*\*免疫\*\*\s*(恐慌|魅惑|耳聾|力竭|目盲|中毒|麻痺|石化|伏地|束縛|昏迷)(.*)$/gm, "**狀態免疫** $1$2");
  body = normalizeAbilityTable(body);
  body = normalizeSections(body);
  return { title, body };
}
let count = 0;
for (const item of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  if (!item.isFile() || !item.name.endsWith(".md") || item.name === "數據卡.md") continue;
  const file = path.join(sourceRoot, item.name); const raw = fs.readFileSync(file, "utf8");
  if (!/^\*\*AC\*\*/m.test(raw)) continue;
  const { title, body } = titleAndBody(raw, path.basename(item.name, ".md")); const type = typeOf(body); const source = sourceOf(file);
  const content = `${frontmatter({ publicationId, publication, kind: "monster", concept: title, title: `${title} (Eberron)`, category: "怪物", tag: `怪物_${type}`, source, locator: `# ${title}` })}\n\n# ${title}\n\n${body}\n\n## 🔗 相關連結\n\n- [[怪物/${type}/${type}索引|${type}索引]]\n`;
  writableCandidate({ destination: path.join(ROOT, "wiki", "怪物", type, `${title}.md`), content, options }); count += 1;
}
console.log(`艾伯倫奇械鍛爐數據卡：${count} 頁。`);
