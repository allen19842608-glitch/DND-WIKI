import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = options.publicationId ?? "TCE2020";
const publication = loadPublication(publicationId); const profile = loadIngestProfile(publicationId); const bookRoot = path.join(ROOT, profile.source_root);
const outputRoot = path.join(ROOT, profile.outputs.rules);
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const groups = [
  { source: "使用本書", output: ["地下城主工具箱", "塔莎的萬事坩堝", "使用本書"], tag: "規則_地下城主工具箱" },
  { source: "團隊贊助者", output: ["地下城主工具箱", "塔莎的萬事坩堝", "團隊贊助者"], tag: "規則_地下城主工具箱" },
  { source: "協力者", output: ["角色建立與成長", "塔莎的萬事坩堝", "協力者"], tag: "規則_角色建立與成長" },
];
function convert(text) { if (!fs.existsSync(openccRoot)) throw new Error(`找不到 OpenCC：${openccRoot}`); return execFileSync(python, ["-c", program, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎"); }
function walk(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => { const target = path.join(directory, entry.name); return entry.isDirectory() ? walk(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : []; }); }
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function safeName(name) { return name.replace(/[\\/:*?"<>|()[\]（）]/g, "").trim(); }
function titleAndBody(text, fallback) { const lines = text.split(/\r?\n/); const index = lines.findIndex((line) => /^#\s+/.test(line)); const raw = index >= 0 ? lines[index].replace(/^#\s+/, "").trim() : fallback; return { title: raw.replace(/\.html$/i, "").replace(/\s*[（(]TCE[）)]/i, ""), body: lines.slice(index + 1).join("\n").trim() }; }
let count = 0;
for (const group of groups) {
  const directory = path.join(bookRoot, group.source); const files = fs.existsSync(directory) ? walk(directory) : [];
  const rootPage = path.join(bookRoot, `${group.source}.md`); if (fs.existsSync(rootPage)) files.unshift(rootPage);
  for (const sourcePath of files) {
    const { title, body } = titleAndBody(convert(fs.readFileSync(sourcePath, "utf8")), path.basename(sourcePath, ".md")); const source = sourceOf(sourcePath);
    const destination = path.join(outputRoot, ...group.output, `${safeName(title)}.md`);
    const content = `${frontmatter({ publicationId, publication, kind: "rule", concept: title, title: `${title} (TCE 2014 Legacy)`, category: "規則機制", tag: group.tag, source, locator: `# ${title}` })}\n\n# ${title}\n\n> [!WARNING] 本頁整理《塔莎的萬事坩堝》的 2014 可選規則與 DM 指引；採用與否由 DM 決定。\n\n## ⚙️ 規則條文 (Rule Text)\n\n${body.replace(/^####\s+/gm, "### ").replace(/^#####\s+/gm, "#### ")}\n\n## 🔗 相關連結\n\n- [[規則索引|規則索引 (Rules Index)]]\n`;
    writableCandidate({ destination, content, options }); count += 1;
  }
}
console.log(`TCE 參考章節：${count} 頁。`);
