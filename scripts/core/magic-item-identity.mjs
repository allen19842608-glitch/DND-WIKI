import { englishTitle } from "./wiki-records.mjs";

function normalizeName(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase();
}

function belongsToPublication(page, { publicationId, sourceRoot, mirrorRoot }) {
  if (String(page.data?.entity_id ?? "").startsWith(`entry:${publicationId}:`)) return true;
  const prefixes = [sourceRoot, mirrorRoot].filter(Boolean).map((value) => `${String(value).replaceAll("\\", "/").replace(/\/$/, "")}/`);
  return (page.data?.sources ?? []).some((source) => prefixes.some((prefix) => String(source?.file ?? "").replaceAll("\\", "/").startsWith(prefix)));
}

/** Publication identity outranks a title collision; a conflicting destination
 * never becomes an overwrite candidate, even with an explicit replace flag. */
export function matchExistingMagicItem(pages, { english, target, publicationId, sourceRoot, mirrorRoot, ruleset }) {
  const sameName = pages.filter((page) => page.data?.category === "魔法物品"
    && normalizeName(englishTitle(page.data?.title)) === normalizeName(english));
  const samePublication = sameName.filter((page) => belongsToPublication(page, { publicationId, sourceRoot, mirrorRoot }));
  const occupied = pages.find((page) => page.file === target);
  if (samePublication.length > 1) return { status: "conflict", reason: "same_publication_identity_multiple", matches: samePublication.map((page) => page.file) };
  if (samePublication.length === 1) {
    const match = samePublication[0];
    if (ruleset && match.data?.ruleset && match.data.ruleset !== ruleset) {
      return { status: "conflict", reason: "same_publication_ruleset_conflict", matches: [match.file] };
    }
    if (occupied && occupied.file !== match.file) {
      return { status: "conflict", reason: "target_occupied_by_other_entity", matches: [occupied.file, match.file] };
    }
    return { status: "matched", target: match.file, same_target: match.file === target };
  }
  if (occupied) return { status: "conflict", reason: "target_occupied_by_other_entity", matches: [occupied.file] };
  const uncertain = sameName.filter((page) => !String(page.data?.entity_id ?? "").startsWith("entry:")
    && !(page.data?.sources ?? []).some((source) => String(source?.file ?? "").startsWith("原始資料/")));
  if (uncertain.length) return { status: "ambiguous", reason: "existing_same_name_publication_unknown", matches: uncertain.map((page) => page.file) };
  return { status: "missing", matches: sameName.map((page) => page.file) };
}

/** Add only a verified entity-page citation to an existing item. Rule prose,
 * IDs, version, AL and updated date stay byte-for-byte unchanged. */
export function prepareExistingMagicItemCitation({ page, english, publicationId, source, mirror }) {
  if (!Array.isArray(page?.data?.sources)) {
    return { status: "incomplete", reason: "existing_magic_item_sources_unreadable" };
  }
  if (page.data?.category !== "魔法物品"
    || normalizeName(englishTitle(page.data?.title)) !== normalizeName(english)
    || !String(page.data?.entity_id ?? "").startsWith(`entry:${publicationId}:magic-item:`)
    || !page.data.sources.some((entry) => entry?.file === source)) {
    return { status: "conflict", reason: "existing_magic_item_identity_or_source_mismatch" };
  }
  if (mirror?.status !== "matched" || !mirror.file || !mirror.locator || !mirror.url) {
    return { status: "incomplete", reason: "magic_item_mirror_entity_citation_unresolved" };
  }
  const existing = page.data.sources.filter((entry) => entry?.file === mirror.file);
  if (existing.length > 1 || existing.length && (existing[0].locator !== mirror.locator
    || existing[0].url !== mirror.url || existing[0].authority !== "官方"
    || existing[0].translation !== "none")) {
    return { status: "conflict", reason: "existing_magic_item_mirror_citation_conflict" };
  }
  if (existing.length) return { status: "unchanged", after: page.text };
  const headings = [...page.text.matchAll(/^sources:\r?\n/gmu)];
  if (headings.length !== 1) return { status: "incomplete", reason: "existing_magic_item_source_layout_unsupported" };
  const newline = page.text.includes("\r\n") ? "\r\n" : "\n";
  const citation = [
    `  - file: ${JSON.stringify(mirror.file)}`,
    `    locator: ${JSON.stringify(mirror.locator)}`,
    `    url: ${JSON.stringify(mirror.url)}`,
    '    authority: "官方"',
    '    translation: "none"',
    "",
  ].join(newline);
  const insertion = headings[0].index + headings[0][0].length;
  return { status: "ready", after: page.text.slice(0, insertion) + citation + page.text.slice(insertion) };
}
