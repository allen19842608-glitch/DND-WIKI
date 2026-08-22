import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = options.publicationId ?? "EBER2025";
const publication = loadPublication(publicationId); const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root);
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function safe(name) { return name.replace(/[\\/:*?"<>|]/g, "-").replace(/[（）]/g, "").trim(); }
function titleAndBody(text, fallback) {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
  const body = text.replace(/^#\s+.+(?:\r?\n|$)/, "").trim().replace(/^#\s+/gm, "## ");
  return { title, body };
}
const chapters = [
  { source: "第四章", output: ["戰役設定", "艾伯倫", "薩恩", "探事員"], index: "薩恩探事員索引" },
  { source: "第五章", output: ["戰役設定", "艾伯倫", "龍紋家族"], index: "龍紋家族索引" },
  { source: "第六章", output: ["戰役設定", "艾伯倫", "莫格雷夫遠征"], index: "莫格雷夫遠征索引" },
  { source: "第七章", output: ["戰役設定", "艾伯倫", "元素飛艇"], index: "元素飛艇索引" },
];
let count = 0;
for (const chapter of chapters) {
  const input = path.join(sourceRoot, chapter.source);
  const files = fs.readdirSync(input, { withFileTypes: true }).filter((item) => item.isFile() && item.name.endsWith(".md")).map((item) => path.join(input, item.name));
  const headings = [];
  for (const file of files) {
    const { title, body } = titleAndBody(fs.readFileSync(file, "utf8"), path.basename(file, ".md"));
    if (title.includes(`第${chapter.source.replace("第", "").replace("章", "")}章`)) continue;
    const source = sourceOf(file); const destination = path.join(ROOT, "wiki", ...chapter.output, `${safe(title)}.md`);
    const content = `${frontmatter({ publicationId, publication, kind: "setting", concept: title, title: `${title} (Eberron)`, category: "戰役設定", tag: "戰役設定_艾伯倫", source, locator: `# ${title}` })}\n\n# ${title}\n\n## 設定資料\n\n${body}\n\n## 🔗 相關連結\n\n- [[戰役設定/艾伯倫/艾伯倫索引|艾伯倫索引 (Eberron Index)]]\n- [[戰役設定/${chapter.output.slice(1).join("/")}/${chapter.index}|${chapter.index}]]\n`;
    writableCandidate({ destination, content, options }); headings.push({ title, output: chapter.output }); count += 1;
  }
  const chapterFile = files.find((file) => /第[四五六七]章/.test(path.basename(file))) ?? files[0];
  const chapterContent = fs.readFileSync(chapterFile, "utf8"); const chapterSource = sourceOf(chapterFile);
  const { body } = titleAndBody(chapterContent, chapter.index);
  const links = headings.sort((a, b) => a.title.localeCompare(b.title, "zh-Hant")).map((item) => `- [[戰役設定/艾伯倫/${item.output.slice(2).join("/")}/${safe(item.title)}|${item.title}]]`).join("\n");
  const indexContent = `${frontmatter({ publicationId, publication, kind: "setting-index", concept: chapter.index, title: `${chapter.index} (Eberron)`, category: "戰役設定", tag: "戰役設定_艾伯倫", source: chapterSource, locator: `# ${chapter.index}` })}\n\n# ${chapter.index}\n\n${body}\n\n## 條目\n\n${links}\n\n## 🔗 相關連結\n\n- [[戰役設定/艾伯倫/艾伯倫索引|艾伯倫索引 (Eberron Index)]]\n`;
  writableCandidate({ destination: path.join(ROOT, "wiki", ...chapter.output, `${chapter.index}.md`), content: indexContent, options }); count += 1;
}
console.log(`艾伯倫奇械鍛爐設定章節：${count} 頁。`);
