import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";
const options = parseOptions(); const publicationId = options.publicationId ?? "ERLW2019"; const publication = loadPublication(publicationId);
const sourceRoot = path.join(ROOT, "原始資料", "艾伯倫：從終末戰爭中崛起", "第六章");
function source(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function titleBody(raw, fallback) { const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback; return [title, raw.replace(/^#\s+.+(?:\r?\n|$)/, "").trim().replace(/^#\s+/gm, "## ").replace(/^###\s+/gm, "## ").replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎")]; }
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
