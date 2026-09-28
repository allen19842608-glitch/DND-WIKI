export function approvedTranslationMap(markdown) {
  const terms = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 5 || cells.at(-1) !== "approved") continue;
    const [english, chinese] = cells;
    if (!english || !chinese) continue;
    if (!terms.has(english)) terms.set(english, new Set());
    terms.get(english).add(chinese);
  }
  return terms;
}

export function assessApprovedTranslation(terms, english, chinese) {
  const names = terms.get(english);
  if (!names?.size) return { status: "ambiguous", reason: "translation_unapproved" };
  if (names.size !== 1) return { status: "conflict", reason: "translation_approved_names_conflict" };
  if (!names.has(chinese)) return { status: "conflict", reason: "translation_differs_from_glossary", approved: [...names][0] };
  return { status: "matched" };
}
