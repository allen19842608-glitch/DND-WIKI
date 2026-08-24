import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const publicationId = "MPMM2022";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root, profile.inputs.species);
const outputRoot = path.join(ROOT, profile.outputs.species);
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const opencc = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";

const species = [
  ["阿蘭寇拉鷹人.md", "鳥羽人", "Aarakocra"], ["熊地精.md", "熊地精", "Bugbear"], ["人馬.md", "人馬", "Centaur"],
  ["地底侏儒.md", "地底侏儒", "Deep Gnome"], ["灰矮人.md", "灰矮人", "Duergar"], ["雅靈.md", "雅靈", "Eladrin"],
  ["仙靈.md", "仙靈", "Fairy"], ["費爾伯格人.md", "費爾伯格人", "Firbolg"], ["吉斯洋基人.md", "吉斯洋基人", "Githyanki"],
  ["吉斯澤萊人.md", "吉斯澤萊人", "Githzerai"], ["地精.md", "地精", "Goblin"], ["兔人.md", "兔人", "Harengon"],
  ["大地精.md", "大地精", "Hobgoblin"], ["天狗.md", "天狗", "Kenku"], ["狗頭人.md", "狗頭人", "Kobold"],
  ["蜥蜴人.md", "蜥蜴人", "Lizardfolk"], ["牛頭人.md", "牛頭人", "Minotaur"], ["半羊人.md", "半羊人", "Satyr"],
  ["海精靈.md", "海精靈", "Sea Elf"], ["影靈.md", "影靈", "Shadar-kai"], ["斑貓人.md", "斑貓人", "Tabaxi"],
  ["龜人.md", "龜人", "Tortle"], ["梭螺魚人.md", "梭螺魚人", "Triton"], ["原體蛇人.md", "蛇人", "Yuan-ti"],
];
const replaced = [
  ["阿斯莫.md", "阿斯莫", "Aasimar", "種族/阿斯莫"], ["歌利亞.md", "歌利亞", "Goliath", "種族/歌利亞"],
  ["獸人.md", "獸人", "Orc", "種族/獸人"], ["幻身靈.md", "幻身靈", "Changeling", "種族/幻身靈"],
  ["化獸者.md", "化獸者", "Shifter", "種族/化獸者"],
];
const genasi = [
  ["氣元素裔", "Air Genasi", "氣元素裔特質"], ["土元素裔", "Earth Genasi", "土元素裔特質"],
  ["火元素裔", "Fire Genasi", "火元素裔特質"], ["水元素裔", "Water Genasi", "水元素裔特質"],
];
const sourceOf = (file) => path.relative(ROOT, file).split(path.sep).join("/");
function traditional(text) {
  if (!fs.existsSync(openccRoot)) throw new Error(`找不到 OpenCC：${openccRoot}`);
  return execFileSync(python, ["-c", opencc, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .replace(/(\d+)\s*尺/g, "$1 呎").replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replace(/(\d+)\s*gp\b/gi, "$1 GP").replaceAll("聖武士", "聖騎士");
}
function section(text, marker) {
  if (!marker) return text.replace(/^#[^\n]*\n(?:##[^\n]*\n)?/, "");
  const start = text.indexOf(`**${marker}`);
  if (start < 0) throw new Error(`找不到段落：${marker}`);
  const rest = text.slice(start);
  const next = rest.search(/\n\*\*[氣土火水]元素裔特質/);
  return next < 0 ? rest : rest.slice(0, next);
}
function fields(text) {
  const re = /\*\*([^*。]+?)\s+([A-Za-z][A-Za-z '\-]+?)。?\*\*\s*([\s\S]*?)(?=\n\*\*[^*。]+?\s+[A-Za-z]|$)/g;
  const result = [];
  for (const match of text.matchAll(re)) result.push({ cn: match[1].trim(), en: match[2].trim(), body: match[3].trim().replace(/\n{3,}/g, "\n\n") });
  return result;
}
function extract(field, expression, fallback) { return (field?.body.match(expression)?.[1] ?? fallback).replace(/[。．].*$/, "").trim(); }
function basic(traits) {
  const type = traits.find((item) => ["生物類型", "生物型別"].includes(item.cn));
  const size = traits.find((item) => item.cn === "體型");
  const speed = traits.find((item) => item.cn === "速度");
  const typeValue = extract(type, /你是(.+?)(?:生物|。)/, type?.body ?? "依來源").replace(/生物$/, "");
  const sizeValue = extract(size, /(?:為|是)(中型或小型|中型|小型|大型)/, size?.body ?? "依來源");
  const walk = extract(speed, /步行速度為\s*(\d+\s*呎)/, "依來源");
  const flight = traits.find((item) => item.en === "Flight")?.body;
  const other = speed?.body.includes("飛行速度") || flight ? ((speed?.body ?? flight).match(/等同於你步行速度的飛行速度/) || flight?.match(/等同於你步行速度的飛行速度/) ? "飛行等同於步行速度" : "飛行")
    : speed?.body.includes("游泳速度") ? (speed.body.match(/等同於你步行速度的游泳速度/) ? "游泳等同於步行速度" : "游泳") : "無";
  return { typeValue, sizeValue, walk, other };
}
function traitBlock(trait) {
  const body = trait.body.replace(/\n+/g, " ").replace(/\s{2,}/g, " ");
  return `#### ${trait.cn} (${trait.en})\n\n- **效果**：${body}`;
}
function page({ file, name, english, raw, locator, current }) {
  const allTraits = fields(raw);
  const data = basic(allTraits);
  const traits = allTraits.filter((item) => !["生物類型", "生物型別", "體型", "速度", name].includes(item.cn) && !item.cn.endsWith("特質"));
  if (traits.length < 2) throw new Error(`${name} 特質解析不足：${traits.length}`);
  const sourceFile = path.join(sourceRoot, file);
  const title = `${name} (${english}，2014 Legacy)`;
  const intro = `本條目出自《魔鄧肯鉅獻：多元宇宙的怪物》的 2014 Legacy 種族選項。採用 2024 角色建立規則時，屬性值提升改由背景提供。`;
  const warning = current ? `> [!WARNING]\n> 本條目為 2014 舊版規則；2024 新版請參閱 [[${current}|${name} (${english})]]。\n\n` : "> [!IMPORTANT]\n> ";
  const metadata = frontmatter({ publicationId, publication, kind: "species", concept: english, title, category: "種族", tag: `種族_${name}`, source: sourceOf(sourceFile), locator }).replace("\ncategory:", `\ncompatibility_2024: "${current ? "replaced" : "compatible"}"\ncategory:`);
  const content = `${metadata}\n\n# ${title}\n\n${warning}${intro}\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 基本資料\n\n| 生物類型 | 體型 | 速度 | 其他速度 |\n| :--- | :--- | :--- | :--- |\n| ${data.typeValue} | ${data.sizeValue} | ${data.walk} | ${data.other} |\n\n### 種族特質 (Species Traits)\n\n${traits.map(traitBlock).join("\n\n")}\n\n## 🔗 相關連結\n\n- [[種族/2014/多元宇宙種族/多元宇宙種族索引|多元宇宙種族索引 (MPMM 2014 Legacy)]]\n- [[種族/2014/種族索引|2014 種族索引 (2014 Species Index)]]${current ? `\n- [[${current}|${name} (${english})]]` : ""}\n`;
  return { destination: path.join(outputRoot, `${name}.md`), content };
}
const results = [];
for (const [file, name, english] of species) {
  const raw = traditional(fs.readFileSync(path.join(sourceRoot, file), "utf8"));
  results.push(page({ file, name, english, raw: section(raw), locator: `# ${name}` }));
}
for (const [file, name, english, current] of replaced) {
  const raw = traditional(fs.readFileSync(path.join(sourceRoot, file), "utf8"));
  results.push(page({ file, name, english, raw: section(raw), locator: `# ${name}`, current }));
}
const genasiRaw = traditional(fs.readFileSync(path.join(sourceRoot, "元素裔.md"), "utf8"));
for (const [name, english, marker] of genasi) results.push(page({ file: "元素裔.md", name, english, raw: section(genasiRaw, marker), locator: `**${marker} ${english} Traits。**` }));
for (const candidate of results) writableCandidate({ ...candidate, options });

const indexTitle = "多元宇宙種族索引 (MPMM 2014 Legacy)";
const indexContent = `${frontmatter({ publicationId, publication, kind: "species-index", concept: "mordenkainen-species-index", title: indexTitle, category: "種族", tag: "種族_索引", source: sourceOf(path.join(ROOT, profile.source_root, "第一章：奇幻種族.md")), locator: "第一章：奇幻種族" })}\n\n# ${indexTitle}\n\n> 收錄《魔鄧肯鉅獻：多元宇宙的怪物》的種族選項。以下均為 2014 Legacy 規則；本索引優先列出尚無 2024 現行取代條目的選項。\n\n## 種族選項\n\n${results.map(({ destination }) => { const n = path.basename(destination, ".md"); const e = [...species, ...replaced, ...genasi.map(([name, english]) => [null, name, english])].find((item) => item[1] === n)?.[2] ?? ""; return `- [[種族/2014/多元宇宙種族/${n}|${n} (${e}，2014 Legacy)]]`; }).join("\n")}\n\n## 🔗 相關連結\n\n- [[種族/2014/種族索引|2014 種族索引 (2014 Species Index)]]\n`;
writableCandidate({ destination: path.join(outputRoot, "多元宇宙種族索引.md"), content: indexContent, options });
console.log(`MPMM 2022 種族：${results.length} 項。`);
