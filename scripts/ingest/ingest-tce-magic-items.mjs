import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const publicationId = options.publicationId ?? "TCE2020";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const inputRoot = path.join(ROOT, profile.source_root, profile.inputs.magic_items);
const outputRoot = path.join(ROOT, profile.outputs.magic_items);
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";

function convert(text) {
  if (!fs.existsSync(openccRoot)) throw new Error(`找不到 OpenCC：${openccRoot}`);
  return execFileSync(python, ["-c", program, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .replace(/(\d+)\s*尺/g, "$1 呎").replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replaceAll("尺", "呎").replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function walk(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => { const target = path.join(directory, entry.name); return entry.isDirectory() ? walk(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : []; }); }
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function safeName(name) { return name.replace(/[\\/:*?"<>|]/g, "-").trim(); }
function clean(line) { return line.replace(/^#{1,6}\s+/, "").replaceAll("**", "").replace(/\\-/g, "-").trim(); }
function titleLine(line) {
  const plain = clean(line); const heading = plain.match(/^(.+?)\s+([A-Z][A-Za-z0-9'’ -]+)$/);
  if (/^#{2,6}\s/.test(line) && heading) return { chinese: heading[1].trim(), english: heading[2].trim() };
  const pipe = plain.match(/^(.+?)\|([A-Z][A-Za-z0-9'’ -]+?)(?:_.*)?$/);
  return pipe ? { chinese: pipe[1].replaceAll("_", "").trim(), english: pipe[2].trim() } : undefined;
}
function rarity(text, fallback) { return text.match(/(普通|非普通|珍稀|極珍稀|傳說|神器)/)?.[1] ?? fallback; }
function category(text) {
  if (/武器/.test(text)) return "武器"; if (/護甲|盾牌/.test(text)) return "護甲"; if (/法杖/.test(text)) return "法杖";
  if (/魔杖/.test(text)) return "魔杖"; if (/權杖/.test(text)) return "權杖"; if (/戒指/.test(text)) return "戒指"; if (/卷軸/.test(text)) return "卷軸";
  return "奇物";
}
function itemData(lines, heading, end, fallbackRarity) {
  const block = lines.slice(heading.index + 1, end); const inline = clean(lines[heading.index]);
  const metadata = [inline, ...block.slice(0, 4).map(clean)].find((line) => /(奇物|武器|護甲|法杖|魔杖|權杖|戒指|卷軸).*(普通|非普通|珍稀|極珍稀|傳說|神器)/.test(line)) ?? inline;
  const prose = block.filter((line) => line.trim() && !/^[_*]+.*[_*]+$/.test(line.trim())).join("\n").trim();
  return { metadata, prose, category: category(metadata), rarity: rarity(metadata, fallbackRarity), attunement: /需.*同調|需.*調諧/.test(metadata) ? "需要" : "不需要" };
}
function splitEffects(prose) {
  const parts = prose.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return "- **主要魔法效果**：依可定位來源補齊。";
  return parts.map((part, index) => `- **${index === 0 ? "主要魔法效果" : `附加效果 ${index + 1}`}**：\n  - **效果**：${part.replace(/\n/g, " ")}`).join("\n\n");
}

const imported = [];
for (const sourcePath of walk(inputRoot)) {
  const lines = convert(fs.readFileSync(sourcePath, "utf8")).split(/\r?\n/);
  const headings = lines.flatMap((line, index) => { const title = titleLine(line); return title ? [{ index, ...title }] : []; });
  const fallbackRarity = path.basename(sourcePath, ".md");
  for (const [position, heading] of headings.entries()) {
    const end = headings[position + 1]?.index ?? lines.length;
    const item = itemData(lines, heading, end, fallbackRarity);
    if (/邊欄|Sidebar/i.test(heading.chinese) || !/(奇物|武器|護甲|法杖|魔杖|權杖|戒指|卷軸)/.test(item.metadata)) continue;
    const source = sourceOf(sourcePath); const title = `${heading.chinese} (${heading.english}，2014 Legacy)`;
    const content = `${frontmatter({ publicationId, publication, kind: "magic-item", concept: heading.english, title, category: "魔法物品", tag: `魔法物品_${item.category}`, source, locator: `${heading.chinese}|${heading.english}` })}\n\n# ${title}\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 物品資料\n\n| 項目 | 內容 |\n| :--- | :--- |\n| 類別 (Category) | ${item.category} |\n| 稀有度 (Rarity) | ${item.rarity} |\n| 同調 (Attunement) | ${item.attunement} |\n| 消耗品 (Consumable) | 否 |\n\n### 物品效果\n\n${splitEffects(item.prose)}\n\n## 🔗 相關連結\n\n- [[魔法物品/魔法物品索引|魔法物品索引 (Magic Item Index)]]\n`;
    const destination = path.join(outputRoot, item.category, `${safeName(heading.chinese)}.md`);
    writableCandidate({ destination, content, options }); imported.push({ source, ...heading, category: item.category });
  }
}
console.log(`TCE 魔法物品：${imported.length} 件。`);
