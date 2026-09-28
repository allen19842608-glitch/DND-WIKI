import fs from "node:fs";
import path from "node:path";
import { resolveRawInputPath } from "./ingest-publication-utils.mjs";

function configuredFiles(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.endsWith(".md")
    || item.includes("\\") || item.split("/").some((part) => !part || part === "." || part === ".."))) {
    throw new Error(`${label} 必須是來源目錄內的安全 Markdown 檔案清單。`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} 不可重複指定來源檔。`);
  return new Set(value);
}

function withoutSuffix(value, suffixes) {
  const suffix = suffixes.find((item) => value.endsWith(item));
  return suffix ? value.slice(0, -suffix.length) : value;
}

/** Inventory a book whose parent class files sit beside same-named subclass
 * directories. This is source structure only; it never drafts rule prose. */
export function configuredSiblingClassSources({ root, profile }) {
  const config = profile.inputs?.class_sources;
  if (config?.layout !== "sibling") return [];
  if (!profile.inputs?.classes || !Array.isArray(config.heading_suffixes)
    || config.heading_suffixes.some((item) => typeof item !== "string" || !item)) {
    throw new Error("sibling 職業來源缺少 inputs.classes 或 heading_suffixes。 ");
  }
  const fullClasses = configuredFiles(config.full_classes ?? [], "class_sources.full_classes");
  const supplements = configuredFiles(config.non_subclasses ?? [], "class_sources.non_subclasses");
  const rootDirectory = resolveRawInputPath({ root, sourceRoot: profile.source_root, input: profile.inputs.classes });
  if (!fs.existsSync(rootDirectory) || !fs.statSync(rootDirectory).isDirectory()) {
    return [{ kind: "directory", source: path.relative(root, rootDirectory).replaceAll("\\", "/"),
      structure: { status: "incomplete", reason: "sibling_class_input_missing" } }];
  }
  const entries = fs.readdirSync(rootDirectory, { withFileTypes: true });
  const directories = entries.filter((item) => item.isDirectory()).map((item) => item.name).sort();
  const seen = new Set();
  const results = [];
  function add(file, kind, expectedChinese, parentChinese = null) {
    const relativeInput = `${profile.inputs.classes}/${file}`.replaceAll("\\", "/");
    const absolute = resolveRawInputPath({ root, sourceRoot: profile.source_root, input: relativeInput });
    const source = path.relative(root, absolute).replaceAll("\\", "/");
    seen.add(file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      results.push({ kind, source, chinese: expectedChinese, parent_chinese: parentChinese,
        structure: { status: "incomplete", reason: "sibling_class_source_missing" } });
      return;
    }
    const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/u);
    const index = lines.findIndex((line) => /^#{1,2}\s+\S/u.test(line));
    const heading = index >= 0 ? lines[index].replace(/^#{1,2}\s+/u, "").trim() : null;
    const chinese = heading ? withoutSuffix(heading, config.heading_suffixes) : null;
    const status = kind === "supplement" ? "out_of_scope"
      : kind === "unpaired_class" || chinese !== expectedChinese ? "incomplete" : "parsed";
    const identityHeading = lines.slice(index + 1, index + 8).map((line) => {
      const plain = line.trim().replace(/^#{1,2}\s+/u, "").replace(/^\*\*|\*\*$/gu, "");
      const match = plain.match(/^([\p{Script=Han}]+)\s+([A-Z][A-Za-z' -]*)$/u);
      return match ? { chinese: match[1], english: match[2] } : null;
    }).find(Boolean) ?? null;
    results.push({ kind, source, chinese: expectedChinese, parent_chinese: parentChinese,
      structure: { status, ...(status === "incomplete" ? { reason: kind === "unpaired_class"
        ? "sibling_class_parent_unpaired" : "sibling_class_heading_mismatch" } : {}),
        heading, locator: heading ? `L${index + 1} 標題：${heading}` : null,
        english_heading: identityHeading?.english ?? null,
        english_heading_chinese: identityHeading?.chinese ?? null } });
  }
  for (const directory of directories) {
    const parentChinese = withoutSuffix(directory, config.heading_suffixes);
    const parentFile = `${directory}.md`;
    add(parentFile, fullClasses.has(parentFile) ? "class" : "class_context", parentChinese);
    const childDirectory = resolveRawInputPath({ root, sourceRoot: profile.source_root,
      input: `${profile.inputs.classes}/${directory}` });
    for (const child of fs.readdirSync(childDirectory, { withFileTypes: true }).filter((item) => item.isFile() && item.name.endsWith(".md"))) {
      const file = `${directory}/${child.name}`;
      add(file, supplements.has(file) ? "supplement" : "subclass", path.basename(child.name, ".md"), parentChinese);
    }
  }
  for (const file of entries.filter((item) => item.isFile() && item.name.endsWith(".md")).map((item) => item.name)) {
    if (!seen.has(file)) add(file, "unpaired_class", path.basename(file, ".md"));
  }
  for (const file of [...fullClasses, ...supplements]) {
    if (!seen.has(file)) throw new Error(`class_sources 設定的來源檔不存在於相鄰結構：${file}`);
  }
  return results;
}
