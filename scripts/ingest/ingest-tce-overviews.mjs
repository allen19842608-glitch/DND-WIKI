import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = options.publicationId ?? "TCE2020";
const publication = loadPublication(publicationId); const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root);
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
function convert(text) { return execFileSync(python, ["-c", program, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎"); }
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function body(text) { return text.replace(/^#\s+.+(?:\r?\n|$)/, "").trim().replace(/^#\s+/gm, "## ").replace(/^####\s+/gm, "### ").replace(/^#####\s+/gm, "#### "); }
function rawHeading(text, fallback) { return text.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback; }
function safe(name) { return name.replace(/[\\/:*?\"<>|]/g, "-").trim(); }

const entries = [
  ["法術/個性化法術.md", "個性化法術", "wiki/規則/2014/施法規則/塔莎的萬事坩堝", "規則_施法"],
  ["法術/法術列表.md", "塔莎法術索引", "wiki/法術/2014", "法術_索引", "法術"],
  ["魔法物品/魔法物品列表.md", "塔莎魔法物品索引", "wiki/魔法物品/2014", "魔法物品_索引", "魔法物品"],
  ["魔法雜物間.md", "魔法雜物間", "wiki/規則/2014/施法規則/塔莎的萬事坩堝", "規則_施法"],
  ["環境災害.md", "環境災害", "wiki/規則/2014/環境與危害/塔莎的萬事坩堝", "規則_環境與危害"],
  ["城主工具/城主工具.md", "塔莎城主工具索引", "wiki/規則/2014/地下城主工具箱/塔莎的萬事坩堝", "規則_地下城主工具箱"],
  ["城主工具/環境災害/自然災害.md", "自然災害", "wiki/規則/2014/環境與危害/塔莎的萬事坩堝", "規則_環境與危害"],
  ["城主工具/環境災害/魔法現象.md", "魔法現象", "wiki/規則/2014/環境與危害/塔莎的萬事坩堝", "規則_環境與危害"],
  ["城主工具/謎題/謎題.md", "塔莎謎題索引", "wiki/規則/2014/地下城主工具箱/塔莎的萬事坩堝/謎題", "規則_地下城主工具箱"],
];
let count = 0;
for (const [relative, title, output, tag, category = "規則機制"] of entries) {
  const sourcePath = path.join(sourceRoot, relative); const raw = convert(fs.readFileSync(sourcePath, "utf8")); const source = sourceOf(sourcePath);
  const content = `${frontmatter({ publicationId, publication, kind: category === "法術" ? "spell-index" : category === "魔法物品" ? "magic-item-index" : "rule", concept: title, title: `${title} (TCE 2014 Legacy)`, category, tag, source, locator: `# ${rawHeading(raw, title)}` })}\n\n# ${title}\n\n> [!WARNING]\n> 本頁整理《塔莎的萬事坩堝》的 2014 舊版規則或導覽；可選內容須由 DM 決定是否採用。\n\n## ⚙️ 規則條文 (Rule Text)\n\n${body(raw)}\n\n## 🔗 相關連結\n\n- [[規則索引|規則索引 (Rules Index)]]\n`;
  writableCandidate({ destination: path.join(ROOT, output, `${safe(title)}.md`), content, options }); count += 1;
}
console.log(`TCE 總覽與索引：${count} 頁。`);
