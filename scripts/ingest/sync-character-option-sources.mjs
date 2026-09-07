import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT, loadIngestProfile, loadPublication, option, quote, slug, today,
} from "../core/ingest-publication-utils.mjs";
import { createAuditReport } from "../audit/character-options-lib.mjs";

const KIND = Object.freeze({ classes: "class", subclasses: "subclass", species: "species", backgrounds: "background", feats: "feat", spells: "spell" });

export function updateCharacterOptionSource(text, entity, { publicationId, publication, mirror }) {
  let next = text;
  const mirrorFile = mirror.file.replaceAll("\\", "/");
  const source = `  - file: "${quote(mirrorFile)}"\n    locator: "${quote(entity.source.locator)}"\n    url: "${quote(mirror.url)}"\n    authority: "官方"\n    translation: "none"\n`;
  const escapedFile = mirrorFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existingSource = new RegExp(`  - file: ["']${escapedFile}["']\\r?\\n(?:    [^\\r\\n]*\\r?\\n)*(?=  - file:|source_type:)`);
  if (existingSource.test(next)) {
    next = next.replace(existingSource, source);
  } else {
    next = next.replace(/sources:\r?\n/, `sources:\n${source}`);
  }
  if (entity.category !== "dependencies") {
    const kind = KIND[entity.category];
    const stableSlug = slug(entity.english_name, entity.english_name);
    const currentPublication = next.match(/^entity_id:\s*["']?entry:([^:]+):/m)?.[1];
    const currentYear = Number(currentPublication?.match(/(\d{4})/)?.[1]);
    const expectedYear = Number(publicationId.match(/(\d{4})/)?.[1]);
    const newerReprint = Number.isInteger(currentYear) && Number.isInteger(expectedYear) && currentYear > expectedYear;
    if (!newerReprint) next = next.replace(/^entity_id:\s*["']?.+?["']?\s*$/m, `entity_id: "entry:${publicationId}:${kind}:${stableSlug}"`);
    const conceptMatch = next.match(/^concept_id:\s*["']?(.+?)["']?\s*$/m)?.[1];
    if (!conceptMatch || conceptMatch.startsWith("concept:entry:")) {
      const replacement = `concept_id: "concept:${kind}:${stableSlug}"`;
      next = conceptMatch ? next.replace(/^concept_id:\s*["']?.+?["']?\s*$/m, replacement) : next.replace(/^entity_id:.*$/m, (line) => `${line}\n${replacement}`);
    }
  }
  if (!next.includes(`- "${publication.canonical_rules_source}"`)) {
    next = next.replace(/rules_sources:\r?\n/, `rules_sources:\n  - "${quote(publication.canonical_rules_source)}"\n`);
  }
  next = next.replace(/^updated:\s*["']?.+?["']?\s*$/m, `updated: "${today()}"`);
  return next;
}

export function syncCharacterOptionSources(args = process.argv.slice(2)) {
  const publicationId = option(args, "--publication");
  const category = option(args, "--category");
  const only = option(args, "--only");
  const reportPath = option(args, "--report");
  const apply = args.includes("--apply");
  if (!publicationId) throw new Error("缺少 --publication <ID>。");
  const publication = loadPublication(publicationId);
  const profile = loadIngestProfile(publicationId);
  const audit = createAuditReport({ publicationId, publication, profile, category });
  const results = [];
  for (const entity of audit.entities) {
    if (typeof entity.wiki_target !== "string" || ["conflict", "ambiguous", "blocked", "out_of_scope", "missing"].includes(entity.status)) {
      results.push({ english_name: entity.english_name, category: entity.category, target: entity.wiki_target, status: "skipped", reason: entity.status });
      continue;
    }
    const filterValues = [entity.english_name, entity.category, entity.wiki_target].map((value) => String(value ?? "").normalize("NFKC").toLowerCase());
    if (only && !filterValues.some((value) => value.includes(only.normalize("NFKC").toLowerCase()))) continue;
    const file = path.join(ROOT, entity.wiki_target);
    const current = fs.readFileSync(file, "utf8");
    const sourceMirror = entity.source?.file
      ? { ...audit.mirror, file: entity.source.file, url: entity.source.url ?? audit.mirror.url }
      : audit.mirror;
    const next = updateCharacterOptionSource(current, entity, { publicationId, publication, mirror: sourceMirror });
    if (next === current) {
      results.push({ english_name: entity.english_name, category: entity.category, target: entity.wiki_target, status: "unchanged" });
    } else if (!apply) {
      results.push({ english_name: entity.english_name, category: entity.category, target: entity.wiki_target, status: "preview" });
    } else {
      fs.writeFileSync(file, next, "utf8");
      results.push({ english_name: entity.english_name, category: entity.category, target: entity.wiki_target, status: "written" });
    }
  }
  const report = { schema_version: 1, publication_id: publicationId, category: category ?? null, mode: apply ? "apply" : "preview", generated_at: new Date().toISOString(), results };
  if (reportPath) {
    const target = path.resolve(ROOT, reportPath);
    const rawRoot = path.join(ROOT, "原始資料") + path.sep;
    if (target === rawRoot.slice(0, -1) || target.startsWith(rawRoot)) throw new Error("同步報告不得寫入原始資料/。");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  const counts = new Map();
  results.forEach((item) => counts.set(item.status, (counts.get(item.status) ?? 0) + 1));
  process.stdout.write(`${publicationId} 角色選項來源同步${apply ? "套用" : "預覽"}：${[...counts].map(([status, count]) => `${status} ${count}`).join("；")}。\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) syncCharacterOptionSources();
