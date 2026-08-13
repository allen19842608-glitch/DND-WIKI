import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { frontmatter, loadPublication, option as publicationOption } from "./ingest-publication-utils.mjs";

const root = process.cwd();
const wikiRoot = path.join(root, "wiki", "怪物");
const apply = process.argv.includes("--apply");
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const source = "原始資料/怪物圖鑑2025/附錄B/附錄B：怪物速查.md";
const publicationId = publicationOption(process.argv.slice(2), "--publication") ?? "MM2025";
const publication = loadPublication(publicationId);
const typeNames = ["亡靈", "元素", "天族", "妖精", "巨人", "怪獸", "植物", "構裝", "泥怪", "異怪", "邪魔", "野獸", "類人", "龍類"];
const typeEnglish = { 亡靈: "Undead", 元素: "Elemental", 天族: "Celestial", 妖精: "Fey", 巨人: "Giant", 怪獸: "Monstrosity", 植物: "Plant", 構裝: "Construct", 泥怪: "Ooze", 異怪: "Aberration", 邪魔: "Fiend", 野獸: "Beast", 類人: "Humanoid", 龍類: "Dragon" };

function read(file) { return fs.readFileSync(file, "utf8"); }
function titleOf(text) { return text.match(/^title:\s+"(.+?)"\s*$/m)?.[1]; }
function quote(value) { return String(value).replaceAll('"', '\\"'); }
function indexFrontmatter(title, tag) {
  return `---\ntitle: "${quote(title)}"\ncategory: "怪物"\nversion: "2024-Core"\ntags:\n  - "怪物圖鑑2025"\n  - "${tag}"\nsources:\n  - file: "${source}"\n    locator: "附錄 B：怪物速查；Wiki 導覽結構"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Monster Manual (2025)"\nerrata: []\nupdated: "${updated}"\n---\n`;
}

function registeredIndexFrontmatter(title, tag) {
  return `${frontmatter({ publicationId, publication, kind: "monster-index", concept: title, title, category: "怪物", tag, source, locator: "附錄 B：怪物速查；Wiki 導覽結構" })}\n`;
}

const writes = new Map();
const renames = [];
const overviewDir = path.join(wikiRoot, "介紹");
const overviewEntries = [];
for (const file of fs.readdirSync(wikiRoot).filter((name) => name.endsWith(".md"))) {
  const full = path.join(wikiRoot, file);
  const text = read(full);
  if (!/原始資料\/怪物圖鑑2025\/.+總\.md/.test(text)) continue;
  const title = titleOf(text);
  const matched = title?.match(/^(.+?)(?: \((.+)\))?$/);
  if (!matched) continue;
  const name = matched[1];
  const english = matched[2];
  const display = english ? `${name}介紹 (${english})` : `${name}介紹`;
  let updatedText = text.replace(/^title:\s+".+?"\s*$/m, `title: "${quote(display)}"`)
    .replace(new RegExp(`^# ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?: \\([^\\n]+\\))?$`, "m"), `# ${display}`);
  if (!updatedText.includes("[[wiki/怪物/介紹/怪物介紹索引|怪物介紹索引]]")) {
    updatedText = updatedText.replace(/(## 🔗 相關條目\r?\n)/, `$1\n- [[wiki/怪物/介紹/怪物介紹索引|怪物介紹索引]]\n`);
  }
  const target = path.join(overviewDir, `${name}介紹.md`);
  renames.push({ from: full, to: target });
  writes.set(target, updatedText);
  overviewEntries.push({ name, english, display });
}
if (fs.existsSync(overviewDir)) for (const file of fs.readdirSync(overviewDir).filter((name) => name.endsWith("介紹.md"))) {
  const text = read(path.join(overviewDir, file));
  const title = titleOf(text);
  const matched = title?.match(/^(.+?)介紹(?: \((.+)\))?$/);
  if (matched && !overviewEntries.some((entry) => entry.name === matched[1])) {
    overviewEntries.push({ name: matched[1], english: matched[2], display: title });
  }
}

for (const type of typeNames) {
  const folder = path.join(wikiRoot, type);
  const cards = fs.readdirSync(folder).filter((name) => name.endsWith(".md") && name !== `${type}索引.md`);
  const links = [];
  for (const card of cards) {
    const file = path.join(folder, card);
    const text = read(file);
    const title = titleOf(text) ?? path.basename(card, ".md");
    links.push(`- [[wiki/怪物/${type}/${path.basename(card, ".md")}|${title}]]`);
    const backlink = `[[wiki/怪物/${type}/${type}索引|${type}索引 (${typeEnglish[type]} Index)]]`;
    const migrated = text.replaceAll(`[[wiki/怪物/${type}/${type}索引|${type}索引]]`, backlink);
    if (!migrated.includes(backlink)) {
      const changed = migrated.includes("## 🔗 相關連結")
        ? migrated.replace(/(## 🔗 相關連結\r?\n)/, `$1\n- ${backlink}\n`)
        : `${migrated.trimEnd()}\n\n## 🔗 相關連結\n\n- ${backlink}\n`;
      writes.set(file, changed);
    } else if (migrated !== text) {
      writes.set(file, migrated);
    }
  }
  const index = `${registeredIndexFrontmatter(`${type}索引 (${typeEnglish[type]} Index)`, "怪物_索引")}\n# ${type}索引 (${typeEnglish[type]} Index)\n\n此索引收錄《怪物圖鑑2025》中生物類型為「${type}」的資料卡。\n\n## 條目\n\n${links.sort().join("\n")}\n\n## 🔗 相關連結\n\n- [[wiki/怪物/怪物索引|怪物索引 (Monster Index)]]\n`;
  writes.set(path.join(folder, `${type}索引.md`), index);
}

const overviewLinks = overviewEntries.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
  .map((entry) => `- [[wiki/怪物/介紹/${entry.name}介紹|${entry.display}]]`).join("\n");
writes.set(path.join(overviewDir, "怪物介紹索引.md"), `${registeredIndexFrontmatter("怪物介紹索引 (Monster Introductions Index)", "怪物_索引")}\n# 怪物介紹索引 (Monster Introductions Index)\n\n此處收錄怪物族群的背景與介紹；個別數據卡請由生物類型索引查閱。\n\n## 介紹頁\n\n${overviewLinks}\n\n## 🔗 相關連結\n\n- [[wiki/怪物/怪物索引|怪物索引 (Monster Index)]]\n`);

const typeLinks = typeNames.map((type) => `- [[wiki/怪物/${type}/${type}索引|${type}索引 (${typeEnglish[type]} Index)]]`).join("\n");
writes.set(path.join(wikiRoot, "怪物索引.md"), `${registeredIndexFrontmatter("怪物索引 (Monster Index)", "怪物_索引")}\n# 怪物索引 (Monster Index)\n\n《怪物圖鑑2025》的資料卡依生物類型存放；棲息地、挑戰等級與版本轉換請使用怪物速查。\n\n## 生物類型\n\n${typeLinks}\n\n## 導覽與速查\n\n- [[wiki/怪物/介紹/怪物介紹索引|怪物介紹索引 (Monster Introductions Index)]]\n- [[wiki/怪物/怪物速查索引|怪物速查 (Monster Lists)]]\n`);

for (const [target, content] of writes) {
  for (const [oldTarget, oldContent] of writes) {
    if (target === oldTarget) continue;
  }
}

const allFiles = fs.readdirSync(path.join(root, "wiki"), { recursive: true })
  .filter((entry) => entry.endsWith(".md"))
  .map((entry) => path.join(root, "wiki", entry));
for (const file of allFiles) {
  let text = writes.get(file) ?? read(file);
  let changed = text;
  for (const entry of overviewEntries) {
    const oldTarget = `wiki/怪物/${entry.name}`;
    const newTarget = `wiki/怪物/介紹/${entry.name}介紹`;
    changed = changed.replaceAll(`[[${oldTarget}|`, `[[${newTarget}|`)
      .replaceAll(`[[${oldTarget}]]`, `[[${newTarget}|${entry.display}]]`);
  }
  if (changed !== text) writes.set(file, changed);
}

console.log(`介紹頁搬移：${renames.length}`);
console.log(`類型索引：${typeNames.length}`);
console.log(`更新／新增：${writes.size}`);
if (apply) {
  fs.mkdirSync(overviewDir, { recursive: true });
  for (const rename of renames) if (fs.existsSync(rename.from)) fs.renameSync(rename.from, rename.to);
  for (const [file, content] of writes) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}
