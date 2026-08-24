import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LineCounter, parseDocument } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_ROOT = path.join(ROOT, "wiki");
const PUBLICATIONS_PATH = path.join(ROOT, "config", "publications.yml");
const TAXONOMY_PATH = path.join(ROOT, "config", "taxonomy.yml");
// 原始資料不隨 GitHub Actions 提交；本機維護時可做實體存在檢查，CI 則只
// 驗證路徑格式與範圍，避免部分 checkout 的舊來源造成誤判。
const RAW_SOURCES_AVAILABLE = process.env.GITHUB_ACTIONS !== "true"
  && fs.existsSync(path.join(ROOT, "原始資料"));

const REQUIRED_FIELDS = [
  "title",
  "entity_id",
  "concept_id",
  "ruleset",
  "content_scope",
  "status",
  "category",
  "version",
  "tags",
  "sources",
  "source_type",
  "confidence",
  "rules_sources",
  "errata",
  "updated",
];
const COMPATIBILITY_2024 = new Set(["compatible", "conditional", "replaced", "review"]);

function loadPublicationRegistry() {
  const text = fs.readFileSync(PUBLICATIONS_PATH, "utf8");
  const document = parseDocument(text, { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length) throw new Error(`出版品註冊表無法解析：${document.errors[0].message}`);
  const data = document.toJS();
  if (data?.schema_version !== 2 || !data.publications) throw new Error("出版品註冊表缺少 schema_version: 2 或 publications。");
  const byTag = new Map();
  const sourceRootsByRuleset = new Map();
  for (const [id, publication] of Object.entries(data.publications)) {
    for (const field of ["entity_id", "concept_id", "ruleset", "content_scope", "status"]) {
      if (typeof publication[field] !== "string" || publication[field] === "") {
        throw new Error(`出版品 ${id} 缺少 ${field}。`);
      }
    }
    if (publication.entity_id !== `publication:${id}` || !/^publication:[a-z0-9-]+$/.test(publication.concept_id)) {
      throw new Error(`出版品 ${id} 的 entity_id 或 concept_id 格式不合法。`);
    }
    for (const tag of [publication.wiki?.tag, ...(publication.wiki?.tag_aliases ?? [])]) {
      if (typeof tag === "string") byTag.set(tag, { id, publication, canonical: publication.wiki?.tag });
    }
    for (const asset of publication.source_assets ?? []) {
      if (typeof asset.path !== "string") continue;
      const roots = sourceRootsByRuleset.get(publication.ruleset) ?? [];
      roots.push(asset.path);
      sourceRootsByRuleset.set(publication.ruleset, roots);
    }
  }
  return { byTag, sourceRootsByRuleset };
}

function loadTaxonomy() {
  const text = fs.readFileSync(TAXONOMY_PATH, "utf8");
  const document = parseDocument(text, { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length) throw new Error(`資料拓樸設定無法解析：${document.errors[0].message}`);
  const data = document.toJS();
  if (data?.schema_version !== 1 || !data.categories || typeof data.categories !== "object") {
    throw new Error("資料拓樸設定缺少 schema_version: 1 或 categories。");
  }
  return data;
}

const CATEGORIES = new Set([
  "職業",
  "法術",
  "種族",
  "背景",
  "專長",
  "怪物",
  "魔法物品",
  "規則機制",
  "戰役設定",
]);
const VERSIONS = new Set([
  "2024-Core",
  "2014-Legacy",
  "UA-Playtest",
  "Homebrew",
  "AL-Organized-Play",
]);
const CONFIDENCE = new Set(["confirmed", "interpreted", "pending"]);
const AUTHORITIES = new Set(["官方", "UA", "自訂", "社群"]);
const TRANSLATIONS = new Set(["official", "community", "none", "unknown"]);
const SOURCE_TYPES = new Map([
  ["官方", "official"],
  ["UA", "ua"],
  ["自訂", "homebrew"],
  ["社群", "community"],
]);
// 這些目錄的索引是「完整列舉型」：同層每個已建立條目都必須被索引收錄，
// 且條目本身必須連回該索引。僅作跨分類入口的索引（例如 wiki/索引.md）
// 不放入此清單，避免把導覽頁誤判為遺漏條目。
const COMPLETE_INDEX_DIRS = [
  "wiki/職業",
  "wiki/背景",
  "wiki/種族",
  "wiki/種族/2014",
  "wiki/魔法物品",
  "wiki/專長/起源專長",
  "wiki/專長/通用專長",
  "wiki/專長/戰鬥風格專長",
  "wiki/專長/史詩恩賜專長",
  "wiki/法術/戲法",
  "wiki/法術/1環",
  "wiki/法術/2環",
  "wiki/法術/3環",
  "wiki/法術/4環",
  "wiki/法術/5環",
  "wiki/法術/6環",
  "wiki/法術/7環",
  "wiki/法術/8環",
  "wiki/法術/9環",
  "wiki/法術/2014/戲法",
  "wiki/法術/2014/1環",
  "wiki/法術/2014/2環",
  "wiki/法術/2014/3環",
  "wiki/法術/2014/4環",
  "wiki/法術/2014/5環",
  "wiki/法術/2014/6環",
  "wiki/法術/2014/7環",
  "wiki/法術/2014/8環",
  "wiki/法術/2014/9環",
  "wiki/規則/核心檢定",
  "wiki/規則/動作與戰鬥",
  "wiki/規則/狀態",
  "wiki/規則/生命值與休息",
  "wiki/規則/移動與探索",
  "wiki/規則/施法規則",
  "wiki/規則/環境與危害",
  "wiki/規則/裝備與物件",
  "wiki/規則/勘誤與版本",
];

function posix(value) {
  return value.split(path.sep).join("/");
}

function repoRelative(absolutePath) {
  return posix(path.relative(ROOT, absolutePath));
}

function walk(root, includeDirectories = false) {
  const results = [];
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (includeDirectories) results.push(absolute);
      results.push(...walk(absolute, includeDirectories));
    } else if (entry.isFile()) {
      results.push(absolute);
    }
  }
  return results;
}

export function extractFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) return null;
  return {
    yaml: normalized.slice(4, end),
    body: normalized.slice(end + 5),
    bodyStartLine: normalized.slice(0, end + 5).split("\n").length,
  };
}

export function deriveSourceType(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  const authorities = new Set(sources.map((source) => source?.authority));
  if (authorities.has(undefined) || authorities.has(null)) return null;
  if (authorities.size > 1) return "mixed";
  return SOURCE_TYPES.get([...authorities][0]) ?? null;
}

export function parseWikiLink(inner) {
  const normalized = inner.replace(/\\\|/g, "|");
  const pipe = normalized.indexOf("|");
  const targetWithFragment = (pipe < 0 ? normalized : normalized.slice(0, pipe)).trim();
  const alias = pipe < 0 ? null : normalized.slice(pipe + 1).trim();
  const target = targetWithFragment.split("#", 1)[0].split("^", 1)[0].trim();
  return { target, alias };
}

function extractWikiLinks(body) {
  const links = [];
  const lines = body.split(/\r?\n/);
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const regex = /\[\[([^\]]+)\]\]/g;
    for (const match of line.matchAll(regex)) {
      links.push({
        ...parseWikiLink(match[1]),
        raw: match[0],
        inner: match[1],
        line: index + 1,
        tableLine: /^\s*\|/.test(line),
      });
    }
  }
  return links;
}

function runGit(args) {
  const result = spawnSync("git", ["-c", "core.quotepath=false", ...args], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function changedWikiFiles() {
  const candidates = new Set([
    ...runGit(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]),
    ...runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]),
    ...runGit(["ls-files", "--others", "--exclude-standard"]),
  ]);
  return [...candidates]
    .map((file) => file.replace(/\\/g, "/"))
    .filter((file) => file.startsWith("wiki/") && file.endsWith(".md"));
}

function addDiagnostic(diagnostics, severity, file, line, code, message) {
  diagnostics.push({ severity, file, line: line || 1, code, message });
}

function validateQuotedStrings(frontmatter, file, diagnostics) {
  const stringKeys = new Set([
    "title", "category", "entry_type", "parent_class", "version", "source_type",
    "confidence", "updated", "file", "locator", "authority", "translation",
  ]);
  const lines = frontmatter.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*(?:-\s+)?([A-Za-z_]+):\s*(.+?)\s*$/);
    if (!match || !stringKeys.has(match[1])) continue;
    const value = match[2];
    if (value === "[]" || (value.startsWith('"') && value.endsWith('"'))) continue;
    addDiagnostic(
      diagnostics,
      "error",
      file,
      index + 2,
      "YAML_QUOTE",
      `字串欄位 ${match[1]} 必須使用雙引號。`,
    );
  }
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s+-\s+/.test(lines[index])) continue;
    if (/^\s+-\s+[A-Za-z_]+:/.test(lines[index])) continue;
    const value = lines[index].replace(/^\s+-\s+/, "").trim();
    if (!(value.startsWith('"') && value.endsWith('"'))) {
      addDiagnostic(
        diagnostics,
        "error",
        file,
        index + 2,
        "YAML_LIST_QUOTE",
        "字串清單項目必須使用雙引號。",
      );
    }
  }
}

function validateHeadings(body, bodyStartLine, file, diagnostics) {
  const lines = body.split(/\r?\n/);
  let previous = 0;
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{1,6})\s+\S/);
    if (!match) continue;
    const level = match[1].length;
    if (previous > 0 && level > previous + 1) {
      addDiagnostic(
        diagnostics,
        "error",
        file,
        bodyStartLine + index,
        "HEADING_JUMP",
        `標題由 H${previous} 跳至 H${level}。`,
      );
    }
    previous = level;
  }
}

function makePathCatalog() {
  const all = walk(ROOT, true).map(repoRelative);
  const exact = new Set(all);
  const lower = new Map(all.map((item) => [item.toLocaleLowerCase("en-US"), item]));
  return { exact, lower };
}

function validateSourcePath(sourcePath, file, line, diagnostics, catalog) {
  if (typeof sourcePath !== "string") return;
  const normalized = sourcePath.replace(/\\/g, "/");
  if (sourcePath !== normalized) {
    addDiagnostic(diagnostics, "error", file, line, "SOURCE_SEPARATOR", "來源路徑必須使用正斜線 /。" );
  }
  if (!normalized.startsWith("原始資料/")) {
    addDiagnostic(diagnostics, "error", file, line, "SOURCE_SCOPE", "sources.file 必須位於原始資料/。" );
  }
  if (!RAW_SOURCES_AVAILABLE) return;
  const key = normalized.replace(/\/$/, "");
  if (!catalog.exact.has(key)) {
    const caseMatch = catalog.lower.get(key.toLocaleLowerCase("en-US"));
    const detail = caseMatch ? `實際路徑大小寫為 ${caseMatch}。` : "目標不存在。";
    addDiagnostic(diagnostics, "error", file, line, "SOURCE_MISSING", `來源路徑無法精確解析：${normalized}；${detail}`);
  }
}

const GENERIC_MAGIC_ITEM_EFFECT_NAMES = new Set([
  "特殊能力",
  "豁免防護",
  "物品效果",
]);

function normalizeEffectText(value) {
  return value.replace(/\s+/g, "").replace(/[。；，、]/g, "");
}

function normalizeEffectName(value) {
  return normalizeEffectText(value).replace(/[（）()：:]/g, "");
}

const EFFECT_NAME_SPLIT_SUFFIX = /(?:持續時間|持續|時長|限制與恢復|限制|恢復|使用次數|充能|耗盡與風險|耗盡|風險)$/;

export function validateMagicItemStructure(record, diagnostics) {
  if (record.data?.category !== "魔法物品") return;
  if (Array.isArray(record.data?.tags) && record.data.tags.includes("魔法物品_索引")) return;
  const pathParts = record.rel.split("/");
  if (pathParts.length < 4 || pathParts[0] !== "wiki" || pathParts[1] !== "魔法物品") return;
  const lines = record.body.split(/\r?\n/);
  const itemDataStart = lines.findIndex((line) => /^###\s+物品資料\s*$/.test(line));
  if (itemDataStart < 0) {
    addDiagnostic(
      diagnostics,
      "warning",
      record.rel,
      record.bodyStartLine,
      "MAGIC_ITEM_TEMPLATE_SECTION",
      "魔法物品條目缺少必要的「### 物品資料」區塊。",
    );
  } else {
    for (const field of ["類別 (Category)", "稀有度 (Rarity)", "同調 (Attunement)", "消耗品 (Consumable)"]) {
      if (!record.body.includes(`| ${field} |`)) {
        addDiagnostic(
          diagnostics,
          "warning",
          record.rel,
          record.bodyStartLine + itemDataStart,
          "MAGIC_ITEM_TEMPLATE_FIELD",
          `物品資料缺少必要欄位「${field}」。`,
        );
      }
    }
  }
  const sectionStart = lines.findIndex((line) => /^###\s+物品效果\s*$/.test(line));
  if (sectionStart < 0) {
    addDiagnostic(
      diagnostics,
      "warning",
      record.rel,
      record.bodyStartLine,
      "MAGIC_ITEM_TEMPLATE_SECTION",
      "魔法物品條目缺少必要的「### 物品效果」區塊。",
    );
    return;
  }
  let sectionEnd = lines.length;
  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      sectionEnd = index;
      break;
    }
  }

  for (let index = sectionStart + 1; index < sectionEnd; index += 1) {
    const line = lines[index];
    if (/^\s+- \*\*啟用／觸發\*\*：.*依效果所列時機/.test(line)) {
      addDiagnostic(
        diagnostics,
        "warning",
        record.rel,
        record.bodyStartLine + index,
        "MAGIC_ITEM_TRIGGER_PLACEHOLDER",
        "啟用／觸發不得使用「依效果所列時機」等占位文字；應依來源具體填寫或刪除該列。",
      );
    }
    if (/^\|\s*充能 \(Charges\)\s*\|\s*依效果說明\s*\|\s*$/.test(line)) {
      addDiagnostic(
        diagnostics,
        "warning",
        record.rel,
        record.bodyStartLine + index,
        "MAGIC_ITEM_CHARGE_PLACEHOLDER",
        "充能欄不得使用「依效果說明」；應移至「使用、充能與恢復」並填寫實際規則。",
      );
    }
  }

  const effectStarts = [];
  for (let index = sectionStart + 1; index < sectionEnd; index += 1) {
    const match = lines[index].match(/^- \*\*(.+?)\*\*：\s*$/);
    if (match) effectStarts.push({ index, name: match[1].trim() });
  }

  for (let effectIndex = 0; effectIndex < effectStarts.length; effectIndex += 1) {
    const effect = effectStarts[effectIndex];
    const end = effectStarts[effectIndex + 1]?.index ?? sectionEnd;
    const segment = lines.slice(effect.index + 1, end);
    const nameIsGeneric = GENERIC_MAGIC_ITEM_EFFECT_NAMES.has(effect.name)
      || /^效果\s*\d+$/.test(effect.name);
    if (nameIsGeneric) {
      addDiagnostic(
        diagnostics,
        "warning",
        record.rel,
        record.bodyStartLine + effect.index,
        "MAGIC_ITEM_EFFECT_NAME",
        `魔法物品效果「${effect.name}」過於泛用；應改用具體規則名稱。`,
      );
    }

    const effectLine = segment.find((line) => /^\s+- \*\*效果\*\*：\S/.test(line));
    if (!effectLine) {
      addDiagnostic(
        diagnostics,
        "warning",
        record.rel,
        record.bodyStartLine + effect.index,
        "MAGIC_ITEM_EFFECT_EMPTY",
        `效果「${effect.name}」缺少非空的「效果」內容。`,
      );
      continue;
    }
    const effectValue = effectLine.replace(/^\s+- \*\*效果\*\*：/, "").trim();
    for (let segmentIndex = 0; segmentIndex < segment.length; segmentIndex += 1) {
      const limitMatch = segment[segmentIndex].match(/^\s+- \*\*限制與恢復\*\*：(.*\S)\s*$/);
      if (limitMatch && normalizeEffectText(limitMatch[1]) === normalizeEffectText(effectValue)) {
        addDiagnostic(
          diagnostics,
          "warning",
          record.rel,
          record.bodyStartLine + effect.index + segmentIndex + 1,
          "MAGIC_ITEM_LIMIT_DUPLICATE",
          `效果「${effect.name}」的「限制與恢復」與效果全文重複；應只保留實際限制或恢復規則。`,
        );
      }
    }
    if (/(?:以|按)\s*\d+\s*(?:或|、|至)\s*\d+\s*(?:枚|支|瓶).*(?:為一組|售賣)|價值等同於.*藥水/.test(effectValue)) {
      addDiagnostic(
        diagnostics,
        "warning",
        record.rel,
        record.bodyStartLine + effect.index,
        "MAGIC_ITEM_EFFECT_METADATA",
        `效果「${effect.name}」看似包裝或價值資料；應移至物品資料。`,
      );
    }
  }

  for (let index = 0; index < effectStarts.length; index += 1) {
    const current = effectStarts[index];
    const currentName = normalizeEffectName(current.name);
    const earlier = effectStarts.slice(0, index);
    const repeatedPrior = earlier.find((prior) => normalizeEffectName(prior.name) === currentName);
    if (repeatedPrior) {
      addDiagnostic(
        diagnostics,
        "warning",
        record.rel,
        record.bodyStartLine + current.index,
        "MAGIC_ITEM_EFFECT_NAME_DUPLICATE",
        `效果名稱「${current.name}」與前項「${repeatedPrior.name}」重複；應合併或改用具體不同的規則名稱。`,
      );
      continue;
    }
    const splitPrior = earlier.find((prior) => {
      const priorName = normalizeEffectName(prior.name);
      const suffix = currentName.slice(priorName.length);
      return currentName.startsWith(priorName) && EFFECT_NAME_SPLIT_SUFFIX.test(suffix);
    });
    if (splitPrior) {
      addDiagnostic(
        diagnostics,
        "warning",
        record.rel,
        record.bodyStartLine + current.index,
        "MAGIC_ITEM_EFFECT_NAME_DUPLICATE",
        `效果名稱「${current.name}」疑似將「${splitPrior.name}」的持續、限制或恢復規則拆成另一項；應合併為同一效果。`,
      );
    }
  }

  const curseInEffects = effectStarts.find((effect) => effect.name === "詛咒");
  if (curseInEffects) {
    addDiagnostic(
      diagnostics,
      "warning",
      record.rel,
      record.bodyStartLine + curseInEffects.index,
      "MAGIC_ITEM_CURSE_SECTION",
      "詛咒應遷移至條件式「### 詛咒」段落，不應列於一般物品效果。",
    );
  }
  const curseStart = lines.findIndex((line) => /^###\s+詛咒\s*$/.test(line));
  if (curseStart >= 0) {
    let curseEnd = lines.length;
    for (let index = curseStart + 1; index < lines.length; index += 1) {
      if (/^#{1,3}\s+/.test(lines[index])) {
        curseEnd = index;
        break;
      }
    }
    const curseBody = lines.slice(curseStart + 1, curseEnd).join("\n");
    for (const required of ["詛咒效果", "解除方式"]) {
      if (!curseBody.includes(`**${required}**：`)) {
        addDiagnostic(
          diagnostics,
          "warning",
          record.rel,
          record.bodyStartLine + curseStart,
          "MAGIC_ITEM_CURSE_FIELD",
          `詛咒段落缺少「${required}」。`,
        );
      }
    }
  }
}

function validateFrontmatter(record, diagnostics, catalog, publications) {
  const { rel, fm, data } = record;
  for (const field of REQUIRED_FIELDS) {
    if (!(field in data)) {
      addDiagnostic(diagnostics, "error", rel, 1, "YAML_REQUIRED", `缺少必要欄位 ${field}。`);
    }
  }
  if (data.category !== undefined && !CATEGORIES.has(data.category)) {
    addDiagnostic(diagnostics, "error", rel, 1, "CATEGORY_ENUM", `category 值不合法：${data.category}`);
  }
  if (data.version !== undefined && !VERSIONS.has(data.version)) {
    addDiagnostic(diagnostics, "error", rel, 1, "VERSION_ENUM", `version 值不合法：${data.version}`);
  }
  if (data.confidence !== undefined && !CONFIDENCE.has(data.confidence)) {
    addDiagnostic(diagnostics, "error", rel, 1, "CONFIDENCE_ENUM", `confidence 值不合法：${data.confidence}`);
  }
  if (!Array.isArray(data.tags) || data.tags.length < 2 || data.tags.length > 3) {
    addDiagnostic(diagnostics, "error", rel, 1, "TAGS_SCHEMA", "tags 必須是含 2–3 個字串的區塊清單。" );
  } else if (data.tags.some((tag) => typeof tag !== "string")) {
    addDiagnostic(diagnostics, "error", rel, 1, "TAGS_TYPE", "tags 的每個項目都必須是字串。" );
  }
  const matchedPublication = Array.isArray(data.tags) ? publications.byTag.get(data.tags[0]) : null;
  if (!matchedPublication) {
    addDiagnostic(diagnostics, "error", rel, 1, "PUBLICATION_TAG", "第一標籤必須是出版品註冊表中的書名標籤。" );
  } else {
    if (data.tags[0] !== matchedPublication.canonical) {
      addDiagnostic(diagnostics, "error", rel, 1, "PUBLICATION_TAG_ALIAS", `第一標籤必須使用統一書名標籤 ${matchedPublication.canonical}。`);
    }
    for (const field of ["ruleset", "content_scope", "status"]) {
      if (data[field] !== matchedPublication.publication[field]) {
        addDiagnostic(diagnostics, "error", rel, 1, "PUBLICATION_METADATA", `${field} 必須與 ${matchedPublication.id} 的出版品註冊資料一致。`);
      }
    }
    if (typeof data.entity_id !== "string" || !data.entity_id.startsWith(`entry:${matchedPublication.id}:`)) {
      addDiagnostic(diagnostics, "error", rel, 1, "ENTITY_ID", `entity_id 必須以 entry:${matchedPublication.id}: 開頭。`);
    }
  }
  if (typeof data.concept_id !== "string" || !/^concept:[a-z0-9][a-z0-9:-]*$/.test(data.concept_id)) {
    addDiagnostic(diagnostics, "error", rel, 1, "CONCEPT_ID", "concept_id 必須為 concept: 開頭的 ASCII 穩定識別碼。" );
  }
  const legacyOption = data.ruleset === "2014"
    && data.status === "legacy"
    && ["職業", "種族", "背景", "專長"].includes(data.category)
    && !String(data.title ?? "").includes("索引");
  if (legacyOption && !COMPATIBILITY_2024.has(data.compatibility_2024)) {
    addDiagnostic(diagnostics, "error", rel, 1, "LEGACY_2024_COMPATIBILITY", "2014 Legacy 角色選項必須標示 compatibility_2024: compatible、conditional、replaced 或 review。" );
  }
  if (legacyOption && data.compatibility_2024 !== undefined && !COMPATIBILITY_2024.has(data.compatibility_2024)) {
    addDiagnostic(diagnostics, "error", rel, 1, "LEGACY_2024_COMPATIBILITY", "compatibility_2024 值不合法。" );
  }
  for (const field of ["rules_sources", "errata"]) {
    if (!Array.isArray(data[field]) || data[field].some((item) => typeof item !== "string")) {
      addDiagnostic(diagnostics, "error", rel, 1, "ARRAY_SCHEMA", `${field} 必須是字串陣列。`);
    }
  }
  if ("rules_source" in data) {
    addDiagnostic(diagnostics, "warning", rel, 1, "LEGACY_FIELD", "舊欄位 rules_source 應遷移為 rules_sources。" );
  }
  if ("last_modified_by" in data) {
    addDiagnostic(diagnostics, "warning", rel, 1, "LEGACY_FIELD", "last_modified_by 已由 Git 作者紀錄取代。" );
  }
  if (typeof data.updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) {
    addDiagnostic(diagnostics, "error", rel, 1, "UPDATED_FORMAT", "updated 必須是雙引號包覆的 YYYY-MM-DD。" );
  } else {
    const date = new Date(`${data.updated}T00:00:00Z`);
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== data.updated) {
      addDiagnostic(diagnostics, "error", rel, 1, "UPDATED_DATE", `updated 不是有效日期：${data.updated}`);
    }
  }
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    addDiagnostic(diagnostics, "error", rel, 1, "SOURCES_SCHEMA", "sources 必須是至少含一筆來源的物件清單。" );
  } else {
    for (const source of data.sources) {
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        addDiagnostic(diagnostics, "error", rel, 1, "SOURCE_OBJECT", "sources 的每個項目必須是物件。" );
        continue;
      }
      for (const field of ["file", "locator", "authority"]) {
        if (typeof source[field] !== "string" || source[field].trim() === "") {
          addDiagnostic(diagnostics, "error", rel, 1, "SOURCE_REQUIRED", `來源缺少字串欄位 ${field}。`);
        }
      }
      if (typeof source.authority === "string" && !AUTHORITIES.has(source.authority)) {
        addDiagnostic(diagnostics, "error", rel, 1, "AUTHORITY_ENUM", `authority 值不合法：${source.authority}`);
      }
      if (source.translation !== undefined && !TRANSLATIONS.has(source.translation)) {
        addDiagnostic(diagnostics, "error", rel, 1, "TRANSLATION_ENUM", `translation 值不合法：${source.translation}`);
      }
      validateSourcePath(source.file, rel, 1, diagnostics, catalog);
      if (typeof source.file === "string" && /\.html?$/i.test(source.file) && typeof source.locator === "string") {
        if (!source.locator.includes("#") && !/L\d+.*(?:標題|表格|：|:)/.test(source.locator)) {
          addDiagnostic(diagnostics, "error", rel, 1, "HTML_LOCATOR", "HTML 來源定位必須使用 #錨點，或 L行號加標題／表格列名稱。" );
        }
      }
    }
  }
  const derived = deriveSourceType(data.sources);
  if (derived && data.source_type !== derived) {
    addDiagnostic(diagnostics, "error", rel, 1, "SOURCE_TYPE", `source_type 應由來源推導為 ${derived}，目前為 ${data.source_type}。`);
  }
  const basename = path.posix.basename(rel);
  if (typeof data.title === "string" && /索引|\bIndex\b/.test(data.title) && !/索引\.md$|_index\.md$/i.test(basename)) {
    addDiagnostic(diagnostics, "error", rel, 1, "INDEX_FILENAME", "索引頁的檔名必須以「索引.md」或「_index.md」結尾。" );
  }
    if (data.category === "職業" && !/索引\.md$/.test(basename)) {
    if (!new Set(["職業", "子職"]).has(data.entry_type)) {
      addDiagnostic(diagnostics, "warning", rel, 1, "ENTRY_TYPE", "職業條目缺少合法的 entry_type。" );
    }
    if (data.entry_type === "子職") {
      if (/本特性尚未完成逐條規則摘要|待依來源定位.*補完|本頁已依子職結構重建/.test(record.body)) {
        addDiagnostic(diagnostics, "warning", rel, record.bodyStartLine, "SUBCLASS_INCOMPLETE", "子職仍含未完成規則摘要或重建占位標記。" );
      }
      if (typeof data.parent_class !== "string" || !data.parent_class) {
        addDiagnostic(diagnostics, "error", rel, 1, "PARENT_CLASS", "子職必須填寫 parent_class。" );
      } else {
        const parentFolder = rel.split("/").at(-2);
        if (parentFolder !== data.parent_class) {
          addDiagnostic(diagnostics, "error", rel, 1, "PARENT_FOLDER", `parent_class ${data.parent_class} 與資料夾 ${parentFolder} 不一致。`);
        }
        if (Array.isArray(data.tags) && data.tags[1] !== `子職_${data.parent_class}`) {
          addDiagnostic(diagnostics, "error", rel, 1, "PARENT_TAG", `第二標籤應為 子職_${data.parent_class}。`);
        }
      }
    } else if (data.entry_type === "職業" && "parent_class" in data) {
      addDiagnostic(diagnostics, "error", rel, 1, "PARENT_CLASS_EXTRA", "職業總覽不得填寫 parent_class。" );
    }
  }
  if (data.confidence === "pending" && !record.body.includes("本條目包含待確認譯名")) {
    addDiagnostic(diagnostics, "error", rel, record.bodyStartLine, "PENDING_WARNING", "pending 條目缺少待確認譯名警告區塊。" );
  }
  validateQuotedStrings(fm, rel, diagnostics);
}

function buildWikiCatalog(records) {
  const exact = new Map();
  const byBasename = new Map();
  for (const record of records) {
    exact.set(record.rel, record);
    const basename = path.posix.basename(record.rel, ".md");
    const values = byBasename.get(basename) ?? [];
    values.push(record);
    byBasename.set(basename, values);
  }
  return { exact, byBasename };
}

function resolveWikiTarget(target, catalog) {
  if (!target) return { status: "empty" };
  let clean = target.replace(/\\/g, "/");
  // 此庫的 Obsidian vault 根目錄是專案根目錄；允許以 wiki/ 指向編譯資料夾。
  if (clean.startsWith("wiki/")) clean = clean.slice("wiki/".length);
  if (clean.endsWith(".md")) return { status: "invalid-extension", target: clean };
  if (clean.includes("/")) {
    const rel = `wiki/${clean}.md`;
    return catalog.exact.has(rel) ? { status: "ok", record: catalog.exact.get(rel) } : { status: "missing", target: clean };
  }
  const matches = catalog.byBasename.get(clean) ?? [];
  if (matches.length === 1) return { status: "ok", record: matches[0] };
  // 同名的舊版條目以版本資料夾消歧義；未帶路徑的既有連結維持指向唯一的
  // 現行條目，避免新增 Legacy 版本後將現有法術等子目錄連結判為歧義。
  const currentMatches = matches.filter((record) => !record.rel.includes("/2014/"));
  if (currentMatches.length === 1) return { status: "ok", record: currentMatches[0] };
  const rootMatch = matches.find((record) => record.rel === `wiki/${clean}.md`)
    ?? matches.find((record) => record.rel.split("/").length === 3);
  if (rootMatch) return { status: "ok", record: rootMatch };
  if (matches.length > 1) return { status: "ambiguous", target: clean, matches };
  return { status: "missing", target: clean };
}

function validateLinks(record, diagnostics, catalog) {
  for (const link of record.links) {
    const absoluteLine = record.bodyStartLine + link.line - 1;
    if (link.tableLine && link.alias && !link.inner.includes("\\|")) {
      addDiagnostic(diagnostics, "error", record.rel, absoluteLine, "TABLE_PIPE", "表格中的 Wiki 連結別名管道符號必須寫成 \\|。" );
    }
    if (link.target.includes("(") || link.target.includes(")")) {
      addDiagnostic(diagnostics, "error", record.rel, absoluteLine, "LINK_TARGET_NAME", `Wiki 連結目標不得包含英文括號名稱：${link.target}`);
    }
    const resolved = resolveWikiTarget(link.target, catalog);
    if (resolved.status === "ok" || resolved.status === "empty") continue;
    if (resolved.status === "ambiguous") {
      addDiagnostic(
        diagnostics,
        "error",
        record.rel,
        absoluteLine,
        "LINK_AMBIGUOUS",
        `Wiki 連結 ${link.target} 有多個目標：${resolved.matches.map((item) => item.rel).join("、")}。`,
      );
    } else if (resolved.status === "invalid-prefix") {
      addDiagnostic(diagnostics, "error", record.rel, absoluteLine, "LINK_PREFIX", `Wiki 連結不得包含 wiki/ 前綴：${link.target}`);
    } else if (resolved.status === "invalid-extension") {
      addDiagnostic(diagnostics, "error", record.rel, absoluteLine, "LINK_EXTENSION", `Wiki 連結不得包含 .md：${link.target}`);
    } else {
      addDiagnostic(diagnostics, "error", record.rel, absoluteLine, "LINK_DEAD", `Wiki 連結目標不存在：${link.target}`);
    }
  }
}

function findDirectoryIndex(directoryRel, records) {
  const directoryName = path.posix.basename(directoryRel);
  const direct = records.filter((record) => path.posix.dirname(record.rel) === directoryRel);
  const named = direct.filter((record) => path.posix.basename(record.rel).endsWith("索引.md") && record.data.index_scope !== "curated");
  if (named.length === 1) return named[0];
  const overview = direct.find((record) => path.posix.basename(record.rel, ".md") === directoryName);
  return overview ?? null;
}

function isIndexRecord(record) {
  const basename = path.posix.basename(record.rel);
  return /索引\.md$|_index\.md$/i.test(basename)
    || (typeof record.data?.title === "string" && /索引|\bIndex\b/.test(record.data.title));
}

function validateIndexes(records, diagnostics, catalog, scope) {
  // 所有索引頁皆檢查是否重複列出同一個已解析條目。死鏈由 validateLinks
  // 以 LINK_DEAD 錯誤處理，會直接指出有問題的索引頁與連結目標。
  for (const index of records.filter(isIndexRecord)) {
    if (!scope.has(index.rel)) continue;
    const duplicateTargets = new Map();
    for (const link of index.links) {
      const resolved = resolveWikiTarget(link.target, catalog);
      if (resolved.status !== "ok") continue;
      const occurrences = duplicateTargets.get(resolved.record.rel) ?? [];
      occurrences.push(link);
      duplicateTargets.set(resolved.record.rel, occurrences);
    }
    for (const [target, occurrences] of duplicateTargets) {
      // 關聯對照表可合理地讓同一條目出現在多個列（例如一種龍紋對應兩個家族）。
      // 只對清單或混合結構中的重複導覽連結提出警告。
      if (occurrences.length > 1 && occurrences.some((link) => !link.tableLine)) {
        addDiagnostic(diagnostics, "warning", index.rel, 1, "INDEX_DUPLICATE", `索引重複連結 ${target}，共 ${occurrences.length} 次。`);
      }
    }
  }

  for (const directoryRel of COMPLETE_INDEX_DIRS) {
    const index = findDirectoryIndex(directoryRel, records);
    if (!index) {
      addDiagnostic(diagnostics, "error", directoryRel, 1, "INDEX_REQUIRED", "重點目錄缺少索引頁。" );
      continue;
    }
    if (!scope.has(index.rel)) continue;
    const linked = new Set();
    for (const link of index.links) {
      const resolved = resolveWikiTarget(link.target, catalog);
      if (resolved.status === "ok") linked.add(resolved.record.rel);
    }
    const siblings = records.filter((record) =>
      path.posix.dirname(record.rel) === directoryRel && record.rel !== index.rel,
    );
    for (const sibling of siblings) {
      if (!linked.has(sibling.rel)) {
        addDiagnostic(diagnostics, "warning", index.rel, 1, "INDEX_MISSING_ENTRY", `索引未收錄 ${path.posix.basename(sibling.rel)}。`);
      }
      const hasBacklink = sibling.links.some((link) => {
        const resolved = resolveWikiTarget(link.target, catalog);
        return resolved.status === "ok" && resolved.record.rel === index.rel;
      });
      if (!hasBacklink) {
        addDiagnostic(diagnostics, "error", sibling.rel, 1, "INDEX_BACKLINK", `條目未連回索引 ${path.posix.basename(index.rel)}。`);
      }
    }
  }
}

function validateSubclassLinks(records, diagnostics, catalog, scope) {
  for (const record of records) {
    if (!scope.has(record.rel) || record.data?.entry_type !== "子職" || typeof record.data.parent_class !== "string") continue;
    const parentRel = `wiki/職業/${record.data.parent_class}.md`;
    const parent = catalog.exact.get(parentRel);
    if (!parent) {
      addDiagnostic(diagnostics, "error", record.rel, 1, "PARENT_MISSING", `找不到父職業頁 ${parentRel}。`);
      continue;
    }
    const subclassTarget = path.posix.basename(record.rel, ".md");
    const childLinksParent = record.links.some((link) => resolveWikiTarget(link.target, catalog).record?.rel === parentRel);
    const parentLinksChild = parent.links.some((link) => resolveWikiTarget(link.target, catalog).record?.rel === record.rel);
    if (!childLinksParent) {
      addDiagnostic(diagnostics, "error", record.rel, 1, "PARENT_BACKLINK", `子職頁未連回 ${record.data.parent_class}。`);
    }
    if (record.data.version === "2014-Legacy" && record.rel.startsWith("wiki/職業/2014/")) continue;
    if (!parentLinksChild) {
      addDiagnostic(diagnostics, "error", parent.rel, 1, "SUBCLASS_LINK", `職業總覽未連結子職 ${subclassTarget}。`);
    }
  }
}

function expandScope(initial, records, catalog) {
  const initialSet = new Set(initial);
  const scope = new Set(initialSet);
  for (const record of records) {
    const related = record.links
      .map((link) => resolveWikiTarget(link.target, catalog))
      .filter((result) => result.status === "ok")
      .map((result) => result.record.rel);
    if (initialSet.has(record.rel)) {
      for (const target of related) scope.add(target);
    } else if (related.some((target) => initialSet.has(target))) {
      scope.add(record.rel);
    }
  }
  return scope;
}

function githubEscape(value) {
  return String(value).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function printDiagnostics(diagnostics, scopeSize, totalSize) {
  const order = ["error", "warning", "info"];
  const labels = { error: "錯誤", warning: "警告", info: "資訊" };
  for (const severity of order) {
    const items = diagnostics.filter((item) => item.severity === severity);
    console.log(`\n${labels[severity]} (${items.length})`);
    if (items.length === 0) {
      console.log("  無");
      continue;
    }
    for (const item of items) {
      console.log(`  ${item.file}:${item.line} [${item.code}] ${item.message}`);
      if (process.env.GITHUB_ACTIONS === "true") {
        const command = severity === "error" ? "error" : severity === "warning" ? "warning" : "notice";
        console.log(`::${command} file=${githubEscape(item.file)},line=${item.line},title=${githubEscape(item.code)}::${githubEscape(item.message)}`);
      }
    }
  }
  console.log(`\n檢查範圍：${scopeSize}/${totalSize} 個 Wiki 頁面`);
}

function validateTaxonomyLocation(record, diagnostics, taxonomy) {
  const category = taxonomy.categories?.[record.data.category];
  if (!category) return;
  const roots = [category.root, ...(category.additional_roots ?? [])];
  const normalRoots = roots.map((root) => `${root}/`);
  const legacyRoot = `${category.legacy_root}/`;
  const allowedFile = (category.allowed_files ?? []).includes(record.rel);
  if (!allowedFile && !normalRoots.some((root) => record.rel.startsWith(root))) {
    const expected = [...normalRoots, ...(category.allowed_files ?? [])].join("、");
    addDiagnostic(diagnostics, "error", record.rel, 1, "TAXONOMY_CATEGORY_PATH", `類別「${record.data.category}」必須位於 ${expected}。`);
    return;
  }
  if (record.data.ruleset === "2014" && category.legacy_root && !record.rel.startsWith(legacyRoot)) {
    addDiagnostic(diagnostics, "error", record.rel, 1, "TAXONOMY_LEGACY_PATH", `2014 Legacy 條目必須位於 ${category.legacy_root}/。`);
  }
  if (record.data.ruleset === "2024" && category.legacy_root && record.rel.startsWith(legacyRoot)) {
    addDiagnostic(diagnostics, "error", record.rel, 1, "TAXONOMY_CURRENT_PATH", `2024 條目不得位於 2014 Legacy 目錄 ${category.legacy_root}/。`);
  }
}

function validateVersionCoverage(record, diagnostics, publications) {
  const coverage = record.data.version_coverage;
  if (coverage === undefined) return;
  if (!Array.isArray(coverage) || coverage.length < 2 || coverage.some((value) => !["2014", "2024"].includes(value)) || new Set(coverage).size !== coverage.length) {
    addDiagnostic(diagnostics, "error", record.rel, 1, "VERSION_COVERAGE_FORMAT", "version_coverage 必須是無重複的版本清單，且只可使用 2014、2024。" );
    return;
  }
  if (!coverage.includes(record.data.ruleset)) {
    addDiagnostic(diagnostics, "error", record.rel, 1, "VERSION_COVERAGE_RULESET", "version_coverage 必須包含本條目的 ruleset。" );
  }
  if (coverage.includes("2014") && coverage.includes("2024")) {
    if (record.data.ruleset !== "2024" || record.data.version !== "2024-Core") {
      addDiagnostic(diagnostics, "error", record.rel, 1, "VERSION_COVERAGE_CANONICAL", "跨 2014／2024 且規則不變的合併條目必須使用 2024 現行頁。" );
    }
    const paths = Array.isArray(record.data.sources) ? record.data.sources.map((source) => source?.file).filter((file) => typeof file === "string") : [];
    for (const ruleset of coverage) {
      const roots = publications.sourceRootsByRuleset.get(ruleset) ?? [];
      if (!paths.some((file) => roots.some((root) => file === root || file.startsWith(`${root}/`)))) {
        addDiagnostic(diagnostics, "error", record.rel, 1, "VERSION_COVERAGE_SOURCE", `version_coverage 包含 ${ruleset} 時，sources 必須包含該版本已註冊的原始來源。`);
      }
    }
  }
}

export function lintWiki({ all = false, files, overrides } = {}) {
  const diagnostics = [];
  const pathCatalog = makePathCatalog();
  const publications = loadPublicationRegistry();
  const taxonomy = loadTaxonomy();
  const markdownFiles = walk(WIKI_ROOT).filter((file) => file.endsWith(".md"));
  const records = [];

  for (const absolute of markdownFiles) {
    const rel = repoRelative(absolute);
    const text = overrides?.get(rel) ?? fs.readFileSync(absolute, "utf8");
    const extracted = extractFrontmatter(text);
    if (!extracted) {
      records.push({ absolute, rel, text, body: text, bodyStartLine: 1, fm: "", data: null, links: extractWikiLinks(text) });
      continue;
    }
    const lineCounter = new LineCounter();
    const document = parseDocument(extracted.yaml, { lineCounter, prettyErrors: true, uniqueKeys: true });
    let data = null;
    if (document.errors.length === 0) {
      try {
        data = document.toJS();
      } catch {
        data = null;
      }
    }
    records.push({
      absolute,
      rel,
      text,
      fm: extracted.yaml,
      body: extracted.body,
      bodyStartLine: extracted.bodyStartLine,
      data,
      yamlErrors: document.errors,
      lineCounter,
      links: extractWikiLinks(extracted.body),
    });
  }

  const catalog = buildWikiCatalog(records);
  const explicitFiles = Array.isArray(files)
    ? [...new Set(files.map((file) => String(file).replace(/\\/g, "/")))]
    : null;
  const initial = all ? records.map((record) => record.rel) : (explicitFiles ?? changedWikiFiles());
  const scope = all ? new Set(initial) : expandScope(initial, records, catalog);

  if (!all && initial.length === 0) {
    addDiagnostic(diagnostics, "info", "wiki", 1, "NO_CHANGES", "沒有可辨識的 Wiki 異動；如需全庫檢查請使用 --all。" );
  }

  for (const record of records) {
    if (!scope.has(record.rel)) continue;
    if (!record.fm) {
      addDiagnostic(diagnostics, "warning", record.rel, 1, "FRONTMATTER_MISSING", "既有頁面缺少 Frontmatter，需安排遷移。" );
      validateHeadings(record.body, 1, record.rel, diagnostics);
      validateLinks(record, diagnostics, catalog);
      continue;
    }
    if (record.yamlErrors.length > 0 || !record.data) {
      for (const error of record.yamlErrors) {
        const position = Array.isArray(error.pos) ? record.lineCounter.linePos(error.pos[0]) : null;
        addDiagnostic(diagnostics, "error", record.rel, (position?.line ?? 1) + 1, "YAML_PARSE", error.message.split("\n")[0]);
      }
      continue;
    }
    validateFrontmatter(record, diagnostics, pathCatalog, publications);
    validateTaxonomyLocation(record, diagnostics, taxonomy);
    validateVersionCoverage(record, diagnostics, publications);
    validateMagicItemStructure(record, diagnostics);
    validateHeadings(record.body, record.bodyStartLine, record.rel, diagnostics);
    validateLinks(record, diagnostics, catalog);
  }

  validateIndexes(records, diagnostics, catalog, scope);
  validateSubclassLinks(records, diagnostics, catalog, scope);
  printDiagnostics(diagnostics, scope.size, records.length);
  return {
    diagnostics,
    errors: diagnostics.filter((item) => item.severity === "error").length,
    warnings: diagnostics.filter((item) => item.severity === "warning").length,
    information: diagnostics.filter((item) => item.severity === "info").length,
    scopeSize: scope.size,
    totalSize: records.length,
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const result = lintWiki({ all: process.argv.includes("--all") });
  process.exitCode = result.errors > 0 ? 1 : 0;
}
