import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";
const options = parseOptions(); const publicationId = process.argv.includes("--publication") ? options.publicationId : "ERLW2019"; const publication = loadPublication(publicationId);
const sourceRoot = path.join(ROOT, "原始資料", "艾伯倫：從終末戰爭中崛起", "第六章");
function source(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function normalizeAbilityScores(body) {
  const match = /力量　敏捷　體質　智力　感知　魅力\r?\n\r?\n([^\r\n]+)/.exec(body);
  if (!match) return body;
  const values = [...match[1].matchAll(/(\d+)\(([+-]\d+)\)/g)];
  if (values.length !== 6) return body;
  const score = (index) => [values[index][1], values[index][2], "—"];
  const row = (first, second, third) => `| **${first[0]}** | ${first[1]} | ${first[2]} | ${first[3]} | **${second[0]}** | ${second[1]} | ${second[2]} | ${second[3]} | **${third[0]}** | ${third[1]} | ${third[2]} | ${third[3]} |`;
  const names = ["力量", "敏捷", "體質", "智力", "感知", "魅力"];
  const cells = names.map((name, index) => [name, ...score(index)]);
  const table = [
    "|  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |",
    "| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |",
    row(cells[0], cells[1], cells[2]),
    row(cells[3], cells[4], cells[5]),
  ].join("\n");
  return body.replace(match[0], table);
}
function normalizeSections(body) {
  let section = "";
  return body.split(/\r?\n/).map((line) => {
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      const name = heading[1].trim();
      if (/^動作 Actions$/.test(name)) { section = "actions"; return "## 動作 (Actions)"; }
      if (/^附贈動作 Bonus Actions$/.test(name)) { section = "bonus"; return "## 附贈動作 (Bonus Actions)"; }
      if (/^反應 Reactions?$/.test(name)) { section = "reactions"; return "## 反應 (Reactions)"; }
      if (/^傳奇動作 Legendary Actions$/.test(name)) { section = "legendary"; return "## 傳奇動作 (Legendary Actions)"; }
      if (/^(?:特性|特質) Traits?$/.test(name)) { section = "traits"; return "## 特性 (Traits)"; }
      section = "";
      return `## ${name}`;
    }
    if (section && /^\*\*[^*].*\*\*/.test(line)) {
      const item = line.replace(/^\*\*(.+?)\s+([A-Za-z][^。]*?)。\*\*(.*)$/, "**$1（$2）**：$3").replace(/^\*\*(.+?)。\*\*(.*)$/, "**$1**：$2");
      return `- ${item}`;
    }
    return line;
  }).join("\n");
}
function titleBody(raw, fallback) {
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
  let body = raw.replace(/^#\s+.+(?:\r?\n|$)/, "").trim().replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎");
  const statStart = body.search(/^\*[^*\n].*\*$/m);
  const preface = statStart < 0 ? body : body.slice(0, statStart);
  const earlyTraits = [...preface.matchAll(/^\*\*[^\n]+?。\*\*[^\n]*$/gm)].map((item) => item[0]);
  if (earlyTraits.length) body = `${preface.replace(/^\*\*[^\n]+?。\*\*[^\n]*$/gm, "").trimEnd()}\n\n${body.slice(statStart)}`;
  body = body.replace(/^\*\*護甲等級\*\*/gm, "**AC**").replace(/^\*\*生命值\*\*/gm, "**HP**").replace(/^\*\*豁免\*\*/gm, "**豁免檢定**");
  body = normalizeAbilityScores(body);
  body = normalizeSections(body);
  if (earlyTraits.length) body = body.replace(/\n(## (?:動作|附贈動作|反應|傳奇動作) \()/, `\n## 特性 (Traits)\n\n${earlyTraits.map((item) => `- ${item.replace(/^\*\*(.+?)\s+([A-Za-z][^。]*?)。\*\*(.*)$/, "**$1（$2）**：$3")}`).join("\n")}\n\n$1`);
  return [title, body];
}
const indexEntries = [];
for (const item of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  if (!item.isFile() || !item.name.endsWith(".md")) continue;
  const file = path.join(sourceRoot, item.name), raw = fs.readFileSync(file, "utf8");
  if (!/^\*\*(?:AC|護甲等級)\*\*/m.test(raw)) continue;
  const [title, body] = titleBody(raw, path.basename(item.name, ".md")); const src = source(file);
  const content = `${frontmatter({ publicationId, publication, kind: "monster", concept: title, title: `${title} (2014 Legacy)`, category: "怪物", tag: "怪物_2014", source: src, locator: `# ${title}` })}\n\n# ${title}\n\n${body}\n\n## 🔗 相關連結\n\n- [[怪物/2014/艾伯倫/艾伯倫怪物索引|艾伯倫怪物索引 (Eberron Monsters Index)]]\n`;
  writableCandidate({ destination: path.join(ROOT, "wiki", "怪物", "2014", "艾伯倫", `${title}.md`), content, options }); indexEntries.push(title);
}
const indexSource = "原始資料/艾伯倫：從終末戰爭中崛起/第六章/生物圖志.md";
const index = `${frontmatter({ publicationId, publication, kind: "monster-index", concept: "艾伯倫怪物索引", title: "艾伯倫怪物索引 (2014 Legacy)", category: "怪物", tag: "怪物_索引", source: indexSource, locator: "第六章：生物圖志" })}\n\n# 艾伯倫怪物索引 (2014 Legacy)\n\n本索引收錄《艾伯倫：從終末戰爭中崛起》第六章的 2014 Legacy 怪物與 NPC 資料卡；不得與 2024 版同名條目混用。\n\n## 條目\n\n${indexEntries.sort((a,b)=>a.localeCompare(b,"zh-Hant")).map((title)=>`- [[${title}|${title}]]`).join("\n")}\n\n## 🔗 相關連結\n\n- [[怪物/怪物索引|怪物索引 (Monster Index)]]\n`;
writableCandidate({ destination: path.join(ROOT, "wiki", "怪物", "2014", "艾伯倫", "艾伯倫怪物索引.md"), content: index, options });
console.log(`艾伯倫 2014 資料卡：${indexEntries.length} 頁。`);
