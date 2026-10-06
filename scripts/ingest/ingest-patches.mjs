import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "yaml";
import { deriveSourceType, lintWiki } from "../core/wiki-lint.mjs";
import { applyCandidateBatch, planCandidateBatch } from "../core/ingest-publication-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_ROOT = path.join(ROOT, "wiki");
const RAW_ROOT = path.join(ROOT, "原始資料");
const GLOSSARY_PATH = path.join(ROOT, "附件", "翻譯詞彙表.md");
const ACTIONS = new Set(["append_rule", "update_frontmatter", "mark_contradiction"]);
const FRONTMATTER_FIELDS = new Set(["sources", "rules_sources", "errata", "confidence", "updated"]);
const CONFIDENCE = new Set(["confirmed", "interpreted", "pending"]);
const TRANSLATIONS = new Set(["official", "community", "none", "unknown"]);

function fail(message) {
  throw new Error(message);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function quote(value) {
  return JSON.stringify(value);
}

function ensureObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} 必須是物件。`);
  return value;
}

function onlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} 不允許欄位 ${key}。`);
  }
}

function pageParts(text, target) {
  const match = text.match(/^(\uFEFF?---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  if (!match) fail(`${target} 缺少可更新的 Frontmatter。`);
  const document = parseDocument(match[2], { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length > 0) fail(`${target} 的 Frontmatter 無法解析：${document.errors[0].message}`);
  const data = document.toJS();
  if (!data || typeof data !== "object") fail(`${target} 的 Frontmatter 必須是物件。`);
  return { start: match[1], yaml: match[2], separator: match[3], body: match[4], data };
}

function headingRange(body, heading, target) {
  const lines = body.split(/\r?\n/);
  const matches = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (match && match[2].trim() === heading) matches.push({ index, level: match[1].length });
  }
  if (matches.length !== 1) {
    fail(`${target} 的 anchor_heading「${heading}」必須唯一存在；目前找到 ${matches.length} 個。`);
  }
  const start = matches[0];
  let end = lines.length;
  for (let index = start.index + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= start.level) {
      end = index;
      break;
    }
  }
  return { lines, end };
}

function marker(patchId) {
  return `<!-- dnd-wiki-patch:${patchId} -->`;
}

function insertAtAnchor(body, heading, fragment, target) {
  const newline = body.includes("\r\n") ? "\r\n" : "\n";
  const { lines, end } = headingRange(body, heading, target);
  const before = lines.slice(0, end).join(newline).trimEnd();
  const after = lines.slice(end).join(newline).trimStart();
  const prefix = before ? `${before}${newline}${newline}` : "";
  const suffix = after ? `${newline}${newline}${after}` : newline;
  return `${prefix}${fragment.trimEnd()}${suffix}`;
}

function renderFrontmatterField(field, value) {
  if (field === "sources") {
    if (value.length === 0) return "sources: []";
    return ["sources:", ...value.flatMap((source) => [
      `  - file: ${quote(source.file)}`,
      `    locator: ${quote(source.locator)}`,
      `    authority: ${quote(source.authority)}`,
      `    translation: ${quote(source.translation)}`,
    ])].join("\n");
  }
  if (Array.isArray(value)) {
    return value.length === 0
      ? `${field}: []`
      : `${field}:\n${value.map((item) => `  - ${quote(item)}`).join("\n")}`;
  }
  return `${field}: ${quote(value)}`;
}

function replaceTopLevelField(yaml, field, replacement) {
  const newline = yaml.includes("\r\n") ? "\r\n" : "\n";
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`${field}:`));
  if (start < 0) fail(`Frontmatter 缺少可更新欄位 ${field}。`);
  let end = start + 1;
  while (end < lines.length && !/^[A-Za-z_][A-Za-z0-9_]*:/.test(lines[end])) end += 1;
  return [...lines.slice(0, start), ...replacement.split("\n"), ...lines.slice(end)].join(newline);
}

function validateSource(source, target, root) {
  ensureObject(source, `${target} 的 sources 項目`);
  onlyKeys(source, new Set(["file", "locator", "authority", "translation"]), `${target} 的 sources 項目`);
  for (const field of ["file", "locator", "authority", "translation"]) {
    if (typeof source[field] !== "string" || source[field].trim() === "") {
      fail(`${target} 的 sources 項目缺少字串欄位 ${field}。`);
    }
  }
  if (source.authority !== "官方") {
    fail(`${target} 的 Patch 來源必須是官方資料；社群、UA 與自訂內容須經人工確認後，以可定位的官方來源另行吸收。`);
  }
  if (!TRANSLATIONS.has(source.translation)) fail(`${target} 的 translation 不合法：${source.translation}。`);
  if (!source.file.replaceAll("\\", "/").startsWith("原始資料/")) {
    fail(`${target} 的來源必須位於 原始資料/。`);
  }
  const absolute = path.resolve(root, source.file);
  if (!isWithin(path.join(root, "原始資料"), absolute) || !fs.existsSync(absolute)) {
    fail(`${target} 的來源檔不存在或超出 原始資料/：${source.file}。`);
  }
}

function sourceKey(source) {
  return [source.file, source.locator, source.authority, source.translation].join("\u0000");
}

function mergeUnique(current, additions, key = (value) => value) {
  const result = Array.isArray(current) ? [...current] : [];
  const known = new Set(result.map(key));
  for (const item of additions) {
    if (known.has(key(item))) continue;
    known.add(key(item));
    result.push(item);
  }
  return result;
}

function updateFrontmatter(text, frontmatter, target, root) {
  const parts = pageParts(text, target);
  ensureObject(frontmatter, `${target} 的 payload.frontmatter`);
  onlyKeys(frontmatter, FRONTMATTER_FIELDS, `${target} 的 payload.frontmatter`);
  if (!Array.isArray(frontmatter.sources) || frontmatter.sources.length === 0) {
    fail(`${target} 的更新必須提供至少一筆 sources。`);
  }
  if (!CONFIDENCE.has(frontmatter.confidence)) fail(`${target} 的更新必須提供合法 confidence。`);
  if (typeof frontmatter.updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.updated)) {
    fail(`${target} 的更新必須提供 YYYY-MM-DD 格式的 updated。`);
  }
  for (const source of frontmatter.sources) validateSource(source, target, root);
  for (const field of ["rules_sources", "errata"]) {
    if (frontmatter[field] !== undefined && (!Array.isArray(frontmatter[field]) || frontmatter[field].some((item) => typeof item !== "string"))) {
      fail(`${target} 的 ${field} 必須是字串陣列。`);
    }
  }

  const data = parts.data;
  const merged = {
    // The Patch input names the authoritative source being applied.  Keep it
    // first so an English mirror with a canonical page locator remains the
    // primary citation while retaining existing community translations.
    sources: mergeUnique(frontmatter.sources, data.sources, sourceKey),
    rules_sources: mergeUnique(data.rules_sources, frontmatter.rules_sources ?? []),
    errata: mergeUnique(data.errata, frontmatter.errata ?? []),
    confidence: frontmatter.confidence,
    updated: frontmatter.updated,
  };
  let yaml = parts.yaml;
  for (const field of ["sources", "rules_sources", "errata", "confidence", "updated"]) {
    yaml = replaceTopLevelField(yaml, field, renderFrontmatterField(field, merged[field]));
  }
  yaml = replaceTopLevelField(yaml, "source_type", renderFrontmatterField("source_type", deriveSourceType(merged.sources)));
  return `${parts.start}${yaml}${parts.separator}${parts.body}`;
}

function glossaryTerms(glossaryPath) {
  const text = fs.readFileSync(glossaryPath, "utf8");
  const terms = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 5 || cells[0] === "英文" || /^:?-+/.test(cells[0])) continue;
    if (cells[0] && cells[1]) terms.set(cells[0], cells[1]);
  }
  return terms;
}

function validateTerms(terms, glossary, target) {
  if (!Array.isArray(terms)) fail(`${target} 的 payload.terms 必須是陣列。`);
  for (const term of terms) {
    ensureObject(term, `${target} 的專有名詞`);
    onlyKeys(term, new Set(["english", "chinese"]), `${target} 的專有名詞`);
    if (typeof term.english !== "string" || typeof term.chinese !== "string") {
      fail(`${target} 的專有名詞必須含 english 與 chinese 字串。`);
    }
    if (glossary.get(term.english) !== term.chinese) {
      fail(`${target} 的專有名詞未獲詞彙表核定：${term.english} → ${term.chinese}。`);
    }
  }
}

function targetPath(targetFile, root) {
  if (typeof targetFile !== "string" || !targetFile.startsWith("wiki/") || !targetFile.endsWith(".md")) {
    fail("target_file 必須是 wiki/ 下的 Markdown 相對路徑。");
  }
  const absolute = path.resolve(root, targetFile);
  if (!isWithin(path.join(root, "wiki"), absolute) || !fs.existsSync(absolute)) {
    fail(`target_file 不存在或超出 wiki/：${targetFile}。`);
  }
  return { rel: toPosix(path.relative(root, absolute)), absolute };
}

function validateOperation(operation, identifiers, glossary, root) {
  ensureObject(operation, "Patch 操作");
  onlyKeys(operation, new Set(["patch_id", "action", "target_file", "anchor_heading", "payload"]), "Patch 操作");
  if (typeof operation.patch_id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/i.test(operation.patch_id)) {
    fail("patch_id 必須是由英數字、點、底線與連字號組成的識別碼。");
  }
  if (identifiers.has(operation.patch_id)) fail(`Patch 內有重複 patch_id：${operation.patch_id}。`);
  identifiers.add(operation.patch_id);
  if (!ACTIONS.has(operation.action)) fail(`不支援的 action：${operation.action}。`);
  if (typeof operation.anchor_heading !== "string" || operation.anchor_heading.trim() === "") {
    fail(`${operation.patch_id} 缺少 anchor_heading。`);
  }
  const target = targetPath(operation.target_file, root);
  const payload = ensureObject(operation.payload, `${operation.patch_id} 的 payload`);
  validateTerms(payload.terms, glossary, operation.patch_id);
  if (operation.action === "update_frontmatter") {
    onlyKeys(payload, new Set(["terms", "frontmatter"]), `${operation.patch_id} 的 payload`);
    if (!payload.frontmatter) fail(`${operation.patch_id} 缺少 payload.frontmatter。`);
  } else {
    onlyKeys(payload, new Set(["terms", "rule_content", "source_anchor"]), `${operation.patch_id} 的 payload`);
    if (typeof payload.rule_content !== "string" || payload.rule_content.trim() === "") {
      fail(`${operation.patch_id} 缺少 rule_content。`);
    }
    if (/^#{1,6}\s/m.test(payload.rule_content)) fail(`${operation.patch_id} 的 rule_content 不得建立 Markdown 標題。`);
    if (payload.rule_content.includes("譯名待確認")) fail(`${operation.patch_id} 含待確認譯名，不能自動套用。`);
    if (typeof payload.source_anchor !== "string" || !payload.source_anchor.trim() || !payload.rule_content.includes(payload.source_anchor)) {
      fail(`${operation.patch_id} 的 rule_content 必須原樣包含 source_anchor。`);
    }
  }
  return { ...operation, target };
}

function contentUpdateCoverage(operations) {
  const updates = new Set(operations.filter((operation) => operation.action === "update_frontmatter").map((operation) => operation.target.rel));
  for (const operation of operations) {
    if (operation.action !== "update_frontmatter" && !updates.has(operation.target.rel)) {
      fail(`${operation.patch_id} 的內容更新缺少同一 target_file 的 update_frontmatter。`);
    }
  }
}

export function preparePatch(operations, { root = ROOT, lint = lintWiki } = {}) {
  if (!Array.isArray(operations) || operations.length === 0) fail("Patch 根節點必須是非空 JSON 陣列。");
  const glossary = glossaryTerms(path.join(root, "附件", "翻譯詞彙表.md"));
  const identifiers = new Set();
  const validated = operations.map((operation) => validateOperation(operation, identifiers, glossary, root));
  contentUpdateCoverage(validated);

  const candidates = new Map();
  const status = [];
  for (const operation of validated) {
    const initial = candidates.get(operation.target.rel) ?? fs.readFileSync(operation.target.absolute, "utf8");
    if (initial.includes(marker(operation.patch_id))) {
      status.push({ patchId: operation.patch_id, status: "skipped", target: operation.target.rel });
      continue;
    }
    const parts = pageParts(initial, operation.target.rel);
    headingRange(parts.body, operation.anchor_heading, operation.target.rel);
    let next = initial;
    if (operation.action === "update_frontmatter") {
      next = updateFrontmatter(next, operation.payload.frontmatter, operation.target.rel, root);
    } else {
      const fragment = `${marker(operation.patch_id)}\n${operation.payload.rule_content.trim()}`;
      next = `${parts.start}${parts.yaml}${parts.separator}${insertAtAnchor(parts.body, operation.anchor_heading, fragment, operation.target.rel)}`;
    }
    if (next === initial) {
      status.push({ patchId: operation.patch_id, status: "skipped", target: operation.target.rel });
      continue;
    }
    candidates.set(operation.target.rel, next);
    status.push({ patchId: operation.patch_id, status: "ready", target: operation.target.rel });
  }

  const lintResult = candidates.size > 0
    ? lint({ files: [...candidates.keys()], overrides: candidates })
    : { errors: 0, warnings: 0, information: 0 };
  if (lintResult.errors > 0) fail(`Patch 虛擬 lint 失敗，共 ${lintResult.errors} 個錯誤；未寫入任何檔案。`);
  const sourceFiles = [...new Set(validated.flatMap((operation) => operation.action === "update_frontmatter"
    ? operation.payload.frontmatter.sources.map((source) => source.file)
    : []))];
  return { candidates, status, lintResult, root, lint, sourceFiles };
}

/** Convert validated Patch candidates into the common, reviewable plan format. */
export function planPreparedPatch(prepared) {
  const changes = [...prepared.candidates].map(([target, content]) => ({
    target,
    before: fs.readFileSync(path.join(prepared.root, target), "utf8"),
    after: content,
    operation: "update",
    source: "JSON Patch",
    status: "ready",
  }));
  return planCandidateBatch(changes, { root: prepared.root, lint: prepared.lint, sourceFiles: prepared.sourceFiles });
}

export function applyPreparedPatch(prepared, { authorization } = {}) {
  const plan = planPreparedPatch(prepared);
  const applied = applyCandidateBatch(plan, { root: prepared.root, lint: prepared.lint, authorization });
  // Preserve the small programmatic result shape used by existing callers.
  return { ...applied, ...applied.lint };
}

function cli() {
  const args = process.argv.slice(2);
  const patchIndex = args.indexOf("--patch");
  const patchFile = patchIndex >= 0 ? args[patchIndex + 1] : undefined;
  const apply = args.includes("--apply");
  if (!patchFile || args.some((value, index) => value === "--patch" && !args[index + 1])) {
    fail("請使用：npm.cmd run wiki:preview -- --patch <patch.json> [--report reports/<計畫>.json]");
  }
  const absolute = path.resolve(ROOT, patchFile);
  if (!fs.existsSync(absolute)) fail(`找不到 Patch 檔：${patchFile}`);
  let operations;
  try {
    operations = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    fail(`Patch JSON 無法解析：${error.message}`);
  }
  const prepared = preparePatch(operations);
  for (const item of prepared.status) process.stdout.write(`${item.status === "ready" ? "可套用" : "略過既有"}：${item.patchId} → ${item.target}\n`);
  if (!apply) {
    process.stdout.write(`預覽完成：${prepared.candidates.size} 個檔案可更新；請以 wiki:preview 儲存計畫，再用 wiki:apply 套用。\n`);
    return;
  }
  fail("JSON Patch 不直接套用；請以 wiki:preview 產生候選計畫，再用 wiki:apply 套用。");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    cli();
  } catch (error) {
    process.stderr.write(`Patch 匯入失敗：${error.message}\n`);
    process.exitCode = 1;
  }
}
