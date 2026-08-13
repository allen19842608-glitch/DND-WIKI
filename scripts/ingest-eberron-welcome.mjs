import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadPublication } from "./ingest-publication-utils.mjs";

const publicationId = "ERLW2019";
const publication = loadPublication(publicationId);
const sourceRoot = path.join(ROOT, "原始資料", "艾伯倫：從終末戰爭中崛起", "歡迎來到艾伯倫");
const eberronRoot = path.join(ROOT, "wiki", "戰役設定", "艾伯倫");
const worldviewRoot = path.join(eberronRoot, "世界觀");
const sourcePrefix = "原始資料/艾伯倫：從終末戰爭中崛起/歡迎來到艾伯倫";

const entries = [
  ["艾伯倫概覽", "Welcome to Eberron", "歡迎來到艾伯倫.md", "艾伯倫的核心主題、冒險基調與世界理解方式。"],
  ["艾伯倫歷史", "History of Eberron", "艾伯倫歷史.md", "創世神話、古代文明、五國與《王座堡條約》的背景。"],
  ["科瓦雷的生活", "Life in Khorvaire", "科瓦雷的生活.md", "語言、命名、社會日常與科瓦雷文化脈絡。"],
  ["魔法世界", "A World of Magic", "魔法世界.md", "魔匠師、龍紋家族與魔法服務如何塑造日常生活。"],
  ["巨龍預言", "The Draconic Prophecy", "巨龍預言.md", "關於可能未來、解讀者與冒險鉤子的設定資料。"],
  ["通俗冒險", "Pulp Adventure", "通俗冒險.md", "高風險、非凡英雄與宿敵式反派的冒險基調。"],
  ["黑色陰謀", "Noir Intrigue", "黑色陰謀.md", "遺憾、債務、灰色地帶與可失之物的黑色電影風格。"],
];

function sourcePath(file) {
  return `${sourcePrefix}/${file}`;
}

function sourceText(file) {
  return fs.readFileSync(path.join(sourceRoot, file), "utf8");
}

function quoteBlock(text, title) {
  return `> [!QUOTE]- ${title}\n>\n${text.trim().split(/\r?\n/).map((line) => `> ${line.replace(/^\*\*|\*\*$/g, "")}`).join("\n")}`;
}

function normalize(file) {
  let text = sourceText(file).replace(/^#\s+[^\n]+\r?\n+/, "");
  if (file === "歡迎來到艾伯倫.md") {
    const intro = text.match(/^([\s\S]*?)\r?\n\r?\n艾伯倫擁有/);
    if (intro) text = `${quoteBlock(intro[1], "冒險剪影")}\n\n艾伯倫擁有${text.slice(intro[0].indexOf("艾伯倫擁有") + "艾伯倫擁有".length)}`;
    text = text.replace(/### 使用這本書[\s\S]*?(?=### 該瞭解的七件事)/, "");
    text = text.replace(/\*\*不一樣的 D&D D&D with a Twist。?《\*\*\s*玩家手冊/, "**不一樣的 D&D D&D with a Twist。**《玩家手冊");
  }
  if (file === "黑色陰謀.md") {
    text = text.replace(/^\*\*你為什麼需要200金幣 Why Do You Need 200 Gold Pieces\?\*\*\r?\n\*\*([^\r\n]+)\*\*/m, "### 你為什麼需要 200 金幣 Why Do You Need 200 Gold Pieces?\n\n$1");
  }
  return text
    .replace(/^###\s+/gm, "## ")
    .replace(/^####\s+/gm, "### ")
    .replace(/^#####\s+/gm, "#### ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function write(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log(`匯入：${path.relative(ROOT, target)}`);
}

function relatedLinks() {
  return "- [[戰役設定/艾伯倫/世界觀/艾伯倫世界觀索引|艾伯倫世界觀索引 (Eberron Worldbuilding Index)]]";
}

for (const [title, english, source, summary] of entries) {
  const content = `${frontmatter({ publicationId, publication, kind: "setting", concept: title, title: `${title} (${english})`, category: "戰役設定", tag: "戰役設定_艾伯倫", source: sourcePath(source), locator: `標題：${path.basename(source, ".md")}` })}

# ${title} (${english})

${summary}

${normalize(source)}

## 🔗 相關連結

${relatedLinks()}
`;
  write(path.join(worldviewRoot, `${title}.md`), content);
}

const indexLinks = entries.map(([title, english, _source, summary]) => `- [[${title}|${title} (${english})]]：${summary}`).join("\n");
const indexContent = `${frontmatter({ publicationId, publication, kind: "setting-index", concept: "eberron-worldbuilding", title: "艾伯倫世界觀索引 (Eberron Worldbuilding Index)", category: "戰役設定", tag: "戰役設定_艾伯倫", source: sourcePath("歡迎來到艾伯倫.md"), locator: "標題：歡迎來到艾伯倫" })}

# 艾伯倫世界觀索引 (Eberron Worldbuilding Index)

此索引依世界觀主題導覽《艾伯倫：從終末戰爭中崛起》的序章設定；不以原始章節編號分類。

## 世界與冒險基調

${indexLinks}

## 延伸設定

- [[戰役設定/艾伯倫/科瓦雷/科瓦雷索引|科瓦雷 (Khorvaire)]]
- [[戰役設定/艾伯倫/信仰/信仰索引|科瓦雷的信仰 (Faiths of Khorvaire)]]
- [[戰役設定/艾伯倫/薩恩/薩恩索引|薩恩 (Sharn, City of Towers)]]
- [[戰役設定/艾伯倫/冒險與勢力/冒險與勢力索引|冒險與勢力索引 (Adventure and Factions Index)]]
- [[戰役設定/艾伯倫/冒險與勢力/終末戰爭|終末戰爭 (Last War)]]

## 🔗 相關連結

- [[戰役設定/艾伯倫/艾伯倫索引|艾伯倫索引 (Eberron Index)]]
`;
write(path.join(worldviewRoot, "艾伯倫世界觀索引.md"), indexContent);

const rootPath = path.join(eberronRoot, "艾伯倫索引.md");
let root = fs.readFileSync(rootPath, "utf8");
const sourceRecord = `  - file: "${sourcePath("歡迎來到艾伯倫.md")}"\n    locator: "標題：歡迎來到艾伯倫"\n    authority: "官方"\n    translation: "community"\n`;
if (!root.includes(sourcePath("歡迎來到艾伯倫.md"))) root = root.replace("source_type:", `${sourceRecord}source_type:`);
const section = "## 世界觀與冒險基調\n\n- [[戰役設定/艾伯倫/世界觀/艾伯倫世界觀索引|艾伯倫世界觀索引 (Eberron Worldbuilding Index)]]：歷史、日常生活、魔法、巨龍預言與冒險風格。\n\n";
if (!root.includes("艾伯倫世界觀索引")) root = root.replace("## 地理與文化", `${section}## 地理與文化`);
fs.writeFileSync(rootPath, root, "utf8");
console.log(`更新：${path.relative(ROOT, rootPath)}`);

const warPath = path.join(eberronRoot, "冒險與勢力", "終末戰爭.md");
let war = fs.readFileSync(warPath, "utf8");
const warSource = sourcePath("終末戰爭.md");
const warRecord = `  - file: "${warSource}"\n    locator: "標題：終末戰爭"\n    authority: "官方"\n    translation: "community"\n`;
if (!war.includes(warSource)) war = war.replace("source_type:", `${warRecord}source_type:`);
const warHeading = "## 終末戰爭概覽";
const warAddition = `${warHeading}\n\n${normalize("終末戰爭.md")}\n\n`;
if (!war.includes(warHeading)) war = war.replace("## 🔗 相關連結", `${warAddition}## 🔗 相關連結`);
const worldviewIndex = "- [[戰役設定/艾伯倫/世界觀/艾伯倫世界觀索引|艾伯倫世界觀索引 (Eberron Worldbuilding Index)]]";
if (!war.includes("|艾伯倫世界觀索引")) war = war.replace("## 🔗 相關連結", `## 🔗 相關連結\n\n${worldviewIndex}`);
fs.writeFileSync(warPath, war, "utf8");
console.log(`更新：${path.relative(ROOT, warPath)}`);
