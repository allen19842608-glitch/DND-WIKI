import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadIngestProfile, loadPublication, today } from "../core/ingest-publication-utils.mjs";

const publicationId = "XGE2017";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const inputRoot = path.join(ROOT, profile.source_root, profile.inputs.spells);
const outputRoot = path.join(ROOT, profile.outputs.spells);
const sourceBook = "原始資料/珊娜薩的萬事指南";
const sourcePdf = `${sourceBook}/Xanathars_Guide_to_Everything.pdf`;
const mirrorDataset = "原始資料/外部來源鏡像/XGE2017/datasets/spells-xge.json";
const mirrorDatasetUrl = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-xge.json";
const converterRoot = process.env.XGE_OPENCC_PATH ?? "C:\\Users\\Owner\\AppData\\Local\\Temp\\dnd-wiki-xge-opencc";
const python = process.env.XGE_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const openccProgram = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const numerals = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const classNames = new Map([
  ["吟遊詩人", ["吟遊詩人", "Bard"]], ["牧師", ["牧師", "Cleric"]], ["德魯伊", ["德魯伊", "Druid"]],
  ["聖武士", ["聖騎士", "Paladin"]], ["聖騎士", ["聖騎士", "Paladin"]], ["遊俠", ["遊俠", "Ranger"]],
  ["術士", ["術士", "Sorcerer"]], ["魔契師", ["契術師", "Warlock"]], ["邪術師", ["契術師", "Warlock"]],
  ["契術師", ["契術師", "Warlock"]], ["法師", ["法師", "Wizard"]], ["奇械師", ["奇械師", "Artificer"]],
]);

function traditional(text) {
  if (!fs.existsSync(converterRoot)) throw new Error(`找不到 OpenCC：${converterRoot}。請設定 XGE_OPENCC_PATH。`);
  return execFileSync(python, ["-c", openccProgram, converterRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}
function read(file) {
  return traditional(fs.readFileSync(file, "utf8"))
    .replace(/(\d+)\s*尺/g, "$1 呎")
    .replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replace(/(\d+)\s*gp\b/gi, "$1 GP")
    .replaceAll("尺", "呎").replaceAll("型別", "類型")
    .replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function quote(value) { return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"'); }
function safeName(value) { return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim(); }
function slug(value) { return value.toLowerCase().replace(/^the\s+/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function relative(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }

function ringForFile(file) {
  if (file === "戲法.md") return { number: 0, name: "戲法", directory: "戲法" };
  const number = Number(file.match(/^(\d+)環\.md$/)?.[1]);
  return Number.isInteger(number) && number >= 1 && number <= 9 ? { number, name: `${numerals[number]}環`, directory: `${number}環` } : undefined;
}
function parseMeta(line, ring) {
  const text = line.replace(/^_|_$/g, "").trim();
  const school = text.match(/(?:戲法|[一二三四五六七八九0-9]+環)\s+([^（(]+)/)?.[1]?.trim() ?? "待確認";
  const parenthetical = text.match(/[（(]([^）)]+)[）)]/)?.[1] ?? "";
  const classes = parenthetical.replace(/儀式[；;,、]*/g, "").split(/[、，,；;]/)
    .map((entry) => entry.trim()).filter(Boolean).map((entry) => classNames.get(entry) ?? [entry, entry]);
  return { school, ritual: /儀式/.test(parenthetical), classes, ring };
}
function field(lines, label) {
  return lines.find((line) => line.startsWith(`**${label}`))?.replace(/^\*\*[^：:]+[：:]\*\*\s*/, "").trim() ?? "依來源確認";
}
function materialDetail(components) {
  if (!/(?:^|、)M(?:[（(]|$)/.test(components)) return undefined;
  const material = components.match(/M[（(]([^）)]+)[）)]/)?.[1]?.trim();
  if (!material) return "含材料成分；成本與消耗依來源確認";
  if (/耗材|消耗/.test(material)) return material;
  return `${material}；未標示成本／不消耗`;
}
function bodyParts(lines) {
  const stripped = lines.filter((line) => !/^_|^\*\*(施法時間|施法距離|法術成分|持續時間)[：:]/.test(line));
  const higherIndex = stripped.findIndex((line) => /^\*\*升環施法[。.]?\*\*/.test(line));
  const effect = (higherIndex < 0 ? stripped : stripped.slice(0, higherIndex)).join("\n").trim();
  const higher = higherIndex < 0 ? undefined : stripped.slice(higherIndex).join("\n").replace(/^\*\*升環施法[。.]?\*\*\s*/, "").trim();
  return { effect, higher };
}
function checkType(effect) {
  const saves = [...effect.matchAll(/(力量|敏捷|體質|智力|感知|魅力)豁免/g)].map((match) => match[1]);
  const attack = effect.match(/(近戰|遠程)?法術攻擊/)?.[0];
  return [...new Set(saves)].map((save) => `${save}豁免`).concat(attack ? [attack] : []).join("；") || undefined;
}
function classLinks(classes) {
  return classes.map(([name, english]) => fs.existsSync(path.join(ROOT, "wiki", "職業", `${name}.md`))
    ? `[[職業/${name}|${name} (${english})]]` : `${name} (${english})`).join("、") || "依來源確認";
}
function effectItem(effect) {
  const lines = effect.split(/\r?\n/);
  if (!lines.length) return "- **效果**：依可定位來源補齊。";
  return [`- **效果**：${lines[0]}`, ...lines.slice(1).map((line) => `  ${line}`)].join("\n");
}
function currentCounterpart(english) {
  const root = path.join(ROOT, "wiki", "法術");
  function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
      const target = path.join(directory, item.name);
      if (item.isDirectory()) return directory === root && item.name === "2014" ? [] : walk(target);
      return item.isFile() && item.name.endsWith(".md") ? [target] : [];
    });
  }
  const files = walk(root);
  return files.find((file) => (fs.readFileSync(file, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? "").includes(`(${english})`));
}
function addBacklink(current, legacyLink) {
  if (!current) return;
  let content = fs.readFileSync(current, "utf8");
  if (content.includes(legacyLink)) return;
  content = content.replace(/(## 🔗 相關連結\r?\n)/, `$1\n- ${legacyLink}\n`);
  fs.writeFileSync(current, content, "utf8");
}
function frontmatter({ title, english, source, locator, ring }) {
  return [
    "---",
    `title: "${quote(title)}"`,
    `entity_id: "entry:${publicationId}:spell:${slug(english)}"`,
    `concept_id: "concept:spell:${slug(english)}"`,
    'ruleset: "2014"',
    'content_scope: "expansion"',
    'status: "legacy"',
    'category: "法術"',
    'version: "2014-Legacy"',
    "tags:",
    `  - "${publication.wiki.tag}"`,
    `  - "法術_${ring.name}"`,
    "sources:",
    `  - file: "${mirrorDataset}"`,
    `    locator: "spell:${quote(english)}"`,
    `    url: "${mirrorDatasetUrl}"`,
    '    authority: "官方"',
    '    translation: "none"',
    `  - file: "${source}"`,
    `    locator: "${quote(locator)}"`,
    '    authority: "官方"',
    '    translation: "community"',
    `  - file: "${sourcePdf}"`,
    `    locator: "Chapter 3: Spells；${quote(english)}"`,
    '    authority: "官方"',
    '    translation: "none"',
    'source_type: "official"',
    'confidence: "interpreted"',
    "rules_sources:",
    `  - "${publication.canonical_rules_source}"`,
    "errata: []",
    `updated: "${today()}"`,
    "---",
  ].join("\n");
}

const terms = [];
const byRing = new Map();
for (const entry of fs.readdirSync(inputRoot).filter((name) => ringForFile(name))) {
  const ring = ringForFile(entry);
  const sourcePath = path.join(inputRoot, entry);
  const source = relative(sourcePath);
  const lines = read(sourcePath).split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = line.match(/^####\s+(.+?)[｜|]\s*(.+?)\s*$/);
    return match ? [{ index, chinese: match[1].trim(), english: match[2].trim() }] : [];
  });
  const entries = [];
  for (const [position, spell] of headings.entries()) {
    const end = headings[position + 1]?.index ?? lines.length;
    const block = lines.slice(spell.index + 1, end).filter((line) => line.trim());
    const meta = parseMeta(block.find((line) => /^_[^_]+_$/.test(line.trim())) ?? "", ring);
    const components = field(block, "法術成分");
    const duration = field(block, "持續時間");
    const { effect, higher } = bodyParts(block);
    const concentration = /^專注[，,]/.test(duration) ? "是" : "否";
    const ritual = meta.ritual ? "是" : "否";
    const check = checkType(effect);
    const destination = path.join(outputRoot, ring.directory, `${safeName(spell.chinese)}.md`);
    const title = `${spell.chinese} (${spell.english}，2014 Legacy)`;
    const legacyLink = `[[法術/2014/${ring.directory}/${safeName(spell.chinese)}|${title}]]`;
    const current = currentCounterpart(spell.english);
    const currentLink = current ? `[[法術/${relative(current).replace(/^wiki\/法術\//, "").replace(/\.md$/, "")}|${fs.readFileSync(current, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? path.basename(current, ".md")}]]` : undefined;
    const content = [
      frontmatter({ title, english: spell.english, source, locator: `#### ${spell.chinese}｜${spell.english}`, ring }), "",
      `# ${title}`, "",
      `- **環階**：${ring.name}`, `- **學派**：${meta.school}`,
      `- **施法時間 (Casting Time)**：${field(block, "施法時間")}`,
      `- **施法距離 (Range)**：${field(block, "施法距離")}`,
      `- **法術成分 (Components)**：${components.replace(/([,、]\s*)?M（[^）]+）/u, "M").replace(/,\s*/gu, "、")}`,
      ...(materialDetail(components) ? [`- **材料成本與消耗**：${materialDetail(components)}`] : []),
      `- **持續時間 (Duration)**：${duration}`, `- **專注 (Concentration)**：${concentration}`,
      `- **儀式 (Ritual)**：${ritual}`, `- **施法職業**：${classLinks(meta.classes)}`, "",
      "## 🔮 法術效果描述", "", effectItem(effect),
      ...(check ? [`- **豁免／法術攻擊**：${check}`] : []),
      ...(higher ? [`- **升環施法 (At Higher Levels)**：${higher}`] : []), "",
      "## 🔗 相關連結", "",
      `- [[法術/2014/${ring.directory}/${ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`}|${ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`} (2014 Legacy)]]`,
      `- [[法術/2014/珊娜薩法術索引|珊娜薩法術索引 (XGE 2014 Legacy)]]`,
      ...(concentration === "是" ? ["- [[專注|專注 (Concentration)]]"] : []),
      ...(ritual === "是" ? ["- [[儀式施法|儀式施法 (Ritual Casting)]]"] : []),
      ...(check ? ["- [[法術攻擊與豁免|法術攻擊與豁免 (Spell Attacks and Saving Throws)]]"] : []),
      ...(currentLink ? ["", `> 同名 2024 條目：${currentLink}。兩版本是否機制相同，須逐條比對後才另行註記。`] : []), "",
    ].join("\n");
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content, "utf8");
    addBacklink(current, legacyLink);
    entries.push({ ...spell, file: safeName(spell.chinese) });
    terms.push({ ...spell, source });
  }
  byRing.set(ring.number, { ring, entries });
}

const indexSections = [...byRing.values()].sort((a, b) => a.ring.number - b.ring.number).map(({ ring, entries }) =>
  `## ${ring.name}（${entries.length} 道）\n\n${entries.map((spell) => `- [[法術/2014/${ring.directory}/${spell.file}|${spell.chinese} (${spell.english})]]`).join("\n")}`).join("\n\n");
const index = `---\ntitle: "珊娜薩法術索引 (XGE 2014 Legacy)"\nentity_id: "entry:${publicationId}:spell-index:xge"\nconcept_id: "concept:spell-index:xge-2014"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "法術"\nversion: "2014-Legacy"\ntags:\n  - "${publication.wiki.tag}"\n  - "法術_索引"\nsources:\n  - file: "${sourceBook}/法術/法術列表.md"\n    locator: "法術詳述 0–9 環"\n    authority: "官方"\n    translation: "community"\n  - file: "${sourcePdf}"\n    locator: "Chapter 3: Spells"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${publication.canonical_rules_source}"\nerrata: []\nupdated: "${today()}"\n---\n\n# 珊娜薩法術索引 (XGE 2014 Legacy)\n\n> 收錄《${publication.title_zh}》新增的 95 道 2014 法術；不與《玩家手冊 2014》法術索引混寫。\n\n${indexSections}\n\n## 🔗 相關連結\n\n- [[法術/2014/法術索引|2014 法術索引 (2014 Spells Index)]]\n- [[法術索引|法術索引 (Spells Index)]]\n`;
fs.writeFileSync(path.join(outputRoot, "珊娜薩法術索引.md"), index, "utf8");
for (const { ring, entries } of byRing.values()) {
  const indexName = ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`;
  const ringIndexPath = path.join(outputRoot, ring.directory, `${indexName}.md`);
  if (!fs.existsSync(ringIndexPath)) continue;
  let ringIndex = fs.readFileSync(ringIndexPath, "utf8");
  const additions = entries
    .filter((spell) => !ringIndex.includes(`/${spell.file}|`))
    .map((spell) => `- [[法術/2014/${ring.directory}/${spell.file}|${spell.chinese} (${spell.english}，2014 Legacy)]]`)
    .join("\n");
  if (additions) {
    ringIndex = ringIndex.replace(/\n## 🔗 相關連結/, `\n${additions}\n\n## 🔗 相關連結`);
    fs.writeFileSync(ringIndexPath, ringIndex, "utf8");
  }
}
const legacyIndexPath = path.join(outputRoot, "法術索引.md");
const xgeIndexLink = "[[法術/2014/珊娜薩法術索引|珊娜薩法術索引 (XGE 2014 Legacy)]]";
if (fs.existsSync(legacyIndexPath)) {
  let legacyIndex = fs.readFileSync(legacyIndexPath, "utf8");
  if (!legacyIndex.includes(xgeIndexLink)) {
    legacyIndex = legacyIndex.replace(/(## 🔗 相關連結\r?\n)/, `$1\n- ${xgeIndexLink}\n`);
    fs.writeFileSync(legacyIndexPath, legacyIndex, "utf8");
  }
}

const glossaryPath = path.join(ROOT, "附件", "翻譯詞彙表.md");
let glossary = fs.readFileSync(glossaryPath, "utf8");
const additions = [...new Map(terms.map((term) => [term.english, term])).values()]
  .map((term) => `| ${term.english} | ${term.chinese} | XGE2017 | 簡轉繁；${term.source.replace(`${sourceBook}/`, "")}；#### ${term.chinese}｜${term.english} | approved |`);
const section = `## 珊娜薩的萬事指南\n\n| 英文 | 本 Wiki 標準譯名 | 來源 ID | 定位 | 狀態 |\n| :--- | :--- | :--- | :--- | :--- |\n${additions.join("\n")}\n\n`;
glossary = glossary.replace(/## 珊娜薩的萬事指南[\s\S]*?(?=## 艾伯倫戰役設定)/, "").replace("## 艾伯倫戰役設定", `${section}## 艾伯倫戰役設定`);
fs.writeFileSync(glossaryPath, glossary, "utf8");

console.log(`完成：${terms.length} 道 XGE 2014 法術。`);
