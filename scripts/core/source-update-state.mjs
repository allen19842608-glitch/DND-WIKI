import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { belongsToPublication, publicationSourceRoots, sourceManifestSnapshot } from "./wiki-maintenance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATASET_KINDS = new Set(["spell", "feat", "item", "monster", "race", "background", "class", "subclass"]);

function load(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

function datasetEntities(file, root) {
  if (!/^原始資料\/外部來源鏡像\/[^/]+\/datasets\/[^/]+\.json$/iu.test(file)) return null;
  try {
    const document = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    const groups = Object.entries(document).filter(([, entries]) => Array.isArray(entries));
    if (!groups.length || groups.some(([kind, entries]) => entries.length && !DATASET_KINDS.has(kind))) return null;
    const entities = {};
    for (const [kind, entries] of groups) {
      for (const entry of entries) {
        if (typeof entry?.name !== "string" || !entry.name.trim() || typeof entry.source !== "string" || !entry.source.trim()) return null;
        const key = `${kind}\u0000${entry.source}\u0000${entry.name}`;
        if (entities[key]) return null;
        entities[key] = { kind, name: entry.name, source_code: entry.source,
          page: Number.isInteger(entry.page) ? entry.page : null,
          sha256: crypto.createHash("sha256").update(JSON.stringify(entry)).digest("hex") };
      }
    }
    return entities;
  } catch { return null; }
}

function changedEntities(previous, current) {
  if (!previous || !current) return null;
  return [...new Set([...Object.keys(previous), ...Object.keys(current)])].sort().flatMap((key) => {
    if (previous[key]?.sha256 === current[key]?.sha256) return [];
    const entity = current[key] ?? previous[key];
    return [{ kind: entity.kind, name: entity.name, source_code: entity.source_code,
      page: current[key]?.page ?? null, change: !previous[key] ? "added" : !current[key] ? "removed" : "modified" }];
  });
}

function citedEntityPages(source, changes, allEntities, root) {
  const publicationId = source.file.match(/^原始資料\/外部來源鏡像\/([^/]+)\/datasets\//u)?.[1];
  let expectedCode = publicationId;
  try {
    const profile = parseDocument(fs.readFileSync(path.join(root, "config", "ingest-profiles", `${publicationId}.yml`), "utf8"));
    if (!profile.errors.length) expectedCode = profile.toJS()?.canonical_mirror?.book_id ?? expectedCode;
  } catch { /* Isolated fixtures and not-yet-configured books use their folder ID. */ }
  const uniqueNames = new Map();
  for (const entity of Object.values(allEntities ?? {})) {
    const key = `${entity.kind}\u0000${entity.name}`;
    uniqueNames.set(key, (uniqueNames.get(key) ?? 0) + 1);
  }
  const pageData = (source.absorbed_by ?? []).flatMap((file) => {
    if (!file.startsWith("wiki/") || !file.endsWith(".md")) return [];
    try {
      const text = fs.readFileSync(path.join(root, file), "utf8").replace(/^\uFEFF/u, "");
      const yaml = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1];
      if (!yaml) return [];
      const parsed = parseDocument(yaml);
      const data = parsed.errors.length ? null : parsed.toJS();
      return data ? [{ file, entity_id: data.entity_id, sources: Array.isArray(data.sources) ? data.sources : [] }] : [];
    } catch { return []; }
  });
  const affected = new Set();
  const unresolved = [];
  for (const entity of changes) {
    if (String(entity.source_code).toLowerCase() !== String(expectedCode).toLowerCase()) {
      unresolved.push({ ...entity, reason: "dataset_source_out_of_scope" });
      continue;
    }
    const key = `${entity.kind}\u0000${entity.name}`;
    if (uniqueNames.get(key) !== 1) { unresolved.push({ ...entity, reason: "dataset_name_ambiguous" }); continue; }
    const markers = [`${entity.kind}:${entity.name}`, `${entity.kind}: ${entity.name}`];
    const matches = pageData.filter((page) => String(page.entity_id ?? "").startsWith(`entry:${publicationId}:${entity.kind}:`)
      && page.sources.some((citation) => {
      if (citation?.file !== source.file || typeof citation.locator !== "string") return false;
      return markers.some((marker) => {
        const index = citation.locator.indexOf(marker);
        return index >= 0 && (index === 0 || !/[A-Za-z0-9]/u.test(citation.locator[index - 1]))
          && !/[A-Za-z0-9]/u.test(citation.locator[index + marker.length] ?? "");
      });
      }));
    if (matches.length === 1) affected.add(matches[0].file);
    else unresolved.push({ ...entity, reason: matches.length ? "wiki_page_ambiguous" : "wiki_page_missing" });
  }
  return { affected_pages: [...affected].sort(), unresolved_entities: unresolved };
}

export function inspectSourceUpdates({ root = ROOT, publicationId = null } = {}) {
  // A refreshed manifest is only a baseline for the next scan. Outstanding
  // observations survive that refresh until an exact fingerprint is processed.
  const manifest = root === ROOT ? sourceManifestSnapshot() : load(path.join(root, ".wiki-cache", "source-manifest.json"), { sources: [] });
  const state = load(path.join(root, ".wiki-cache", "source-update-state.json"), { observed: {}, processed: {} });
  const publicationRoots = publicationId ? publicationSourceRoots(publicationId) : null;
  const pending = manifest.sources
    .filter((source) => ["new", "changed"].includes(source.status)
      || state.observed?.[source.file]?.sha256 === source.sha256)
    .filter((source) => !publicationRoots || belongsToPublication(source.file, publicationId, publicationRoots))
    .map((source) => {
    const observed = state.observed[source.file];
    const processed = state.processed[source.file];
    const baseline = state.dataset_snapshots?.[source.file];
    const currentEntities = datasetEntities(source.file, root);
    const entityChanges = observed?.sha256 === source.sha256 && Array.isArray(observed.entity_changes)
      ? observed.entity_changes
      : baseline?.sha256 !== source.sha256
        ? changedEntities(baseline?.entities, currentEntities)
        : null;
    const entityPages = entityChanges?.length
      ? citedEntityPages(source, entityChanges, { ...baseline?.entities, ...currentEntities }, root)
      : null;
    // File-level hashes cannot identify which entry changed inside a book,
    // PDF, chapter, or multi-entity dataset, even if many pages cite it.
    const singleText = source.absorbed_by?.length === 1
      && /\.(?:md|txt)$/iu.test(source.file)
      && !/\/(?:book|chapter)[^/]*\./iu.test(source.file);
    const precise = entityChanges?.length ? entityPages.unresolved_entities.length === 0 && entityPages.affected_pages.length > 0 : singleText;
    return {
      file: source.file, sha256: source.sha256, status: source.status,
      impact: precise ? "direct_pages" : entityChanges?.length ? "entity_review" : "publication_review",
      affected_pages: entityPages?.affected_pages ?? (precise ? source.absorbed_by : []),
      changed_entities: entityChanges,
      unresolved_entities: entityPages?.unresolved_entities ?? [],
      referencing_pages: source.absorbed_by ?? [],
      observed_at: observed?.sha256 === source.sha256 ? observed.observed_at : null,
      processed_sha256: processed?.sha256 ?? null,
      todo: processed?.sha256 === source.sha256
        || (baseline?.sha256 === source.sha256 && !processed) ? "none" : "review_required",
    };
    });
  return { schema_version: 2, pending, summary: { pending: pending.filter((item) => item.todo === "review_required").length, already_processed: pending.filter((item) => item.todo === "none").length } };
}

export function recordObservedSources(sources, { root = ROOT } = {}) {
  const destination = path.join(root, ".wiki-cache", "source-update-state.json");
  const state = load(destination, { schema_version: 1, observed: {}, processed: {} });
  state.schema_version = 2;
  state.observed ??= {};
  state.processed ??= {};
  state.dataset_snapshots ??= {};
  const recorded = [];
  let changed = false;
  for (const source of sources) {
    if (typeof source.file !== "string" || !source.file.startsWith("原始資料/")
      || !/^[a-f0-9]{64}$/iu.test(String(source.sha256))) continue;
    const previous = state.dataset_snapshots[source.file];
    const entities = datasetEntities(source.file, root);
    const entityChanges = previous
      ? previous.sha256 === source.sha256 ? null : changedEntities(previous.entities, entities)
      : source.status === "new" ? changedEntities({}, entities) : null;
    // Keep the entity baseline at the last processed (or initial clean)
    // version. Rebuilding the file manifest must not discard an older,
    // still-unprocessed change when another source revision arrives.
    if (entities && !previous && (source.status === "unchanged" || state.processed[source.file]?.sha256 === source.sha256)) {
      state.dataset_snapshots[source.file] = { sha256: source.sha256, entities };
      changed = true;
    }
    if (!["new", "changed"].includes(source.status) || state.observed[source.file]?.sha256 === source.sha256) continue;
    state.observed[source.file] = { sha256: source.sha256, observed_at: new Date().toISOString(), entity_changes: entityChanges };
    recorded.push(source.file);
    changed = true;
  }
  if (!changed) return recorded;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return recorded;
}

/** Record only sources whose exact fingerprint was used by a successfully
 * applied candidate.  Observation and completion intentionally remain two
 * separate state channels so rebuilding a manifest cannot erase a todo. */
export function recordProcessedSources(fingerprints, { root = ROOT } = {}) {
  if (!fingerprints || typeof fingerprints !== "object") return [];
  const destination = path.join(root, ".wiki-cache", "source-update-state.json");
  const state = load(destination, { schema_version: 1, observed: {}, processed: {} });
  state.schema_version = 2;
  state.observed ??= {};
  state.processed ??= {};
  const recorded = [];
  for (const [file, sha256] of Object.entries(fingerprints)) {
    if (typeof file !== "string" || !file.startsWith("原始資料/") || !/^[a-f0-9]{64}$/i.test(String(sha256))) continue;
    if (state.processed[file]?.sha256 === sha256) continue;
    state.processed[file] = { sha256, processed_at: new Date().toISOString() };
    const entities = datasetEntities(file, root);
    if (entities) {
      const absolute = path.join(root, file);
      const currentSha = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
      if (currentSha.toLowerCase() === sha256.toLowerCase()) {
        state.dataset_snapshots ??= {};
        state.dataset_snapshots[file] = { sha256, entities };
      }
    }
    recorded.push(file);
  }
  if (!recorded.length) return recorded;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return recorded;
}

/** A successful candidate is not proof that every change in its source was
 * absorbed.  Only advance the file-level baseline when the source update can
 * be mapped to pages precisely and this transaction applied every such page. */
export function recordProcessedCandidateSources(fingerprints, { root = ROOT, appliedChanges = [], updates = null } = {}) {
  const candidates = Object.entries(fingerprints ?? {}).filter(([file, sha256]) => file.startsWith("原始資料/")
    && /^[a-f0-9]{64}$/iu.test(String(sha256)));
  if (!candidates.length) return { recorded: [], withheld: [] };
  const observations = updates ?? inspectSourceUpdates({ root });
  const byFile = new Map((observations.pending ?? []).map((item) => [item.file, item]));
  const complete = {};
  const withheld = [];
  for (const [file, sha256] of candidates) {
    const observation = byFile.get(file);
    let reason = null;
    if (!observation || observation.sha256 !== sha256 || !observation.observed_at) reason = "source_update_not_observed";
    else if (observation.todo !== "review_required") reason = "source_already_processed";
    else if (observation.impact !== "direct_pages" || !observation.affected_pages?.length
      || observation.unresolved_entities?.length) reason = "source_scope_not_precise";
    else {
      const appliedForSource = new Set(appliedChanges.filter((change) => change.source === file).map((change) => change.target));
      if (!observation.affected_pages.every((target) => appliedForSource.has(target))) reason = "affected_pages_not_all_applied";
    }
    if (reason) withheld.push({ file, reason });
    else complete[file] = sha256;
  }
  return { recorded: recordProcessedSources(complete, { root }), withheld };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--record-observed")) recordObservedSources(sourceManifestSnapshot().sources);
  process.stdout.write(`${JSON.stringify(inspectSourceUpdates(), null, 2)}\n`);
}
