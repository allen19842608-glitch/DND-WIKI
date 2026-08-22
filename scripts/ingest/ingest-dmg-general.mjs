import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const rawRoot = path.join(root, "原始資料", "地下城主指南2024");
const wikiRoot = path.join(root, "wiki");
const apply = process.argv.includes("--apply");
const normalize = process.argv.includes("--normalize-headings");
const date = "2026-08-22";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  });
}
function sha(value) { return crypto.createHash("sha1").update(value).digest("hex").slice(0, 10); }
function yaml(value) { return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"'); }
function sourceOf(file) { return `原始資料/地下城主指南2024/${path.relative(rawRoot, file).split(path.sep).join("/")}`; }
function titleOf(text, fallback) { return text.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback; }
function normalizeHeadingLevels(markdown) {
  let previous = 1;
  return markdown.replace(/^(#{1,6})(\s+)/gm, (_match, marks, spacing) => {
    const level = Math.min(marks.length, previous + 1);
    previous = level;
    return `${"#".repeat(level)}${spacing}`;
  });
}
function bodyOf(text) {
  return normalizeHeadingLevels(text.replace(/^#\s+.+\r?\n*/, "").trim()
    .replace(/^(#{2,6})\s+/gm, "#$1 ")
    .replace(/^#\s+(.+)$/gm, "### $1"));
}
function destination(file) {
  const parts = path.relative(rawRoot, file).split(path.sep);
  const chapter = parts.shift();
  const remainder = parts.join(path.sep);
  if (chapter === "第四章_創建冒險") return { category: "戰役設定", tag: "戰役設定_戰役創作", file: path.join(wikiRoot, "戰役設定", "戰役創作", "冒險創建", remainder) };
  if (chapter === "第五章_創作戰役") return { category: "戰役設定", tag: "戰役設定_戰役創作", file: path.join(wikiRoot, "戰役設定", "戰役創作", "戰役設計", remainder) };
  if (chapter === "附錄A：設定彙編.md") return { category: "戰役設定", tag: "戰役設定_戰役創作", file: path.join(wikiRoot, "戰役設定", "戰役創作", "設定彙編.md") };
  const section = chapter === "第三章_地下城主工具箱" ? "" : chapter.replace(/^第[一二三]章_/, "");
  return { category: "規則機制", tag: "規則_地下城主工具箱", file: path.join(wikiRoot, "規則", "地下城主工具箱", section, remainder) };
}

if (normalize) {
  const generatedRoots = [
    path.join(wikiRoot, "規則", "地下城主工具箱"),
    path.join(wikiRoot, "戰役設定", "戰役創作", "冒險創建"),
    path.join(wikiRoot, "戰役設定", "戰役創作", "戰役設計"),
  ];
  let fixed = 0;
  for (const generatedRoot of generatedRoots) for (const file of walk(generatedRoot)) {
    const original = fs.readFileSync(file, "utf8");
    const normalized = normalizeHeadingLevels(original);
    if (normalized !== original) { fs.writeFileSync(file, normalized, "utf8"); fixed += 1; }
  }
  console.log(`標題層級已正規化：${fixed}`);
  process.exit(0);
}

const allWikiText = walk(wikiRoot).map((file) => fs.readFileSync(file, "utf8")).join("\n");
let added = 0;
let present = 0;
for (const input of walk(rawRoot).sort()) {
  const source = sourceOf(input);
  if (allWikiText.includes(source)) { present += 1; continue; }
  const original = fs.readFileSync(input, "utf8");
  const title = titleOf(original, path.basename(input, ".md"));
  const mapped = destination(input);
  const content = `---\ntitle: "${yaml(title)}"\nentity_id: "entry:DMG2024:entry:${sha(source)}"\nconcept_id: "concept:dmg2024:${sha(title)}"\nruleset: "2024"\ncontent_scope: "core"\nstatus: "current"\ncategory: "${mapped.category}"\nversion: "2024-Core"\ntags:\n  - "地下城主指南2024"\n  - "${mapped.tag}"\nsources:\n  - file: "${source}"\n    locator: "L1 標題：${yaml(title)}；全文"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Dungeon Master's Guide (2024)"\nerrata: []\nupdated: "${date}"\n---\n\n# ${title}\n\n## ⚙️ 規則條文 (Rule Text)\n\n${bodyOf(original) || "本節未提供可獨立編譯的正文。"}\n`;
  if (apply) { fs.mkdirSync(path.dirname(mapped.file), { recursive: true }); fs.writeFileSync(mapped.file, content, "utf8"); }
  console.log(`${apply ? "匯入" : "預覽"}：${path.relative(root, mapped.file)}`);
  added += 1;
}
console.log(`完成：${added}；既有吸收：${present}`);
