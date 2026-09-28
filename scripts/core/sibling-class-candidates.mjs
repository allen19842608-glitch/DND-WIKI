import path from "node:path";
import { configuredSiblingClassSources } from "./sibling-class-source.mjs";
import { prepareExistingClassCitation } from "./class-replacement-review.mjs";
import { mirrorEntityPage } from "./mirror-entity-page.mjs";
import { versionForPublication } from "./ingest-publication-utils.mjs";
import { englishTitle, readWikiPages } from "./wiki-records.mjs";

const normalized = (value) => String(value ?? "").normalize("NFKC").toLowerCase();

/** The sibling layout contains optional class features and supplements as well
 * as subclasses. Only an exact, unique existing-page source match may yield
 * a citation-only candidate; this adapter never rebuilds rule text. */
export function siblingClassCitationCandidates({ root, profile, publication, publicationId, only, replace = false }) {
  const inventory = configuredSiblingClassSources({ root, profile });
  const pages = readWikiPages(root, { directory: profile.outputs.classes });
  const parentPages = readWikiPages(root, { directory: "wiki/職業" });
  const results = [];
  const changes = [];
  const sourceFiles = inventory.filter((item) => !["sibling_class_source_missing", "sibling_class_input_missing"]
    .includes(item.structure.reason)).map((item) => item.source);
  const parentSources = new Map(inventory.filter((item) => ["class", "class_context"].includes(item.kind))
    .map((item) => [item.source, item]));
  const version = versionForPublication(publication);

  for (const item of inventory) {
    const matchingPages = pages.filter((page) => Array.isArray(page.data?.sources)
      && page.data.sources.some((citation) => citation?.file === item.source));
    const page = matchingPages.length === 1 ? matchingPages[0] : null;
    const english = page ? englishTitle(page.data?.title) : null;
    const base = { category: item.kind === "subclass" ? "subclasses"
      : ["class", "class_context"].includes(item.kind) ? "classes" : "class_supplement",
    kind: item.kind, source: item.source, source_structure: item.structure,
    ...(page ? { target: page.file, english_name: english } : {}) };
    const filterFields = [item.source, item.chinese, item.parent_chinese, item.structure.english_heading,
      page?.file, page?.data?.title, english];
    if (only && !filterFields.some((value) => normalized(value).includes(normalized(only)))) {
      results.push({ ...base, status: "filtered" });
      continue;
    }
    if (["supplement", "class_context"].includes(item.kind)) {
      results.push({ ...base, status: item.structure.status === "incomplete" ? "incomplete" : "out_of_scope",
        reason: item.structure.reason ?? (item.kind === "class_context"
          ? "optional_class_features_not_full_class" : "class_supplement_not_subclass") });
      continue;
    }
    if (item.structure.status !== "parsed") {
      results.push({ ...base, status: "incomplete", reason: item.structure.reason });
      continue;
    }
    if (item.kind === "subclass") {
      const sourceDirectory = path.posix.dirname(item.source);
      const context = parentSources.get(`${sourceDirectory}.md`);
      if (!context || context.structure.status !== "parsed" || !context.structure.english_heading) {
        results.push({ ...base, status: "incomplete", reason: "sibling_parent_identity_unresolved" });
        continue;
      }
    }
    if (matchingPages.length > 1) {
      results.push({ ...base, status: "conflict", reason: "sibling_source_matches_multiple_wiki_pages",
        wiki_targets: matchingPages.map((entry) => entry.file) });
      continue;
    }
    if (!page) {
      results.push({ ...base, status: "missing", reason: "sibling_wiki_page_missing_requires_content_review" });
      continue;
    }
    const evidence = { ...base, target: page.file, english_name: english };
    if (page.data?.compatibility_2024 === "replaced") {
      results.push({ ...evidence, status: "out_of_scope", reason: "legacy_class_replaced_by_2024" });
      continue;
    }
    if (!english) {
      results.push({ ...evidence, status: "incomplete", reason: "existing_class_english_title_missing" });
      continue;
    }
    const entryType = item.kind === "class" ? "職業" : "子職";
    let parentClass;
    let parentEnglish;
    if (entryType === "職業") {
      if (item.structure.english_heading !== english) {
        results.push({ ...evidence, status: "conflict", reason: "sibling_class_english_identity_mismatch" });
        continue;
      }
    } else {
      parentClass = page.data?.parent_class;
      const context = parentSources.get(`${path.posix.dirname(item.source)}.md`);
      const candidates = parentPages.filter((entry) => path.posix.basename(entry.file) === `${parentClass}.md`
        && entry.data?.category === "職業" && entry.data?.entry_type === "職業");
      const parentIdentities = new Set(candidates.map((entry) => englishTitle(entry.data?.title)).filter(Boolean));
      parentEnglish = parentIdentities.size === 1 ? [...parentIdentities][0] : null;
      if (!parentEnglish || parentEnglish !== context.structure.english_heading
        || parentClass !== context.structure.english_heading_chinese) {
        results.push({ ...evidence, status: "conflict", reason: "sibling_subclass_parent_identity_mismatch" });
        continue;
      }
    }
    const mirror = mirrorEntityPage({ root, profile, publicationId, english,
      kind: entryType === "職業" ? "class" : "subclass", parentClass: parentEnglish });
    if (mirror.status !== "matched") {
      results.push({ ...evidence, status: mirror.status, reason: mirror.reason });
      continue;
    }
    if (!replace) {
      results.push({ ...evidence, mirror_page: mirror.page, status: "skipped",
        reason: "existing_page_preserved_use_replace_for_citation_preview" });
      continue;
    }
    const title = String(page.data.title);
    const titleSeparator = title.lastIndexOf(" (");
    const chinese = titleSeparator >= 0 ? title.slice(0, titleSeparator).trim() : title;
    const prepared = prepareExistingClassCitation({ before: page.text, source: item.source, mirror,
      english, chinese, entryType, parentClass, publicationId, version });
    if (!["ready", "unchanged"].includes(prepared.status)) {
      results.push({ ...evidence, mirror_page: mirror.page, status: prepared.status,
        reason: prepared.reason, review: prepared.review });
      continue;
    }
    if (prepared.status === "ready") changes.push({ target: page.file, operation: "update",
      before: page.text, after: prepared.after, source: item.source, locator: item.structure.locator,
      status: "manual_review", review: ["只補英文鏡像實體自身頁碼引註；正文、識別碼、版本及 AL 不變。",
        "中文譯名與規則正文仍須獨立覆核。"] });
    results.push({ ...evidence, mirror_page: mirror.page,
      status: prepared.status === "ready" ? "manual_review" : "unchanged",
      candidate_preserves_existing: true });
  }
  if (only && results.every((item) => item.status === "filtered")) {
    results.push({ category: "classes", status: "missing", reason: "requested_class_entity_not_found_in_source",
      requested_entity: only });
  }
  return { inventory, results, changes, sourceFiles };
}
