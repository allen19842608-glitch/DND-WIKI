import fs from "node:fs";
import path from "node:path";
import { resolveRawInputPath } from "./ingest-publication-utils.mjs";

const relative = (root, file) => path.relative(root, file).replaceAll("\\", "/");
const cleanFeature = (value) => value.trim().replace(/（[^）]*）/gu, "").replace(/\([^)]*\)/gu, "").trim();

/** TCE sidekick classes have a 20-level table, not sibling class files. This
 * parser inventories their structure and source discrepancies; it drafts no Wiki text. */
export function parseSidekickClassSource(text, { chinese, english } = {}) {
  const lines = text.split(/\r?\n/u);
  const title = lines[0]?.match(/^#\s+(.+)$/u)?.[1]?.trim();
  const levels = [];
  const headings = [];
  for (const [index, line] of lines.entries()) {
    const row = line.match(/^\|\s*\*\*(\d{1,2})(?:st|nd|rd|th)\*\*\s*\|/u);
    if (row) {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      levels.push({ level: Number(row[1]), features: (cells[2] ?? "").split(/[，,]/u)
        .map(cleanFeature).filter((item) => item && item !== "\\-" && item !== "-"),
      locator: `L${index + 1} 等級表：${row[1]}級`, raw_features: cells[2] ?? "" });
    }
    const heading = line.match(/^\*\*([\p{Script=Han}][^*]*?)\s+([A-Z][A-Za-z .'-]+)\*\*$/u);
    if (heading) headings.push({ chinese: heading[1].trim(), english: heading[2].trim(),
      locator: `L${index + 1} 特性：${heading[1].trim()}` });
  }
  const issues = [];
  if (title !== chinese) issues.push({ code: "sidekick_title_mismatch", expected: chinese, actual: title });
  if (levels.length !== 20 || levels.some((row, index) => row.level !== index + 1)) {
    issues.push({ code: "sidekick_levels_not_1_to_20", levels: levels.map((row) => row.level) });
  }
  const names = new Set(headings.map((item) => item.chinese));
  for (const row of levels) {
    for (const feature of row.features) {
      if (!names.has(feature)) issues.push({ code: "sidekick_table_heading_mismatch", level: row.level,
        feature, locator: row.locator });
    }
    const value = row.raw_features;
    if ((value.match(/（/gu) ?? []).length !== (value.match(/）/gu) ?? []).length) {
      issues.push({ code: "sidekick_unbalanced_parenthesis", level: row.level, locator: row.locator });
    }
  }
  return { status: issues.length ? "conflict" : "parsed", title, english_name: english,
    levels, headings, issues };
}

export function configuredSidekickClassSources({ root, profile }) {
  const entries = profile.inputs?.sidekick_classes;
  if (entries === undefined) return [];
  if (!Array.isArray(entries) || !entries.length || entries.some((item) =>
    !item || typeof item !== "object" || typeof item.file !== "string" || !item.file.endsWith(".md")
    || !item.file.startsWith("協力者/") || typeof item.chinese !== "string" || !item.chinese.trim()
    || typeof item.english !== "string" || !item.english.trim())) {
    throw new Error("sidekick_classes 必須逐項指定協力者來源、中文名及英文名。 ");
  }
  if (new Set(entries.map((item) => item.file)).size !== entries.length
    || new Set(entries.map((item) => item.english)).size !== entries.length) {
    throw new Error("sidekick_classes 不可重複指定來源或英文實體。 ");
  }
  return entries.map((item) => {
    const absolute = resolveRawInputPath({ root, sourceRoot: profile.source_root, input: item.file });
    const source = relative(root, absolute);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return { kind: "sidekick_class", source, chinese: item.chinese, english_name: item.english,
        structure: { status: "incomplete", reason: "sidekick_source_missing" } };
    }
    return { kind: "sidekick_class", source, chinese: item.chinese, english_name: item.english,
      structure: parseSidekickClassSource(fs.readFileSync(absolute, "utf8"), item) };
  });
}
