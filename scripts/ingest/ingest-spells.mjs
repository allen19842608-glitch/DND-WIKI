import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  ROOT, candidateChange, defaultSource, frontmatter, loadIngestProfile, loadPublication,
  parseOptions, planCandidateBatch, writeIngestReport,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";
import { extractSpellRules } from "../core/spell-content.mjs";
import { mirrorDatasetEntityPage, mirrorEvidenceFiles } from "../core/mirror-entity-page.mjs";
import { approvedTranslationMap, assessApprovedTranslation } from "../core/approved-translation.mjs";
import { withIndexEffects } from "../core/index-candidates.mjs";

const options = parseOptions();
if (options.apply) throw new Error("法術解析器不直接寫入 Wiki；請先以 wiki:preview 儲存候選計畫，再以 wiki:apply 套用。");
const pending = [];
const staged = new Map();
const mirrorSources = new Set();
const approvedTranslations = approvedTranslationMap(fs.readFileSync(path.join(ROOT, "附件", "翻譯詞彙表.md"), "utf8"));
const publication = loadPublication(options.publicationId);
const profile = loadIngestProfile(options.publicationId);
const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
const inputDir = path.join(sourceRoot, profile.inputs.spells ?? "法術詳述");
const outputRoot = path.resolve(options.output ? path.join(ROOT, options.output) : path.join(ROOT, profile.outputs.spells ?? "wiki/法術"));
const legacy = publication.ruleset === "2014";
const linkRoot = legacy ? "法術/2014" : "法術";
const editionLabel = legacy ? "2014 Legacy" : "2024";
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const openccProgram = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const spellSourceLanguage = profile.inputs.spells_language
  ?? publication.source_assets?.find((asset) => asset.format === "directory" && asset.status === "available")?.language;
if (spellSourceLanguage && !["zh-Hans", "zh-Hant"].includes(spellSourceLanguage)) {
  throw new Error(`不支援的法術來源語言：${spellSourceLanguage}`);
}

if (!fs.existsSync(inputDir)) {
  options.results.push({
    source: path.relative(ROOT, inputDir).split(path.sep).join("/"),
    status: "incomplete",
    reason: "configured_spell_input_missing",
  });
  writeIngestReport({ options, publicationId: options.publicationId, category: "spells" });
  console.log(`待處理：找不到設定的法術來源目錄：${inputDir}`);
  process.exit(0);
}

const numerals = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const classNames = new Map([
  ["吟遊詩人", "吟遊詩人"], ["牧師", "牧師"], ["德魯伊", "德魯伊"], ["聖武士", "聖騎士"],
  ["聖騎士", "聖騎士"], ["遊俠", "遊俠"], ["術士", "術士"], ["魔契師", "契術師"],
  ["契術師", "契術師"], ["法師", "法師"], ["奇械師", "奇械師"],
]);

function ringForFile(file) {
  if (file === "戲法.md" || file === "0環.md") return { number: 0, name: "戲法", directory: "戲法" };
  const number = Number(file.match(/^(\d+)環\.md$/)?.[1]);
  if (!Number.isInteger(number) || number < 1 || number > 9) return null;
  return { number, name: `${numerals[number]}環`, directory: `${number}環` };
}

function ringForText(text) {
  const marker = String(text ?? "").match(/([零一二三四五六七八九0-9]+)環|戲法/);
  if (!marker) return null;
  if (marker[0] === "戲法") return { number: 0, name: "戲法", directory: "戲法" };
  const value = marker[1];
  const number = /^\d+$/.test(value) ? Number(value) : numerals.indexOf(value);
  return Number.isInteger(number) && number >= 1 && number <= 9 ? { number, name: `${numerals[number]}環`, directory: `${number}環` } : null;
}

function sourceLocator(spell) {
  if (typeof spell === "object") return `#### ${spell.chinese}｜${spell.english}`;
  return `#${spell.replaceAll(" ", "_").replaceAll("'", "")}`;
}

function traditional(text) {
  if (spellSourceLanguage !== "zh-Hans") return text;
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

function normalize(text) {
  return traditional(text)
    .replace(/(\d+)\s*尺/g, "$1 呎")
    .replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replaceAll("尺", "呎").replaceAll("型別", "類型")
    .replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}

function pageName(chinese) {
  return chinese.replaceAll("/", "-").replaceAll("\\", "-");
}

function walkMarkdown(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walkMarkdown(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

function currentCounterpart(english) {
  const root = path.join(ROOT, "wiki", "法術");
  return walkMarkdown(root).find((file) => !file.includes(`${path.sep}2014${path.sep}`)
    && (fs.readFileSync(file, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? "").includes(`(${english})`));
}

function wikiTarget(file) {
  return path.relative(path.join(ROOT, "wiki"), file).split(path.sep).join("/").replace(/\.md$/, "");
}

function addCurrentBacklink(current, legacyTarget, legacyTitle, source) {
  if (!current) return;
  let content = staged.get(current) ?? fs.readFileSync(current, "utf8");
  const link = `[[${legacyTarget}|${legacyTitle}]]`;
  if (content.includes(link)) return;
  content = content.replace(/(## 🔗 相關連結\r?\n\r?\n)/, `$1- ${link}\n`);
  queueWrite(current, content, source, "現行法術反向連結");
}

function queueWrite(destination, content, source, locator = null, status = "ready", review = []) {
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === content || staged.get(destination) === content) return;
  staged.set(destination, content);
  const change = candidateChange({ destination, before, after: content, operation: before === null ? "create" : "update", source, locator, status, review });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}

function queueCandidate(destination, content, matchValues = [], { mirror, english, preserveExisting = false } = {}) {
  const filter = String(options.only ?? "").normalize("NFKC").toLowerCase();
  if (filter && !matchValues.concat(destination).some((value) => String(value).normalize("NFKC").toLowerCase().includes(filter))) {
    options.results.push({ target: path.relative(ROOT, destination).replaceAll("\\", "/"), status: "filtered", reason: "only_filter" });
    return "filtered";
  }
  if (fs.existsSync(destination) && !options.replace) {
    options.results.push({ target: path.relative(ROOT, destination).replaceAll("\\", "/"), english_name: english,
      mirror_page: mirror?.page, status: "skipped", reason: "existing_page_preserved" });
    return "skipped";
  }
  const replacement = preserveExisting && fs.existsSync(destination);
  queueWrite(destination, content, matchValues.find((value) => String(value).startsWith("原始資料/")) ?? null,
    matchValues.at(-1) ?? destination, replacement ? "manual_review" : "ready",
    replacement ? ["既有法術頁可能有人工內容、版本與 AL 資訊；整頁重建僅供差異覆核。"] : []);
  if (mirror) {
    mirrorSources.add(mirror.file);
    mirrorSources.add(mirror.manifest_file);
  }
  options.results.push({ target: path.relative(ROOT, destination).replaceAll("\\", "/"),
    english_name: english, mirror_page: mirror?.page,
    status: replacement ? "manual_review" : "preview", reason: replacement ? "spell_rebuild_requires_content_review" : undefined });
  return replacement ? "manual_review" : "ready";
}

function appendIndexEntries(destination, entries, source) {
  if (!fs.existsSync(destination)) return false;
  let content = staged.get(destination) ?? fs.readFileSync(destination, "utf8");
  const additions = entries.filter((entry) => !content.includes(`/${pageName(entry.chinese)}|`))
    .map((entry) => `- [[${linkRoot}/${entry.ring.directory}/${pageName(entry.chinese)}|${entry.chinese} (${entry.english}，${editionLabel})]]`);
  if (!additions.length) return false;
  content = content.replace(/\n## 🔗 相關連結/, `\n${additions.join("\n")}\n\n## 🔗 相關連結`);
  queueWrite(destination, content, source, "法術索引反向連結");
  return true;
}

function metadata(meta, ring) {
  const school = meta.match(/^([^\s（(]+)\s+(?:[一二三四五六七八九0-9]+環|戲法)/)?.[1]?.trim()
    ?? meta.match(/(?:[一二三四五六七八九0-9]+環|戲法)\s+([^（(]+)/)?.[1]?.trim()
    ?? "待確認";
  const parenthetical = meta.match(/[（(]([^）)]+)[）)]/)?.[1] ?? "";
  const ritual = /儀式/.test(parenthetical);
  const classes = parenthetical
    .replace(/儀式[；;,、]*/g, "")
    .split(/[、，,；;]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => classNames.get(name) ?? name);
  return { school, ritual, classes, ring };
}

function field(block, name) {
  const line = block.find((item) => new RegExp(`^(?:\\*\\*)?${name}[：:]`).test(item.trim()));
  return line?.replace(/^(?:\*\*)?[^：:]+[：:](?:\*\*)?\s*/, "").trim() ?? "依來源確認";
}

function componentsDetail(components) {
  if (!/(?:^|、)M(?:[（(]|$)/.test(components)) return null;
  const material = components.match(/M[（(]([^）)]+)[）)]/)?.[1]?.trim();
  return material ? `${material}；未標示成本／不消耗` : "含材料成分；成本與消耗依來源確認";
}

function componentsMarker(components) {
  return components.replace(/([,、]\s*)?M[（(][^）)]+[）)]/u, "M").replace(/,\s*/gu, "、");
}

function rulesText(block) {
  return extractSpellRules(block);
}

function spellPage({ spell, source, ring, block, mirror }) {
  const metaLine = block.find((line) => /^_[^_]+_$/.test(line.trim()))?.replace(/^_|_$/g, "")
    ?? block.find((line) => /^(?:[一二三四五六七八九0-9]+環|[^\s]+\s+戲法)\s+/.test(line.trim()))
    ?? "";
  const details = metadata(metaLine, ring);
  const castingTime = field(block, "施法時間");
  const range = field(block, "施法距離");
  const components = field(block, "法術成分");
  const duration = field(block, "持續時間");
  const material = componentsDetail(components);
  const { effect, higher } = rulesText(block);
  const concentration = /^專注[，,]/.test(duration) ? "是" : "否";
  const ritual = details.ritual || /儀式/.test(castingTime) ? "是" : "否";
  const classes = details.classes.length ? details.classes.join("、") : "依來源確認";
  const spellTag = `法術_${ring.name}`;
  const indexName = ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`;
  const sourceLabel = `${publication.title_zh} ${publication.year}`;
  const current = legacy ? currentCounterpart(spell.english) : null;
  const currentLink = current
    ? `[[${wikiTarget(current)}|${fs.readFileSync(current, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? path.basename(current, ".md")}]]`
    : undefined;
  const lines = [
    frontmatter({ publicationId: options.publicationId, publication, kind: "spell", concept: spell.english, title: `${spell.chinese} (${spell.english})`, category: "法術", tag: spellTag, source, locator: sourceLocator(spell), mirror }),
    "",
    `# ${spell.chinese} (${spell.english})`,
    "",
    `- **環階**：${ring.name}`,
    `- **學派**：${details.school}`,
    `- **施法時間 (Casting Time)**：${castingTime}`,
    `- **施法距離 (Range)**：${range}`,
    `- **法術成分 (Components)**：${componentsMarker(components)}`,
    ...(material ? [`- **材料成本與消耗**：${material}`] : []),
    `- **持續時間 (Duration)**：${duration}`,
    `- **專注 (Concentration)**：${concentration}`,
    `- **儀式 (Ritual)**：${ritual}`,
    `- **施法職業**：${classes}`,
    "",
    "## 🔮 法術效果描述",
    "",
    `- **效果**：${effect}（來源：${sourceLabel}，法術詳述，${sourceLocator(spell)}）`,
    ...(higher ? [`- **升環施法 (At Higher Levels)**：${higher}`] : []),
    "",
    "## 🔗 相關連結",
    "",
    `- [[${linkRoot}/${ring.directory}/${indexName}|${indexName} (${editionLabel})]]`,
    ...(currentLink ? [`- ${currentLink}`] : []),
    "",
  ];
  if (!effect) throw new Error(`${spell.english} 未擷取到效果；停止產生占位頁。`);
  return lines.join("\n");
}

const spellsByRing = new Map();
const inputFiles = fs.statSync(inputDir).isFile()
  ? [inputDir]
  : fs.readdirSync(inputDir).filter((name) => ringForFile(name)).map((name) => path.join(inputDir, name));
if (!inputFiles.length) options.results.push({ source: path.relative(ROOT, inputDir).split(path.sep).join("/"),
  status: "incomplete", reason: "spell_files_unresolved" });
for (const sourcePath of inputFiles) {
  const fileRing = ringForFile(path.basename(sourcePath));
  const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
  let lines;
  try {
    lines = normalize(fs.readFileSync(sourcePath, "utf8")).split(/\r?\n/);
  } catch (error) {
    if (error.code !== "translation_converter_unavailable") throw error;
    options.results.push({ source, status: "incomplete", reason: error.code, review: [error.message] });
    continue;
  }
  const headings = lines.flatMap((line, index) => {
    const match = line.match(/^####\s+(.+?)[｜|]\s*([A-Za-z][A-Za-z '\-]+)/);
    return match ? [{ index, chinese: match[1].trim(), english: match[2].trim() }] : [];
  });
  if (!headings.length) {
    options.results.push({ source, status: "incomplete", reason: "spell_headings_unresolved" });
    continue;
  }
  const spells = headings.flatMap((spell, position) => {
    const end = headings[position + 1]?.index ?? lines.length;
    const block = lines.slice(spell.index + 1, end).filter((line) => line.trim());
    const ring = fileRing ?? ringForText(block.find((line) => /^_[^_]+_$/.test(line.trim())) ?? block[0]);
    if (!ring) {
      options.results.push({ target: `${source}#${spell.english}`, status: "incomplete", reason: "spell_ring_unresolved" });
      return [];
    }
    const destination = path.join(outputRoot, ring.directory, `${pageName(spell.chinese)}.md`);
    const target = path.relative(ROOT, destination).replaceAll("\\", "/");
    const filter = String(options.only ?? "").normalize("NFKC").toLowerCase();
    if (filter && ![spell.chinese, spell.english, source, target].some((value) => value.normalize("NFKC").toLowerCase().includes(filter))) {
      options.results.push({ target, english_name: spell.english, status: "filtered", reason: "only_filter" });
      return [];
    }
    const mirror = mirrorDatasetEntityPage({ root: ROOT, profile, publicationId: options.publicationId, english: spell.english, kind: "spell" });
    const translation = assessApprovedTranslation(approvedTranslations, spell.english, spell.chinese);
    if (mirror.status !== "matched") {
      options.results.push({ source, target, english_name: spell.english, status: mirror.status, reason: mirror.reason,
        review: translation.status === "matched" ? [] : [translation.reason] });
      return [];
    }
    if (translation.status !== "matched") {
      options.results.push({ source, target, english_name: spell.english, mirror_page: mirror.page, ...translation });
      return [];
    }
    const page = spellPage({ spell, source, ring, block, mirror });
    const result = queueCandidate(destination, page, [spell.chinese, spell.english, source], { mirror, english: spell.english, preserveExisting: true });
    if (result === "ready") {
      if (legacy) addCurrentBacklink(currentCounterpart(spell.english), `${linkRoot}/${ring.directory}/${pageName(spell.chinese)}`, `${spell.chinese} (${spell.english}，${editionLabel})`, source);
      const indexName = ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`;
      appendIndexEntries(path.join(outputRoot, ring.directory, `${indexName}.md`), [{ ...spell, ring }], source);
      return [{ ...spell, ring }];
    }
    return [];
  });
  for (const spell of spells) {
    const group = spellsByRing.get(spell.ring.number) ?? { ring: spell.ring, spells: [], source };
    group.spells.push(spell);
    spellsByRing.set(spell.ring.number, group);
  }
}

for (const { ring, spells, source } of spellsByRing.values()) {
  if (options.only) continue;
  const indexName = ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`;
  const entries = spells.map((spell) => `- [[${linkRoot}/${ring.directory}/${pageName(spell.chinese)}|${spell.chinese} (${spell.english}，${editionLabel})]]`).join("\n");
  const content = `${frontmatter({ publicationId: options.publicationId, publication, kind: "spell-index", concept: `${ring.name}-spells`, title: `${ring.name}法術索引 (${editionLabel} ${ring.name} Spells Index)`, category: "法術", tag: "法術_索引", source, locator: `${ring.name}法術詳述` })}\n\n# ${ring.name}法術索引 (${editionLabel} ${ring.name} Spells Index)\n\n> 收錄《${publication.title_zh} ${publication.year}》的 ${ring.name} 法術。\n\n${entries}\n\n## 🔗 相關連結\n\n- [[${linkRoot}/法術索引|${editionLabel} 法術索引 (${editionLabel} Spells Index)]]\n`;
  const destination = path.join(outputRoot, ring.directory, `${indexName}.md`);
  if (fs.existsSync(destination)) appendIndexEntries(destination, spells, source);
  else queueCandidate(destination, content, [source, indexName]);
}

if (spellsByRing.size && !options.only) {
  const source = [...spellsByRing.values()][0].source;
  const rows = [...spellsByRing.values()].sort((a, b) => a.ring.number - b.ring.number).map(({ ring }) => {
    const name = ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`;
    return `| ${ring.number} | [[${linkRoot}/${ring.directory}/${name}\\|${name} (${editionLabel})]] |`;
  }).join("\n");
  const content = `${frontmatter({ publicationId: options.publicationId, publication, kind: "spell-index", concept: `spells-index-${publication.ruleset}`, title: `${editionLabel} 法術索引 (${editionLabel} Spells Index)`, category: "法術", tag: "法術_索引", source, locator: "法術詳述 0–9 環" })}\n\n# ${editionLabel} 法術索引 (${editionLabel} Spells Index)\n\n> 收錄《${publication.title_zh} ${publication.year}》的法術規則。${legacy ? "與現行規則不同的條目保留於此舊版索引。" : "此索引採用 2024 規則；舊版法術另見 2014 索引。"}\n\n| 環階 | 索引 |\n| :---: | :--- |\n${rows}\n\n## 🔗 相關連結\n\n- [[${legacy ? "法術/法術索引" : "索引"}|${legacy ? "現行法術索引" : "Wiki 首頁"}]]\n`;
  const destination = path.join(outputRoot, "法術索引.md");
  if (!fs.existsSync(destination)) queueCandidate(destination, content, [source, "法術索引"]);
}

const plan = planCandidateBatch(withIndexEffects(pending, { root: ROOT, source: "spell-index" }), {
  root: ROOT, lint: lintWiki,
  sourceFiles: [...inputFiles.map((file) => path.relative(ROOT, file).split(path.sep).join("/")),
    ...mirrorEvidenceFiles({ root: ROOT, profile, kind: "spell" }), ...mirrorSources],
  dependencyFiles: [`config/ingest-profiles/${options.publicationId}.yml`, "config/publications.yml", "附件/翻譯詞彙表.md"],
});
if (options.report) writeIngestReport({ options, publicationId: options.publicationId, category: "spells", extra: { changes: plan.changes,
  source_fingerprints: plan.source_fingerprints, dependency_fingerprints: plan.dependency_fingerprints,
  summary: plan.summary, lint: plan.lint } });
console.log(`預覽法術匯入：${plan.changes.length} 個候選變更；${plan.changes.length
  ? "審閱後才可用 wiki:apply 套用已儲存計畫。" : "沒有可套用候選，仍須檢查實體結果。"}`);
const resultCounts = options.results.reduce((counts, item) => {
  counts[item.status] = (counts[item.status] ?? 0) + 1;
  return counts;
}, {});
console.log(`實體結果：${Object.entries(resultCounts).map(([status, count]) => `${status} ${count}`).join("；") || "無可辨識實體"}`);
for (const item of options.results.filter((result) => result.status === "incomplete")) {
  console.log(`待處理：${item.source ?? item.target}：${item.reason}`);
}
