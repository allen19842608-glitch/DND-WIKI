import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = options.publicationId ?? "EBER2025";
const publication = loadPublication(publicationId); const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, "原始資料", "艾伯倫：奇械鍛爐", "數據卡");
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function typeOf(body) {
  const match = body.match(/^\*[^\n]*?(類人|構裝|異怪|野獸|怪獸|妖精|元素|邪魔|亡靈|龍類|巨人|天族|植物|泥怪)/m);
  return match?.[1] ?? "類人";
}
function titleAndBody(text, fallback) { const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback; return { title, body: text.replace(/^#\s+.+(?:\r?\n|$)/, "").trim().replace(/^#\s+/gm, "## ").replace(/^###\s+/gm, "## ").replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎") }; }
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
