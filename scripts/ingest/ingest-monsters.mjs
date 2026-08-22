import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { identityFields, loadPublication, option as publicationOption, versionForPublication } from "../core/ingest-publication-utils.mjs";

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

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function usage() {
  return `用法：npm run ingest -- --category "怪物" --source "原始資料/怪物圖鑑2025" [--only "中文或英文名稱"] [--include-overviews] [--prune-stale] [--report "報告.json"] [--apply] [--replace] [--diff]\n\n預設為預覽；只有 --apply 才會建立條目。--include-overviews 會將「總」介紹頁寫入 wiki/怪物 根目錄並連結同群資料卡。--prune-stale 只移除來源已不存在的本書舊生成頁。中文名稱以原始資料為準；config/monster-name-map.json 僅用於補入英文名稱。`;
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
    const match = line.match(new RegExp(`^\\*\\*(?:${names.join("|")})\\*\\*\\s*[:：]?\\s*(.+)$`));
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

function sectionContent(lines, names) {
  const index = lines.findIndex((line) => /^#{2,4}\s+/.test(line) && names.some((name) => line.includes(name)));
  if (index < 0) return [];
  const depth = lines[index].match(/^(#+)/)[1].length;
  const content = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    const next = lines[i].match(/^(#+)\s+/);
    if (next && next[1].length <= depth) break;
    content.push(lines[i]);
  }
  return content;
}

function renderEntries(lines) {
  const compact = lines.map((line) => line.trim()).filter(Boolean).join(" ");
  if (!compact) return "";
  const matches = [...compact.matchAll(/\*\*([^*]+?)\*\*\s*[:：]?\s*/g)];
  if (!matches.length) return `- ${compact}`;
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? compact.length;
    return `- **${formatEntryName(match[1])}**：${compact.slice(start, end).trim()}`;
  }).join("\n");
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

function titleParts(lines, fallback) {
  const rawTitle = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, "").trim() ?? fallback;
  const match = rawTitle.match(/^(.+?)\s+(.+)$/);
  const english = match && /[A-Za-z]/.test(match[2]) ? match[2].trim() : undefined;
  return { chinese: (english ? match[1] : fallback).trim(), english };
}

function candidatesFromFile(file, names) {
  const lines = expandEmbeddedStatBlocks(fs.readFileSync(file, "utf8").split(/\r?\n/));
  const candidates = [];
  for (let index = 0; index < lines.length; index += 1) {
    const typeLine = lines[index];
    if (!/^\*[^*]+\*$/.test(typeLine.trim()) || !/(微型|小型|中型|大型|超大型|巨型)/.test(typeLine)) continue;
    const nextCard = lines.findIndex((line, lineIndex) => lineIndex > index && /^\*[^*]+\*$/.test(line.trim()) && /(微型|小型|中型|大型|超大型|巨型)/.test(line));
    const block = lines.slice(index, nextCard < 0 ? lines.length : nextCard);
    const titleLine = lines.map((line, lineIndex) => ({ line, lineIndex })).find(({ line }) => /^#\s+/.test(line));
    const sourceName = path.basename(file, ".md");
    const rawTitle = titleLine?.line.replace(/^#\s+/, "").trim() ?? sourceName;
    const titleMatch = rawTitle.match(/^(.+?)\s+(.+)$/);
    const titleEnglish = titleMatch && /[A-Za-z]/.test(titleMatch[2]) ? titleMatch[2].trim() : undefined;
    const chinese = (titleEnglish ? titleMatch[1] : sourceName).trim();
    const exactEnglishHeading = lines
      .map((line) => line.match(new RegExp(`^#{1,3}\\s+${escapeRegex(chinese)}\\s+(.+)$`))?.[1])
      .filter((value) => /[A-Za-z]/.test(value ?? ""))
      .find(Boolean);
    const english = titleEnglish ?? exactEnglishHeading ?? names[chinese];
    if (!/[\u3400-\u9fff]/.test(chinese)) continue;
    const ac = inlineValue(block, ["AC", "護甲等級"]);
    const hp = inlineValue(block, ["HP", "生命值"]);
    const speed = inlineValue(block, ["速度"]);
    const stats = abilityValues(block);
    if (!typeLine || !ac || !hp || !speed || !stats) continue;
    const legendaryLines = sectionContent(block, ["傳奇動作", "Legendary Actions"]);
    const lairLines = sectionContent(block, ["巢穴動作", "Lair Actions"]);
    candidates.push({
      chinese: chinese.trim(), english: english?.trim(), block, stats,
      type: typeLine.trim().slice(1, -1), ac, hp, speed,
      folder: creatureTypeFolder(typeLine.trim().slice(1, -1)),
      saves: inlineValue(block, ["豁免檢定"]), skills: inlineValue(block, ["技能"]),
      senses: inlineValue(block, ["感官"]), languages: inlineValue(block, ["語言"]),
      resistance: [inlineValue(block, ["傷害抗性", "抗性"]), inlineValue(block, ["傷害免疫", "免疫"])]
        .filter(Boolean).join("；"),
      conditionImmunity: inlineValue(block, ["狀態免疫"]), cr: inlineValue(block, ["CR", "挑戰等級"]),
      equipment: inlineValue(block, ["裝備"]),
      traits: renderEntries(sectionContent(block, ["特性", "Traits"])),
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

const names = nameMap();
const sourceFiles = markdownFiles(sourcePath);
// 「雪怪總」等檔案是生物族群介紹，不是可獨立吸收的怪物資料卡。
const overviewFiles = sourceFiles.filter((file) => path.basename(file, ".md").endsWith("總"));
const cardFiles = sourceFiles.filter((file) => !path.basename(file, ".md").endsWith("總"));
const discovered = cardFiles.flatMap((file) => candidatesFromFile(file, names))
  .filter((candidate) => !only || candidate.chinese === only || (candidate.english && normalizeEnglish(candidate.english) === normalizeEnglish(only)));
if (only && !discovered.length) fail(`找不到可完整解析的怪物：${only}`);
if (!discovered.length) {
  process.stdout.write("未發現完整怪物資料卡。來源須包含名稱、體型／類型、AC、HP、速度與六項屬性表。\n");
  process.exit(0);
}
const overviews = includeOverviews ? overviewFiles.map(overviewFromFile) : [];
const overviewByDirectory = new Map(overviews.map((overview) => [overview.directory, overview]));

const report = { create: [], existing: [], pending: [] };
for (const candidate of discovered) {
  const canonical = candidate.chinese;
  const existing = (candidate.english && existingByEnglish(candidate.english)) ?? existingByChinese(canonical);
  if (existing && !replace) { report.existing.push({ candidate, existing }); continue; }
  report.create.push({ candidate, canonical, existing });
}

process.stdout.write(`來源：${relativeSource}\n${includeOverviews ? `介紹頁：${overviews.length}` : `略過介紹頁：${overviewFiles.length}`}\n候選資料卡：${discovered.length}\n可${apply ? "建立／覆寫" : "建立"}：${report.create.length}\n既有條目（未覆寫）：${report.existing.length}\n待確認譯名：${report.pending.length}\n`);
for (const item of report.create.slice(0, 20)) process.stdout.write(`  ${apply ? "寫入" : "預覽"}：${item.canonical}${item.candidate.english ? ` (${item.candidate.english})` : ""}\n`);
for (const item of report.existing.slice(0, 20)) process.stdout.write(`  保留既有：${item.candidate.english} → ${path.relative(root, item.existing)}\n`);
for (const item of report.pending.slice(0, 20)) process.stdout.write(`  待確認譯名：${item.chinese} (${item.english ?? "英文名稱未辨識"})；${item.source} ${item.locator}\n`);
if (report.create.length > 20 || report.existing.length > 20 || report.pending.length > 20) process.stdout.write("  ……其餘項目請以 --report 匯出。\n");
if (reportPath) {
  const target = path.resolve(root, reportPath);
  if (path.relative(root, target).startsWith("..")) fail("--report 必須位於知識庫內。");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify({ source: relativeSource, generated_at: updated, overview_files: overviewFiles.map((file) => path.relative(root, file).replaceAll("\\", "/")), ...report }, null, 2)}\n`);
  process.stdout.write(`報告：${path.relative(root, target).replaceAll("\\", "/")}\n`);
}

if (!apply) process.exit(0);
fs.mkdirSync(wikiRoot, { recursive: true });
for (const item of report.create) {
  const target = path.join(wikiRoot, item.candidate.folder, `${item.canonical}.md`);
  const content = withRegistryFrontmatter(
    render(item.candidate, item.canonical, overviewByDirectory.get(path.dirname(path.resolve(root, item.candidate.source)))),
    { publicationId, publication, kind: "monster", concept: item.candidate.english ?? item.canonical, title: item.candidate.english ? `${item.canonical} (${item.candidate.english})` : item.canonical, source: item.candidate.source },
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (item.existing && path.resolve(item.existing) !== path.resolve(target) && fs.existsSync(item.existing)) fs.renameSync(item.existing, target);
  if (diff && fs.existsSync(target)) {
    const before = fs.readFileSync(target, "utf8");
    const temp = path.join(process.env.TEMP ?? root, `dnd-monster-${process.pid}.md`);
    fs.writeFileSync(temp, content);
    try { process.stdout.write(execFileSync("git", ["diff", "--no-index", "--", target, temp], { encoding: "utf8" })); } catch (error) { process.stdout.write(error.stdout ?? ""); }
    finally { fs.rmSync(temp, { force: true }); }
    if (before === content) continue;
  }
  fs.writeFileSync(target, content);
}
for (const overview of overviews) {
  const target = path.join(wikiRoot, "介紹", `${overview.chinese}介紹.md`);
  if (fs.existsSync(target) && !replace) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const related = discovered.filter((candidate) => path.dirname(path.resolve(root, candidate.source)) === overview.directory);
  fs.writeFileSync(target, withRegistryFrontmatter(
    renderOverview(overview, related),
    { publicationId, publication, kind: "monster-index", concept: overview.english ?? overview.chinese, title: `${overview.chinese}介紹${overview.english ? ` (${overview.english})` : ""}`, source: overview.source },
  ));
}
if (pruneStale) {
  const stale = fs.readdirSync(wikiRoot, { recursive: true })
    .map((entry) => path.join(wikiRoot, entry))
    .filter((file) => file.endsWith(".md") && fs.statSync(file).isFile())
    .filter((file) => {
      const text = fs.readFileSync(file, "utf8");
      const source = text.match(/^\s{4}file: "(.+)"$/m)?.[1];
      return source?.startsWith(relativeSource) && !fs.existsSync(path.resolve(root, source));
    });
  for (const file of stale) fs.rmSync(file);
  process.stdout.write(`清理失效來源頁：${stale.length}\n`);
}
