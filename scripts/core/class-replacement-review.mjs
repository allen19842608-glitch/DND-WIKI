import YAML from "yaml";

function parts(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/u);
  if (!match) throw new Error("職業頁缺少可解析的 Frontmatter，不能評估整頁替換。");
  const fields = YAML.parse(match[1], { uniqueKeys: true });
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    throw new Error("職業頁 Frontmatter 不是物件，不能評估整頁替換。");
  }
  const headings = [...text.matchAll(/^#{2,4}\s+(.+)$/gm)].map((item) => item[1].trim());
  return { fields, headings };
}

const protectedFields = new Set([
  "entity_id", "concept_id", "ruleset", "content_scope", "status", "version",
  "version_coverage", "al_availability", "al_campaigns", "al_notes", "rules_sources", "errata",
]);

export function analyzeClassReplacement(before, after) {
  const original = parts(before);
  const proposed = parts(after);
  const removedFields = Object.keys(original.fields).filter((key) => !(key in proposed.fields));
  const changedProtectedFields = [...protectedFields].filter((key) => key in original.fields
    && key in proposed.fields && !isEqual(original.fields[key], proposed.fields[key]));
  const proposedHeadings = new Set(proposed.headings);
  const removedHeadings = original.headings.filter((heading) => !proposedHeadings.has(heading));
  const review = ["解析器的整頁重建草稿僅供內容比對；既有頁必須保留人工內容並獨立核定版本與 AL。"];
  if (removedFields.length) review.push(`整頁重建草稿會移除既有欄位：${removedFields.join("、")}`);
  if (changedProtectedFields.length) review.push(`整頁重建草稿會改動識別碼／版本／AL／勘誤欄位：${changedProtectedFields.join("、")}`);
  if (removedHeadings.length) review.push(`整頁重建草稿會移除既有章節：${removedHeadings.join("、")}`);
  return {
    removed_fields: removedFields,
    changed_protected_fields: changedProtectedFields,
    removed_headings: removedHeadings,
    review,
  };
}

function isEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Add only the verified English mirror citation. All existing body and
 * metadata bytes, including IDs, AL decisions and dates, remain untouched. */
export function prepareExistingClassCitation({ before, source, mirror, english, chinese, entryType, parentClass, publicationId, version }) {
  let original;
  try { original = parts(before); } catch (error) {
    return { status: "incomplete", reason: "existing_frontmatter_unreadable", review: [error.message] };
  }
  const fields = original.fields;
  const expectedTitleSuffix = version === "2014-Legacy" ? `(${english}，2014 Legacy)` : `(${english})`;
  if (fields.category !== "職業" || fields.entry_type !== entryType
    || !String(fields.title ?? "").endsWith(expectedTitleSuffix)
    || chinese && fields.title !== `${chinese} ${expectedTitleSuffix}`
    || version && fields.version !== version
    || entryType === "子職" && fields.parent_class !== parentClass
    || !String(fields.entity_id ?? "").startsWith(`entry:${publicationId}:`)) {
    return { status: "conflict", reason: "existing_class_identity_mismatch" };
  }
  if (!Array.isArray(fields.sources) || fields.sources.filter((item) => item?.file === source).length !== 1) {
    return { status: "conflict", reason: "existing_class_source_not_unique" };
  }
  if (fields.source_type !== "official" || fields.sources.some((item) => item?.authority !== "官方")) {
    return { status: "conflict", reason: "existing_class_source_authority_mismatch" };
  }
  // The same book snapshot may already be cited for a chapter or image.
  // Preserve those locators and identify this entity citation by locator too.
  const citations = fields.sources.filter((item) => item?.file === mirror.file && item.locator === mirror.locator);
  if (citations.length > 1) return { status: "conflict", reason: "english_mirror_entity_citation_not_unique" };
  if (citations.length) {
    const item = citations[0];
    if (item.url !== mirror.url || item.authority !== "官方" || item.translation !== "none") {
      return { status: "conflict", reason: "english_mirror_entity_citation_differs" };
    }
    return { status: "unchanged", after: before };
  }
  const sourceHeading = [...before.matchAll(/^sources:\r?\n/gm)];
  if (sourceHeading.length !== 1) return { status: "incomplete", reason: "existing_source_layout_unsupported" };
  const newline = before.includes("\r\n") ? "\r\n" : "\n";
  const quoted = (value) => JSON.stringify(String(value));
  const citation = [
    `  - file: ${quoted(mirror.file)}`,
    `    locator: ${quoted(mirror.locator)}`,
    `    url: ${quoted(mirror.url)}`,
    '    authority: "官方"',
    '    translation: "none"',
    "",
  ].join(newline);
  const insertion = sourceHeading[0].index + sourceHeading[0][0].length;
  return { status: "ready", after: before.slice(0, insertion) + citation + before.slice(insertion) };
}
