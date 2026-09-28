import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  ROOT,
  applyCandidateBatch,
  candidateChange,
  frontmatter,
  loadIngestProfile,
  loadPublication,
  parseOptions,
  planCandidateBatch,
  walkMarkdown,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const publicationId = "BPGG2023";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const options = parseOptions(process.argv.slice(2), { extraBooleanOptions: ["--debug"] });
if (options.apply && !options.report) fail("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const sourceRoot = path.join(ROOT, profile.source_root, "圖鑑");
const outputRoot = path.join(ROOT, "wiki", "怪物", "2014");
const glossaryPath = path.join(ROOT, "附件", "翻譯詞彙表.md");
const python = process.platform === "win32" ? "py" : "python3";
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const openccProgram = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const types = ["異怪", "野獸", "怪獸", "天族", "構裝", "龍類", "元素", "妖精", "邪魔", "巨人", "類人", "泥怪", "植物", "亡靈"];
const typeEnglish = { 亡靈: "Undead", 元素: "Elemental", 天族: "Celestial", 巨人: "Giant", 妖精: "Fey", 邪魔: "Fiend", 野獸: "Beast", 類人: "Humanoid", 怪獸: "Monstrosity", 泥怪: "Ooze" };

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function convert(value) {
  if (!fs.existsSync(openccRoot)) fail(`找不到 OpenCC：${openccRoot}`);
  return execFileSync(python, ["-c", openccProgram, openccRoot], { input: value, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .replaceAll("尺", "呎")
    .replace(/(\d+)\s*呎/g, "$1 呎")
    .replace(/(\d+)\s*gp\b/gi, "$1 GP")
    .replace(/\bXP\s*(\d[\d,]*)/g, "XP $1")
    .replaceAll("_", "")
    .replace(/\s+([，。；：])/g, "$1")
    .trim();
}

function sourceOf(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function glossaryEnglish() {
  return new Set([...fs.readFileSync(glossaryPath, "utf8").matchAll(/^\|\s*([^|]+?)\s*\|/gm)]
    .map((match) => match[1].trim())
    .filter((value) => value && value !== "英文"));
}

function splitTitle(value) {
  const match = value.trim().match(/^(.*?)\s+([A-Za-z][A-Za-z0-9'’.,()\- ]+)$/);
  return match ? { chinese: clean(match[1]), english: match[2].trim() } : undefined;
}

function clean(value) {
  return String(value)
    .replaceAll("_", "")
    .replaceAll("尺", "呎")
    .replace(/(\d+)\s*呎/g, "$1 呎")
    .replace(/(\d+)\s*gp\b/gi, "$1 GP")
    .replace(/\s+([，。；：])/g, "$1")
    .trim();
}

function creatureFolder(typeLine) {
  const normalized = clean(typeLine);
  return types.find((type) => normalized.includes(type)) ?? "其他";
}

function field(lines, label) {
  const labels = {
    "護甲等級": "(?:\\*\\*護甲等級[:：]?\\*\\*|\\*\\*AC\\*\\*|AC)",
    "生命值": "(?:\\*\\*生命值[:：]?\\*\\*|\\*\\*HP\\*\\*|HP)",
    "速度": "(?:\\*\\*速度[:：]?\\*\\*|速度)",
    "豁免檢定": "(?:\\*\\*豁免檢定[:：]?\\*\\*|豁免)",
    "技能": "(?:\\*\\*技能[:：]?\\*\\*|技能)",
    "感官": "(?:\\*\\*感官[:：]?\\*\\*|感官)",
    "語言": "(?:\\*\\*語言[:：]?\\*\\*|語言)",
    "傷害抗性": "(?:\\*\\*傷害抗性[:：]?\\*\\*|傷害抗性)",
    "傷害免疫": "(?:\\*\\*傷害免疫[:：]?\\*\\*|傷害免疫)",
    "狀態免疫": "(?:\\*\\*狀態免疫[:：]?\\*\\*|狀態免疫)",
    "挑戰等級": "(?:\\*\\*挑戰等級[:：]?\\*\\*|挑戰等級)",
    "裝備": "(?:\\*\\*裝備[:：]?\\*\\*|裝備)",
  };
  const expression = labels[label] ?? label;
  const line = lines.find((item) => new RegExp(`^${expression}(?=[:：\\s]|\\d)`).test(item.trim()));
  return line?.replace(new RegExp(`^${expression}[:：\\s]*`), "").trim();
}

function stats(lines) {
  const values = new Map();
  for (const line of lines) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 3 || !types) continue;
    if (!["力量", "敏捷", "體質", "智力", "感知", "魅力"].includes(cells[0])) continue;
    if (!/^\d+$/.test(cells[1])) continue;
    values.set(convert(cells[0]), { score: cells[1], modifier: cells[2] });
  }
  if (values.size !== 6) {
    for (const line of lines) {
      for (const match of line.matchAll(/(?:\*\*)?(力量|敏捷|體質|智力|感知|魅力)(?:\*\*)?\s*(\d+)\s*[（(]([+−-]?\d+)[）)]/g)) {
        values.set(match[1], { score: match[2], modifier: match[3].replace("-", "−") });
      }
    }
  }
  return values.size === 6 ? values : undefined;
}

function entries(lines) {
  const result = [];
  let current;
  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    const plainHeading = line.match(/^([\u3400-\u9fff（）()]+\s+[A-Za-z][A-Za-z'’\- ]+)[。.]\s*(.+)$/);
    if (heading || plainHeading) {
      if (current) result.push(current);
      const matched = heading ?? plainHeading;
      current = {
        title: matched[1].replaceAll("*", "").replace(/[。.]$/, "").trim(),
        body: matched[2].replace(/^\*+\s*/, "").replace(/\*+$/, "").trim(),
      };
    } else if (current && line && !line.startsWith("|")) {
      current.body = `${current.body} ${line}`.trim();
    }
  }
  if (current) result.push(current);
  return result.map(({ title, body }) => {
    const name = splitTitle(title);
    const display = name ? `${name.chinese}（${name.english}）` : clean(title);
    return `- **${display}**：${clean(body)}`;
  }).join("\n");
}

function section(lines, heading) {
  const start = lines.findIndex((line) => new RegExp(`^(?:###\\s+|\\*\\*)${heading}(?:(?:\\*\\*)?\\s|$)`, "i").test(line.trim()));
  if (start < 0) return [];
  const values = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,3}\s+/.test(lines[index]) || /^\*\*(?:動作|Actions|附贈動作|Bonus Actions|反應|Reactions|傳奇動作|Legendary Actions|巢穴動作|Lair Actions)/i.test(lines[index].trim())) break;
    values.push(lines[index]);
  }
  return values;
}

function cards(file) {
  // 本書原始資料為簡體中文；先整檔嚴格簡轉繁，再識別固定的中文欄位。
  const lines = convert(fs.readFileSync(file, "utf8")).split(/\r?\n/);
  const typeIndexes = lines.map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => /^(?:_)?(?:微型|小型|中型|大型|超大型|超巨型|巨型).+(?:_)?$/.test(line.replaceAll("*", "")));
  return typeIndexes.flatMap(({ index, line: type }, itemIndex) => {
    const end = typeIndexes[itemIndex + 1]?.index ?? lines.length;
    const titleLine = [...lines.slice(0, index)].reverse().find((line) => {
      const value = line.trim().replace(/^#+\s+/, "").replace(/^\*\*|\*\*$/g, "");
      return Boolean(splitTitle(value));
    });
    const title = splitTitle(titleLine?.trim().replace(/^#+\s+/, "").replace(/^\*\*|\*\*$/g, ""));
    const block = lines.slice(index + 1, end);
    if (!title) return [];
    const values = stats(block);
    const ac = field(block, "護甲等級");
    const hp = field(block, "生命值");
    const speed = field(block, "速度");
    if (!values || !ac || !hp || !speed) return [];
    const actionStart = block.findIndex((line) => /^(?:###\s+|\*\*)(?:動作|Actions)/i.test(line.trim()));
    const traitLines = block.slice(0, actionStart < 0 ? block.length : actionStart)
      .filter((line) => !/^\*\*(?:護甲等級|生命值|速度|技能|感官|語言|挑戰等級|豁免檢定|豁免|傷害|狀態|裝備|力量|敏捷|體質|智力|感知|魅力|AC|HP)/.test(line.trim()));
    return [{
      ...title,
      source: sourceOf(file),
      locator: `L${index + 1} 標題：${title.chinese}`,
      type: clean(type.trim().replaceAll("*", "").replace(/^_/, "").replace(/_$/, "")),
      folder: creatureFolder(type), ac: clean(ac), hp: clean(hp), speed: clean(speed), stats: values,
      saves: field(block, "豁免檢定"), skills: field(block, "技能"), senses: field(block, "感官"),
      languages: field(block, "語言"), resistances: field(block, "傷害抗性"), immunities: field(block, "傷害免疫"),
      conditions: field(block, "狀態免疫"), challenge: field(block, "挑戰等級"), equipment: field(block, "裝備"),
      traits: entries(traitLines), actions: entries(section(block, "(?:動作|Actions)")),
      bonusActions: entries(section(block, "(?:附贈動作|Bonus Actions)")), reactions: entries(section(block, "(?:反應|Reactions)")),
      legendary: entries(section(block, "(?:傳奇動作|Legendary Actions)")), lair: entries(section(block, "(?:巢穴動作|Lair Actions)")),
    }];
  });
}

function optional(label, value) {
  return value ? `\n**${label}** ${clean(value)}\n` : "";
}

function render(card) {
  const title = `${card.chinese} (${card.english}，2014 Legacy)`;
  const stat = (name) => card.stats.get(name);
  const rows = [["力量", "敏捷", "體質"], ["智力", "感知", "魅力"]].map((names) => `| ${names.flatMap((name) => {
    const value = stat(name);
    return [`**${name}**`, value.score, value.modifier, "—"];
  }).join(" | ")} |`).join("\n");
  const sectionText = (name, value) => value ? `\n## ${name}\n\n${value}\n` : "";
  const meta = frontmatter({ publicationId, publication, kind: "monster", concept: card.english, title, category: "怪物", tag: `生物類型_${card.folder}`, source: card.source, locator: card.locator });
  return `${meta}\n\n# ${title}\n\n> [!WARNING]\n> 本條目為 2014 Legacy 怪物資料卡；2024 怪物資料卡如有同名條目，應依其版本分別使用。\n\n*${card.type}*\n\n**AC** ${card.ac}\n\n**HP** ${card.hp}\n\n**速度** ${card.speed}\n${optional("豁免檢定", card.saves)}${optional("技能", card.skills)}${optional("感官", card.senses)}${optional("語言", card.languages)}${optional("傷害抗性", card.resistances)}${optional("傷害免疫", card.immunities)}${optional("狀態免疫", card.conditions)}${optional("裝備", card.equipment)}${optional("CR", card.challenge)}\n|  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |\n| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |\n${rows}\n${sectionText("特性 (Traits)", card.traits)}${sectionText("動作 (Actions)", card.actions)}${sectionText("附贈動作 (Bonus Actions)", card.bonusActions)}${sectionText("反應 (Reactions)", card.reactions)}${sectionText("傳奇動作 (Legendary Actions)", card.legendary)}${sectionText("巢穴動作 (Lair Actions)", card.lair)}\n## 🔗 相關連結\n\n- [[怪物/2014/${card.folder}/2014${card.folder}索引|${card.folder}索引 (${typeEnglish[card.folder] ?? card.folder} Index，2014 Legacy)]]\n`;
}

function renderIndex(folder, cardsInFolder) {
  const first = cardsInFolder[0];
  const english = typeEnglish[folder] ?? folder;
  const title = `${folder}索引 (${english} Index，2014 Legacy)`;
  const meta = frontmatter({ publicationId, publication, kind: "monster-index", concept: `${english} 2014`, title, category: "怪物", tag: "怪物_索引", source: first.source, locator: `${first.locator}；Wiki 導覽結構` });
  const links = cardsInFolder.sort((a, b) => a.chinese.localeCompare(b.chinese, "zh-Hant"))
    .map((card) => `- [[${card.chinese}|${card.chinese} (${card.english}，2014 Legacy)]]`).join("\n");
  return `${meta}\n\n# ${title}\n\n此索引收錄《畢格比鉅獻：巨人之榮耀》已吸收、且生物類型為${folder}的 2014 Legacy 資料卡。\n\n## 條目\n\n${links}\n\n## 🔗 相關連結\n\n- [[怪物/2014/2014怪物索引|2014 怪物索引 (2014 Legacy Monster Index)]]\n`;
}

const known = glossaryEnglish();
const allCards = walkMarkdown(sourceRoot).flatMap(cards);
if (process.argv.includes("--debug")) console.log(`解析候選：${allCards.map((card) => card.chinese).join("、")}`);
const duplicateEnglish = [];
const uniqueCards = [...allCards.reduce((selected, card) => {
  const existing = selected.get(card.english);
  if (existing) {
    duplicateEnglish.push({ english: card.english, selected: existing, skipped: card });
    return selected;
  }
  selected.set(card.english, card);
  return selected;
}, new Map()).values()];
const discovered = uniqueCards
  .filter((card) => !options.only || card.chinese === options.only || card.english === options.only);
if (options.only && !discovered.length) fail(`找不到可完整解析的資料卡：${options.only}`);
const missing = [...new Map(discovered.filter((card) => !known.has(card.english)).map((card) => [card.english, card])).values()];
console.log(`來源：${sourceOf(sourceRoot)}\n完整資料卡：${discovered.length}\n詞彙表缺少主標題：${missing.length}`);
for (const card of discovered) console.log(`${options.apply ? "寫入" : "預覽"}：${card.chinese} (${card.english}) → 怪物/2014/${card.folder}/${card.chinese}.md`);
for (const card of missing) console.log(`待補詞彙：${card.english} | ${card.chinese} | ${card.source}；${card.locator}`);
for (const duplicate of duplicateEnglish) console.log(`略過重複英文資料卡：${duplicate.english}；保留 ${duplicate.selected.source}，未吸收 ${duplicate.skipped.source}`);
if (options.apply && missing.length) fail("仍有主標題詞彙未登錄；請先審核並補入詞彙表後再使用 --apply。");
const pending = [];
function queue(destination, content, source, locator) {
  const target = path.relative(ROOT, destination).split(path.sep).join("/");
  if (fs.existsSync(destination) && !options.replace) {
    options.results.push({ target, status: "skipped", reason: "existing_page_preserved" });
    return;
  }
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === content) {
    options.results.push({ target, status: "unchanged" });
    return;
  }
  pending.push(candidateChange({ destination, before, after: content, operation: before === null ? "create" : "update", source, locator }));
  options.results.push({ target, status: "preview" });
}
for (const card of discovered) {
  queue(path.join(outputRoot, card.folder, `${card.chinese}.md`), render(card), card.source, card.locator);
}
for (const [folder, cardsInFolder] of Object.entries(Object.groupBy(discovered, (card) => card.folder))) {
  const indexPath = path.join(outputRoot, folder, `2014${folder}索引.md`);
  const existing = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : null;
  const content = renderIndex(folder, cardsInFolder);
  if (existing !== content) pending.push(candidateChange({ destination: indexPath, before: existing, after: content, operation: existing === null ? "create" : "update", source: cardsInFolder[0].source, locator: "Wiki 導覽結構" }));
}
const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
if (options.report) {
  const reportPath = path.resolve(ROOT, options.report);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ ...plan, publication_id: publicationId, category: "monsters", results: options.results }, null, 2)}\n`, "utf8");
}
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
