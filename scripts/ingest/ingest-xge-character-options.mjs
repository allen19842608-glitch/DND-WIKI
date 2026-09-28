import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT, applyCandidateBatch, candidateChange, loadIngestProfile, loadPublication, parseOptions, planCandidateBatch, today,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const publicationId = "XGE2017";
const publication = loadPublication(publicationId);
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root, profile.inputs.character_options);
const outputRoot = path.join(ROOT, profile.outputs.classes);
const sourceBook = "原始資料/珊娜薩的萬事指南";
const sourcePdf = `${sourceBook}/Xanathars_Guide_to_Everything.pdf`;
const converterRoot = process.env.XGE_OPENCC_PATH ?? "C:\\Users\\Owner\\AppData\\Local\\Temp\\dnd-wiki-xge-opencc";
const python = process.env.XGE_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const openccProgram = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const pending = [];
const staged = new Map();

const classes = new Map([
  ["野蠻人", ["野蠻人", "Barbarian"]], ["吟遊詩人", ["吟遊詩人", "Bard"]],
  ["牧師", ["牧師", "Cleric"]], ["德魯伊", ["德魯伊", "Druid"]], ["戰士", ["戰士", "Fighter"]],
  ["武僧", ["武僧", "Monk"]], ["聖武士", ["聖騎士", "Paladin"]], ["遊俠", ["遊俠", "Ranger"]],
  ["遊蕩者", ["遊蕩者", "Rogue"]], ["術士", ["術士", "Sorcerer"]], ["邪術師", ["契術師", "Warlock"]],
  ["法師", ["法師", "Wizard"]],
]);
const nonSubclassFiles = new Set(["魔能祈喚.md", "學習野獸形態.md"]);
const titleOverrides = new Map([
  ["夢境結社.md", { chinese: "夢境結社", english: "Circle of Dreams" }],
]);

function traditional(text) {
  if (!fs.existsSync(converterRoot)) throw new Error(`找不到 OpenCC：${converterRoot}。請設定 XGE_OPENCC_PATH。`);
  return execFileSync(python, ["-c", openccProgram, converterRoot], { input: text, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

function read(file) {
  return traditional(fs.readFileSync(file, "utf8"))
    .replace(/(\d+)\s*尺/g, "$1 呎")
    .replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replaceAll("尺", "呎").replaceAll("型別", "類型")
    .replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function escaped(value) { return String(value).replaceAll('"', '\\"'); }
function safeName(value) { return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim(); }
function englishName(value) { return value.replace(/^The\s+/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function queueWrite(destination, content, locator) {
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === content || staged.get(destination) === content) return;
  staged.set(destination, content);
  const change = candidateChange({ destination, before, after: content, operation: before === null ? "create" : "update", source: sourceBook, locator });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}
function readWorking(file) { return staged.has(file) ? staged.get(file) : fs.readFileSync(file, "utf8"); }

function titleFrom(text, fallback) {
  const lines = text.split(/\r?\n/);
  for (const line of lines.slice(0, 15)) {
    const match = line.match(/^\*\*([^*]+?)\s+([A-Z][A-Za-z'’\- ]+)\*\*$/);
    if (match) return { chinese: match[1].trim(), english: match[2].trim() };
  }
  if (fallback && lines.some((line) => line.trim() === `# ${fallback.chinese}`)) return fallback;
  throw new Error("找不到子職中英文標題。");
}

function classTable(text) {
  const lines = text.split(/\r?\n/);
  const marker = lines.findIndex((line, index) => (
    /\|\s*\*\*[^|]*等級\*\*\s*\|\s*\*\*特性\*\*/.test(line)
    && lines.slice(index + 1, index + 4).some((next) => next.trim().startsWith("|"))
  ));
  if (marker < 0) return { rows: [], start: -1, end: -1 };
  const table = [];
  let end = marker;
  for (let index = marker + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) { if (table.length) break; continue; }
    if (!line.trim().startsWith("|")) { if (table.length) break; continue; }
    table.push(line.trim());
    end = index;
  }
  const rows = table.slice(1).flatMap((line) => {
    const cells = line.split("|").slice(1, -1).map((value) => value.trim());
    const level = Number(cells[0]?.match(/\d+/)?.[0]);
    if (!level || !cells[1]) return [];
    return [[level, cells[1]]];
  });
  return { rows, start: marker, end };
}

function featureHeadings(text) {
  const lines = text.split(/\r?\n/);
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\*\*([^*]+?)\s+([A-Z][A-Za-z'’\-: ]+)\*\*$/);
    if (!match) continue;
    const chinese = match[1].trim();
    const english = match[2].trim();
    if (
      /特性$/.test(chinese)
      || /特性$/.test(english)
      || /^(邊欄|Sidebar)[：:]/i.test(chinese)
      || /^(XGE|Sidebar)/.test(english)
    ) continue;
    headings.push({ index, chinese, english });
  }
  return { lines, headings };
}

function titleLineOf(lines, name) {
  return lines.findIndex((line) => line.includes(`**${name.chinese} ${name.english}**`) || line.trim() === `# ${name.chinese}`);
}

function subclassDescription(lines, name, tableStart) {
  const titleLine = titleLineOf(lines, name);
  const nextHeading = lines.findIndex((line, index) => index > titleLine && /^\*\*.+\*\*$/.test(line.trim()));
  const paragraphs = lines.slice(titleLine + 1, nextHeading < 0 ? tableStart : nextHeading)
    .join("\n").split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 40 && !paragraph.startsWith("#") && !paragraph.startsWith("**") && !paragraph.startsWith("|") && !paragraph.startsWith("!") && !/[？！]/.test(paragraph));
  return paragraphs.join(" ") || "依來源摘要。";
}

function preFeatureSections(lines, name, tableStart) {
  const titleLine = titleLineOf(lines, name);
  const headings = [];
  for (let index = titleLine + 1; index < tableStart; index += 1) {
    const match = lines[index].match(/^\*\*([^*]+?)\s+([A-Z][A-Za-z'’\-: ]+)\*\*$/);
    if (match && !match[1].includes("特性")) headings.push({ index, chinese: match[1].trim(), english: match[2].trim() });
  }
  return headings.map((heading, index) => {
    const body = featureBody(lines, heading, headings[index + 1] ?? { index: tableStart });
    return body ? `### ${heading.chinese} (${heading.english})\n\n${body}` : "";
  }).filter(Boolean).join("\n\n");
}

function featureBody(lines, heading, next) {
  const nextIndex = next?.index ?? lines.length;
  const sidebarIndex = lines.findIndex((line, index) => (
    index > heading.index
    && index < nextIndex
    && /^\*\*(?:邊欄|Sidebar)[：:]/i.test(line.trim())
  ));
  const endIndex = sidebarIndex >= 0 ? sidebarIndex : nextIndex;
  return lines.slice(heading.index + 1, endIndex)
    .filter((line) => !/^!\[\]/.test(line.trim()))
    .join("\n").trim();
}

function formatFeatureContent(heading, body) {
  if (!body) return "- **效果**：依可定位來源補齊。";
  if (heading.english === "Hound of Ill Omen") {
    return `- **效果**：當你達到6級時，你能以附贈動作花費3點術法點，選擇一個120 呎內你可見的生物為獵物，魔法性地召喚一隻凶兆獵犬去獵殺它。

- **召喚與行動限制**：凶兆獵犬出現於獵物30 呎內、由你選擇的一處未佔據空間；為它單獨擲先攻。它僅能以最短路徑朝獵物移動，並只能將動作用於攻擊獵物；可使用藉機攻擊，但僅能對獵物使用。它位於獵物5 呎內時，獵物對你施展法術進行的豁免具有劣勢。它於出現5 分鐘後消失；其生命值降至0點或獵物生命值降至0點時，會提前消失。

##### 凶兆獵犬

*中型怪獸，無陣營*

**AC** 14（天生護甲）　**先攻** +2

**HP** 37（5d10+10）

**速度** 50 呎

**技能** 察覺+3，隱匿+4

**感官** 被動察覺13

**語言** —

**CR** 1（XP 200；PB +2）

|  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| **力量** | 17 | +4 | — | **敏捷** | 15 | +2 | — | **體質** | 15 | +2 | — |
| **智力** | 3 | -4 | — | **感知** | 12 | +1 | — | **魅力** | 7 | -2 | — |

###### 特性 (Traits)

- **敏銳嗅聽覺（Keen Hearing and Smell）**：依賴聽覺或嗅覺進行的感知（察覺）檢定具有優勢。
- **集群戰術（Pack Tactics）**：目標生物5 呎內有至少一名未處於失能狀態的盟友時，凶兆獵犬對該生物的攻擊檢定具有優勢。
- **凶兆獵犬（Hound of Ill Omen）**：出現時獲得等同於你術士等級一半的臨時生命值；可如同穿越困難地形般穿過其他生物與物件，但回合結束時若位於物件內，會受到5點力場傷害。它在每個回合開始時自動知曉獵物位置；對它而言，獵物不會處於隱藏狀態。

###### 動作 (Actions)

- **啃咬（Bite）**：**近戰武器攻擊：**+5，觸及5 呎，單一生物（僅限獵物）。**命中：**10（2d6+3）穿刺傷害。若目標為生物，必須成功通過DC 13力量豁免，否則倒地。`;
  }
  if (heading.english === "Arcane Shot") {
    const [selection, usage, advancement] = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (selection && usage && advancement) {
      return `- **效果**：\n  - **取得與選擇**：${selection}\n  - **使用**：${usage}\n  - **成長**：${advancement}`;
    }
  }
  return `- **效果**：${body}`;
}

function levelForFeature(feature, rows, headings = [], lines = []) {
  const normalized = feature.chinese.replace(/[：:]/g, "");
  const exact = rows.find(([, names]) => names.replace(/[（(].*?[）)]/g, "").split(/[、，,]/).some((name) => normalized.includes(name.trim()) || name.trim().includes(normalized)));
  if (exact) return exact[0];

  // 「X 選項」下的個別選項由同名基礎特性授予，故沿用該特性的取得等級。
  const optionsHeading = [...headings].reverse().find((heading) => (
    heading.index < feature.index && /選項$/.test(heading.chinese)
  ));
  if (optionsHeading) {
    const parentLevel = levelForFeature(
      { chinese: optionsHeading.chinese.replace(/選項$/, "") },
      rows,
    );
    if (parentLevel !== "依來源") return parentLevel;
  }

  const nextHeading = headings.find((heading) => heading.index > feature.index);
  const firstRuleLine = lines.slice(feature.index + 1, nextHeading?.index ?? lines.length)
    .map((line) => line.trim()).find(Boolean);
  const statedLevel = firstRuleLine?.match(/^(?:自|在|從)?\s*(\d+)\s*級(?:起|時)?/);
  if (statedLevel) return Number(statedLevel[1]);

  return "依來源";
}

function currentCounterpart(parent, english) {
  const directory = path.join(ROOT, "wiki", "職業", parent);
  if (!fs.existsSync(directory)) return undefined;
  for (const file of fs.readdirSync(directory).filter((entry) => entry.endsWith(".md"))) {
    const target = path.join(directory, file);
    const title = fs.readFileSync(target, "utf8").match(/^title:\s*"(.+?)"$/m)?.[1] ?? "";
    if (title.match(/\(([^()]*)\)$/)?.[1]?.toLowerCase() === english.toLowerCase()) return { path: target, name: path.basename(file, ".md"), title };
  }
  return undefined;
}

function addCurrentBacklink(counterpart, legacy) {
  if (!counterpart) return;
  const link = `[[職業/2014/${legacy.parent}/${legacy.name}|${legacy.title}]]`;
  let text = readWorking(counterpart.path);
  if (text.includes(link)) return;
  text = text.replace(/(## 🔗 相關連結\r?\n\r?\n)/, `$1- ${link}\n`);
  queueWrite(counterpart.path, text, "現行子職反向連結");
}

function frontmatter({ title, concept, source, locator, tag }) {
  return `---\ntitle: "${escaped(title)}"\nentity_id: "entry:${publicationId}:subclass:${englishName(concept)}"\nconcept_id: "concept:subclass:${englishName(concept)}"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "職業"\nentry_type: "子職"\nparent_class: "${escaped(tag.parent)}"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "子職_${escaped(tag.parent)}"\nsources:\n  - file: "${source}"\n    locator: "${escaped(locator)}"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options；${escaped(title)}"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---`;
}

const terms = [];
const byParent = new Map();
for (const [rawParent, [parent, parentEnglish]] of classes) {
  const inputDirectory = path.join(sourceRoot, rawParent);
  if (!fs.existsSync(inputDirectory)) continue;
  const outputDirectory = path.join(outputRoot, parent);
  const entries = [];
  for (const entry of fs.readdirSync(inputDirectory).filter((name) => name.endsWith(".md") && !nonSubclassFiles.has(name))) {
    const input = path.join(inputDirectory, entry);
    const text = read(input);
    let name;
    try { name = titleFrom(text, titleOverrides.get(entry)); } catch { console.warn(`略過：${sourceOf(input)}（非子職資料）`); continue; }
    const { rows, start: tableStart, end: tableEnd } = classTable(text);
    const { lines, headings } = featureHeadings(text);
    const featureHeadingsAfterTable = headings.filter((heading) => heading.index > tableEnd);
    const optionGroups = [];
    for (let index = 0; index < featureHeadingsAfterTable.length; index += 1) {
      const optionsHeading = featureHeadingsAfterTable[index];
      if (!/選項$/.test(optionsHeading.chinese)) continue;
      const parentName = optionsHeading.chinese.replace(/選項$/, "");
      const parentIndex = featureHeadingsAfterTable.findIndex((heading, candidateIndex) => (
        candidateIndex < index && heading.chinese === parentName
      ));
      if (parentIndex < 0) continue;
      let endIndex = index + 1;
      while (endIndex < featureHeadingsAfterTable.length && levelForFeature(featureHeadingsAfterTable[endIndex], rows) === "依來源") endIndex += 1;
      optionGroups.push({ parentIndex, headingIndex: index, itemIndexes: Array.from({ length: endIndex - index - 1 }, (_, offset) => index + offset + 1) });
    }
    const skippedOptionIndexes = new Set(optionGroups.flatMap((group) => [group.headingIndex, ...group.itemIndexes]));
    const optionGroupByParent = new Map(optionGroups.map((group) => [group.parentIndex, group]));
    const renderBody = (heading, next) => {
      const body = featureBody(lines, heading, next);
      return formatFeatureContent(heading, body);
    };
    const details = featureHeadingsAfterTable.flatMap((heading, index) => {
      if (skippedOptionIndexes.has(index)) return [];
      const content = renderBody(heading, featureHeadingsAfterTable[index + 1]);
      if (heading.english === "Eyes of the Dark") {
        const [darkvision, darkness] = featureBody(lines, heading, featureHeadingsAfterTable[index + 1])
          .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (darkvision && darkness) {
          return [
            `#### 1 級：幽暗之瞳 (Eyes of the Dark)\n\n- **效果**：${darkvision}`,
            `#### 3 級：幽暗之瞳（黑暗術） (Eyes of the Dark)\n\n- **效果**：${darkness}`,
          ];
        }
      }
      const sections = [`#### ${levelForFeature(heading, rows, featureHeadingsAfterTable, lines)} 級：${heading.chinese} (${heading.english})\n\n${content}`];
      const group = optionGroupByParent.get(index);
      if (!group) return sections;
      const optionsHeading = featureHeadingsAfterTable[group.headingIndex];
      sections.push(`##### ${optionsHeading.chinese} (${optionsHeading.english})\n\n${renderBody(optionsHeading, featureHeadingsAfterTable[group.itemIndexes[0]])}`);
      for (const itemIndex of group.itemIndexes) {
        const item = featureHeadingsAfterTable[itemIndex];
        const next = featureHeadingsAfterTable[itemIndex + 1];
        sections.push(`###### ${item.chinese} (${item.english})\n\n${renderBody(item, next)}`);
      }
      return sections;
    }).join("\n\n");
    const tableRows = rows.map(([level, features]) => `| ${level} | ${features} |`).join("\n") || "| 依來源 | 待確認 |";
    const source = sourceOf(input);
    const title = `${name.chinese} (${name.english}，2014 Legacy)`;
    const current = currentCounterpart(parent, name.english);
    const currentLink = current ? `\n> [!WARNING] 本條目為 2014 舊版規則；2024 新版請參閱 [[職業/${parent}/${current.name}|${current.title}]]。\n` : "\n> [!WARNING] 本條目為 2014 舊版規則。\n";
    const principles = preFeatureSections(lines, name, tableStart);
    const content = `${frontmatter({ title, concept: name.english, source, locator: `L1 標題；${name.chinese}`, tag: { parent } }).replace(`Chapter 1: Character Options；${title}`, `Chapter 1: Character Options；${name.english}`)}\n\n# ${title}\n${currentLink}\n**子職定位**：${subclassDescription(lines, name, tableStart)}\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 子職特性表\n\n| 職業等級 | 子職特性 |\n| :--: | :--- |\n${tableRows}${principles ? `\n\n${principles}` : ""}\n\n### 子職特性詳解\n\n${details || "依可定位來源補齊。"}\n\n## 🔗 相關連結\n\n- [[職業/2014/${parent}/${parent}子職索引|${parent}子職索引 (2014 Legacy)]]\n- [[職業/${parent}|${parent} (${parentEnglish})]]\n${current ? `- [[職業/${parent}/${current.name}|${current.title}]]\n` : ""}`;
    const destination = path.join(outputDirectory, `${safeName(name.chinese)}.md`);
    queueWrite(destination, content, `L1 標題；${name.chinese}`);
    entries.push({ name, title, file: safeName(name.chinese) });
    terms.push({ ...name, source });
    addCurrentBacklink(current, { parent, name: safeName(name.chinese), title });
    console.log(`匯入：${path.relative(ROOT, destination)}`);
  }
  if (!entries.length) continue;
  entries.sort((a, b) => a.name.chinese.localeCompare(b.name.chinese, "zh-Hant"));
  const indexSource = sourceOf(path.join(sourceRoot, `${rawParent}.md`));
  const index = `---\ntitle: "${parent}子職索引 (2014 Legacy)"\nentity_id: "entry:${publicationId}:subclass-index:${englishName(parentEnglish)}"\nconcept_id: "concept:subclass-index:${englishName(parentEnglish)}-2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "職業"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "職業_索引"\nsources:\n  - file: "${indexSource}"\n    locator: "L1 標題：${rawParent}"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options；${parentEnglish}"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# ${parent}子職索引 (2014 Legacy)\n\n> 收錄《${publication.title_zh}》的 ${parent} 2014 子職；此索引不取代現行 2024 職業頁。\n\n${entries.map((item) => `- [[${item.file}|${item.title}]]`).join("\n")}\n\n## 🔗 相關連結\n\n- [[職業/2014/職業索引|職業索引 (2014 Legacy)]]\n- [[職業/${parent}|${parent} (${parentEnglish})]]\n`;
  queueWrite(path.join(outputDirectory, `${parent}子職索引.md`), index, `L1 標題：${rawParent}`);
  byParent.set(parent, { parentEnglish, entries });
}

const rootEntries = [...byParent.entries()].map(([parent, data]) => `- [[職業/2014/${parent}/${parent}子職索引|${parent}子職索引 (${data.parentEnglish}，2014 Legacy)]]`).join("\n");
const rootIndex = `---\ntitle: "職業索引 (2014 Legacy)"\nentity_id: "entry:${publicationId}:class-index:2014"\nconcept_id: "concept:class-index:2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "職業"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "職業_索引"\nsources:\n  - file: "${sourceBook}/角色選項/構建角色生平.md"\n    locator: "L1 標題：構建角色生平；角色選項章節"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 1: Character Options"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# 職業索引 (2014 Legacy)\n\n> 收錄《${publication.title_zh}》的 2014 子職選項；現行角色規則以 2024 核心規則與其適用擴充為準。\n\n${rootEntries}\n\n## 🔗 相關連結\n\n- [[職業索引|職業索引 (Classes Index)]]\n`;
queueWrite(path.join(outputRoot, "職業索引.md"), rootIndex, "Chapter 1: Character Options");

const glossaryPath = path.join(ROOT, "附件", "翻譯詞彙表.md");
let glossary = fs.readFileSync(glossaryPath, "utf8");
const additions = [...new Map(terms.map((term) => [term.english, term])).values()]
  .map((term) => `| ${term.english} | ${term.chinese} | XGE2017 | 簡轉繁；${term.source.replace(`${sourceBook}/`, "")}；L1 標題 | approved |`);
const heading = "## 艾伯倫戰役設定";
const xgeSection = `## 珊娜薩的萬事指南\n\n| 英文 | 本 Wiki 標準譯名 | 來源 ID | 定位 | 狀態 |\n| :--- | :--- | :--- | :--- | :--- |\n${additions.join("\n")}\n\n`;
glossary = glossary.replace(/## 珊娜薩的萬事指南[\s\S]*?(?=## 艾伯倫戰役設定)/, "").replace(heading, `${xgeSection}${heading}`);
queueWrite(glossaryPath, glossary, "珊娜薩的萬事指南譯名表");

console.log(`完成：${[...byParent.values()].reduce((sum, value) => sum + value.entries.length, 0)} 個 XGE 2014 子職，新增 ${additions.length} 個詞彙。`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
if (options.report) {
  const reportPath = path.resolve(ROOT, options.report);
  if (!reportPath.startsWith(`${path.join(ROOT, "reports")}${path.sep}`)) throw new Error("報告只能輸出至 reports/。");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用 XGE 子職：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽 XGE 子職：${plan.changes.length} 個候選變更；加入 --apply 才會寫入。`);
}
