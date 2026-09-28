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
