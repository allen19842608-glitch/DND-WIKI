import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, frontmatter, loadPublication, today } from "./ingest-publication-utils.mjs";

const publicationId = "EBER2025";
const publication = loadPublication(publicationId);
const sourceRoot = path.join(ROOT, "原始資料", "艾伯倫：奇械鍛爐", "第二章");

function sourceOf(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

function write(destination, content) {
  if (fs.existsSync(destination) && fs.readFileSync(destination, "utf8") === content) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.writeFileSync(destination, content, "utf8");
      break;
    } catch (error) {
      if (attempt === 4 || !["EBUSY", "EPERM", "UNKNOWN"].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100 * (attempt + 1));
    }
  }
  console.log(`匯入：${path.relative(ROOT, destination)}`);
}

function replaceSection(text, heading, body, before = "## 🔗 相關連結") {
  const section = `## ${heading}\n\n${body.trim()}\n`;
  const expression = new RegExp(`\\n## ${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?(?=\\n## |$)`, "g");
  const withoutPrevious = text.replace(expression, "");
  return withoutPrevious.replace(`\n${before}`, `\n\n${section}\n${before}`);
}

function restoreCoreIndexIfOverwritten(relativePath) {
  const destination = path.join(ROOT, relativePath);
  const current = fs.readFileSync(destination, "utf8");
  if (!current.includes('entity_id: "entry:EBER2025:feat-index:')) return current;
  return execFileSync("git", ["show", `HEAD:${relativePath.replaceAll(path.sep, "/")}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function walkMarkdown(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const location = path.join(directory, item.name);
    if (item.isDirectory()) return walkMarkdown(location);
    return item.isFile() && item.name.endsWith(".md") ? [location] : [];
  });
}

const spellLinks = new Map();
for (const spellPath of walkMarkdown(path.join(ROOT, "wiki", "法術"))) {
  if (spellPath.includes(`${path.sep}2014${path.sep}`) || spellPath.endsWith("索引.md")) continue;
  const title = fs.readFileSync(spellPath, "utf8").match(/^title:\s*"(.+?)"$/m)?.[1];
  const match = title?.match(/^(.+?) \((.+)\)$/);
  if (!match) continue;
  spellLinks.set(match[2].toLowerCase(), {
    target: path.relative(path.join(ROOT, "wiki"), spellPath).replace(/\\/g, "/").replace(/\.md$/, ""),
    title: `${match[1]} (${match[2]})`,
  });
}

const spellEnglishAliases = new Map([
  ["conjure minor elemental", "conjure minor elementals"],
]);

function linkDragonmarkSpellTables(text) {
  const linked = text.replace(/^(\|\s*[一二三四五]環\s*\|\s*)_(.*?)_(\s*\|)$/gm, (whole, prefix, spells, suffix) => {
    const linked = spells.split("，").map((entry) => {
      const match = entry.trim().match(/^(.+?)\s+([A-Za-z][A-Za-z'’\- ]+)$/);
      if (!match) return `_${entry.trim()}_`;
      const english = match[2].toLowerCase();
      const spell = spellLinks.get(spellEnglishAliases.get(english) ?? english);
      return spell ? `[[${spell.target}\\|${spell.title}]]` : `_${entry.trim()}_`;
    }).join("、");
    return `${prefix}${linked}${suffix}`;
  });
  return linked.replace(/(\*\*[^*\n]+ Spells\*\*)\n(\| \*\*法術環階\*\* \| \*\*法術\*\* \|)/g, "$1\n\n$2");
}

const backgrounds = [];
for (const item of fs.readdirSync(path.join(sourceRoot, "背景"), { withFileTypes: true })) {
  if (!item.isFile() || !item.name.endsWith(".md")) continue;
  const file = path.join(sourceRoot, "背景", item.name);
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const title = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, "").trim();
  const values = Object.fromEntries(["屬性值", "專長", "技能熟練", "工具熟練", "裝備"].map((label) => [label, lines.find((line) => line.startsWith(`**${label}：**`))?.replace(`**${label}：**`, "").trim()]));
  if (!title || !values.屬性值 || !values.專長) continue;
  const narrative = lines.slice(lines.findIndex((line) => line.startsWith("**裝備：**")) + 1).filter((line) => line.trim()).join(" ");
  const source = sourceOf(file);
  const page = `${frontmatter({ publicationId, publication, kind: "background", concept: title, title, category: "背景", tag: `背景_${title}`, source, locator: `標題：${title}` })}\n\n# ${title}\n\n## 規則條文\n\n- **屬性值**：${values.屬性值}\n- **專長**：${values.專長}\n- **技能熟練**：${values.技能熟練 ?? "依來源確認"}\n- **工具熟練**：${values.工具熟練 ?? "依來源確認"}\n- **裝備**：${values.裝備 ?? "依來源確認"}\n\n## 背景描述\n\n${narrative || "依可定位來源確認。"}\n\n## 🔗 相關連結\n\n- [[背景索引|背景索引 (Background Index)]]\n`;
  write(path.join(ROOT, "wiki", "背景", `${title}.md`), page);
  backgrounds.push(title);
}

const featSources = [
  { file: "龍紋專長.md", directory: "龍紋專長", label: "起源專長（龍紋）", tag: "專長_起源", index: "龍紋專長索引", createIndex: true },
  { file: "通用專長.md", directory: "通用專長", tag: "專長_通用", index: "通用專長索引" },
  { file: "傳奇恩惠.md", directory: "史詩恩賜專長", tag: "專長_史詩恩賜", index: "史詩恩賜專長索引" },
];
const feats = [];
for (const descriptor of featSources) {
  const file = path.join(sourceRoot, descriptor.file);
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = line.match(/^\*\*([^*]+?)\s+([A-Za-z][A-Za-z '\-]+)\*\*/);
    const isFeat = lines.slice(index + 1, index + 4).some((candidate) => /^_.*專長/.test(candidate.trim()));
    return match && isFeat ? [{ index, chinese: match[1].trim(), english: match[2].trim() }] : [];
  });
for (const [index, feat] of headings.entries()) {
    const body = lines.slice(feat.index + 1, headings[index + 1]?.index ?? lines.length).filter((line) => line.trim());
    const prerequisite = body.find((line) => /^_.*先決/.test(line))?.replace(/^_|_$/g, "").replace(/^.+?（先決：?/, "").replace(/[）)]$/, "") ?? "無";
    const content = linkDragonmarkSpellTables(body.filter((line) => !/^_.*先決/.test(line)).join("\n"));
    const source = sourceOf(file);
    const dragonmarkIndexLink = descriptor.directory === "龍紋專長" ? "" : "- [[專長/龍紋專長/龍紋專長索引|龍紋專長索引 (Dragonmark Feats Index)]]\n";
    const page = `${frontmatter({ publicationId, publication, kind: "feat", concept: feat.english, title: `${feat.chinese} (${feat.english})`, category: "專長", tag: descriptor.tag, source, locator: `標題：${feat.chinese}` })}\n\n# ${feat.chinese} (${feat.english})\n\n- **前置條件 (Prerequisite)**：${prerequisite}\n\n## 🌟 專長效果描述\n\n${content}\n\n## 🔗 相關連結\n\n- [[${descriptor.index}|${descriptor.index}]]\n${dragonmarkIndexLink}- [[專長索引|專長索引 (Feats Index)]]\n`;
    write(path.join(ROOT, "wiki", "專長", descriptor.directory, `${feat.chinese}.md`), page);
    feats.push({ ...feat, ...descriptor });
  }
}

const featByName = new Map(feats.map((feat) => [feat.chinese, feat]));
const existingOriginFeats = new Map([
  ["幸運", { target: "專長/起源專長/幸運", title: "幸運 (Lucky)" }],
  ["警戒", { target: "專長/起源專長/警覺", title: "警覺 (Alert)" }],
  ["熟習", { target: "專長/起源專長/技巧嫻熟", title: "技巧嫻熟 (Skilled)" }],
]);

function addRelatedLink(destination, link) {
  let text = fs.readFileSync(destination, "utf8");
  if (text.includes(link)) return;
  text = text.replace("## 🔗 相關連結\n\n", `## 🔗 相關連結\n\n- ${link}\n`);
  write(destination, text);
}

const baseDragonmarks = feats.filter((feat) => feat.directory === "龍紋專長");
for (const base of baseDragonmarks) {
  const advanced = feats.find((feat) => feat.directory === "通用專長" && feat.chinese === `高等${base.chinese}`);
  const basePath = path.join(ROOT, "wiki", "專長", "龍紋專長", `${base.chinese}.md`);
  if (advanced) {
    const advancedPath = path.join(ROOT, "wiki", "專長", "通用專長", `${advanced.chinese}.md`);
    addRelatedLink(basePath, `[[專長/通用專長/${advanced.chinese}|${advanced.chinese} (${advanced.english})]]`);
    addRelatedLink(advancedPath, `[[專長/龍紋專長/${base.chinese}|${base.chinese} (${base.english})]]`);
  }
  const potent = feats.find((feat) => feat.directory === "通用專長" && feat.chinese === "強效龍紋");
  if (potent) {
    const potentPath = path.join(ROOT, "wiki", "專長", "通用專長", `${potent.chinese}.md`);
    addRelatedLink(basePath, `[[專長/通用專長/${potent.chinese}|${potent.chinese} (${potent.english})]]`);
    addRelatedLink(potentPath, `[[專長/龍紋專長/${base.chinese}|${base.chinese} (${base.english})]]`);
  }
}

for (const background of backgrounds) {
  const backgroundPath = path.join(ROOT, "wiki", "背景", `${background}.md`);
  let backgroundText = fs.readFileSync(backgroundPath, "utf8");
  backgroundText = backgroundText.replace(/(\*\*專長\*\*：)([^\n]+)/, (whole, label, value) => {
    const feat = [...featByName.values()].find((item) => value.startsWith(item.chinese));
    if (feat) {
      const link = `[[專長/${feat.directory}/${feat.chinese}|${feat.chinese} (${feat.english})]]`;
      return `${label}${value.replace(feat.chinese, link)}`;
    }
    const existing = [...existingOriginFeats.entries()].find(([name]) => value.startsWith(name));
    if (!existing) return whole;
    const [sourceName, target] = existing;
    return `${label}[[${target.target}|${target.title}]]${value.slice(sourceName.length)}`;
  });
  write(backgroundPath, backgroundText);
}

const backgroundIndex = path.join(ROOT, "wiki", "背景", "背景索引.md");
let backgroundText = fs.readFileSync(backgroundIndex, "utf8");
const backgroundLinks = `> 龍紋背景授予的龍紋專長，等同於角色建立時選擇的起源專長，並取代標準起源專長。\n\n${backgrounds.sort((a, b) => a.localeCompare(b, "zh-Hant")).map((name) => `- [[${name}|${name}]]`).join("\n")}`;
backgroundText = replaceSection(backgroundText, "艾伯倫：奇械鍛爐背景", backgroundLinks);
write(backgroundIndex, backgroundText);

const featIndex = path.join(ROOT, "wiki", "專長", "專長索引.md");
let featText = fs.readFileSync(featIndex, "utf8");
const featGroups = featSources.map((descriptor) => {
  const entries = feats.filter((feat) => feat.directory === descriptor.directory).map((feat) => `[[專長/${descriptor.directory}/${feat.chinese}|${feat.chinese} (${feat.english})]]`).join(" · ");
  return `### ${descriptor.label ?? descriptor.directory}\n\n${entries}`;
}).join("\n\n");
featText = replaceSection(featText, "艾伯倫：奇械鍛爐專長", featGroups);
write(featIndex, featText);

for (const descriptor of featSources) {
  if (!descriptor.createIndex) continue;
  const entries = descriptor.directory === "龍紋專長" ? "" : feats.filter((feat) => feat.directory === descriptor.directory).map((feat) => `- [[${feat.chinese}|${feat.chinese} (${feat.english})]]`).join("\n");
  const source = sourceOf(path.join(sourceRoot, descriptor.file));
  const originIndexLink = descriptor.tag === "專長_起源" ? "\n- [[專長/起源專長/起源專長索引|起源專長索引 (Origin Feats Index)]]" : "";
  const originGuidance = descriptor.directory === "龍紋專長"
    ? `
> 龍紋專長是《艾伯倫：奇械鍛爐》的起源專長。先從下列家族／背景對照選擇角色起源；若角色後來才顯現龍紋，則於可自由選擇專長時取得。

## 取得與限制

| 建立方式 | 適用情況 | 取得時機 |
| :--- | :--- | :--- |
| **家族龍紋後裔** | 角色與十二家族之一有血緣或正式關係。 | 選擇該家族後裔背景；1 級取得對應龍紋專長，並取代標準起源專長。 |
| **遠親支脈** | 與常見血脈相符，但不受家族束縛。 | 4 級或更高等級時選擇對應龍紋專長。 |
| **預言龍紋** | 龍紋不屬於家族血脈；任何種族都可顯現。 | 4 級或更高等級選擇；也可選家族背景或異種後裔背景，經 DM 批准調整背景熟練項。 |
| **異種龍紋** | 與十二家族無關的罕見龍紋。 | 選擇異種後裔背景，或於 4 級或更高等級選擇異種龍紋。 |

- **專長限制**：每項龍紋專長的前置條件均為「艾伯倫戰役」與「不具有其他龍紋專長」，因此角色通常只能持有一項基本龍紋專長。
- **施法規則**：龍紋授予的法術可使用角色持有的適當法術位施展；授予的儀式法術依 2024 規則可作為儀式施展。

## 十二家族與異種龍紋

| 家族／組織 | 基本龍紋專長 | 對應背景 |
| :--- | :--- | :--- |
| 伽藍達家族 | [[專長/龍紋專長/招待龍紋\\|招待龍紋 (Mark of Hospitality)]] | [[背景/伽藍達家族後裔\\|伽藍達家族後裔]] |
| 喬拉斯科家族 | [[專長/龍紋專長/醫療龍紋\\|醫療龍紋 (Mark of Healing)]] | [[背景/喬拉斯科家族後裔\\|喬拉斯科家族後裔]] |
| 坎尼斯家族 | [[專長/龍紋專長/創造龍紋\\|創造龍紋 (Mark of Making)]] | [[背景/坎尼斯家族後裔\\|坎尼斯家族後裔]] |
| 昆達拉克家族 | [[專長/龍紋專長/守禦龍紋\\|守禦龍紋 (Mark of Warding)]] | [[背景/昆達拉克家族後裔\\|昆達拉克家族後裔]] |
| 梅丹尼家族 | [[專長/龍紋專長/偵測龍紋\\|偵測龍紋 (Mark of Detection)]] | [[背景/梅丹尼家族後裔\\|梅丹尼家族後裔]] |
| 歐瑞恩家族 | [[專長/龍紋專長/通行龍紋\\|通行龍紋 (Mark of Passage)]] | [[背景/歐瑞恩家族後裔\\|歐瑞恩家族後裔]] |
| 瓦達利斯家族 | [[專長/龍紋專長/畜牧龍紋\\|畜牧龍紋 (Mark of Handling)]] | [[背景/瓦達利斯家族後裔\\|瓦達利斯家族後裔]] |
| 薩拉釋克家族 | [[專長/龍紋專長/探尋龍紋\\|探尋龍紋 (Mark of Finding)]] | [[背景/薩拉釋克家族後裔\\|薩拉釋克家族後裔]] |
| 西維斯家族 | [[專長/龍紋專長/抄錄龍紋\\|抄錄龍紋 (Mark of Scribing)]] | [[背景/西維斯家族後裔\\|西維斯家族後裔]] |
| 費亞蘭家族 | [[專長/龍紋專長/陰影龍紋\\|陰影龍紋 (Mark of Shadow)]] | [[背景/費亞蘭家族後裔\\|費亞蘭家族後裔]] |
| 蘇蘭尼家族 | [[專長/龍紋專長/陰影龍紋\\|陰影龍紋 (Mark of Shadow)]] | [[背景/蘇蘭尼家族後裔\\|蘇蘭尼家族後裔]] |
| 鄧內斯家族 | [[專長/龍紋專長/哨戒龍紋\\|哨戒龍紋 (Mark of Sentinel)]] | [[背景/鄧內斯家族後裔\\|鄧內斯家族後裔]] |
| 黎蘭達家族 | [[專長/龍紋專長/暴風龍紋\\|暴風龍紋 (Mark of Storm)]] | [[背景/黎蘭達家族後裔\\|黎蘭達家族後裔]] |
| 塔卡南家族 | [[專長/龍紋專長/異種龍紋\\|異種龍紋 (Aberrant Dragonmark)]] | [[背景/異種後裔\\|異種後裔]] |

> 表中的十二家族包含共用陰影龍紋的費亞蘭家族與蘇蘭尼家族；塔卡南家族與異種龍紋另列，並非十二家族之一。

## 龍紋成長路徑

角色達 4 級後，可用通用專長讓既有龍紋成長。每個「高等龍紋」都要求其同名基本龍紋；「強效龍紋」則可套用於任意龍紋。

| 基本龍紋 | 對應通用專長 |
| :--- | :--- |
| 異種龍紋 | [[專長/通用專長/高等異種龍紋\\|高等異種龍紋 (Greater Aberrant Mark)]] |
| 偵測龍紋 | [[專長/通用專長/高等偵測龍紋\\|高等偵測龍紋 (Greater Mark of Detection)]] |
| 探尋龍紋 | [[專長/通用專長/高等探尋龍紋\\|高等探尋龍紋 (Greater Mark of Finding)]] |
| 畜牧龍紋 | [[專長/通用專長/高等畜牧龍紋\\|高等畜牧龍紋 (Greater Mark of Handling)]] |
| 醫療龍紋 | [[專長/通用專長/高等醫療龍紋\\|高等醫療龍紋 (Greater Mark of Healing)]] |
| 招待龍紋 | [[專長/通用專長/高等招待龍紋\\|高等招待龍紋 (Greater Mark of Hospitality)]] |
| 創造龍紋 | [[專長/通用專長/高等創造龍紋\\|高等創造龍紋 (Greater Mark of Making)]] |
| 通行龍紋 | [[專長/通用專長/高等通行龍紋\\|高等通行龍紋 (Greater Mark of Passage)]] |
| 抄錄龍紋 | [[專長/通用專長/高等抄錄龍紋\\|高等抄錄龍紋 (Greater Mark of Scribing)]] |
| 哨戒龍紋 | [[專長/通用專長/高等哨戒龍紋\\|高等哨戒龍紋 (Greater Mark of Sentinel)]] |
| 陰影龍紋 | [[專長/通用專長/高等陰影龍紋\\|高等陰影龍紋 (Greater Mark of Shadow)]] |
| 暴風龍紋 | [[專長/通用專長/高等暴風龍紋\\|高等暴風龍紋 (Greater Mark of Storm)]] |
| 守禦龍紋 | [[專長/通用專長/高等守禦龍紋\\|高等守禦龍紋 (Greater Mark of Warding)]] |
| 任意龍紋 | [[專長/通用專長/強效龍紋\\|強效龍紋 (Potent Dragonmark)]] |

## 西伯瑞斯龍紋

[[專長/史詩恩賜專長/西伯瑞斯之恩惠\\|西伯瑞斯之恩惠 (Boon of Siberys)]] 是 19 級可選的史詩恩賜，能代表西伯瑞斯龍紋或強大的異種龍紋；它不要求角色先持有基本龍紋。此恩惠可讓角色準備並在休息後恢復一次施展所選高環術士法術或西伯瑞斯龍紋表法術的能力。
`
    : "";
  const progressionLinks = "";
  const header = frontmatter({ publicationId, publication, kind: "feat-index", concept: descriptor.directory, title: `${descriptor.index}`, category: "專長", tag: descriptor.tag, source, locator: `標題：${descriptor.directory}` });
  const sourcedHeader = descriptor.directory === "龍紋專長"
    ? header.replace('source_type: "official"', `  - file: "原始資料/艾伯倫：奇械鍛爐/第二章/龍紋.md"\n    locator: "標題：龍紋；角色起源選項、取得限制與更新要點"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"`)
    : header;
  const content = `${sourcedHeader}\n\n# ${descriptor.index}\n\n${entries}${originGuidance}${progressionLinks}\n\n## 🔗 相關連結\n\n- [[專長索引|專長索引 (Feats Index)]]${originIndexLink}\n`;
  write(path.join(ROOT, "wiki", "專長", descriptor.directory, `${descriptor.index}.md`), content);
}

for (const descriptor of featSources.filter((item) => !item.createIndex)) {
  const indexPath = path.join(ROOT, "wiki", "專長", descriptor.directory, `${descriptor.index}.md`);
  let indexText = restoreCoreIndexIfOverwritten(path.relative(ROOT, indexPath));
  const entries = feats
    .filter((feat) => feat.directory === descriptor.directory)
    .map((feat) => `- [[${feat.chinese}|${feat.chinese} (${feat.english})]]`)
    .join("\n");
  const anchor = indexText.includes("## 🔗 相關連結") ? "## 🔗 相關連結" : "## 相關連結";
  indexText = replaceSection(indexText, "艾伯倫：奇械鍛爐", entries, anchor);
  write(indexPath, indexText);
}

console.log(`完成：${backgrounds.length} 個背景、${feats.length} 個專長（${today()}）。`);
