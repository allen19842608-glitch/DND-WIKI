import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = options.publicationId ?? "TCE2020";
const publication = loadPublication(publicationId); const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root, profile.inputs.dungeon_master_tools);
const outputRoot = path.join(ROOT, profile.outputs.rules);
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";

function convert(text) { if (!fs.existsSync(openccRoot)) throw new Error(`找不到 OpenCC：${openccRoot}`); return execFileSync(python, ["-c", program, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎"); }
function walk(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => { const target = path.join(directory, entry.name); return entry.isDirectory() ? walk(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : []; }); }
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function safeName(name) { return name.replace(/[\\/:*?"<>|]/g, "-").trim(); }
function targetFor(file) {
  const relative = path.relative(sourceRoot, file).split(path.sep);
  if (relative[0] === "環境災害") return { directory: path.join(outputRoot, "環境與危害", "塔莎的萬事坩堝"), tag: "規則_環境與危害" };
  return { directory: path.join(outputRoot, "地下城主工具箱", "塔莎的萬事坩堝", ...(relative.slice(0, -1))), tag: "規則_地下城主工具箱" };
}
function titleAndBody(text, fallback) {
  const lines = text.split(/\r?\n/); const line = lines.findIndex((value) => /^#\s+/.test(value));
  const rawTitle = line >= 0 ? lines[line].replace(/^#\s+/, "").trim() : fallback;
  const embedded = lines.slice(Math.max(0, line + 1), line + 8).map((value) => value.match(/^\*\*([^*]+?)\s+[A-Z][A-Za-z'’ -]+\*\*$/)?.[1]?.trim()).find(Boolean);
  const title = rawTitle === "New Item" && embedded ? embedded : rawTitle;
  return { title, body: lines.slice(line + 1).join("\n").trim() };
}
function imageEmbeds(body, sourcePath, destination) {
  return body.replace(/!\[\]\(([^)]+\.jpg)\)/gi, (_all, asset) => {
    const sourceAsset = path.join(path.dirname(sourcePath), asset); const assetDestination = path.join(path.dirname(destination), path.basename(asset));
    if (fs.existsSync(sourceAsset) && options.apply) { fs.mkdirSync(path.dirname(assetDestination), { recursive: true }); fs.copyFileSync(sourceAsset, assetDestination); }
    return fs.existsSync(sourceAsset) ? `![](${path.basename(asset)})` : `> [!NOTE] 圖像資料未隨來源提供：${path.basename(asset)}`;
  });
}

let count = 0;
for (const sourcePath of walk(sourceRoot)) {
  const { title, body } = titleAndBody(convert(fs.readFileSync(sourcePath, "utf8")), path.basename(sourcePath, ".md"));
  if (["城主工具", "自然災害", "魔法現象", "謎題"].includes(title)) continue;
  const target = targetFor(sourcePath); const source = sourceOf(sourcePath); const destination = path.join(target.directory, `${safeName(title)}.md`);
  const normalizedBody = imageEmbeds(body, sourcePath, destination).replace(/^####\s+/gm, "### ").replace(/^#####\s+/gm, "#### ");
  const content = `${frontmatter({ publicationId, publication, kind: "rule", concept: title, title: `${title} (TCE 2014 Legacy)`, category: "規則機制", tag: target.tag, source, locator: `# ${title}` })}\n\n# ${title}\n\n> [!WARNING] 本頁整理《塔莎的萬事坩堝》的 2014 DM 工具；屬 DM 指引或可選規則時，須由 DM 決定是否採用。\n\n## ⚙️ 規則條文 (Rule Text)\n\n${normalizedBody}\n\n## 🔗 相關連結\n\n- [[規則索引|規則索引 (Rules Index)]]\n`;
  writableCandidate({ destination, content, options }); count += 1;
}
console.log(`TCE 城主工具：${count} 頁。`);
