import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { CHARACTER_OPTION_CATEGORIES, ROOT, slug, walkMarkdown } from "../core/ingest-publication-utils.mjs";

export const AUDIT_STATUSES = Object.freeze([
  "matched", "missing", "incomplete", "stale", "conflict", "ambiguous", "blocked", "out_of_scope",
]);

const SOURCE_CODES = Object.freeze({
  PHB2024: "XPHB", DMG2024: "XDMG", MM2025: "XMM", FRHOF2025: "FRHoF",
  FRAIF2025: "FRAiF", ABH2025: "ABH", NF2025: "NF", RTHW2026: "RHW",
});

const TAG_TO_CATEGORY = Object.freeze({ class: "classes", background: "backgrounds", race: "species", feat: "feats", spell: "spells" });
const CATEGORY_META = Object.freeze({
  classes: { category: "職業", entryType: "職業", kind: "class" },
  subclasses: { category: "職業", entryType: "子職", kind: "subclass" },
  species: { category: "種族", kind: "species" },
  backgrounds: { category: "背景", kind: "background" },
  feats: { category: "專長", kind: "feat" },
  spells: { category: "法術", kind: "spell" },
  dependencies: { category: "怪物", kind: "monster" },
});

function normalizeEnglish(value) {
  return String(value ?? "").normalize("NFKD").toLowerCase()
    .replace(/\((?:artificer|barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard)\)$/i, "")
    .replace(/\b(?:the|a|an)\b/g, "").replace(/[^a-z0-9]/g, "");
}

function sourceLocator(manifest, entity) {
  const pathText = entity.ancestors.filter(Boolean).slice(-3).join(" > ");
  return `${manifest.publication_title}${entity.page ? `, p. ${entity.page}` : ""}：${pathText ? `${pathText} > ` : ""}${entity.english_name}；5e.tools 鏡像快照`;
}

function uniqueEntities(entities) {
  const seen = new Set();
  return [...entities].sort((left, right) => {
    const score = (entity) => entity.source_shape === "statblock" ? 2 : entity.source_shape === "tag" ? 1 : 0;
    return score(right) - score(left);
  }).filter((entity) => {
    const key = `${entity.category}:${normalizeEnglish(entity.english_name)}:${normalizeEnglish(entity.parent_class)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractSourceEntities(book, { publicationId, manifest }) {
  const sourceCode = SOURCE_CODES[publicationId];
  const configured = new Set(manifest.character_options ?? []);
  const entities = [];
  function add(category, englishName, context, extra = {}) {
    if (!configured.has(category) || !englishName) return;
    entities.push({
      category,
      english_name: englishName.trim(),
      source_file: manifest.snapshot.file.replaceAll("\\", "/"),
      page: context.page ?? null,
      ancestors: context.ancestors,
      source_shape: extra.sourceShape ?? "reference",
      ...extra,
    });
  }
  function scanTags(text, context) {
    const pattern = /\{@(class|background|race|feat|spell)\s+([^}]+)}/g;
    for (const match of text.matchAll(pattern)) {
      const parts = match[2].split("|").map((part) => part.trim());
      if (match[1] === "class" && parts.length >= 5 && parts[4] === sourceCode) {
        add("subclasses", parts[2], context, { parent_class: parts[0], sourceShape: "tag" });
      } else {
        const category = TAG_TO_CATEGORY[match[1]];
        if (parts[1] === sourceCode) add(category, parts[0], context, { sourceShape: "tag" });
      }
    }
  }
  function visit(value, context = { page: null, ancestors: [] }) {
    if (typeof value === "string") {
      scanTags(value, context);
      return;
    }
    if (value === null || typeof value !== "object") return;
    const page = value.page ?? context.page;
    const ancestors = value.name ? [...context.ancestors, value.name] : context.ancestors;
    const next = { page, ancestors };
    if (value.type === "statblock") {
      const category = TAG_TO_CATEGORY[value.tag];
      const inCharacterOptions = ancestors.some((name) => /Character (?:Options|Classes|Origins)|Feats|Spells/i.test(name));
      if (category && (value.source === sourceCode || inCharacterOptions)) add(category, value.name, next, { sourceShape: "statblock" });
      const inPhbAppendix = publicationId === "PHB2024" && ancestors.some((name) => /Appendix B: Creature Stat Blocks/i.test(name));
      if (inPhbAppendix && value.tag === "creature") add("dependencies", value.name, next, { sourceShape: "statblock", dependency_source: value.source });
    }
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach((item) => visit(item, next));
      else visit(child, next);
    }
  }
  visit(book);
  return uniqueEntities(entities).map((entity) => ({ ...entity, locator: sourceLocator(manifest, entity) }));
}

function extractFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try { return YAML.parse(match[1]) ?? {}; } catch { return {}; }
}

function titleEnglish(title) {
  const matches = [...String(title ?? "").matchAll(/\(([^()]*)\)/g)];
  return matches.at(-1)?.[1]?.replace(/，?\s*2014 Legacy.*$/i, "").trim();
}

export function loadWikiEntries(wikiRoot = path.join(ROOT, "wiki")) {
  return walkMarkdown(wikiRoot).map((file) => {
    const text = fs.readFileSync(file, "utf8");
    const data = extractFrontmatter(text);
    return {
      file,
      target: path.relative(ROOT, file).split(path.sep).join("/"),
      text,
      data,
      english: titleEnglish(data.title ?? text.match(/^#\s+(.+)$/m)?.[1]),
    };
  });
}

function structuralReasons(entity, page) {
  const patterns = {
    classes: [/職業特性|Class Features/i, /主要屬性|Primary Ability/i, /生命骰|Hit Point/i],
    subclasses: [/子職特性|Subclass Features/i, /\d+\s*級|Level/i],
    species: [/種族特質|Species Traits/i, /體型|Size/i, /速度|Speed/i],
    backgrounds: [/屬性值/, /起源專長/, /技能熟練/, /工具熟練/, /裝備\s*A/i, /裝備\s*B/i],
    feats: [/專長效果|規則條文|Feat (?:Benefits|Description)|類別：戰鬥風格專長/i],
    spells: [/環階|Level/i, /施法時間|Casting Time/i, /法術效果|Spell Effect/i],
    dependencies: [/護甲等級|Armor Class|\*\*AC\*\*/i, /生命值|Hit Points|\*\*HP\*\*/i, /速度|Speed/i],
  }[entity.category] ?? [];
  return patterns.filter((pattern) => !pattern.test(page.text)).map((pattern) => `缺少必要結構：${pattern.source}`);
}

function candidatePages(entity, pages) {
  const meta = CATEGORY_META[entity.category];
  const expected = normalizeEnglish(entity.english_name);
  const expectedSlug = slug(entity.english_name, entity.english_name);
  return pages.filter((page) => {
    if (page.target.includes("/2014/")) return false;
    if (page.data.category !== meta.category) return false;
    if (meta.entryType && page.data.entry_type !== meta.entryType) return false;
    const concept = String(page.data.concept_id ?? "");
    const identityMatch = concept === `concept:${meta.kind}:${expectedSlug}` || String(page.data.entity_id ?? "").endsWith(`:${expectedSlug}`);
    return identityMatch || normalizeEnglish(page.english) === expected;
  });
}

export function classifyEntity(entity, pages, { publicationId, mirrorFile }) {
  const candidates = candidatePages(entity, pages);
  const base = {
    category: entity.category,
    english_name: entity.english_name,
    parent_class: entity.parent_class ?? null,
    source: { file: entity.source_file, locator: entity.locator, page: entity.page },
  };
  if (!candidates.length) return { ...base, wiki_target: null, status: "missing", reasons: ["找不到同英文名稱或同 concept_id 的現行 Wiki 條目。"] };
  const structurallyComplete = candidates.filter((page) => structuralReasons(entity, page).length === 0);
  if (candidates.length > 1 && structurallyComplete.length !== 1) return { ...base, wiki_target: candidates.map((page) => page.target), status: "ambiguous", reasons: ["存在多個同名或同概念候選條目，無法唯一判定。"] };
  const page = structurallyComplete.length === 1 ? structurallyComplete[0] : candidates[0];
  const reasons = structuralReasons(entity, page);
  const hasConflict = page.data.audit_status === "conflict" || (/來源差異與不確定性/.test(page.text) && page.data.confidence === "pending");
  if (hasConflict) reasons.push("條目明確標記來源衝突或待確認差異。");
  const sources = Array.isArray(page.data.sources) ? page.data.sources : [];
  if (!sources.some((source) => String(source?.file ?? "").replaceAll("\\", "/") === mirrorFile)) reasons.push("主要來源尚未包含本出版品英文鏡像。");
  const expectedPrefix = `entry:${publicationId}:${CATEGORY_META[entity.category].kind}:`;
  const actualPublication = String(page.data.entity_id ?? "").match(/^entry:([^:]+):/)?.[1];
  const expectedYear = Number(publicationId.match(/(\d{4})/)?.[1]);
  const actualYear = Number(actualPublication?.match(/(\d{4})/)?.[1]);
  const newerReprint = Number.isInteger(expectedYear) && Number.isInteger(actualYear) && actualYear > expectedYear;
  if (entity.category !== "dependencies" && !newerReprint && !String(page.data.entity_id ?? "").startsWith(expectedPrefix)) reasons.push(`entity_id 尚未指向最新出版品 ${publicationId}。`);
  let status = "matched";
  if (hasConflict) status = "conflict";
  else if (reasons.some((reason) => reason.startsWith("缺少必要結構"))) status = "incomplete";
  else if (reasons.length) status = "stale";
  return { ...base, wiki_target: page.target, status, reasons };
}

export function mirrorManifest(publicationId, profile) {
  const manifestPath = path.join(ROOT, profile.canonical_mirror?.output_root ?? `原始資料/外部來源鏡像/${publicationId}`, "manifest.yml");
  if (!fs.existsSync(manifestPath)) return { manifestPath, missing: true };
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  const snapshotPath = path.join(ROOT, manifest.snapshot?.file ?? "");
  return { manifestPath, manifest, snapshotPath, missing: !manifest.snapshot?.file || !fs.existsSync(snapshotPath) };
}

export function createAuditReport({ publicationId, publication, profile, category, pages = loadWikiEntries() }) {
  if (category && !CHARACTER_OPTION_CATEGORIES.includes(category)) throw new Error(`不支援的角色選項類別：${category}`);
  const configured = profile.character_options;
  if (!Array.isArray(configured)) throw new Error(`出版品 ${publicationId} 尚未宣告 character_options 清單。`);
  const selected = category ? [category] : configured;
  const mirror = mirrorManifest(publicationId, profile);
  let entities;
  if (configured.length === 0 || (category && !configured.includes(category))) {
    entities = [{ category: category ?? "publication", english_name: null, source: null, wiki_target: null, status: "out_of_scope", reasons: [configured.length === 0 ? "本出版品已核對且無角色選項。" : "此類別未列入本出版品角色選項範圍。"] }];
  } else if (mirror.missing) {
    entities = selected.map((item) => ({ category: item, english_name: null, source: null, wiki_target: null, status: "blocked", reasons: ["缺少可唯一對照的英文鏡像或鏡像快照。"] }));
  } else if (publicationId === "MM2025" && selected.every((item) => item === "dependencies")) {
    entities = [{ category: "dependencies", english_name: null, source: { file: mirror.manifest.snapshot.file, locator: mirror.manifest.publication_title }, wiki_target: null, status: "out_of_scope", reasons: ["MM2025 僅作其他角色選項必要資料卡的原文依據；不獨立吸收一般怪物。"] }];
  } else {
    const book = JSON.parse(fs.readFileSync(mirror.snapshotPath, "utf8"));
    const sourceEntities = extractSourceEntities(book, { publicationId, manifest: { ...mirror.manifest, character_options: selected } });
    entities = sourceEntities.map((entity) => classifyEntity(entity, pages, { publicationId, mirrorFile: mirror.manifest.snapshot.file.replaceAll("\\", "/") }));
    for (const item of selected) {
      if (!sourceEntities.some((entity) => entity.category === item)) {
        entities.push({ category: item, english_name: null, source: { file: mirror.manifest.snapshot.file, locator: mirror.manifest.publication_title }, wiki_target: null, status: "out_of_scope", reasons: ["英文鏡像未列出此類別的獨立角色選項或直接相依資料卡。"] });
      }
    }
  }
  const summary = Object.fromEntries(AUDIT_STATUSES.map((status) => [status, entities.filter((entity) => entity.status === status).length]));
  return {
    schema_version: 1,
    publication_id: publicationId,
    publication_title: publication.canonical_rules_source,
    requested_category: category ?? null,
    character_options: configured,
    mirror: mirror.missing ? { status: "missing" } : { status: "available", file: mirror.manifest.snapshot.file, sha256: mirror.manifest.snapshot.sha256, url: mirror.manifest.upstream_url },
    generated_at: new Date().toISOString(),
    summary,
    entities,
  };
}
