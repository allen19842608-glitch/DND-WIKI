import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import YAML from "yaml";
import { candidateChange, identityFields, loadIngestProfile, loadPublication, option as publicationOption, planCandidateBatch, versionForPublication, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { partitionTargetConflicts, withIndexEffects } from "../core/index-candidates.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = process.cwd();
const rawRoot = path.join(root, "原始資料");
const wikiRoot = path.join(root, "wiki", "怪物");
const glossaryPath = path.join(root, "附件", "翻譯詞彙表.md");
const nameMapPath = path.join(root, "config", "monster-name-map.json");
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (name) => args.includes(name);
const sourceArg = option("--source");
const only = option("--only");
const reportPath = option("--report");
const includeOverviews = has("--include-overviews");
const pruneStale = has("--prune-stale");
const apply = has("--apply") && !has("--dry-run");
const replace = has("--replace");
const diff = has("--diff");
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const publicationId = publicationOption(process.argv.slice(2), "--publication") ?? "MM2025";
const publication = loadPublication(publicationId);
const ingestProfile = loadIngestProfile(publicationId);
if (apply) fail("怪物解析器不直接寫入 Wiki；請使用 wiki:preview 產生候選，再以 wiki:apply 套用。 ");
const sourceLanguage = ingestProfile.inputs?.monsters_language
  ?? publication.source_assets?.find((asset) => asset.format === "directory" && asset.status === "available")?.language;
if (sourceLanguage && !["zh-Hans", "zh-Hant"].includes(sourceLanguage)) fail(`不支援的怪物來源語言：${sourceLanguage}`);
const python = process.platform === "win32" ? "py" : "python3";
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const openccProgram = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
let convertedSourceTexts;

function englishMirrorEvidence(candidate) {
  const outputRoot = ingestProfile.canonical_mirror?.output_root;
  if (!outputRoot) return { ok: false, reason: "出版品未設定英文鏡像資料集。" };
  const manifestPath = path.resolve(root, outputRoot, "manifest.yml");
  if (!manifestPath.startsWith(`${rawRoot}${path.sep}`)) return { ok: false, reason: "英文鏡像清單越出原始資料範圍。" };
  if (!fs.existsSync(manifestPath)) return { ok: false, reason: `英文鏡像清單不存在：${path.relative(root, manifestPath).replaceAll("\\", "/")}` };
  let manifest;
  try {
    manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return { ok: false, reason: "英文鏡像清單無法解析。" };
  }
  const chapter = (Array.isArray(manifest?.chapters) ? manifest.chapters : []).find((entry) => /Bestiary/i.test(entry.title ?? ""));
  const chapterPath = chapter?.file && path.resolve(root, chapter.file);
  if (chapterPath && !chapterPath.startsWith(`${rawRoot}${path.sep}`)) return { ok: false, reason: "英文鏡像章節越出原始資料範圍。" };
  if (!candidate.english || !chapterPath || !fs.existsSync(chapterPath)) return { ok: false, reason: "英文鏡像找不到可比對的怪物章節或英文名稱。" };
  const line = fs.readFileSync(chapterPath, "utf8").split(/\r?\n/).findIndex((value) => new RegExp(`^#{2,4}\\s+${escapeRegex(candidate.english)}\\s*$`, "i").test(value));
  if (line < 0) return { ok: false, reason: `英文鏡像 Bestiary 找不到「${candidate.english}」。` };
  // The mirrored book records a chapter start page but not an entity page.
  // Never infer a page number by counting headings or lines.
  return { ok: false, reason: `英文鏡像定位至 ${chapter.file}:L${line + 1}；僅有章節起始 p. ${chapter.page ?? "未標示"}，缺少此實體的精確頁碼。` };
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function usage() {
  return `用法：npm.cmd run wiki:preview -- --category "怪物" --publication <出版品 ID> [--only "中文或英文名稱"] [--include-overviews] [--prune-stale] [--report "reports/<計畫>.json"] [--replace] [--diff]\n\n怪物解析器只產生候選，不能以 --apply 直接寫入；先審閱儲存計畫，再以 wiki:apply 套用。--include-overviews 只把「總」介紹頁與同群資料卡的異動納入候選。--prune-stale 只把來源已不存在的本書舊生成頁列入刪除候選。中文名稱以原始資料為準；config/monster-name-map.json 僅用於補入英文名稱。`;
}

if (has("--help") || has("-h")) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!sourceArg) fail(`缺少 --source。\n${usage()}`);

const sourcePath = path.resolve(root, sourceArg);
const relativeSource = path.relative(root, sourcePath).replaceAll("\\", "/");
if (!relativeSource.startsWith("原始資料/") || relativeSource.startsWith("..") || !fs.existsSync(sourcePath)) {
  fail("--source 必須是存在的原始資料相對路徑。");
}
if (!relativeSource.includes("怪物圖鑑") && publication.content_scope !== "expansion") {
  fail("--source 必須是正式怪物書目，或已登錄的正式擴充書怪物來源。");
}

function markdownFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith(".md") ? [target] : [];
  return fs.readdirSync(target, { recursive: true })
    .map((entry) => path.join(target, entry))
    .filter((entry) => fs.statSync(entry).isFile() && entry.endsWith(".md"));
}

function normalizeEnglish(value) {
  return value.toLowerCase().replace(/\b(?:the|a|an)\b/g, "").replace(/[^a-z0-9]/g, "");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameMap() {
  const data = JSON.parse(fs.readFileSync(nameMapPath, "utf8"));
  if (!data || typeof data.names !== "object" || Array.isArray(data.names)) fail("config/monster-name-map.json 的 names 必須是物件。");
  return data.names;
}

function existingByEnglish(english) {
  if (!fs.existsSync(wikiRoot)) return undefined;
  for (const file of fs.readdirSync(wikiRoot, { recursive: true }).filter((name) => name.endsWith(".md"))) {
    const fullPath = path.join(wikiRoot, file);
    const title = fs.readFileSync(fullPath, "utf8").match(/^title:\s+"(.+?)"\s*$/m)?.[1];
    const currentEnglish = title?.match(/\(([^()]*)\)$/)?.[1];
    if (currentEnglish && normalizeEnglish(currentEnglish) === normalizeEnglish(english)) return fullPath;
  }
  return undefined;
}

function existingByChinese(chinese) {
  if (!fs.existsSync(wikiRoot)) return undefined;
  for (const file of fs.readdirSync(wikiRoot, { recursive: true }).filter((name) => name.endsWith(".md"))) {
    const fullPath = path.join(wikiRoot, file);
    const title = fs.readFileSync(fullPath, "utf8").match(/^title:\s+"(.+?)"\s*$/m)?.[1];
    if ((title?.replace(/\s*\([^()]*\)$/, "") ?? path.basename(file, ".md")) === chinese) return fullPath;
  }
  return undefined;
}

function inlineValue(lines, names) {
  for (const line of lines) {
    const normalized = line.trim().replace(/^_+|_+$/g, "");
    const match = normalized.match(new RegExp(`^(?:\\*\\*)?(?:${names.join("|")})(?:\\*\\*)?\\s*[:：]?\\s*(.+)$`));
    if (match) return match[1].trim();
  }
  return undefined;
}

const abilities = ["力量", "敏捷", "體質", "智力", "感知", "魅力"];
const creatureTypes = ["異怪", "野獸", "怪獸", "天族", "構裝", "龍類", "元素", "妖精", "邪魔", "巨人", "類人", "泥怪", "植物", "亡靈"];

function creatureTypeFolder(typeLine) {
  const body = typeLine.replace(/^(?:超巨型|超大型|巨型|大型|中型|小型|微型)(?:或(?:超巨型|超大型|巨型|大型|中型|小型|微型))*/, "").trim();
  return creatureTypes.find((type) => body.startsWith(type)) ?? "其他";
}

function abilityValues(lines) {
  const values = new Map();
  for (const line of lines) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    for (let i = 0; i < cells.length; i += 1) {
      if (!abilities.includes(cells[i])) continue;
      const score = cells[i + 1]?.match(/^\d+$/)?.[0];
      if (!score) continue;
      values.set(cells[i], { score, modifier: cells[i + 2] ?? "—", save: cells[i + 3] ?? "—" });
    }
  }
  if (values.size < 6) {
    for (const line of lines) {
      for (const label of ["力量", "敏捷", "體質", "智力", "感知", "魅力"]) {
        const match = new RegExp(`${label}\\s*(\\d+)\\s*[（(]([+−-]?\\d+)[）)]`, "u").exec(line);
        if (match) values.set(label, { score: match[1], modifier: match[2].replace("−", "-"), save: "—" });
      }
    }
  }
  return values.size === 6 ? values : undefined;
}

function expandEmbeddedStatBlocks(lines) {
  const expanded = [];
  for (const line of lines) {
    if (!line.startsWith("| ## ") || !line.includes("<br>")) {
      expanded.push(line);
      continue;
    }
    const imageMarker = line.indexOf(" |  | ![]");
    const embedded = (imageMarker < 0 ? line.slice(2) : line.slice(2, imageMarker))
      .replaceAll("<br>", "\n")
      .replaceAll("\\|", "|");
    expanded.push(...embedded.split("\n"));
  }
  return expanded;
}

const sectionNames = ["特性", "Traits", "動作", "Actions", "附贈動作", "Bonus Actions", "反應", "Reactions", "傳奇動作", "Legendary Actions", "巢穴動作", "Lair Actions", "區域效應", "Regional Effects"];

function sectionHeader(line, names = sectionNames) {
  const trimmed = line.trim();
  const title = trimmed.replace(/^#{2,4}\s+/, "").replace(/^\*+|\*+$/g, "").trim();
  return (/^#{2,4}\s+/.test(trimmed) || /^\*{2,4}[^*]+\*{2,4}$/.test(trimmed))
    && names.some((name) => title.includes(name));
}

function sectionContent(lines, names) {
  const index = lines.findIndex((line) => sectionHeader(line, names));
  if (index < 0) return [];
  const depth = lines[index].match(/^(#+)/)?.[1].length;
  const content = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    const next = lines[i].match(/^(#+)\s+/);
    if ((next && depth && next[1].length <= depth) || sectionHeader(lines[i])) break;
    content.push(lines[i]);
  }
  return content;
}

function compactTraitContent(lines) {
  const firstSection = lines.findIndex((line) => sectionHeader(line));
  const firstEntry = lines.findIndex((line) => /^\*\*[^*]+?\*\*/.test(line.trim()) && !sectionHeader(line));
  return firstEntry < 0 ? [] : lines.slice(firstEntry, firstSection < 0 ? lines.length : firstSection);
}

function renderEntries(lines) {
  const entries = [];
  const lead = [];
  let current;
  for (const sourceLine of lines) {
    const line = sourceLine.trim();
    if (!line) continue;
    // 只有原始行首的粗體名稱才是特性／動作項目。效果文字內的
    // **恐慌（Frightened）** 等狀態名稱必須保留在同一項目中。
    const match = line.match(/^\*\*([^*]+?)\*\*\s*[:：]?\s*(.*)$/);
    if (match) {
      if (current) entries.push(current);
      current = { name: formatEntryName(match[1]), body: match[2].trim().replace(/^。\s*/u, "") };
    } else if (current) {
      current.body = `${current.body} ${line}`.trim();
    } else {
      lead.push(line);
    }
  }
  if (current) entries.push(current);
  if (entries.length) {
    const rendered = entries.map((entry) => `- **${entry.name}**：${entry.body}`);
    return lead.length ? `- ${lead.join(" ")}\n${rendered.join("\n")}` : rendered.join("\n");
  }
  return lead.length ? `- ${lead.join(" ")}` : "";
}

function formatEntryName(value) {
  const cleaned = value.trim().replace(/。$/, "");
  const match = cleaned.match(/^(?<chinese>.+?)\s+(?<english>[A-Za-z][A-Za-z0-9'’\- ]*(?:（[^）]+）)?)$/);
  return match ? `${match.groups.chinese}（${match.groups.english}）` : cleaned;
}

function sectionLead(lines) {
  const compact = lines.map((line) => line.trim()).filter(Boolean).join(" ");
  const firstEntry = compact.search(/\*\*[^*]+?\*\*/);
  return (firstEntry < 0 ? compact : compact.slice(0, firstEntry)).trim();
}

function normalizeRulesText(value) {
  return value.replaceAll("_", "").replace(/(\d+)\s*尺/g, "$1 呎").replace(/(\d+)\s*天/g, "$1 天");
}

function sourceText(file) {
  if (convertedSourceTexts?.has(file)) return convertedSourceTexts.get(file);
  const text = fs.readFileSync(file, "utf8");
  if (sourceLanguage !== "zh-Hans") return text;
  try {
    if (!fs.existsSync(openccRoot)) throw new Error("OpenCC missing");
    return execFileSync(python, ["-c", openccProgram, openccRoot], {
      input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    const failure = new Error("簡體來源轉換工具不可用；此來源未完成解析。");
    failure.code = "translation_converter_unavailable";
    throw failure;
  }
}

function convertSourceTexts(files) {
  const texts = files.map((file) => fs.readFileSync(file, "utf8"));
  if (sourceLanguage !== "zh-Hans") return new Map(files.map((file, index) => [file, texts[index]]));
  if (!fs.existsSync(openccRoot)) {
    const failure = new Error("簡體來源轉換工具不可用；此來源未完成解析。");
    failure.code = "translation_converter_unavailable";
    throw failure;
  }
  const program = "import json,sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;conv=OpenCC('s2twp');sys.stdout.write(json.dumps([conv.convert(v) for v in json.load(sys.stdin)],ensure_ascii=False))";
  let converted;
  try {
    converted = JSON.parse(execFileSync(python, ["-c", program, openccRoot], {
      input: JSON.stringify(texts), encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"],
    }));
  } catch {
    const failure = new Error("簡體來源轉換工具不可用；此來源未完成解析。");
    failure.code = "translation_converter_unavailable";
    throw failure;
  }
  return new Map(files.map((file, index) => [file, converted[index]]));
}

function titleParts(lines, fallback) {
  const rawTitle = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, "").trim() ?? fallback;
  const match = rawTitle.match(/^(.+?)\s+(.+)$/);
  const english = match && /[A-Za-z]/.test(match[2]) ? match[2].trim() : undefined;
  return { chinese: (english ? match[1] : fallback).trim(), english };
}

function titleBeforeCard(lines, index) {
  return lines.slice(0, index).map((line, lineIndex) => ({ line, lineIndex })).reverse().find(({ line }) => {
    const heading = /^#{1,3}\s+(.+)$/u.exec(line)?.[1]?.trim();
    const bold = /^\*\*(.+?)\*\*$/u.exec(line)?.[1]?.trim();
    const title = heading ?? bold;
    return Boolean(title)
      && !/(?:譯者注|譯註|翻譯註)/u.test(title)
      && !sectionNames.some((name) => title === name || title.endsWith(` ${name}`));
  });
}

function normalizedCreatureType(line) {
  return line.trim().replace(/^[*_]+|[*_]+$/g, "").trim();
}

function isCreatureTypeLine(line) {
  const normalized = normalizedCreatureType(line);
  return normalized !== line.trim()
    && /(微型|小型|中型|大型|超大型|巨型)/.test(normalized);
}

function candidatesFromFile(file, names) {
  const lines = expandEmbeddedStatBlocks(sourceText(file).split(/\r?\n/));
  const candidates = [];
  for (let index = 0; index < lines.length; index += 1) {
    const typeLine = lines[index];
    if (!isCreatureTypeLine(typeLine)) continue;
    const nextCard = lines.findIndex((line, lineIndex) => lineIndex > index && isCreatureTypeLine(line));
    const block = lines.slice(index, nextCard < 0 ? lines.length : nextCard);
    // 同一來源檔可先有章節／族群介紹；資料卡應採其前最近的標題，
    // 不能一律使用檔案的第一個 H1 或轉檔占位檔名。
    const titleLine = titleBeforeCard(lines, index);
    const sourceName = path.basename(file, ".md");
    const rawTitle = titleLine?.line.replace(/^#{1,3}\s+/, "").replace(/^\*\*|\*\*$/g, "").trim() ?? sourceName;
    const titleMatch = rawTitle.match(/^(.+?)\s+([A-Za-z].*)$/);
    const titleEnglish = titleMatch?.[2]?.trim();
    const chinese = (titleEnglish ? titleMatch[1] : sourceName).trim();
    const exactEnglishHeading = lines
      .map((line) => line.match(new RegExp(`^#{1,3}\\s+${escapeRegex(chinese)}\\s+(.+)$`))?.[1])
      .filter((value) => /[A-Za-z]/.test(value ?? ""))
      .find(Boolean);
    const english = titleEnglish ?? exactEnglishHeading ?? names[chinese];
    if (!/[\u3400-\u9fff]/.test(chinese) || /(?:巢穴|區域效應)$/u.test(chinese)) continue;
    const ac = inlineValue(block, ["AC", "護甲等級"]);
    const hp = inlineValue(block, ["HP", "生命值"]);
    const speed = inlineValue(block, ["速度"]);
    const stats = abilityValues(block);
    if (!typeLine || !ac || !hp || !speed || !stats) continue;
    const legendaryLines = sectionContent(block, ["傳奇動作", "Legendary Actions"]);
    const lairLines = sectionContent(block, ["巢穴動作", "Lair Actions"]);
    candidates.push({
      chinese: chinese.trim(), english: english?.trim(), block, stats,
      type: normalizedCreatureType(typeLine), ac, hp, speed,
      folder: creatureTypeFolder(normalizedCreatureType(typeLine)),
      saves: inlineValue(block, ["豁免檢定"]), skills: inlineValue(block, ["技能"]),
      senses: inlineValue(block, ["感官"]), languages: inlineValue(block, ["語言"]),
      resistance: [inlineValue(block, ["傷害抗性", "抗性"]), inlineValue(block, ["傷害免疫", "免疫"])]
        .filter(Boolean).join("；"),
      conditionImmunity: inlineValue(block, ["狀態免疫"]), cr: inlineValue(block, ["CR", "挑戰等級"]),
      equipment: inlineValue(block, ["裝備"]),
      traits: renderEntries(sectionContent(block, ["特性", "Traits"]).length ? sectionContent(block, ["特性", "Traits"]) : compactTraitContent(block)),
      actions: renderEntries(sectionContent(block, ["動作", "Actions"])),
      bonusActions: renderEntries(sectionContent(block, ["附贈動作", "Bonus Actions"])),
      reactions: renderEntries(sectionContent(block, ["反應", "Reactions"])),
      legendaryLead: sectionLead(legendaryLines), legendary: renderEntries(legendaryLines),
      lairLead: sectionLead(lairLines), lair: renderEntries(lairLines),
      source: path.relative(root, file).replaceAll("\\", "/"), locator: `L${(titleLine?.lineIndex ?? index) + 1} 標題：${chinese.trim()}`,
    });
  }
  return candidates;
}

function overviewFromFile(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const fallback = path.basename(file, ".md").replace(/總$/, "");
  const title = titleParts(lines, fallback);
  const firstHeading = lines.findIndex((line) => /^#\s+/.test(line));
  const body = lines.slice(firstHeading + 1).map((line) => line.replace(/^(#{1,5})(\s+)/, "#$1$2"));
  return {
    ...title,
    source: path.relative(root, file).replaceAll("\\", "/"),
    locator: `L${firstHeading + 1} 標題：${title.chinese}`,
    directory: path.dirname(file),
    body,
  };
}

function quote(value) { return String(value).replaceAll('"', '\\"'); }
function displayName(entry) { return entry.english ? `${entry.chinese} (${entry.english})` : entry.chinese; }

function withRegistryFrontmatter(page, values) {
  const headerEnd = page.indexOf("\n---", 4);
  if (headerEnd < 0) throw new Error("匯入器產物缺少 Frontmatter 結尾。");
  const identity = identityFields(values);
  return page.replace(/^---\ntitle: ([^\n]+)\n/, `---\ntitle: $1\n${identity}\n`)
    .replace(/\nversion: "2024-Core"/, `\nversion: "${versionForPublication(publication)}"`)
    .replace(/\n  - "怪物圖鑑2025"/, `\n  - "${publication.wiki.tag}"`)
    .replace(/\n  - "Monster Manual \(2025\)"/, `\n  - "${publication.canonical_rules_source}"`);
}

function render(candidate, chinese, overview) {
  const stat = (name) => candidate.stats.get(name);
  const row = (names) => names.flatMap((name) => {
    const value = stat(name);
    return [`**${name}**`, value.score, value.modifier, value.save];
  }).join(" | ");
  const optional = (label, value) => value ? `\n**${label}** ${normalizeRulesText(value)}\n` : "";
  const section = (name, value) => value ? `\n### ${name}\n\n${normalizeRulesText(value)}\n` : "";
  const title = candidate.english ? `${chinese} (${candidate.english})` : chinese;
  const overviewLink = overview ? `\n- [[wiki/怪物/介紹/${overview.chinese}介紹|${overview.chinese}介紹${overview.english ? ` (${overview.english})` : ""}]]：此怪物類型的介紹與背景。\n` : "";
  candidate.legendary = candidate.legendaryLead ? `${candidate.legendaryLead}\n\n${candidate.legendary}` : candidate.legendary;
  candidate.lair = candidate.lairLead ? `${candidate.lairLead}\n\n${candidate.lair}` : candidate.lair;
  return `---\ntitle: "${quote(title)}"\ncategory: "怪物"\nversion: "2024-Core"\ntags:\n  - "怪物圖鑑2025"\n  - "生物類型_${quote(candidate.folder)}"\nsources:\n  - file: "${quote(candidate.source)}"\n    locator: "${quote(candidate.locator)}"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Monster Manual (2025)"\nerrata: []\nupdated: "${updated}"\n---\n\n# ${title}\n\n## ⚙️ 規則條文 (Rule Text)\n\n*${normalizeRulesText(candidate.type)}*\n\n**AC** ${normalizeRulesText(candidate.ac)}\n\n**HP** ${normalizeRulesText(candidate.hp)}\n\n**速度** ${normalizeRulesText(candidate.speed)}\n${optional("豁免檢定", candidate.saves)}${optional("技能", candidate.skills)}${optional("感官", candidate.senses)}${optional("語言", candidate.languages)}${optional("傷害抗性／免疫", candidate.resistance)}${optional("狀態免疫", candidate.conditionImmunity)}${optional("裝備", candidate.equipment)}${optional("CR", candidate.cr)}\n|  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |  |  | 調整 | 豁免 |\n| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |\n| ${row(["力量", "敏捷", "體質"])} |\n| ${row(["智力", "感知", "魅力"])} |\n${section("特性 (Traits)", candidate.traits)}${section("動作 (Actions)", candidate.actions)}${section("附贈動作 (Bonus Actions)", candidate.bonusActions)}${section("反應 (Reactions)", candidate.reactions)}${section("傳奇動作 (Legendary Actions)", candidate.legendary)}${section("巢穴動作 (Lair Actions)", candidate.lair)}\n## 🔗 相關連結\n${overviewLink}`;
}

function renderOverview(overview, related) {
  const title = `${overview.chinese}介紹${overview.english ? ` (${overview.english})` : ""}`;
  const links = related.length
    ? related.map((candidate) => `- [[wiki/怪物/${candidate.folder}/${candidate.chinese}|${displayName(candidate)}]]`).join("\n")
    : "- 尚無可連結的資料卡。";
  return `---\ntitle: "${quote(title)}"\ncategory: "怪物"\nversion: "2024-Core"\ntags:\n  - "怪物圖鑑2025"\n  - "怪物_介紹"\nsources:\n  - file: "${quote(overview.source)}"\n    locator: "${quote(overview.locator)}"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Monster Manual (2025)"\nerrata: []\nupdated: "${updated}"\n---\n\n# ${title}\n\n## 📖 怪物介紹\n\n${overview.body.join("\n").trim()}\n\n## 🔗 相關條目\n\n${links}\n`;
}

function sourceEvidence(files, { includeMirror = false } = {}) {
  const evidence = [relativeSource, ...files.map((file) => path.relative(root, file).replaceAll("\\", "/"))];
  if (includeMirror && ingestProfile.canonical_mirror?.output_root) {
    const manifestPath = path.resolve(root, ingestProfile.canonical_mirror.output_root, "manifest.yml");
    const withinRaw = (file) => file.startsWith(`${rawRoot}${path.sep}`);
    if (withinRaw(manifestPath) && fs.existsSync(manifestPath)) {
      evidence.push(path.relative(root, manifestPath).replaceAll("\\", "/"));
      try {
        const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
        const bestiary = (manifest?.chapters ?? []).find((entry) => /Bestiary/i.test(entry.title ?? ""));
        const chapterPath = bestiary?.file && path.resolve(root, bestiary.file);
        if (chapterPath && withinRaw(chapterPath) && fs.existsSync(chapterPath)) {
          evidence.push(path.relative(root, chapterPath).replaceAll("\\", "/"));
        }
      } catch {
        // The manifest itself remains fingerprinted; entity matching reports its invalid structure.
      }
    }
  }
  return [...new Set(evidence)];
}

const dependencyFiles = [`config/ingest-profiles/${publicationId}.yml`, "config/publications.yml",
  "config/monster-name-map.json", "附件/翻譯詞彙表.md"];
function writeUnresolvedPlan(reason, files, { status = "incomplete", requestedEntity = null, sourceEntityCount = null } = {}) {
  const plan = {
    ...planCandidateBatch([], { root, lint: lintWiki, sourceFiles: sourceEvidence(files), dependencyFiles }),
    publication_id: publicationId, category: "怪物", source: relativeSource,
    results: [{ source: relativeSource, status, reason,
      ...(requestedEntity ? { requested_entity: requestedEntity } : {}),
      ...(sourceEntityCount !== null ? { source_entity_count: sourceEntityCount } : {}) }],
  };
  if (reportPath) {
    writeCandidatePlan(plan, reportPath, { root });
    process.stdout.write(`報告：${reportPath}\n`);
  }
  process.stdout.write(`怪物預覽結果：${status}；${reason}；0 個可套用候選。\n`);
}

const names = nameMap();
const sourceFiles = markdownFiles(sourcePath);
if (!sourceFiles.length) {
  writeUnresolvedPlan("monster_markdown_files_missing", sourceFiles);
  process.exit(0);
}
try {
  convertedSourceTexts = convertSourceTexts(sourceFiles);
} catch (error) {
  if (error.code !== "translation_converter_unavailable") throw error;
  writeUnresolvedPlan(error.code, sourceFiles);
  process.exit(0);
}
// 「雪怪總」等檔案是生物族群介紹，不是可獨立吸收的怪物資料卡。
const overviewFiles = sourceFiles.filter((file) => path.basename(file, ".md").endsWith("總"));
const cardFiles = sourceFiles.filter((file) => !path.basename(file, ".md").endsWith("總"));
const allDiscovered = cardFiles.flatMap((file) => candidatesFromFile(file, names));
const discovered = allDiscovered.filter((candidate) => !only || candidate.chinese === only
  || (candidate.english && normalizeEnglish(candidate.english) === normalizeEnglish(only)));
if (only && !discovered.length && allDiscovered.length) {
  writeUnresolvedPlan("requested_monster_not_found_in_source", sourceFiles,
    { status: "missing", requestedEntity: only, sourceEntityCount: allDiscovered.length });
  process.exit(0);
}
if (!discovered.length) {
  writeUnresolvedPlan("monster_statblocks_unresolved", sourceFiles);
  process.exit(0);
}
const overviews = includeOverviews ? overviewFiles.map(overviewFromFile) : [];
const overviewByDirectory = new Map(overviews.map((overview) => [overview.directory, overview]));

const report = { create: [], existing: [], pending: [] };
for (const candidate of discovered) {
  const canonical = candidate.chinese;
  const existing = (candidate.english && existingByEnglish(candidate.english)) ?? existingByChinese(canonical);
  const mirror = englishMirrorEvidence(candidate);
  if (!mirror.ok) { report.pending.push({ candidate, canonical, existing, reason: mirror.reason }); continue; }
  if (existing && !replace) { report.existing.push({ candidate, existing }); continue; }
  report.create.push({ candidate, canonical, existing });
}

process.stdout.write(`來源：${relativeSource}\n${includeOverviews ? `介紹頁：${overviews.length}` : `略過介紹頁：${overviewFiles.length}`}\n候選資料卡：${discovered.length}\n可建立／覆寫：${report.create.length}\n既有條目（未覆寫）：${report.existing.length}\n待人工覆核：${report.pending.length}\n`);
for (const item of report.create.slice(0, 20)) process.stdout.write(`  預覽：${item.canonical}${item.candidate.english ? ` (${item.candidate.english})` : ""}\n`);
for (const item of report.existing.slice(0, 20)) process.stdout.write(`  保留既有：${item.candidate.english} → ${path.relative(root, item.existing)}\n`);
for (const item of report.pending.slice(0, 20)) process.stdout.write(`  待人工覆核：${item.canonical} (${item.candidate.english ?? "英文名稱未辨識"})；${item.reason}\n`);
if (report.create.length > 20 || report.existing.length > 20 || report.pending.length > 20) process.stdout.write("  ……其餘項目請以 --report 匯出。\n");
const outputRoot = path.resolve(root, ingestProfile.outputs?.monsters ?? "");
if (!outputRoot.startsWith(`${wikiRoot}${path.sep}`) && outputRoot !== wikiRoot) fail("怪物輸出設定必須位於 wiki/怪物/。 ");
const changes = [];
const results = [];
for (const item of report.create) {
  const target = path.join(outputRoot, item.candidate.folder, `${item.canonical}.md`);
  const content = withRegistryFrontmatter(
    render(item.candidate, item.canonical, overviewByDirectory.get(path.dirname(path.resolve(root, item.candidate.source)))),
    { publicationId, publication, kind: "monster", concept: item.candidate.english ?? item.canonical, title: item.candidate.english ? `${item.canonical} (${item.candidate.english})` : item.canonical, source: item.candidate.source },
  );
  const before = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  if (before !== content) {
    changes.push(candidateChange({ destination: target, before, after: content, operation: before === null ? "create" : "update", source: item.candidate.source, locator: item.candidate.locator }));
    results.push({ target: path.relative(root, target).replaceAll("\\", "/"), status: "preview" });
  } else results.push({ target: path.relative(root, target).replaceAll("\\", "/"), status: "unchanged" });
  if (item.existing && path.resolve(item.existing) !== path.resolve(target)) {
    changes.push(candidateChange({ destination: item.existing, before: fs.readFileSync(item.existing, "utf8"), after: null, operation: "delete", source: item.candidate.source, locator: item.candidate.locator }));
  }
}
for (const overview of overviews) {
  const target = path.join(outputRoot, "介紹", `${overview.chinese}介紹.md`);
  if (fs.existsSync(target) && !replace) {
    results.push({ target: path.relative(root, target).replaceAll("\\", "/"), status: "skipped", reason: "existing_page_preserved" });
    continue;
  }
  const related = discovered.filter((candidate) => path.dirname(path.resolve(root, candidate.source)) === overview.directory);
  const content = withRegistryFrontmatter(
    renderOverview(overview, related),
    { publicationId, publication, kind: "monster-index", concept: overview.english ?? overview.chinese, title: `${overview.chinese}介紹${overview.english ? ` (${overview.english})` : ""}`, source: overview.source },
  );
  const before = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  if (before !== content) changes.push(candidateChange({ destination: target, before, after: content, operation: before === null ? "create" : "update", source: overview.source, locator: overview.locator }));
}
if (pruneStale) {
  const stale = (fs.existsSync(outputRoot) ? fs.readdirSync(outputRoot, { recursive: true }) : [])
    .map((entry) => path.join(outputRoot, entry))
    .filter((file) => file.endsWith(".md") && fs.statSync(file).isFile())
    .filter((file) => {
      const text = fs.readFileSync(file, "utf8");
      const source = text.match(/^\s{4}file: "(.+)"$/m)?.[1];
      return source?.startsWith(relativeSource) && !fs.existsSync(path.resolve(root, source));
    });
  for (const file of stale) changes.push(candidateChange({ destination: file, before: fs.readFileSync(file, "utf8"), after: null, operation: "delete", source: relativeSource, locator: "來源已不存在" }));
  process.stdout.write(`預覽清理失效來源頁：${stale.length}\n`);
}
for (const item of report.pending) {
  const target = path.join(outputRoot, item.candidate.folder, `${item.canonical}.md`);
  const before = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  const content = withRegistryFrontmatter(
    render(item.candidate, item.canonical, overviewByDirectory.get(path.dirname(path.resolve(root, item.candidate.source)))),
    { publicationId, publication, kind: "monster", concept: item.candidate.english ?? item.canonical, title: item.candidate.english ? `${item.canonical} (${item.candidate.english})` : item.canonical, source: item.candidate.source },
  );
  changes.push(candidateChange({
    destination: target, before, after: content, operation: before === null ? "create" : "update",
    source: item.candidate.source, locator: item.candidate.locator, status: "manual_review", review: [item.reason],
  }));
  results.push({ target: path.relative(root, target).replaceAll("\\", "/"), status: "manual_review", reason: item.reason,
    source: item.candidate.source, locator: item.candidate.locator });
}
for (const item of report.existing) results.push({ target: path.relative(root, item.existing).replaceAll("\\", "/"), status: "skipped", reason: "existing_page_preserved" });
const { changes: safeChanges, conflicts, results: resolvedResults } = partitionTargetConflicts(changes, results);
if (conflicts.size) process.stdout.write(`同目標來源衝突：${resolvedResults.filter((result) => result.status === "conflict").length} 筆／${conflicts.size} 個目標；未產生可套用候選。\n`);
const plan = {
  ...planCandidateBatch(withIndexEffects(safeChanges, { root, source: "monster-index" }), {
    root, lint: lintWiki,
    sourceFiles: sourceEvidence(sourceFiles, { includeMirror: true }), dependencyFiles,
  }),
  publication_id: publicationId,
  category: "怪物",
  source: relativeSource,
  overview_files: overviewFiles.map((file) => path.relative(root, file).replaceAll("\\", "/")),
  results: resolvedResults,
};
if (reportPath) {
  writeCandidatePlan(plan, reportPath, { root });
  process.stdout.write(`報告：${reportPath}\n`);
}
