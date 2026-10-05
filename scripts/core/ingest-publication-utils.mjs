import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { preserveSpellFieldsForImport } from "./spell-target-area.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CHARACTER_OPTION_CATEGORIES = Object.freeze([
  "classes", "subclasses", "species", "backgrounds", "feats", "spells", "dependencies",
]);

export function option(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} 必須指定值，不可使用下一個選項作為檔名。`);
  return args[index + 1];
}

const VALUE_OPTIONS = new Set(["--only", "--publication", "--source", "--output", "--report"]);
const BOOLEAN_OPTIONS = new Set(["--apply", "--dry-run", "--replace"]);

export function validateCliOptions(args = process.argv.slice(2), { extraValueOptions = [], extraBooleanOptions = [] } = {}) {
  const valueOptions = new Set([...VALUE_OPTIONS, ...extraValueOptions]);
  const booleanOptions = new Set([...BOOLEAN_OPTIONS, ...extraBooleanOptions]);
  const allowed = new Set([...valueOptions, ...booleanOptions]);
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) continue;
    if (!allowed.has(value)) throw new Error(`不支援的選項：${value}`);
    if (valueOptions.has(value)) {
      if (!args[index + 1] || args[index + 1].startsWith("--")) {
        throw new Error(`${value} 必須指定值，不可使用下一個選項作為檔名。`);
      }
      index += 1;
    }
  }
  if (args.includes("--apply") && args.includes("--dry-run")) {
    throw new Error("--apply 與 --dry-run 不可同時使用。");
  }
  return args;
}

export function parseOptions(args = process.argv.slice(2), extra = {}) {
  validateCliOptions(args, extra);
  const report = option(args, "--report");
  if (report) reportTargetPath(report);
  return {
    apply: args.includes("--apply") && !args.includes("--dry-run"),
    replace: args.includes("--replace"),
    only: option(args, "--only"),
    publicationId: option(args, "--publication") ?? "PHB2024",
    source: option(args, "--source"),
    output: option(args, "--output"),
    report,
    candidates: [],
    results: [],
  };
}

/** Reject lexical escapes and existing links (including Windows junctions)
 * before a report is read or written. A report must never alias Wiki, raw
 * source, or governance files through reports/. */
export function reportTargetPath(report, { root = ROOT } = {}) {
  const base = path.resolve(root);
  const reportsRoot = path.join(base, "reports");
  const destination = path.resolve(base, report);
  if (!destination.startsWith(`${reportsRoot}${path.sep}`)) throw new Error("報告只能寫入 reports/。");
  const assertNotLinked = (current) => {
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`報告路徑包含符號連結：${report}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  };
  for (let current = reportsRoot; ; current = path.dirname(current)) {
    assertNotLinked(current);
    if (current === base) break;
  }
  for (let current = destination; current !== reportsRoot; current = path.dirname(current)) {
    assertNotLinked(current);
  }
  return destination;
}

function relativeTarget(destination) {
  return path.relative(ROOT, destination).split(path.sep).join("/");
}

/** Wiki candidate plans are intentionally narrower than the repository. */
export function assertWikiTarget(target) {
  const normalized = String(target ?? "");
  const segments = normalized.split("/");
  if (segments[0] !== "wiki" || segments.length < 2 || !normalized.endsWith(".md")
    || segments.some((segment) => !segment || segment === "." || segment === ".."
      || /[\\:*?"<>|\x00-\x1f]/u.test(segment) || /[. ]$/u.test(segment)
      || /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu.test(segment))) {
    throw new Error(`Wiki 候選目標必須是 wiki/ 內的 Markdown 檔案：${target}`);
  }
  return normalized;
}

// Windows paths are case-insensitive; NFC also prevents visually identical
// spellings from bypassing the one-target-per-plan invariant.
function wikiTargetIdentity(target) {
  return assertWikiTarget(target).normalize("NFC").toLowerCase();
}

const CANDIDATE_OPERATIONS = new Set(["create", "update", "delete", "link", "unchanged"]);
const WRITABLE_OPERATIONS = new Set(["create", "update", "delete", "link"]);

function assertCandidateOperation(change) {
  if (!CANDIDATE_OPERATIONS.has(change.operation)) {
    throw new Error(`不支援的候選操作：${change.operation}`);
  }
  if (!WRITABLE_OPERATIONS.has(change.operation)) return;
  const creating = change.operation === "create";
  const deleting = change.operation === "delete";
  if ((creating ? change.before !== null : typeof change.before !== "string")
    || (deleting ? change.after !== null : typeof change.after !== "string")) {
    throw new Error(`候選操作與變更內容不一致：${change.target}（${change.operation}）。`);
  }
}

/** Resolve a publication input without accepting a configured escape from
 * immutable 原始資料/, including an existing directory link. */
export function resolveRawInputPath({ root = ROOT, sourceRoot, input }) {
  for (const [label, value] of [["source_root", sourceRoot], ["input", input]]) {
    if (typeof value !== "string" || !value.trim() || path.isAbsolute(value) || /^[A-Za-z]:/.test(value)
      || value.replaceAll("\\", "/").split("/").some((part) => !part || part === "." || part === "..")) {
      throw new Error(`出版品 ${label} 必須是不可越界的相對路徑。`);
    }
  }
  const absolute = path.resolve(root, sourceRoot, input);
  const rawDirectory = path.resolve(root, "原始資料");
  const rawRoot = `${rawDirectory}${path.sep}`;
  if (!absolute.startsWith(rawRoot)) throw new Error(`出版品來源越出原始資料/：${sourceRoot}/${input}`);
  if (fs.existsSync(rawDirectory) && fs.realpathSync(rawDirectory) !== rawDirectory) {
    throw new Error("原始資料/ 本身不可經目錄連結指向其他位置。");
  }
  for (let current = absolute; current.startsWith(rawRoot); current = path.dirname(current)) {
    if (fs.existsSync(current) && !fs.realpathSync(current).startsWith(rawRoot)) {
      throw new Error(`出版品來源經目錄連結越出原始資料/：${sourceRoot}/${input}`);
    }
  }
  return absolute;
}

function assertWikiTargetNotLinked(root, target) {
  let absolute = path.resolve(root);
  for (const segment of assertWikiTarget(target).split("/")) {
    absolute = path.join(absolute, segment);
    try {
      if (fs.lstatSync(absolute).isSymbolicLink()) {
        throw new Error(`Wiki 候選目標路徑包含符號連結：${target}`);
      }
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    }
  }
}

export function candidateChange({ destination, before = null, after = null, operation, source = null, locator = null, status = "ready", review = [] }) {
  if (!destination || (typeof after !== "string" && operation !== "delete")) throw new Error("候選變更必須包含 destination 與 after。");
  const target = relativeTarget(destination);
  assertWikiTarget(target);
  const inferredOperation = operation ?? (before === null ? "create" : before === after ? "unchanged" : "update");
  if (!["create", "update", "delete", "link", "unchanged"].includes(inferredOperation)) throw new Error(`不支援的候選操作：${inferredOperation}`);
  return { target, operation: inferredOperation, before, after, source, locator, status, review };
}

function changeSummary(changes = [], mode = "preview") {
  const summary = { written: 0, unchanged: 0, skipped: 0, blocked: 0, manual_review: 0, error: 0, ready: 0 };
  for (const change of changes) {
    if (change.status === "blocked") summary.blocked += 1;
    else if (change.status === "manual_review") summary.manual_review += 1;
    else if (change.operation === "unchanged" || change.status === "unchanged") summary.unchanged += 1;
    else if (change.status === "skipped") summary.skipped += 1;
    else if (change.status !== "ready") summary.error += 1;
    else if (mode === "apply" && ["create", "update", "link", "delete"].includes(change.operation)) summary.written += 1;
    else summary.ready += 1;
  }
  return summary;
}

function sourceFingerprints(changes, root, sourceFiles = []) {
  const fingerprints = {};
  const sources = new Set();
  for (const file of sourceFiles) {
    const source = typeof file === "string" ? file.replaceAll("\\", "/") : "";
    if (!source.startsWith("原始資料/")) throw new Error(`候選來源必須位於原始資料/：${file}`);
    sources.add(source);
  }
  for (const change of changes) if (typeof change.source === "string") sources.add(change.source);
  for (const source of sources) {
    if (typeof source !== "string" || !source.startsWith("原始資料/")) continue;
    const absolute = path.resolve(root, source);
    const rawRoot = `${path.resolve(root, "原始資料")}${path.sep}`;
    if (!absolute.startsWith(rawRoot)) throw new Error(`候選來源越出原始資料/：${source}`);
    if (!fs.existsSync(absolute)) throw new Error(`候選來源不存在：${source}`);
    if (!fs.realpathSync(absolute).startsWith(rawRoot)) throw new Error(`候選來源經連結越出原始資料/：${source}`);
    fingerprints[source] = fingerprintSource(absolute);
  }
  return fingerprints;
}

function fingerprintSource(absolute) {
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
  if (!stat.isDirectory()) throw new Error(`候選來源不是檔案或目錄：${absolute}`);
  const digest = crypto.createHash("sha256");
  const visit = (directory, relative = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const child = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`候選來源目錄含無法安全追蹤的連結：${child}`);
      if (entry.isDirectory()) visit(child, childRelative);
      else if (entry.isFile()) {
        digest.update(childRelative).update("\0").update(fs.readFileSync(child)).update("\0");
      }
    }
  };
  visit(absolute);
  return digest.digest("hex");
}

function verifySourceFingerprints(fingerprints, root) {
  for (const [source, expected] of Object.entries(fingerprints ?? {})) {
    const absolute = path.resolve(root, source);
    const rawRoot = `${path.resolve(root, "原始資料")}${path.sep}`;
    if (!absolute.startsWith(rawRoot)) throw new Error(`候選來源越出原始資料/：${source}`);
    if (!fs.existsSync(absolute)) throw new Error(`候選來源已不存在：${source}`);
    if (!fs.realpathSync(absolute).startsWith(rawRoot)) throw new Error(`候選來源經連結越出原始資料/：${source}`);
    const actual = fingerprintSource(absolute);
    if (actual !== expected) throw new Error(`候選來源已過期：${source} 在預覽後發生變更；未寫入任何檔案。`);
  }
}

function dependencyFingerprints(files, root) {
  const fingerprints = {};
  const configRoot = `${path.resolve(root, "config")}${path.sep}`;
  const wikiRoot = `${path.resolve(root, "wiki")}${path.sep}`;
  const glossary = path.resolve(root, "附件", "翻譯詞彙表.md");
  for (const file of new Set(files)) {
    const normalized = String(file ?? "").replaceAll("\\", "/");
    const absolute = path.resolve(root, normalized);
    const wikiDependency = normalized.startsWith("wiki/") && absolute.startsWith(wikiRoot);
    const allowed = normalized.startsWith("config/") && absolute.startsWith(configRoot)
      || normalized === "附件/翻譯詞彙表.md" && absolute === glossary || wikiDependency;
    if (!allowed) {
      throw new Error(`候選唯讀依賴僅允許 config/、wiki/ 或指定詞彙表：${file}`);
    }
    if (!fs.existsSync(absolute)
      || (!wikiDependency && !fs.statSync(absolute).isFile())
      || (absolute === glossary ? fs.realpathSync(absolute) !== glossary
        : !fs.realpathSync(absolute).startsWith(wikiDependency ? wikiRoot : configRoot))) {
      throw new Error(`候選唯讀依賴不存在或越出允許範圍：${file}`);
    }
    fingerprints[normalized] = wikiDependency ? fingerprintSource(absolute)
      : crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
  }
  return fingerprints;
}

function verifyDependencyFingerprints(fingerprints, root) {
  for (const [file, expected] of Object.entries(fingerprints ?? {})) {
    const actual = dependencyFingerprints([file], root)[file];
    if (actual !== expected) {
      const dependencyKind = file.startsWith("config/") ? "設定依賴" : "唯讀依賴";
      throw new Error(`候選${dependencyKind}已過期：${file} 在預覽後發生變更；未寫入任何檔案。`);
    }
  }
}

export function planCandidateBatch(changes, { root = ROOT, lint, sourceFiles = [], dependencyFiles = [] } = {}) {
  if (!Array.isArray(changes)) throw new Error("候選變更必須是陣列。");
  const unique = new Map();
  for (const change of changes) {
    if (!change?.target) throw new Error("候選變更缺少 target。");
    assertWikiTarget(change.target);
    const normalized = { ...change, status: change.status ?? "ready" };
    assertCandidateOperation(normalized);
    const identity = wikiTargetIdentity(change.target);
    const previous = unique.get(identity);
    if (previous && ["target", "before", "after", "operation", "status", "source", "locator"].some((field) => previous[field] !== normalized[field])) {
      throw new Error(`同一目標存在互相衝突的候選變更：${change.target}`);
    }
    unique.set(identity, normalized);
  }
  const candidates = [...unique.values()].filter((change) => change.operation !== "unchanged" && change.status === "ready");
  const overrides = new Map(candidates.map((change) => [change.target, change.after]));
  const lintResult = lint && overrides.size ? lint({ files: [...overrides.keys()], overrides }) : { errors: 0, warnings: 0, information: 0 };
  if (lintResult.errors > 0) throw new Error(`候選變更虛擬 lint 失敗，共 ${lintResult.errors} 個錯誤；未寫入任何檔案。`);
  const planned = [...unique.values()];
  return { schema_version: 2, root, mode: "preview", changes: planned, source_fingerprints: sourceFingerprints(planned, root, sourceFiles),
    dependency_fingerprints: dependencyFingerprints(dependencyFiles, root), summary: changeSummary(planned), lint: lintResult };
}

/**
 * The transaction primitive is deliberately not a public writer for parsers.
 * Parser processes may construct and validate plans, but only wiki:apply may
 * supply this capability after loading an already reviewed plan from reports/.
 */
export function applyCandidateBatch(plan, { root = ROOT, lint, postApply, authorization } = {}) {
  if (authorization !== "wiki:apply") {
    throw new Error("解析器不得直接套用 Wiki 候選；請使用 wiki:apply -- --plan reports/<plan>.json。");
  }
  if (!plan || plan.schema_version !== 2 || !Array.isArray(plan.changes)) throw new Error("無效的候選變更計畫。");
  if (path.resolve(plan.root ?? "") !== path.resolve(root)) throw new Error("候選計畫缺少目前工作區的根目錄資訊；請重新預覽後再套用。");
  if (!plan.source_fingerprints || typeof plan.source_fingerprints !== "object") throw new Error("候選計畫缺少來源指紋；請重新預覽後再套用。");
  const uniqueTargets = new Set();
  for (const change of plan.changes) {
    assertWikiTarget(change.target);
    assertCandidateOperation(change);
    const identity = wikiTargetIdentity(change.target);
    if (uniqueTargets.has(identity)) throw new Error(`同一目標存在重複候選變更：${change.target}`);
    uniqueTargets.add(identity);
  }
  const writable = plan.changes.filter((change) => ["create", "update", "link", "delete"].includes(change.operation) && change.status === "ready");
  const overrides = new Map(writable.map((change) => [change.target, change.after]));
  const lintResult = lint && overrides.size ? lint({ files: [...overrides.keys()], overrides }) : { errors: 0, warnings: 0, information: 0 };
  if (lintResult.errors > 0) throw new Error(`套用前虛擬 lint 失敗，共 ${lintResult.errors} 個錯誤；未寫入任何檔案。`);
  for (const change of writable) {
    const destination = path.resolve(root, change.target);
    if (!destination.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`候選目標越出工作區：${change.target}`);
    assertWikiTargetNotLinked(root, change.target);
  }
  verifySourceFingerprints(plan.source_fingerprints, root);
  verifyDependencyFingerprints(plan.dependency_fingerprints, root);
  const originals = new Map(writable.map((change) => {
    const destination = path.resolve(root, change.target);
    return [destination, fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null];
  }));
  for (const change of writable) {
    const destination = path.resolve(root, change.target);
    const current = originals.get(destination);
    if (current !== change.before) throw new Error(`候選計畫已過期：${change.target} 在預覽後發生變更；未寫入任何檔案。`);
  }
  const createdDirectories = new Set();
  const workspaceRoot = path.resolve(root);
  function ensureParent(destination) {
    const parent = path.dirname(destination);
    const missing = [];
    for (let cursor = parent; cursor.startsWith(`${workspaceRoot}${path.sep}`) && !fs.existsSync(cursor); cursor = path.dirname(cursor)) {
      missing.push(cursor);
    }
    try {
      fs.mkdirSync(parent, { recursive: true });
    } finally {
      for (const directory of missing) {
        if (fs.existsSync(directory) && fs.lstatSync(directory).isDirectory()) createdDirectories.add(directory);
      }
    }
  }
  try {
    for (const change of writable.filter((change) => change.operation !== "delete")) {
      const destination = path.resolve(root, change.target);
      assertWikiTargetNotLinked(root, change.target);
      ensureParent(destination);
      assertWikiTargetNotLinked(root, change.target);
      fs.writeFileSync(destination, change.after, "utf8");
    }
    for (const change of writable.filter((change) => change.operation === "delete")) {
      assertWikiTargetNotLinked(root, change.target);
      fs.rmSync(path.resolve(root, change.target));
    }
    const result = lint && overrides.size ? lint({ files: [...overrides.keys()] }) : lintResult;
    if (result.errors > 0) throw new Error(`套用後 lint 失敗，共 ${result.errors} 個錯誤。`);
    postApply?.({ plan, writable, lint: result });
    return { ...plan, mode: "apply", lint: result, applied: writable.map((change) => change.target), summary: changeSummary(plan.changes, "apply") };
  } catch (error) {
    const rollbackErrors = [];
    for (const [destination, content] of originals) {
      try {
        assertWikiTargetNotLinked(root, path.relative(root, destination).split(path.sep).join("/"));
        if (content === null) {
          if (fs.existsSync(destination)) fs.rmSync(destination);
        } else {
          fs.writeFileSync(destination, content, "utf8");
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const directory of [...createdDirectories].sort((left, right) => right.length - left.length)) {
      try {
        fs.rmdirSync(directory);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "候選套用失敗，且未能完整回復所有檔案或資料夾。 ");
    throw error;
  }
}

/** Store a reviewable candidate plan.  Reports are deliberately the only
 * persistent preview output so maintenance commands cannot scatter artefacts
 * through the Wiki tree. */
export function writeCandidatePlan(plan, report, { root = ROOT } = {}) {
  if (!report) return null;
  const destination = reportTargetPath(report, { root });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return destination;
}

function unifiedDiff(change) {
  const before = change.before === null ? "" : String(change.before);
  const after = change.after === null ? "" : String(change.after);
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const output = [`--- a/${change.target}`, `+++ b/${change.target}`];
  let prefix = 0;
  while (prefix < beforeLines.length && prefix < afterLines.length && beforeLines[prefix] === afterLines[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < beforeLines.length - prefix
    && suffix < afterLines.length - prefix
    && beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) suffix += 1;
  const beforeChanged = beforeLines.slice(prefix, beforeLines.length - suffix);
  const afterChanged = afterLines.slice(prefix, afterLines.length - suffix);
  if (!beforeChanged.length && !afterChanged.length) return output.join("\n");
  // Keep review output readable for inserted Frontmatter records while
  // bounding the work for unusually large generated pages.
  if (beforeChanged.length * afterChanged.length > 250000) {
    output.push(`@@ -${prefix + 1},${beforeChanged.length} +${prefix + 1},${afterChanged.length} @@`);
    output.push(...beforeChanged.map((line) => `-${line}`), ...afterChanged.map((line) => `+${line}`));
    return output.join("\n");
  }
  const rows = beforeChanged.length + 1;
  const columns = afterChanged.length + 1;
  const lengths = Array.from({ length: rows }, () => Array(columns).fill(0));
  for (let beforeIndex = beforeChanged.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterChanged.length - 1; afterIndex >= 0; afterIndex -= 1) {
      lengths[beforeIndex][afterIndex] = beforeChanged[beforeIndex] === afterChanged[afterIndex]
        ? lengths[beforeIndex + 1][afterIndex + 1] + 1
        : Math.max(lengths[beforeIndex + 1][afterIndex], lengths[beforeIndex][afterIndex + 1]);
    }
  }
  let beforeIndex = 0;
  let afterIndex = 0;
  let beforeLine = prefix + 1;
  let afterLine = prefix + 1;
  while (beforeIndex < beforeChanged.length || afterIndex < afterChanged.length) {
    if (beforeIndex < beforeChanged.length && afterIndex < afterChanged.length && beforeChanged[beforeIndex] === afterChanged[afterIndex]) {
      beforeIndex += 1;
      afterIndex += 1;
      beforeLine += 1;
      afterLine += 1;
    } else {
      const deleted = [];
      const added = [];
      const hunkBefore = beforeLine;
      const hunkAfter = afterLine;
      while (beforeIndex < beforeChanged.length || afterIndex < afterChanged.length) {
        if (beforeIndex < beforeChanged.length && afterIndex < afterChanged.length && beforeChanged[beforeIndex] === afterChanged[afterIndex]) break;
        if (afterIndex < afterChanged.length && (beforeIndex === beforeChanged.length || lengths[beforeIndex][afterIndex + 1] >= lengths[beforeIndex + 1][afterIndex])) {
          added.push(afterChanged[afterIndex]);
          afterIndex += 1;
          afterLine += 1;
        } else {
          deleted.push(beforeChanged[beforeIndex]);
          beforeIndex += 1;
          beforeLine += 1;
        }
      }
      output.push(`@@ -${hunkBefore},${deleted.length} +${hunkAfter},${added.length} @@`);
      output.push(...deleted.map((line) => `-${line}`), ...added.map((line) => `+${line}`));
    }
  }
  return output.join("\n");
}

/** Persist a compact review companion beside a JSON candidate plan. */
export function writeCandidateReview(plan, report, { root = ROOT } = {}) {
  if (!report) return null;
  const jsonPath = path.resolve(root, report);
  const extension = path.extname(jsonPath) || ".json";
  const base = jsonPath.slice(0, -extension.length);
  const summaryPath = `${base}.summary.md`;
  const diffPath = `${base}.diff`;
  const changes = plan.changes ?? [];
  const sourceReviewCount = (plan.results ?? []).filter((result) =>
    ["ambiguous", "incomplete", "conflict", "blocked"].includes(result.outcome ?? result.status)
    || result.status === "manual_review").length;
  const resultGroups = new Map();
  for (const result of plan.results ?? []) {
    const key = [result.item_type ?? result.category ?? "全體", result.status ?? "unknown", result.reason ?? ""].join("\u0000");
    resultGroups.set(key, (resultGroups.get(key) ?? 0) + 1);
  }
  const summary = [
    "# Wiki 候選計畫摘要",
    "",
    `- 計畫狀態：${plan.mode === "apply" ? "已套用" : "預覽"}`,
    ...(plan.mode === "apply" ? [`- 已套用：${plan.applied?.length ?? plan.summary?.written ?? 0}`] : []),
    `- 可套用：${plan.summary?.ready ?? 0}`,
    `- 需人工覆核：${plan.summary?.manual_review ?? 0}`,
    `- 來源待覆核：${sourceReviewCount}`,
    `- 已阻擋：${plan.summary?.blocked ?? 0}`,
    `- 無異動：${plan.summary?.unchanged ?? 0}`,
    `- 虛擬 lint：錯誤 ${plan.lint?.errors ?? 0}；警告 ${plan.lint?.warnings ?? 0}；資訊 ${plan.lint?.information ?? 0}`,
    "",
    "## 異動目標",
    "",
    ...changes.map((change) => `- \`${change.operation}\` \`${change.target}\`${change.review?.length ? `；覆核：${change.review.join("、")}` : ""}`),
    "",
    ...(resultGroups.size ? ["## 來源解析結果", "", ...[...resultGroups].map(([key, count]) => {
      const [scope, status, reason] = key.split("\u0000");
      return `- ${scope}：${status} ${count} 筆${reason ? `；原因：${reason}` : ""}`;
    }), ""] : []),
  ].join("\n");
  writeReportText(summary, path.relative(root, summaryPath), { root });
  writeReportText(`${changes.map(unifiedDiff).join("\n\n")}\n`, path.relative(root, diffPath), { root });
  return { summary: summaryPath, diff: diffPath };
}

/** Write a human-readable companion report under reports/ using the same path
 * validation as candidate plans. */
export function writeReportText(content, report, { root = ROOT } = {}) {
  if (!report) return null;
  const destination = reportTargetPath(report, { root });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content, "utf8");
  return destination;
}

export function loadPublication(publicationId, { root = ROOT } = {}) {
  const registryPath = path.join(root, "config", "publications.yml");
  const registry = YAML.parse(fs.readFileSync(registryPath, "utf8"));
  const publication = registry?.publications?.[publicationId];
  if (!publication) throw new Error(`找不到出版品 ID：${publicationId}`);
  if (!publication.wiki?.tag || !publication.canonical_rules_source) {
    throw new Error(`出版品 ${publicationId} 缺少 Wiki 標籤或 canonical_rules_source。`);
  }
  return publication;
}

export function loadIngestProfile(publicationId, { root = ROOT } = {}) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(publicationId))) throw new Error(`出版品 ID 格式錯誤：${publicationId}`);
  const profilePath = path.join(root, "config", "ingest-profiles", `${publicationId}.yml`);
  if (!fs.existsSync(profilePath)) throw new Error(`找不到出版品 ${publicationId} 的匯入設定：${profilePath}`);
  const profile = YAML.parse(fs.readFileSync(profilePath, "utf8"));
  if (profile?.publication_id !== publicationId || typeof profile.source_root !== "string" || typeof profile.outputs !== "object" || typeof profile.inputs !== "object") {
    throw new Error(`匯入設定 ${publicationId} 缺少 publication_id、source_root、inputs 或 outputs。`);
  }
  const sourceRoot = profile.source_root.replaceAll("\\", "/");
  if (!sourceRoot.startsWith("原始資料/") || sourceRoot.split("/").includes("..")) {
    throw new Error(`匯入設定 ${publicationId} 的 source_root 必須位於原始資料/。`);
  }
  for (const [key, output] of Object.entries(profile.outputs)) {
    const normalized = String(output ?? "").replaceAll("\\", "/");
    if (typeof output !== "string" || !normalized.startsWith("wiki/") || normalized.split("/").includes("..")) {
      throw new Error(`匯入設定 ${publicationId} 的 outputs.${key} 必須位於 wiki/。`);
    }
  }
  if (profile.character_options !== undefined) {
    if (!Array.isArray(profile.character_options)) {
      throw new Error(`匯入設定 ${publicationId} 的 character_options 必須是清單。`);
    }
    const invalid = profile.character_options.filter((value) => !CHARACTER_OPTION_CATEGORIES.includes(value));
    if (invalid.length) throw new Error(`匯入設定 ${publicationId} 含有不支援的 character_options：${invalid.join("、")}`);
  }
  if (profile.parsers !== undefined) {
    if (!profile.parsers || typeof profile.parsers !== "object" || Array.isArray(profile.parsers)) {
      throw new Error(`匯入設定 ${publicationId} 的 parsers 必須是物件。`);
    }
    for (const [category, parser] of Object.entries(profile.parsers)) {
      if (!CHARACTER_OPTION_CATEGORIES.includes(category) && !["職業", "種族", "背景", "法術", "專長", "魔法物品", "角色建立與成長", "怪物", "戰役設定"].includes(category)) {
        throw new Error(`匯入設定 ${publicationId} 的 parsers 含未知類別：${category}`);
      }
      if (!parser || typeof parser !== "object" || Array.isArray(parser)) {
        throw new Error(`匯入設定 ${publicationId} 的 parsers.${category} 格式錯誤。`);
      }
      if (parser.candidate_ready === false && !String(parser.incomplete_reason ?? "").trim()) {
        throw new Error(`匯入設定 ${publicationId} 的 parsers.${category} 必須說明不支援的來源結構。`);
      }
      if (parser.candidate_ready === false && parser.parser === undefined && parser.argument_profile === undefined) continue;
      if (typeof parser.parser !== "string" || typeof parser.argument_profile !== "string" || !parser.parser.startsWith("scripts/ingest/") || parser.parser.includes("..")) {
        throw new Error(`匯入設定 ${publicationId} 的 parsers.${category} 必須指定安全的 scripts/ingest/ 解析器及 argument_profile。`);
      }
    }
  }
  return profile;
}

export const INGEST_CATEGORY_FIELDS = Object.freeze({
  "職業": { key: "classes", output: "classes" },
  "種族": { key: "species", output: "species" },
  "背景": { key: "backgrounds", output: "backgrounds" },
  "法術": { key: "spells", output: "spells" },
  "專長": { key: "feats", output: "feats" },
  "魔法物品": { key: "magic_items", output: "magic_items" },
  "角色建立與成長": { key: "character_creation", output: "rules" },
  "怪物": { key: "monsters", output: "monsters" },
  "戰役設定": { key: "lore", output: "settings" },
});

export function configuredIngestAdapters({ profile, dispatch }) {
  const declaredOptions = new Set((profile.character_options ?? []).map((category) => ({
    classes: "職業", subclasses: "職業", species: "種族", backgrounds: "背景",
    spells: "法術", feats: "專長", dependencies: "怪物",
  })[category]).filter(Boolean));
  return Object.entries(INGEST_CATEGORY_FIELDS).filter(([category, fields]) => declaredOptions.has(category)
    || profile.inputs?.[fields.key] !== undefined
    || (category === "角色建立與成長" && profile.inputs?.character_creation_tables !== undefined)
    || (category !== "角色建立與成長" && profile.outputs?.[fields.output] !== undefined)
    || profile.parsers?.[category] !== undefined || profile.parsers?.[fields.key] !== undefined
    || (category === "魔法物品" && profile.inputs?.magic_items_file !== undefined)
    || (category === "專長" && (profile.inputs?.feats_file !== undefined || profile.inputs?.feat_sources !== undefined)))
    .map(([category]) => {
      const definition = resolveIngestDefinition({ category, profile, dispatch });
      const optionCategories = { "職業": ["classes", "subclasses"], "種族": ["species"], "背景": ["backgrounds"],
        "法術": ["spells"], "專長": ["feats"] }[category] ?? [];
      const entityInventory = optionCategories.some((item) => profile.character_options?.includes(item))
        ? "character_options_audit" : category === "怪物" && profile.character_options?.includes("dependencies")
          ? "dependencies_audit_only" : "not_run";
      return { category, adapter_status: definition.candidate_ready === false ? "incomplete" : "ready_for_preview",
        parser: definition.parser ?? null, reason: definition.candidate_ready === false ? definition.incomplete_reason
          : definition.candidate_scope ?? "解析器已設定；仍須預覽此類別候選，不代表內容已完整收錄。",
        entity_inventory: entityInventory };
    });
}

export function resolveIngestDefinition({ category, profile, dispatch, source = null }) {
  const fields = INGEST_CATEGORY_FIELDS[category];
  if (!fields) throw new Error(`不支援的匯入類別：${category}`);
  const override = profile.parsers?.[category] ?? profile.parsers?.[fields.key];
  const definition = override ?? dispatch.categories?.[category];
  if (!definition) return { candidate_ready: false, incomplete_reason: `${category} 尚未設定解析器。` };
  if (definition.candidate_ready === false) return definition;
  if (!definition.parser?.startsWith("scripts/ingest/") || definition.parser.includes("..") || typeof definition.argument_profile !== "string") {
    throw new Error(`${category} 的解析器設定不安全或不完整。`);
  }
  const candidateParsers = new Set([
    ...Object.values(dispatch.categories ?? {}).map((item) => item?.parser),
    ...(Array.isArray(dispatch.candidate_parsers) ? dispatch.candidate_parsers : []),
  ]);
  if (!candidateParsers.has(definition.parser)) {
    throw new Error(`${category} 的 ${definition.parser} 未登錄為候選解析器；不得由日常入口執行歷史寫入工具。`);
  }
  if (!profile.outputs?.[fields.output]) {
    return { candidate_ready: false, incomplete_reason: `${category} 缺少 outputs.${fields.output}，不可沿用其他出版品的輸出位置。` };
  }
  const inputConfigured = fields.key === "feats"
    ? Boolean(profile.inputs?.feats || profile.inputs?.feats_file || profile.inputs?.feat_sources)
    : fields.key === "magic_items" ? Boolean(profile.inputs?.magic_items || profile.inputs?.magic_items_file)
    : Boolean(profile.inputs?.[fields.key]);
  const supportsSourceOverride = ["職業", "種族", "背景", "法術", "專長", "怪物"].includes(category);
  if (!inputConfigured && !(supportsSourceOverride && source)) {
    return { candidate_ready: false, incomplete_reason: `${category} 缺少 inputs.${fields.key}，不可沿用其他出版品的來源結構。` };
  }
  if (category === "角色建立與成長" && (!profile.inputs.character_creation_tables
    || typeof profile.inputs.character_creation_tables !== "object"
    || Array.isArray(profile.inputs.character_creation_tables)
    || !Object.keys(profile.inputs.character_creation_tables).length)) {
    return { candidate_ready: false, incomplete_reason: `${category} 缺少 inputs.character_creation_tables 的頁面與來源表格對應。` };
  }
  return definition;
}

export function defaultSource(publication) {
  const asset = publication.source_assets?.find((item) => item.format === "directory" && item.status === "available");
  if (!asset) throw new Error("出版品沒有可用的目錄型原始資料；請指定 --source。");
  return path.join(ROOT, asset.path);
}

export function versionForRuleset(ruleset) {
  if (ruleset === "2014") return "2014-Legacy";
  if (ruleset === "2024") return "2024-Core";
  throw new Error(`尚未定義 ruleset ${ruleset} 的 Wiki version。`);
}

export function versionForPublication(publication) {
  if (publication.content_scope === "organized_play") return "AL-Organized-Play";
  return versionForRuleset(publication.ruleset);
}

export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

export function quote(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function slug(value, fallback) {
  const result = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return result || crypto.createHash("sha1").update(fallback).digest("hex").slice(0, 12);
}

export function entityId(publicationId, kind, sourcePath, title) {
  const hash = crypto.createHash("sha1").update(`${sourcePath}:${title}`).digest("hex").slice(0, 10);
  return `entry:${publicationId}:${kind}:${hash}`;
}

export function identityFields({ publicationId, publication, kind, concept, title, source }) {
  return `entity_id: "${entityId(publicationId, kind, source, title)}"\nconcept_id: "concept:${kind}:${slug(concept, title)}"\nruleset: "${publication.ruleset}"\ncontent_scope: "${publication.content_scope}"\nstatus: "${publication.status}"`;
}

export function frontmatter({ publicationId, publication, kind, concept, title, category, tag, source, locator, mirror }) {
  const mirrorCitation = mirror ? `  - file: "${quote(mirror.file)}"\n    locator: "${quote(mirror.locator)}"\n    url: "${quote(mirror.url)}"\n    authority: "官方"\n    translation: "none"\n` : "";
  return `---\ntitle: "${quote(title)}"\nentity_id: "${entityId(publicationId, kind, source, title)}"\nconcept_id: "concept:${kind}:${slug(concept, title)}"\nruleset: "${publication.ruleset}"\ncontent_scope: "${publication.content_scope}"\nstatus: "${publication.status}"\ncategory: "${category}"\nversion: "${versionForPublication(publication)}"\ntags:\n  - "${publication.wiki.tag}"\n  - "${tag}"\nsources:\n${mirrorCitation}  - file: "${quote(source)}"\n    locator: "${quote(locator)}"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "interpreted"\nrules_sources:\n  - "${quote(publication.canonical_rules_source)}"\nerrata: []\nupdated: "${today()}"\n---`;
}

function normalizedFilterValue(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s_—–-]+/g, " ").trim();
}

function recordResult(options, item) {
  if (Array.isArray(options.results)) options.results.push(item);
}

export function writableCandidate({ destination, content, options, matchValues = [], source = null, locator = null }) {
  const rel = path.relative(ROOT, destination).split(path.sep).join("/");
  if (options.apply) throw new Error("匯入器不直接寫入 Wiki；請先預覽並以 wiki:apply 套用已審閱的計畫。");
  // A caller that did not opt into candidate collection retains the legacy
  // preview-only behaviour.  It still cannot write, and production parsers
  // receive candidates: [] from parseOptions.
  const collectCandidates = Array.isArray(options.candidates);
  const filter = normalizedFilterValue(options.only);
  const candidates = [rel, ...matchValues].map(normalizedFilterValue);
  if (filter && !candidates.some((value) => value.includes(filter))) {
    recordResult(options, { target: rel, status: "filtered" });
    return "filtered";
  }
  const exists = fs.existsSync(destination);
  if (exists && !options.replace) {
    console.log(`保留既有頁面（使用 --replace 才覆寫）：${rel}`);
    recordResult(options, { target: rel, status: "skipped", reason: "existing_page_preserved" });
    return "skipped";
  }
  if (exists && /category: "法術"/u.test(content)) {
    const preserved = preserveSpellFieldsForImport(fs.readFileSync(destination, "utf8"), content);
    content = preserved.text;
    recordResult(options, { target: rel, status: "field-preservation", reason: preserved.status });
  }
  if (collectCandidates) {
    const before = exists ? fs.readFileSync(destination, "utf8") : null;
    options.candidates.push(candidateChange({
      destination, before, after: content, operation: exists ? "update" : "create", source, locator, status: "ready",
    }));
  }
  console.log(`預覽：${rel}`);
  recordResult(options, { target: rel, status: "preview" });
  return "preview";
}

export function writeIngestReport({ options, publicationId, category, extra = {} }) {
  if (!options.report) return;
  const destination = reportTargetPath(options.report);
  const report = {
    schema_version: 2,
    root: ROOT,
    publication_id: publicationId,
    category,
    mode: options.apply ? "apply" : "preview",
    plan_type: "ingest-candidates",
    replace: options.replace,
    only: options.only ?? null,
    generated_at: new Date().toISOString(),
    changes: options.candidates ?? [],
    source_fingerprints: sourceFingerprints(options.candidates ?? [], ROOT),
    summary: changeSummary(options.candidates ?? [], options.apply ? "apply" : "preview"),
    results: options.results.map((item) => ({
      operation: item.operation ?? (item.status === "written" ? "update" : item.status === "preview" ? "update" : "unchanged"),
      ...item,
      review: item.review ?? [],
    })),
    ...extra,
  };
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`報告：${path.relative(ROOT, destination).split(path.sep).join("/")}`);
}

const RESULT_OUTCOMES = new Set(["matched", "missing", "incomplete", "conflict", "ambiguous", "out_of_scope"]);

/** Normalize legacy parser result words without discarding their diagnostic
 * detail.  The daily preview contract can therefore be queried uniformly. */
export function normalizeCandidatePlanResults(plan) {
  const results = Array.isArray(plan?.results) ? plan.results : [];
  const normalized = results.map((item) => {
    const original = item.status ?? "unknown";
    const outcome = RESULT_OUTCOMES.has(original) ? original
      : ["preview", "written", "unchanged", "skipped"].includes(original) ? "matched"
        : original === "filtered" ? "out_of_scope"
        : original === "manual_review" ? "ambiguous"
          : ["blocked", "error"].includes(original) ? "incomplete"
            : "incomplete";
    return { ...item, original_status: original, outcome };
  });
  const outcomes = Object.fromEntries([...RESULT_OUTCOMES].map((name) => [name, normalized.filter((item) => item.outcome === name)]));
  return { ...plan, results: normalized, outcome_summary: Object.fromEntries(Object.entries(outcomes).map(([name, items]) => [name, items.length])), outcomes };
}

export function walkMarkdown(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(root, item.name);
    return item.isDirectory() ? walkMarkdown(target) : item.isFile() && item.name.endsWith(".md") ? [target] : [];
  });
}
