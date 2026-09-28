import fs from "node:fs";
import path from "node:path";
import { assertWikiTarget, planCandidateBatch } from "./ingest-publication-utils.mjs";

function safeRelative(value, label) {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw new Error(`${label} 必須是非空相對路徑。`);
  }
  const normalized = value.replaceAll("\\", "/");
  if (normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${label} 不得含空白、. 或 .. 路徑元件。`);
  }
  return normalized;
}

function tablesFrom(text) {
  const lines = text.split(/\r?\n/);
  const groups = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith("|")) continue;
    const table = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) table.push(lines[i++]);
    i -= 1;
    let title = lines.slice(0, i - table.length + 1).reverse().find((line) => line.trim().startsWith("**"))?.trim();
    title = title?.replace(/^\*\*|\*\*$/g, "").replace(/。$/, "") ?? "來源表格";
    groups.push(`### ${title}\n\n${table.join("\n")}`);
  }
  return groups;
}

/** A source/target mapping is publication configuration, not PHB-specific code. */
export function characterCreationTableCandidates({ root, profile, only = null, lint = null }) {
  const publicationId = profile?.publication_id;
  if (!publicationId || !profile.source_root || !profile.outputs?.rules || !profile.inputs?.character_creation
    || !profile.inputs?.character_creation_tables || typeof profile.inputs.character_creation_tables !== "object"
    || Array.isArray(profile.inputs.character_creation_tables)) {
    throw new Error("角色建立表格需指定出版品、來源根、規則輸出根、來源目錄及表格對應。");
  }
  const sourceRoot = safeRelative(profile.source_root, "source_root");
  const inputDirectory = safeRelative(profile.inputs.character_creation, "inputs.character_creation");
  const outputRoot = safeRelative(profile.outputs.rules, "outputs.rules");
  if (!sourceRoot.startsWith("原始資料/") || !outputRoot.startsWith("wiki/")) {
    throw new Error("角色建立表格來源必須位於原始資料/，輸出必須位於 wiki/。");
  }
  const sourceDirectory = `${sourceRoot}/${inputDirectory}`;
  const sourceAbsolute = path.resolve(root, sourceDirectory);
  const sourcePresent = fs.existsSync(sourceAbsolute) && fs.statSync(sourceAbsolute).isDirectory();
  const rawBoundary = `${path.resolve(root, "原始資料")}${path.sep}`;
  const wikiBoundary = `${path.resolve(root, "wiki")}${path.sep}`;
  if (sourcePresent && !fs.realpathSync(sourceAbsolute).startsWith(rawBoundary)) {
    throw new Error(`角色建立來源目錄越出原始資料/：${sourceDirectory}`);
  }
  const pending = [];
  const results = [];
  for (const [targetPath, sourceNames] of Object.entries(profile.inputs.character_creation_tables)) {
    const target = assertWikiTarget(`${outputRoot}/${safeRelative(targetPath, "表格目標")}`);
    if (!Array.isArray(sourceNames) || !sourceNames.length) throw new Error(`${target} 的來源表格清單必須非空。`);
    const sources = sourceNames.map((name) => `${sourceDirectory}/${safeRelative(name, `${target} 來源`)}`);
    const identity = { target, source_files: sources, item_type: "character_creation_tables" };
    if (only && !target.includes(only)) {
      results.push({ ...identity, status: "out_of_scope", reason: "only_filter" });
      continue;
    }
    const targetAbsolute = path.resolve(root, target);
    if (!sourcePresent || !fs.existsSync(targetAbsolute) || !fs.statSync(targetAbsolute).isFile()) {
      results.push({ ...identity, status: "incomplete", reason: sourcePresent ? "wiki_target_missing" : "source_directory_missing" });
      continue;
    }
    if (!fs.realpathSync(targetAbsolute).startsWith(wikiBoundary)) throw new Error(`角色建立目標越出 wiki/：${target}`);
    const missing = sources.filter((source) => !fs.existsSync(path.resolve(root, source)) || !fs.statSync(path.resolve(root, source)).isFile());
    if (missing.length) {
      results.push({ ...identity, status: "incomplete", reason: "source_file_missing", missing });
      continue;
    }
    for (const source of sources) {
      if (!fs.realpathSync(path.resolve(root, source)).startsWith(rawBoundary)) throw new Error(`角色建立來源越出原始資料/：${source}`);
    }
    const tables = sources.flatMap((source) => tablesFrom(fs.readFileSync(path.resolve(root, source), "utf8")));
    if (!tables.length) {
      results.push({ ...identity, status: "incomplete", reason: "source_tables_missing" });
      continue;
    }
    const before = fs.readFileSync(targetAbsolute, "utf8");
    if (!before.includes("\n## 🔗 相關連結")) {
      results.push({ ...identity, status: "incomplete", reason: "related_links_section_missing" });
      continue;
    }
    let after = before.replace(/\n## 完整來源表格[\s\S]*?(?=\n## 🔗 相關連結)/, "");
    after = after.replace("\n## 🔗 相關連結", `\n## 完整來源表格\n\n${tables.join("\n\n")}\n\n## 🔗 相關連結`);
    const operation = after === before ? "unchanged" : "update";
    results.push({ ...identity, status: "matched", operation,
      ...(operation === "update" ? { candidate_status: "manual_review", reason: "table_content_requires_source_and_terminology_review" } : {}) });
    // Source tables can contain unapproved names or differ from curated Wiki
    // content.  A syntactically valid virtual lint is not content approval.
    if (operation === "update") pending.push({ target, before, after, operation, status: "manual_review",
      source: sourceDirectory, locator: sourceNames.join("、"),
      review: ["來源表格與既有 Wiki 內容、英文鏡像及核定譯名須逐檔比對；不得自動覆寫。"] });
  }
  const dependency = `config/ingest-profiles/${publicationId}.yml`;
  const plan = planCandidateBatch(pending, { root, lint,
    sourceFiles: sourcePresent ? [sourceDirectory] : [], dependencyFiles: fs.existsSync(path.join(root, dependency)) ? [dependency] : [] });
  return { ...plan, publication_id: publicationId, category: "character-creation-tables", results };
}
