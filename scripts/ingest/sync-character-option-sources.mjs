import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT, candidateChange, loadIngestProfile, loadPublication, parseOptions, planCandidateBatch, quote, slug, today, writeCandidatePlan, writeCandidateReview,
} from "../core/ingest-publication-utils.mjs";
import { createAuditReport } from "../core/character-options-lib.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

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
  const options = parseOptions(args, { extraValueOptions: ["--category"] });
  const publicationId = options.publicationId;
  const category = args.includes("--category") ? args[args.indexOf("--category") + 1] : undefined;
  const { only, apply } = options;
  if (!args.includes("--publication")) throw new Error("缺少 --publication <ID>。");
  if (apply) throw new Error("角色選項來源同步只產生候選；請使用 wiki:preview -- --category 角色選項來源 儲存計畫，再以 wiki:apply 套用。 ");
  const publication = loadPublication(publicationId);
  const profile = loadIngestProfile(publicationId);
  const audit = createAuditReport({ publicationId, publication, profile, category });
  const results = [];
  const pending = [];
  for (const entity of audit.entities) {
    const filterValues = [entity.english_name, entity.category, entity.wiki_target].map((value) => String(value ?? "").normalize("NFKC").toLowerCase());
    if (only && !filterValues.some((value) => value.includes(only.normalize("NFKC").toLowerCase()))) {
      results.push({ english_name: entity.english_name, category: entity.category, target: entity.wiki_target, status: "out_of_scope", reason: "only_filter" });
      continue;
    }
    if (typeof entity.wiki_target !== "string" || ["conflict", "ambiguous", "blocked", "out_of_scope", "missing"].includes(entity.status)) {
      results.push({ english_name: entity.english_name, category: entity.category, target: entity.wiki_target, status: "skipped", reason: entity.status });
      continue;
    }
    const file = path.join(ROOT, entity.wiki_target);
    const current = fs.readFileSync(file, "utf8");
    const sourceMirror = entity.source?.file
      ? { ...audit.mirror, file: entity.source.file, url: entity.source.url ?? audit.mirror.url }
      : audit.mirror;
    const next = updateCharacterOptionSource(current, entity, { publicationId, publication, mirror: sourceMirror });
    if (next === current) {
      results.push({ english_name: entity.english_name, category: entity.category, target: entity.wiki_target, status: "unchanged" });
    } else {
      pending.push(candidateChange({ destination: file, before: current, after: next, operation: "update", source: sourceMirror.file, locator: entity.source?.locator ?? null }));
      results.push({ english_name: entity.english_name, category: entity.category, target: entity.wiki_target, status: "preview" });
    }
  }
  const mirrorSources = [audit.mirror?.file, `${profile.canonical_mirror?.output_root ?? ""}/manifest.yml`,
    ...(audit.mirror?.datasets ?? []).filter((dataset) => dataset.available).map((dataset) => dataset.file)]
    .filter((file) => typeof file === "string" && file.startsWith("原始資料/") && fs.existsSync(path.join(ROOT, file)));
  const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki, sourceFiles: mirrorSources,
    dependencyFiles: [`config/ingest-profiles/${publicationId}.yml`, "config/publications.yml"] });
  const report = { ...plan, publication_id: publicationId, category: category ?? null, generated_at: new Date().toISOString(), results };
  writeCandidatePlan(report, options.report, { root: ROOT });
  if (options.report) writeCandidateReview(report, options.report, { root: ROOT });
  const counts = new Map();
  results.forEach((item) => counts.set(item.status, (counts.get(item.status) ?? 0) + 1));
  process.stdout.write(`${publicationId} 角色選項來源同步預覽：${[...counts].map(([status, count]) => `${status} ${count}`).join("；")}。\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) syncCharacterOptionSources();
