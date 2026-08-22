import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { identityFields, loadIngestProfile, loadPublication, option as publicationOption, versionForPublication } from "../core/ingest-publication-utils.mjs";

const root = process.cwd();
const glossaryPath = path.join(root, "附件", "翻譯詞彙表.md");
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");
const replace = process.argv.includes("--replace");
const diff = process.argv.includes("--diff");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : undefined;
const publicationId = publicationOption(process.argv.slice(2), "--publication") ?? "PHB2024";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const rawRoot = path.join(root, profile.source_root, profile.inputs.classes ?? "角色職業");
const outputRoot = path.join(root, profile.outputs.classes ?? "wiki/職業");
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

function translationMap() {
  const translations = new Map();
  for (const line of fs.readFileSync(glossaryPath, "utf8").split(/\r?\n/)) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 5 || cells[0] === "英文" || cells[0].startsWith(":")) continue;
    if (cells[4] === "approved") translations.set(cells[0], cells[1]);
  }
  return translations;
}

const translations = translationMap();

function existingNameByEnglish(directory, english) {
  if (!fs.existsSync(directory)) return undefined;
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".md"))) {
    const text = fs.readFileSync(path.join(directory, file), "utf8");
    const title = text.match(/^title:\s+"(.+?)"\s*$/m)?.[1] ?? text.match(/^#\s+(.+)$/m)?.[1];
    const currentEnglish = title?.match(/\(([^()]*)\)$/)?.[1];
    if (currentEnglish === english || (currentEnglish && normalizeEnglish(currentEnglish) === normalizeEnglish(english))) return path.basename(file, ".md");
  }
  return undefined;
}

function normalizeEnglish(value) {
  return value.toLowerCase().replace(/\b(?:the|a|an)\b/g, "").replace(/[^a-z0-9]/g, "");
}

function canonicalMeta(meta, existingDirectory) {
  return {
    ...meta,
    rawChinese: meta.chinese,
    chinese: existingNameByEnglish(existingDirectory, meta.english)
      ?? translations.get(meta.english)
      ?? [...translations.entries()].find(([english]) => normalizeEnglish(english) === normalizeEnglish(meta.english))?.[1]
      ?? meta.chinese,
  };
}

function q(value) {
  return String(value ?? "").replace(/"/g, '\\"');
}

function findTitle(lines) {
  const line = lines.find((value) => /^#{1,2}\s+/.test(value));
  const match = line?.match(/^#{1,2}\s+(.+?)\s+([A-Za-z].*)$/);
  if (!match) throw new Error("找不到「# 中文名稱 English Name」標題。");
  return { chinese: match[1].trim(), english: match[2].trim() };
}

function sourceLocator(lines, title) {
  const index = lines.findIndex((line) => line.includes(title));
  return `L${index + 1} 標題：${title}`;
}

function tableAfter(lines, marker) {
  const index = lines.findIndex((line) => marker.test(line));
  if (index < 0) return [];
  const table = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    if (!lines[i].trim()) {
      if (table.length) break;
      continue;
    }
    if (!lines[i].trim().startsWith("|")) {
      if (table.length) break;
      continue;
    }
    table.push(lines[i].trim());
  }
  return table;
}

function tableRows(table) {
  return table.slice(2).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function classTraits(lines) {
  const rows = tableRows(tableAfter(lines, /核心特質|Core .*Traits/));
  const find = (name) => rows.find(([label]) => name.test(label))?.[1] ?? "無";
  return {
    primary: find(/主要屬性|Primary Ability/),
    hitDie: find(/生命.*骰|Hit Point Die/),
    saves: find(/豁免.*熟練|Saving Throw/),
    skills: find(/技能.*熟練|Skill Proficiencies/),
    weapons: find(/武器.*熟練|Weapon Proficiencies/),
    armor: find(/護甲.*(?:受訓|訓練)|Armor Training/),
    equipment: find(/起始裝備|Starting Equipment/),
  };
}

function featureBlocks(lines) {
  const features = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^\*\*(\d+)級：?\s*(.+?)\s+([A-Za-z].*?)\*\*$/);
    if (!match) continue;
    const [, level, chinese, english] = match;
    const body = [];
    for (let j = i + 1; j < lines.length && !/^\*\*\d+級：/.test(lines[j]); j += 1) {
      if (lines[j].trim()) body.push(lines[j].trim());
    }
    features.push({ level, chinese: chinese.trim(), english: english.trim(), body });
  }
  return features;
}

function frontmatter({ chinese, english, entryType, parentClass, source, locator, supplementalSource }) {
  const tags = entryType === "職業" ? `  - "職業_${chinese}"` : `  - "子職_${parentClass}"`;
  const parent = entryType === "子職" ? `parent_class: "${q(parentClass)}"\n` : "";
  const supplemental = supplementalSource ? `\n  - file: "${q(supplementalSource)}"\n    locator: "L1 標題：${q(chinese)}法術列表"\n    authority: "官方"\n    translation: "community"` : "";
  const title = `${chinese} (${english})`;
  const identity = identityFields({ publicationId, publication, kind: entryType === "職業" ? "class" : "subclass", concept: english, title, source });
  return `---\ntitle: "${q(title)}"\n${identity}\ncategory: "職業"\nentry_type: "${entryType}"\n${parent}version: "${versionForPublication(publication)}"\ntags:\n  - "${q(publication.wiki.tag)}"\n${tags}\nsources:\n  - file: "${q(source)}"\n    locator: "${q(locator)}"\n    authority: "官方"\n    translation: "community"${supplemental}\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "${q(publication.canonical_rules_source)}"\nerrata: []\nupdated: "${updated}"\n---`;
}

function detailBlocks(features) {
  return features.map((feature) => {
    const blocks = [];
    let prose = [];
    for (let i = 0; i < feature.body.length; i += 1) {
      const line = feature.body[i];
      if (!line.startsWith("|")) { prose.push(line); continue; }
      let title;
      if (prose.length && /^\*\*.+\*\*$/.test(prose.at(-1))) title = prose.pop().slice(2, -2);
      const table = [];
      while (i < feature.body.length && feature.body[i].startsWith("|")) table.push(feature.body[i++]);
      i -= 1;
      blocks.push({ prose: prose.join(" "), title, table });
      prose = [];
    }
    const opening = blocks.length ? blocks[0].prose : prose.join(" ");
    if (blocks.length) blocks[0].prose = "";
    const trailing = blocks.length ? prose.join(" ") : "";
    const readable = (value) => value
      .replace(/\s+\*\s+/g, "\n  - ")
      .replace(/\*\*([^*。]+?)\s+([A-Za-z][^*。]*?)。\*\*/g, "**$1 ($2)**：")
      .replace(/\*\*([^*。]+?)。\*\*/g, "**$1**：");
    const renderedTables = blocks.map((block) => `${block.prose ? `\n\n${readable(block.prose)}` : ""}\n\n##### ${block.title ?? "相關表格"}\n\n${block.table.join("\n")}`).join("");
    return `#### ${feature.level} 級：${feature.chinese} (${feature.english})\n\n- **效果與數值**：${readable(opening) || "待依來源補齊。"}${renderedTables}${trailing ? `\n\n${readable(trailing)}` : ""}`;
  }).join("\n\n");
}

function spellListBlock(meta, spellLines) {
  if (!spellLines?.length) return "";
  const ranks = { 一: "1", 二: "2", 三: "3", 四: "4", 五: "5", 六: "6", 七: "7", 八: "8", 九: "9" };
  const body = spellLines.slice(1).join("\n").trim()
    .replaceAll(/\*\*戲法[^*]*\*\*/g, `#### 戲法（0 環${meta.chinese}法術）`)
    .replaceAll(/\*\*([一二三四五六七八九0-9]+)環[^*]*\*\*/g, (_, rank) => `#### ${ranks[rank] ?? rank} 環${meta.chinese}法術`);
  return `\n\n### ${meta.chinese}法術列表 (${meta.english} Spell List)\n\n法術依環位與英文首字母排序；「特殊」欄的 C、R、M 分別表示專注、儀式與材料成分。\n\n${body}`;
}

function classPage(meta, lines, source, subclasses, spellSource, spellLines) {
  const traits = classTraits(lines);
  const featureTable = tableAfter(lines, /特性.*Features|Features/);
  const features = featureBlocks(lines);
  const role = lines.slice(1).find((line) => line.trim() && !line.startsWith("**") && !line.startsWith("#"))?.trim() ?? "依來源摘要。";
  const subclassLinks = subclasses.map((subclass) => `- [[${subclass.chinese}|${subclass.chinese} (${subclass.english})]]：導覽：此子職的規則詳見對應頁面。`).join("\n") || "- 無。";
  const optionLink = meta.english === "Sorcerer"
    ? "- [[規則/施法規則/超魔法選項|超魔法選項 (Metamagic Options)]]\n"
    : meta.english === "Warlock"
      ? "- [[規則/施法規則/魔能祈喚選項|魔能祈喚選項 (Eldritch Invocation Options)]]\n"
      : "";
  return `${frontmatter({ ...meta, entryType: "職業", source, locator: sourceLocator(lines, meta.rawChinese ?? meta.chinese), supplementalSource: spellSource })}\n\n# ${meta.chinese} (${meta.english})\n\n**職業定位**：${role}\n\n## ⚙️ 規則條文 (Rule Text)\n\n### ${meta.chinese}核心特質 (Core ${meta.english} Traits)\n\n| 項目 | 內容 |\n| :--- | :--- |\n| **主要屬性 (Primary Ability)** | ${traits.primary} |\n| **生命骰 (Hit Point Die)** | ${traits.hitDie} |\n| **豁免檢定熟練** | ${traits.saves} |\n| **技能熟練** | ${traits.skills} |\n| **武器熟練** | ${traits.weapons} |\n| **護甲訓練** | ${traits.armor} |\n| **起始裝備** | ${traits.equipment} |\n\n### 📊 ${meta.chinese}特性 (Class Features)\n\n${featureTable.length ? featureTable.join("\n") : "來源未提供可解析的職業特性表。"}\n\n### 🛡️ 職業特性詳解 (Class Features Description)\n\n${detailBlocks(features)}${spellListBlock(meta, spellLines)}\n\n### 🧭 ${meta.chinese}子職 (Subclass)\n\n${subclassLinks}\n\n## 🔗 相關連結\n\n${optionLink}- [[職業索引|職業索引 (Classes Index)]]\n`;
}

function subclassPage(meta, lines, source, parentClass) {
  const features = featureBlocks(lines);
  const role = lines.slice(1).find((line) => line.trim() && !line.startsWith("**") && !line.startsWith("#"))?.trim() ?? "依來源摘要。";
  const rows = features.map((feature) => `| ${feature.level} | ${feature.chinese} |`).join("\n");
  return `${frontmatter({ ...meta, entryType: "子職", parentClass, source, locator: sourceLocator(lines, meta.rawChinese ?? meta.chinese) })}\n\n# ${meta.chinese} (${meta.english})\n\n**子職定位**：${role}\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 子職特性表\n\n| 職業等級 | 子職特性 |\n| :--: | :--- |\n${rows || "| 依來源 | 待補齊 |"}\n\n### 子職特性詳解\n\n${detailBlocks(features)}\n\n## 🔗 相關連結\n\n- [[${parentClass}|${parentClass}]]\n`;
}

for (const classDir of fs.readdirSync(rawRoot, { withFileTypes: true }).filter((item) => item.isDirectory())) {
  const rawParentClass = classDir.name;
  const sourceDir = path.join(rawRoot, rawParentClass);
  const sourceFiles = fs.readdirSync(sourceDir).filter((name) => name.endsWith(".md") && !name.includes("法術列表"));
  const classSource = sourceFiles.find((file) => file === `${rawParentClass}.md`);
  if (!classSource) { console.warn(`略過：${sourceDir}（找不到職業總覽檔）`); continue; }
  const parentMeta = canonicalMeta(findTitle(fs.readFileSync(path.join(sourceDir, classSource), "utf8").split(/\r?\n/)), outputRoot);
  const parentClass = parentMeta.chinese;
  const spellFile = fs.readdirSync(sourceDir).find((name) => name.endsWith("法術列表.md"));
  const spellSource = spellFile ? path.relative(root, path.join(sourceDir, spellFile)).replaceAll("\\", "/") : undefined;
  const spellLines = spellFile ? fs.readFileSync(path.join(sourceDir, spellFile), "utf8").split(/\r?\n/) : undefined;
  const outputDir = path.join(outputRoot, parentClass);
  const subclasses = sourceFiles.filter((file) => file !== `${rawParentClass}.md`).flatMap((file) => {
    const lines = fs.readFileSync(path.join(sourceDir, file), "utf8").split(/\r?\n/);
    try { return featureBlocks(lines).length ? [canonicalMeta(findTitle(lines), outputDir)] : []; } catch { return []; }
  });
  for (const file of sourceFiles) {
    const input = path.join(sourceDir, file);
    const lines = fs.readFileSync(input, "utf8").split(/\r?\n/);
    const entryType = file === `${rawParentClass}.md` ? "職業" : "子職";
    let meta;
    try { meta = canonicalMeta(findTitle(lines), entryType === "職業" ? outputRoot : outputDir); } catch { console.warn(`略過：${path.relative(root, input)}（標題格式不符）`); continue; }
    if (entryType === "子職" && featureBlocks(lines).length === 0) {
      if (!only) console.log(`略過非子職補充資料：${path.relative(root, input)}`);
      continue;
    }
    const output = entryType === "職業" ? path.join(outputRoot, `${meta.chinese}.md`) : path.join(outputDir, `${meta.chinese}.md`);
    if (only && !path.relative(root, output).replaceAll("\\", "/").includes(only)) continue;
    if (fs.existsSync(output) && !replace && !dryRun && !diff) {
      console.log(`保留既有頁面（僅預覽或使用 --replace 才覆寫）：${path.relative(root, output)}`);
      continue;
    }
    const source = path.relative(root, input).replaceAll("\\", "/");
    const page = entryType === "職業" ? classPage(meta, lines, source, subclasses, spellSource, spellLines) : subclassPage(meta, lines, source, parentClass);
    if (diff) {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-class-preview-"));
      const candidate = path.join(tempDir, path.basename(output));
      fs.writeFileSync(candidate, page, "utf8");
      try {
        execFileSync("git", ["diff", "--no-index", "--", fs.existsSync(output) ? output : candidate, candidate], { stdio: "inherit" });
      } catch (error) {
        if (error.status !== 1) throw error;
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      continue;
    }
    if (!dryRun) fs.mkdirSync(outputDir, { recursive: true });
    if (!dryRun) fs.writeFileSync(output, page, "utf8");
    console.log(`${dryRun ? "預覽" : "匯入"}：${path.relative(root, output)}`);
  }
}
