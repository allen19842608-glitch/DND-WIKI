import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, candidateChange, identityFields, loadIngestProfile, loadPublication, parseOptions, planCandidateBatch, versionForPublication, writeIngestReport } from "../core/ingest-publication-utils.mjs";
import { withIndexEffects } from "../core/index-candidates.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";
import { mirrorEntityPage, mirrorEvidenceFiles } from "../core/mirror-entity-page.mjs";
import { resolveClassSourceTitle } from "../core/class-source-title.mjs";
import { analyzeClassReplacement, prepareExistingClassCitation } from "../core/class-replacement-review.mjs";
import { configuredFlatPlayerOptions } from "../core/flat-player-option-source.mjs";
import { siblingClassCitationCandidates } from "../core/sibling-class-candidates.mjs";
import { createAuditReport } from "../core/character-options-lib.mjs";

const root = ROOT;
const glossaryPath = path.join(root, "附件", "翻譯詞彙表.md");
const options = parseOptions(process.argv.slice(2), { extraBooleanOptions: ["--force", "--diff"] });
if (options.apply) throw new Error("職業解析器不直接寫入 Wiki；請先以 wiki:preview 儲存候選計畫，再以 wiki:apply 套用。");
const { apply, replace, only, report, results } = options;
const diff = Boolean(options.diff);
const publicationId = process.argv.includes("--publication") ? options.publicationId : "PHB2024";
const pending = [];
const mirrorSources = new Set();
const flatSourceFiles = [];
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const sourceRoot = options.source ? path.resolve(root, options.source) : path.join(root, profile.source_root);
const rawRoot = path.join(sourceRoot, profile.inputs.classes ?? "角色職業");
const outputRoot = path.join(root, profile.outputs.classes ?? "wiki/職業");
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
if (profile.inputs.class_sources?.layout === "sibling" && (options.source || diff)) {
  throw new Error("相鄰職業來源由出版品設定逐檔指定；不接受 --source 或舊式 --diff，請使用 --report 查看差異。");
}

if (!fs.existsSync(rawRoot)) {
  results.push({ source: path.relative(root, rawRoot).replaceAll("\\", "/"), status: "incomplete", reason: "configured_class_input_missing" });
  writeIngestReport({ options, publicationId, category: "classes" });
  process.exit(0);
}

if (profile.inputs.class_sources?.layout === "sibling") {
  const adapter = siblingClassCitationCandidates({ root, profile, publication, publicationId, only, replace });
  const audit = createAuditReport({ publicationId, publication, profile });
  const knownEnglish = new Set(adapter.results.map((item) => item.english_name).filter(Boolean));
  const mirrorOnly = audit.entities.filter((item) => ["classes", "subclasses"].includes(item.category)
    && !knownEnglish.has(item.english_name)
    && (!only || [item.english_name, item.wiki_target, item.source?.locator]
      .some((value) => String(value ?? "").normalize("NFKC").toLowerCase()
        .includes(String(only).normalize("NFKC").toLowerCase()))))
    .map((item) => ({ category: item.category, english_name: item.english_name,
      source: item.source, wiki_target: item.wiki_target, status: item.status,
      reason: item.reasons?.join("；") ?? "english_mirror_entity_without_sibling_source",
      review: item.reasons ?? [] }));
  results.push(...adapter.results, ...mirrorOnly);
  pending.push(...adapter.changes);
  const plan = planCandidateBatch(pending, { root, lint: lintWiki,
    sourceFiles: [path.relative(root, rawRoot).replaceAll("\\", "/"), ...adapter.sourceFiles,
      ...mirrorEvidenceFiles({ root, profile, kind: "class" })],
    dependencyFiles: [`config/ingest-profiles/${publicationId}.yml`, "config/publications.yml",
      "config/ingest-dispatch.json", "附件/翻譯詞彙表.md"],
  });
  options.candidates = pending;
  writeIngestReport({ options, publicationId, category: "classes", extra: {
    changes: plan.changes, source_fingerprints: plan.source_fingerprints,
    dependency_fingerprints: plan.dependency_fingerprints, summary: plan.summary, lint: plan.lint,
    source_inventory: adapter.inventory,
  } });
  if (!report) console.log(`相鄰職業來源 ${adapter.inventory.length} 份；另有無相鄰來源的鏡像實體 ${mirrorOnly.length} 筆；候選 ${pending.length} 項。`);
  process.exit(0);
}

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

function frontmatter({ chinese, english, entryType, parentClass, source, locator, supplementalSource, mirror }) {
  const tags = entryType === "職業" ? `  - "職業_${chinese}"` : `  - "子職_${parentClass}"`;
  const parent = entryType === "子職" ? `parent_class: "${q(parentClass)}"\n` : "";
  const supplemental = supplementalSource ? `\n  - file: "${q(supplementalSource)}"\n    locator: "L1 標題：${q(chinese)}法術列表"\n    authority: "官方"\n    translation: "community"` : "";
  const mirrorCitation = `  - file: "${q(mirror.file)}"\n    locator: "${q(mirror.locator)}"\n    url: "${q(mirror.url)}"\n    authority: "官方"\n    translation: "none"\n`;
  const title = `${chinese} (${english})`;
  const identity = identityFields({ publicationId, publication, kind: entryType === "職業" ? "class" : "subclass", concept: english, title, source });
  return `---\ntitle: "${q(title)}"\n${identity}\ncategory: "職業"\nentry_type: "${entryType}"\n${parent}version: "${versionForPublication(publication)}"\ntags:\n  - "${q(publication.wiki.tag)}"\n${tags}\nsources:\n${mirrorCitation}  - file: "${q(source)}"\n    locator: "${q(locator)}"\n    authority: "官方"\n    translation: "community"${supplemental}\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "${q(publication.canonical_rules_source)}"\nerrata: []\nupdated: "${updated}"\n---`;
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

function classPage(meta, lines, source, subclasses, spellSource, spellLines, mirror) {
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
  return `${frontmatter({ ...meta, entryType: "職業", source, locator: sourceLocator(lines, meta.rawChinese ?? meta.chinese), supplementalSource: spellSource, mirror })}\n\n# ${meta.chinese} (${meta.english})\n\n**職業定位**：${role}\n\n## ⚙️ 規則條文 (Rule Text)\n\n### ${meta.chinese}核心特質 (Core ${meta.english} Traits)\n\n| 項目 | 內容 |\n| :--- | :--- |\n| **主要屬性 (Primary Ability)** | ${traits.primary} |\n| **生命骰 (Hit Point Die)** | ${traits.hitDie} |\n| **豁免檢定熟練** | ${traits.saves} |\n| **技能熟練** | ${traits.skills} |\n| **武器熟練** | ${traits.weapons} |\n| **護甲訓練** | ${traits.armor} |\n| **起始裝備** | ${traits.equipment} |\n\n### 📊 ${meta.chinese}特性 (Class Features)\n\n${featureTable.length ? featureTable.join("\n") : "來源未提供可解析的職業特性表。"}\n\n### 🛡️ 職業特性詳解 (Class Features Description)\n\n${detailBlocks(features)}${spellListBlock(meta, spellLines)}\n\n### 🧭 ${meta.chinese}子職 (Subclass)\n\n${subclassLinks}\n\n## 🔗 相關連結\n\n${optionLink}- [[職業索引|職業索引 (Classes Index)]]\n`;
}

function subclassPage(meta, lines, source, parentClass, mirror) {
  const features = featureBlocks(lines);
  const role = lines.slice(1).find((line) => line.trim() && !line.startsWith("**") && !line.startsWith("#"))?.trim() ?? "依來源摘要。";
  const rows = features.map((feature) => `| ${feature.level} | ${feature.chinese} |`).join("\n");
  return `${frontmatter({ ...meta, entryType: "子職", parentClass, source, locator: sourceLocator(lines, meta.rawChinese ?? meta.chinese), mirror })}\n\n# ${meta.chinese} (${meta.english})\n\n**子職定位**：${role}\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 子職特性表\n\n| 職業等級 | 子職特性 |\n| :--: | :--- |\n${rows || "| 依來源 | 待補齊 |"}\n\n### 子職特性詳解\n\n${detailBlocks(features)}\n\n## 🔗 相關連結\n\n- [[${parentClass}|${parentClass}]]\n`;
}

function classGroups() {
  if (profile.inputs.flat_player_options?.subclasses?.length && !profile.inputs.class_sources) return [];
  const declared = profile.inputs.class_sources;
  if (declared?.layout === "flat") {
    const entries = [declared.parent, ...(declared.subclasses ?? [])];
    if (!declared.parent || entries.some((item) => !item?.file || !item.chinese || !item.english || path.basename(item.file) !== item.file || !item.file.endsWith(".md"))) {
      throw new Error("inputs.class_sources 的平鋪檔案對照不完整或路徑不安全。");
    }
    const byFile = new Map(entries.map((item) => [item.file, item]));
    if (byFile.size !== entries.length) throw new Error("inputs.class_sources 不可重複指定同一來源檔。");
    for (const item of entries) if (!fs.existsSync(path.join(rawRoot, item.file))) {
      results.push({ source: path.relative(root, path.join(rawRoot, item.file)).replaceAll("\\", "/"), status: "incomplete", reason: "configured_class_entity_missing" });
    }
    for (const file of fs.readdirSync(rawRoot).filter((name) => name.endsWith(".md") && !byFile.has(name))) {
      results.push({ source: path.relative(root, path.join(rawRoot, file)).replaceAll("\\", "/"), status: "out_of_scope", reason: "not_configured_as_class_entity" });
    }
    return [{ sourceDir: rawRoot, classSource: declared.parent.file, sourceFiles: entries.filter((item) => fs.existsSync(path.join(rawRoot, item.file))).map((item) => item.file), byFile }];
  }
  const groups = fs.readdirSync(rawRoot, { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => {
    const sourceDir = path.join(rawRoot, item.name);
    return { sourceDir, classSource: `${item.name}.md`, sourceFiles: fs.readdirSync(sourceDir).filter((name) => name.endsWith(".md") && !name.includes("法術列表")) };
  });
  if (!groups.length) results.push({ source: path.relative(root, rawRoot).replaceAll("\\", "/"), status: "incomplete", reason: "class_input_structure_unsupported" });
  return groups;
}

// Books with only standalone subclass files do not have a parent-class overview
// to rebuild. Cite their own verified mirror page in existing Wiki pages only.
if (profile.inputs.flat_player_options?.subclasses?.length && !profile.inputs.class_sources) {
  if (options.source) throw new Error("平鋪子職由出版品設定逐檔指定來源，不接受 --source 覆寫。");
  const flat = configuredFlatPlayerOptions({ root, profile, category: "subclasses" });
  for (const item of flat) {
    if (item.structure.reason !== "flat_option_source_missing") flatSourceFiles.push(item.source);
    const output = path.join(outputRoot, item.parent_class, `${item.chinese}.md`);
    const target = path.relative(root, output).replaceAll("\\", "/");
    const evidence = { target, english_name: item.english,
      translation_source: { file: item.source, locator: item.structure.locator ?? null },
      source_structure: item.structure };
    if (only && ![target, item.chinese, item.english, item.source].some((value) =>
      value.normalize("NFKC").toLowerCase().includes(only.normalize("NFKC").toLowerCase()))) {
      results.push({ ...evidence, status: "filtered" });
      continue;
    }
    if (item.structure.status !== "parsed") {
      results.push({ ...evidence, status: "incomplete", reason: item.structure.reason });
      continue;
    }
    if (!item.parent_english || translations.get(item.english) !== item.chinese) {
      results.push({ ...evidence, status: "incomplete", reason: "flat_subclass_identity_or_translation_unapproved" });
      continue;
    }
    const mirror = mirrorEntityPage({ root, profile, publicationId, english: item.english,
      kind: "subclass", parentClass: item.parent_english });
    if (mirror.status !== "matched") {
      results.push({ ...evidence, status: mirror.status, reason: mirror.reason });
      continue;
    }
    if (!fs.existsSync(output)) {
      results.push({ ...evidence, mirror_page: mirror.page, status: "missing",
        reason: "flat_subclass_wiki_page_missing_requires_content_review" });
      continue;
    }
    if (!replace && !diff) {
      results.push({ ...evidence, mirror_page: mirror.page, status: "skipped", reason: "existing_page_preserved" });
      continue;
    }
    const before = fs.readFileSync(output, "utf8");
    const prepared = prepareExistingClassCitation({ before, source: item.source, mirror,
      english: item.english, chinese: item.chinese, entryType: "子職", parentClass: item.parent_class,
      publicationId, version: versionForPublication(publication) });
    if (!["ready", "unchanged"].includes(prepared.status)) {
      results.push({ ...evidence, mirror_page: mirror.page, status: prepared.status,
        reason: prepared.reason, review: prepared.review });
      continue;
    }
    if (diff) {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-flat-class-preview-"));
      const candidate = path.join(tempDir, path.basename(output));
      fs.writeFileSync(candidate, prepared.after, "utf8");
      try {
        execFileSync("git", ["diff", "--no-index", "--", output, candidate], { stdio: "inherit" });
      } catch (error) {
        if (error.status !== 1) throw error;
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      results.push({ ...evidence, mirror_page: mirror.page, status: "diff" });
      continue;
    }
    if (prepared.status === "ready") pending.push(candidateChange({
      destination: output, before, after: prepared.after, operation: "update",
      source: item.source, locator: item.structure.locator, status: "manual_review",
      review: ["僅補英文鏡像子職自身頁碼引註；人工正文、識別碼、版本與 AL 判定不變。",
        ...(item.structure.sidecars.length ? ["來源另含數據卡，規則內容須獨立覆核。"] : [])],
    }));
    mirrorSources.add(mirror.file);
    mirrorSources.add(mirror.manifest_file);
    results.push({ ...evidence, mirror_page: mirror.page,
      status: prepared.status === "ready" ? "manual_review" : "unchanged",
      reason: prepared.status === "ready" ? "flat_subclass_content_requires_review" : undefined,
      candidate_preserves_existing: true });
  }
}

function existingEnglishBySource(source, directory) {
  if (!fs.existsSync(directory)) return undefined;
  const matches = [];
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".md"))) {
    const content = fs.readFileSync(path.join(directory, file), "utf8");
    if (!content.includes(`file: "${source}"`)) continue;
    if (!content.includes(`entity_id: "entry:${publicationId}:`)) continue;
    const english = content.match(/^title:\s*"[^"\n]+ \(([^()]+)\)"\s*$/m)?.[1];
    if (english) matches.push(english);
  }
  if (new Set(matches).size > 1) throw new Error(`同一來源對應多個英文實體：${source}`);
  return matches[0];
}

function classMeta(lines, directory, declared, sourceFile) {
  if (!declared) {
    try { return canonicalMeta(findTitle(lines), directory); } catch {
      const chinese = lines.find((line) => /^#{1,2}\s+[^#]/.test(line))?.replace(/^#{1,2}\s+/, "").trim();
      if (!chinese) throw new Error("找不到職業／子職標題。");
      const source = path.relative(root, sourceFile).replaceAll("\\", "/");
      const existing = existingEnglishBySource(source, directory);
      const approved = [...translations.entries()].filter(([, translated]) => translated === chinese).map(([english]) => english);
      return canonicalMeta(resolveClassSourceTitle(lines, { existingEnglish: existing, approvedEnglish: approved }), directory);
    }
  }
  const headings = lines.filter((line) => /^#{1,2}\s+/.test(line)).map((line) => line.replace(/^#{1,2}\s+/, "").trim());
  if (!headings.some((heading) => heading === declared.chinese || heading.startsWith(`${declared.chinese} `))) {
    throw new Error(`來源標題與設定譯名不符：${declared.file}`);
  }
  return canonicalMeta({ chinese: declared.chinese, english: declared.english }, directory);
}

for (const { sourceDir, classSource, sourceFiles, byFile } of classGroups()) {
  if (!sourceFiles.includes(classSource)) {
    results.push({ source: path.relative(root, path.join(sourceDir, classSource)).replaceAll("\\", "/"), status: "incomplete", reason: "class_overview_missing" });
    continue;
  }
  let parentMeta;
  try {
    parentMeta = classMeta(fs.readFileSync(path.join(sourceDir, classSource), "utf8").split(/\r?\n/), outputRoot, byFile?.get(classSource), path.join(sourceDir, classSource));
  } catch (error) {
    console.warn(`略過：${path.relative(root, sourceDir)}（職業總覽標題格式不符：${error.message}）`);
    results.push({ target: path.relative(root, sourceDir).replaceAll("\\", "/"), status: "blocked", reason: "class_overview_title_unresolved", review: [error.message] });
    continue;
  }
  const parentClass = parentMeta.chinese;
  const spellFile = fs.readdirSync(sourceDir).find((name) => name.endsWith("法術列表.md"));
  const spellSource = spellFile ? path.relative(root, path.join(sourceDir, spellFile)).replaceAll("\\", "/") : undefined;
  const spellLines = spellFile ? fs.readFileSync(path.join(sourceDir, spellFile), "utf8").split(/\r?\n/) : undefined;
  const outputDir = path.join(outputRoot, parentClass);
  const subclasses = sourceFiles.filter((file) => file !== classSource).flatMap((file) => {
    const lines = fs.readFileSync(path.join(sourceDir, file), "utf8").split(/\r?\n/);
    try { return featureBlocks(lines).length ? [classMeta(lines, outputDir, byFile?.get(file), path.join(sourceDir, file))] : []; } catch { return []; }
  });
  for (const file of sourceFiles) {
    const input = path.join(sourceDir, file);
    const lines = fs.readFileSync(input, "utf8").split(/\r?\n/);
    const entryType = file === classSource ? "職業" : "子職";
    if (entryType === "子職" && featureBlocks(lines).length === 0) {
      results.push({ source: path.relative(root, input).replaceAll("\\", "/"), status: "out_of_scope", reason: "class_supplement_not_subclass" });
      continue;
    }
    let meta;
    try { meta = classMeta(lines, entryType === "職業" ? outputRoot : outputDir, byFile?.get(file), input); } catch (error) {
      results.push({ source: path.relative(root, input).replaceAll("\\", "/"), status: "incomplete", reason: "class_entity_title_unresolved", review: [error.message] });
      continue;
    }
    const output = entryType === "職業" ? path.join(outputRoot, `${meta.chinese}.md`) : path.join(outputDir, `${meta.chinese}.md`);
    const filterValues = [path.relative(root, output).replaceAll("\\", "/"), meta.chinese, meta.english, path.relative(root, input).replaceAll("\\", "/")]
      .map((value) => value.normalize("NFKC").toLowerCase());
    if (only && !filterValues.some((value) => value.includes(only.normalize("NFKC").toLowerCase()))) {
      results.push({ target: path.relative(root, output).replaceAll("\\", "/"), status: "filtered" });
      continue;
    }
    const mirror = mirrorEntityPage({ root, profile, publicationId, english: meta.english, kind: entryType === "職業" ? "class" : "subclass", parentClass: parentMeta.english });
    if (mirror.status !== "matched") {
      results.push({ target: path.relative(root, output).replaceAll("\\", "/"), english_name: meta.english, status: mirror.status, reason: mirror.reason });
      continue;
    }
    if (fs.existsSync(output) && !replace && !diff) {
      console.log(`保留既有頁面（使用 --replace 才預覽來源增量候選）：${path.relative(root, output)}`);
      results.push({ target: path.relative(root, output).replaceAll("\\", "/"), english_name: meta.english, mirror_page: mirror.page, status: "skipped", reason: "existing_page_preserved" });
      continue;
    }
    const source = path.relative(root, input).replaceAll("\\", "/");
    const generated = entryType === "職業" ? classPage(meta, lines, source, subclasses, spellSource, spellLines, mirror) : subclassPage(meta, lines, source, parentClass, mirror);
    const before = fs.existsSync(output) ? fs.readFileSync(output, "utf8") : null;
    let page = generated;
    let preservation;
    if (before !== null) {
      const prepared = prepareExistingClassCitation({ before, source, mirror, english: meta.english,
        entryType, parentClass, publicationId });
      if (!["ready", "unchanged"].includes(prepared.status)) {
        results.push({ target: path.relative(root, output).replaceAll("\\", "/"), english_name: meta.english,
          mirror_page: mirror.page, status: prepared.status, reason: prepared.reason, review: prepared.review });
        continue;
      }
      page = prepared.after;
      if (before !== generated) {
        try { preservation = analyzeClassReplacement(before, generated); } catch (error) {
          preservation = { removed_fields: [], changed_protected_fields: [], removed_headings: [],
            review: [`既有職業頁無法完成內容差異評估：${error.message}；整頁重建不可直接套用。`] };
        }
      }
    }
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
      results.push({ target: path.relative(root, output).replaceAll("\\", "/"), english_name: meta.english, status: "diff" });
      continue;
    }
    const status = before === page ? "unchanged" : preservation ? "manual_review" : "ready";
    if (status !== "unchanged") pending.push(candidateChange({
      destination: output, before, after: page,
      operation: before === null ? "create" : "update",
      source, locator: source,
      status,
      review: preservation ? ["候選只補可定位的英文鏡像來源，保留既有正文與 metadata；規則內容差異仍須逐項覆核。", ...preservation.review] : [],
    }));
    mirrorSources.add(mirror.file);
    mirrorSources.add(mirror.manifest_file);
    console.log(`${status === "unchanged" ? "不變" : "預覽"}：${path.relative(root, output)}`);
    results.push({ target: path.relative(root, output).replaceAll("\\", "/"), english_name: meta.english, mirror_page: mirror.page,
      status: status === "ready" ? "preview" : status, reason: preservation ? "class_content_diff_requires_review" : undefined,
      ...(preservation ? { preservation_risk: {
        removed_fields: preservation.removed_fields, changed_protected_fields: preservation.changed_protected_fields,
        removed_headings: preservation.removed_headings,
      }, candidate_preserves_existing: true } : {}) });
  }
}

if (only && results.length && results.every((item) => ["filtered", "out_of_scope"].includes(item.status))) {
  results.push({ category: "classes", status: "missing", reason: "requested_class_entity_not_found_in_source",
    requested_entity: only, source_entity_count: results.filter((item) => item.status === "filtered").length });
}

const plan = planCandidateBatch(withIndexEffects(pending, { root: ROOT, source: "class-index" }), {
  root: ROOT, lint: lintWiki,
  sourceFiles: [path.relative(root, rawRoot).replaceAll("\\", "/"), ...flatSourceFiles,
    ...mirrorEvidenceFiles({ root, profile, kind: "class" }), ...mirrorSources],
  dependencyFiles: [`config/ingest-profiles/${publicationId}.yml`, "config/publications.yml", "附件/翻譯詞彙表.md"],
});
if (report) {
  options.candidates = pending;
  writeIngestReport({
    options,
    publicationId,
    category: "classes",
    extra: { changes: plan.changes, source_fingerprints: plan.source_fingerprints,
      dependency_fingerprints: plan.dependency_fingerprints, summary: plan.summary, lint: plan.lint },
  });
}
