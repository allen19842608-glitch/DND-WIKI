import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const publicationId = options.publicationId ?? "TCE2020";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root, profile.inputs.character_options);
const rulesRoot = path.join(ROOT, profile.outputs.rules, "角色建立與成長", "塔莎的萬事坩堝");
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";

function convert(text) {
  if (!fs.existsSync(openccRoot)) throw new Error(`找不到 OpenCC：${openccRoot}`);
  return execFileSync(python, ["-c", program, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎").replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師");
}
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function heading(text, fallback) { return text.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback; }
function body(text) { return text.replace(/^#\s+.+(?:\r?\n|$)/, "").trim().replace(/^#\s+/gm, "## "); }
function safe(name) { return name.replace(/[\\/:*?\"<>|]/g, "-").trim(); }
function page({ sourcePath, title, directory, intro, category = "規則機制", tag = "規則_角色建立與成長" }) {
  const raw = convert(fs.readFileSync(sourcePath, "utf8"));
  const source = sourceOf(sourcePath);
  const content = `${frontmatter({ publicationId, publication, kind: "rule", concept: title, title: `${title} (TCE 2014 Legacy)`, category, tag, source, locator: `# ${heading(raw, title)}` })}\n\n# ${title}\n\n> [!WARNING]\n> 本頁整理《塔莎的萬事坩堝》的 2014 舊版可選規則；是否採用由 DM 與玩家在建立角色或取得特性時共同決定。\n\n${intro ? `${intro}\n\n` : ""}## ⚙️ 規則條文 (Rule Text)\n\n${body(raw)}\n\n## 🔗 相關連結\n\n- [[規則索引|規則索引 (Rules Index)]]\n`;
  return { destination: path.join(directory, `${safe(title)}.md`), content };
}

const files = [
  ["角色選項.md", "角色選項", rulesRoot, "本書提供的角色建立、職業與專長選項總覽。"],
  ["定製角色.md", "定製角色", rulesRoot, "本頁提供 2014 種族出身、熟練與子職調整的可選規則。"],
  ["職業/吟遊詩人（TCE）.md", "吟遊詩人可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 吟遊詩人的額外與替換職業特性。"],
  ["職業/德魯伊（TCE）.md", "德魯伊可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 德魯伊的額外與替換職業特性。"],
  ["職業/戰士（TCE）.md", "戰士可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 戰士的額外與替換職業特性。"],
  ["職業/武僧（TCE）.md", "武僧可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 武僧的額外與替換職業特性。"],
  ["職業/法師（TCE）.md", "法師可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 法師的額外與替換職業特性。"],
  ["職業/牧師（TCE）.md", "牧師可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 牧師的額外與替換職業特性。"],
  ["職業/聖武士（TCE）.md", "聖騎士可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 聖騎士的額外與替換職業特性。"],
  ["職業/術士（TCE）.md", "術士可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 術士的額外與替換職業特性。"],
  ["職業/遊俠（TCE）.md", "遊俠可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 遊俠的額外與替換職業特性。"],
  ["職業/遊蕩者（TCE）.md", "遊蕩者可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 遊蕩者的額外與替換職業特性。"],
  ["職業/邪術師（TCE）.md", "契術師可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 契術師的額外與替換職業特性。"],
  ["職業/野蠻人（TCE）.md", "野蠻人可選職業特性", path.join(rulesRoot, "職業選項"), "適用於 2014 野蠻人的額外與替換職業特性。"],
  ["職業/奇械師/奇械師注法.md", "奇械師注法", path.join(rulesRoot, "奇械師"), "奇械師可選用的注法清單與其物品效果。"],
  ["職業/奇械師/奇械師法術列表.md", "奇械師法術列表", path.join(rulesRoot, "奇械師"), "2014 奇械師可準備與施展的法術清單。"],
  ["職業/戰士（TCE）/戰技選項.md", "戰技選項", path.join(rulesRoot, "戰士"), "戰鬥大師、戰技專家與相關特性可選用的追加戰技。"],
  ["職業/戰士（TCE）/戰鬥大師構築.md", "戰鬥大師構築", path.join(rulesRoot, "戰士"), "戰鬥大師的主題構築建議，屬角色扮演與選擇導覽而非新增規則。"],
  ["職業/邪術師（TCE）/魔能祈喚.md", "魔能祈喚選項", path.join(rulesRoot, "契術師"), "2014 契術師可選用的追加魔能祈喚。"],
  ["職業/遊俠（TCE）/馴獸師夥伴.md", "馴獸師夥伴", path.join(rulesRoot, "遊俠"), "馴獸師的原初夥伴替換特性與三種夥伴數據。"],
];

let count = 0;
for (const [relative, title, directory, intro] of files) {
  const candidate = page({ sourcePath: path.join(sourceRoot, relative), title, directory, intro });
  writableCandidate({ ...candidate, options }); count += 1;
}

const lineagePath = path.join(sourceRoot, "定製血統.md");
const lineageSource = sourceOf(lineagePath);
const lineage = `${frontmatter({ publicationId, publication, kind: "species", concept: "Custom Lineage", title: "定製血統 (Custom Lineage，2014 Legacy)", category: "種族", tag: "種族_定製血統", source: lineageSource, locator: "邊欄：定製血統 Custom Lineage" })}\n\n# 定製血統 (Custom Lineage，2014 Legacy)\n\n> [!WARNING]\n> 本條目為《塔莎的萬事坩堝》提供的 2014 舊版可選角色起源規則；採用與否由 DM 決定，不是 2024 種族規則的替代頁。\n\n## ⚙️ 規則條文 (Rule Text)\n\n> [!IMPORTANT]\n> **種族摘要**：以自訂外觀與一組固定的基礎特質建立角色血統，並不視為任何既有種族。\n\n### 基本資料\n\n| 生物類型 | 體型 | 速度 | 其他速度 |\n| :--- | :--- | :--- | :--- |\n| 類人 | 小型或中型 | 30 呎 | 無 |\n\n### 種族特質 (Species Traits)\n\n#### 專長 (Feat)\n\n- **取得／觸發**：建立 1 級角色時。\n- **效果**：獲得一項你符合先決條件的自選專長。\n\n#### 屬性值提升 (Ability Score Increase)\n\n- **取得／觸發**：建立 1 級角色時。\n- **效果**：選擇一項屬性值增加 2。\n\n#### 可選特性 (Variable Trait)\n\n- **取得／觸發**：建立 1 級角色時，二選一。\n- **效果**：\n  - **黑暗視覺**：獲得 60 呎黑暗視覺。\n  - **技能熟練**：獲得一項自選技能熟練。\n\n#### 語言 (Language)\n\n- **效果**：你可以說、讀、寫通用語與一門你和 DM 認為合適的語言。\n\n### 適用範圍\n\n- **血統判定**：在要求特定種族（如精靈或矮人）的遊戲特性中，你視為「定製血統」，而非該特定種族。\n\n## 🔗 相關連結\n\n- [[種族/2014/種族索引|2014 種族索引 (2014 Species Index)]]\n- [[定製角色|定製角色 (Customizing Your Origin)]]\n`;
writableCandidate({ destination: path.join(ROOT, "wiki", "種族", "2014", "定製血統.md"), content: lineage, options }); count += 1;
console.log(`TCE 角色選項：${count} 頁。`);
