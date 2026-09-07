import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIRROR_ROOT = "原始資料/外部來源鏡像/PHB2014/chapters";
const MIRROR_BOOK = "原始資料/外部來源鏡像/PHB2014/book-phb.json";
const MIRROR_URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-phb.json";
const MIRROR_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, MIRROR_BOOK), "utf8"));

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && file.endsWith(".md") ? [file] : [];
  });
}

function chapterFor(category) {
  return {
    "種族": ["03-Races.md", "Chapter 3: Races"],
    "職業": ["04-Classes.md", "Chapter 4: Classes"],
    "背景": ["05-Personality and Background.md", "Chapter 5: Personality and Background"],
    "法術": ["12-Spells.md", "Chapter 12: Spells"],
  }[category];
}

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  let data;
  try { data = YAML.parse(match[1]); } catch { return null; }
  return { text, yaml: match[1], data };
}

function englishName(title) {
  return String(title ?? "").match(/\(([^()，]+)(?:，2014 Legacy)?\)$/)?.[1]?.trim() ?? "";
}

function hasNamedRuleText(value, name) {
  if (Array.isArray(value)) return value.some((item) => hasNamedRuleText(item, name));
  if (!value || typeof value !== "object") return false;
  const referenceOnly = ["statblock", "item", "image"].includes(value.type);
  if (!referenceOnly && value.name === name
    && (Array.isArray(value.entries) && value.entries.length > 0 || typeof value.entry === "string" && value.entry.trim())) return true;
  return Object.values(value).some((item) => hasNamedRuleText(item, name));
}

function candidate(file) {
  const page = parse(file);
  const entityParts = String(page?.data?.entity_id ?? "").split(":");
  if (!page || entityParts[1] !== "PHB2014" || page.data?.ruleset !== "2014" || page.data?.status !== "legacy") return null;
  // PHB2014 spell pages predate the compatibility classifier and intentionally
  // do not carry compatibility_2024; the legacy mirror still covers them.
  const compatibilityRequired = page.data?.category !== "法術";
  if (compatibilityRequired && !["compatible", "conditional"].includes(page.data?.compatibility_2024)) return null;
  if (page.data?.category === "法術" && entityParts[2] !== "spell") return null;
  const chapter = chapterFor(page.data.category);
  if (!chapter) return null;
  const chapterFile = `${MIRROR_ROOT}/${chapter[0]}`;
  if (!fs.existsSync(path.join(ROOT, chapterFile)) || !fs.existsSync(path.join(ROOT, MIRROR_BOOK))) return null;
  const name = englishName(page.data.title);
  if (!name) return null;
  if (!hasNamedRuleText(MIRROR_DATA, name)) return null;
  // Rendered chapter files can contain headings without the corresponding rule
  // body.  The structured book JSON is the verification source for legacy
  // English content, so a chapter citation alone is not sufficient here.
  const hasBookMirror = (page.data.sources ?? []).some((source) => source?.file === MIRROR_BOOK);
  if (hasBookMirror) return { file, page, sourceFile: MIRROR_BOOK, name, chapter, changed: false };
  const source = `  - file: "${MIRROR_BOOK}"\n    locator: "${chapter[1]}；${name}"\n    url: "${MIRROR_URL}"\n    authority: "官方"\n    translation: "none"\n`;
  const nextYaml = page.yaml.replace(/\nsources:\n/, `\nsources:\n${source}`);
  return { file, page, sourceFile: MIRROR_BOOK, name, chapter, changed: true, next: page.text.replace(page.yaml, nextYaml) };
}

const apply = process.argv.includes("--apply");
const eligibleOnly = process.argv.includes("--eligible-only");
const rows = walk(path.join(ROOT, "wiki")).map(candidate).filter(Boolean)
  .filter((row) => !eligibleOnly || ["compatible", "conditional"].includes(row.page.data?.compatibility_2024))
  .filter((row) => row.changed);
for (const row of rows) {
  console.log(`${apply ? "套用" : "預覽"}：${path.relative(ROOT, row.file).replaceAll("\\", "/")} ← ${row.sourceFile}（${row.name}）`);
  if (apply) fs.writeFileSync(row.file, row.next, "utf8");
}
console.log(`${apply ? "已更新" : "預覽"}：${rows.length} 頁。`);
