/**
 * 法術 Target／Area 欄位的保守遷移工具。
 *
 * 本模組只處理 Wiki 已有的欄位；絕不從效果正文、Range 或鏡像來源推導新規則事實。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXCEPTION_FILE = path.join(MODULE_ROOT, "config", "spell-target-area-exceptions.json");

/**
 * JSON.parse silently accepts duplicate object keys and keeps only the last
 * value. Exception IDs are governance data, so reject that ambiguity before
 * parsing instead of allowing a later row to silently rewrite an earlier one.
 */
export function parseTargetAreaExceptions(text) {
  const ids = [...String(text).matchAll(/^\s*"(entry:[^"]+)"\s*:/gmu)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) throw new Error(`Target／Area 例外表含重複 entity_id：${duplicates.join("、")}`);
  return JSON.parse(text);
}

const TARGET_AREA_EXCEPTIONS = fs.existsSync(EXCEPTION_FILE)
  ? parseTargetAreaExceptions(fs.readFileSync(EXCEPTION_FILE, "utf8"))
  : {};

const TERMINAL_PUNCTUATION = /[。！？]\s*$/u;
const PLACEHOLDER = /^(?:無|無資料|—|-|依下列效果敘述與來源條文判定。?)$/u;
const SELF_ONLY = /^(?:自身|自己|你|施法者|self)$/iu;
const TARGET_LABEL = "目標 (Target)";
const AREA_LABEL = "效應區域 (Area)";
const COMBINED_LABEL = "目標／範圍 (Target/Area)";

export const spellFieldLabels = Object.freeze({ target: TARGET_LABEL, area: AREA_LABEL, combined: COMBINED_LABEL });

export function normalizeSpellField(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/gu, " ").trim().replace(TERMINAL_PUNCTUATION, "").trim();
  return normalized && !PLACEHOLDER.test(normalized) ? normalized : null;
}

export function isSelfOnlyTarget(value) {
  return typeof value === "string" && SELF_ONLY.test(value.trim());
}

function topLevelLine(line) {
  return /^- \*\*([^*]+)\*\*：(.*)$/u.exec(line);
}

function fieldKind(label) {
  if (label === TARGET_LABEL) return "target";
  if (label === AREA_LABEL) return "area";
  if (label === COMBINED_LABEL || /^目標.*範圍/u.test(label)) return "combined";
  if (/^施法距離(?: \(Range\))?$/u.test(label)) return "range";
  if (/^法術成分(?: \(Components\))?$/u.test(label)) return "components";
  return null;
}

/** Read only top-level list fields, preserving line offsets for diagnostics. */
export function readSpellFields(text) {
  const lines = String(text).split(/\r?\n/u);
  const result = [];
  let inFrontmatter = lines[0] === "---";
  for (let index = 0; index < lines.length; index += 1) {
    if (inFrontmatter) {
      if (index > 0 && lines[index] === "---") inFrontmatter = false;
      continue;
    }
    const match = topLevelLine(lines[index]);
    if (!match) continue;
    const kind = fieldKind(match[1]);
    if (kind) result.push({ kind, label: match[1], value: match[2], line: index, raw: lines[index] });
  }
  return result;
}

function validTargetPhrase(value) {
  return /(?:生物|物件|遺體|遺骸|一點|一處|空間|地點|表面|目標|攻擊所命中的)/u.test(value)
    && !/(?:造成|獲得|進行|使其|形成|出現|創造|製造|變成|散射)/u.test(value);
}

function validAreaPhrase(value) {
  return /(?:球狀|錐狀|立方|柱狀|線狀|光環|牆|半徑|寬|高|長)/u.test(value)
    && !/(?:造成|獲得|進行|使其|形成|出現|創造|製造|變成|散射|生物|物件)/u.test(value);
}

export function validateSpellField(kind, value) {
  const normalized = normalizeSpellField(value);
  if (!normalized) return { ok: false, reason: "空白或占位欄位" };
  if (TERMINAL_PUNCTUATION.test(String(value).trim())) return { ok: false, reason: "不得使用句末標點" };
  if (/^(?:目標|效應區域)：/u.test(normalized)) return { ok: false, reason: "欄位值不得重複標籤" };
  if (kind === "target" && isSelfOnlyTarget(normalized)) return { ok: false, reason: "僅為自身的目標應省略" };
  return { ok: true, value: normalized };
}

function resolved(target, area, reason) {
  let finalTarget = normalizeSpellField(target);
  const finalArea = normalizeSpellField(area);
  const selfOmitted = isSelfOnlyTarget(finalTarget);
  if (selfOmitted) finalTarget = null;
  const targetResult = finalTarget ? validateSpellField("target", finalTarget) : { ok: true };
  const areaResult = finalArea ? validateSpellField("area", finalArea) : { ok: true };
  if (!targetResult.ok || !areaResult.ok) return { status: "exception", reason: targetResult.reason ?? areaResult.reason };
  return {
    status: "resolved",
    target: finalTarget,
    area: finalArea,
    selfOmitted,
    layout: finalTarget && finalArea ? "both" : finalTarget ? "target-only" : finalArea ? "area-only" : "omitted",
    reason,
  };
}

/**
 * Split a pre-existing combined value. This is deliberately conservative: a prose
 * effect sentence is an exception rather than a source for inferred field data.
 */
export function splitCombinedTargetArea(value) {
  const normalized = normalizeSpellField(value);
  if (!normalized) return resolved(null, null, "既有欄位無資料");

  const markers = [...normalized.matchAll(/(?:^|[；;])\s*(目標|效應區域)\s*[：:]\s*/gu)];
  if (markers.length) {
    if (markers[0].index !== 0) return { status: "exception", reason: "標示分句前含無法安全歸類的文字" };
    const parts = {};
    for (let index = 0; index < markers.length; index += 1) {
      const marker = markers[index];
      const key = marker[1] === "目標" ? "target" : "area";
      if (parts[key] !== undefined) return { status: "exception", reason: "重複的既有分句標籤" };
      parts[key] = normalized.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? normalized.length).replace(/[；;]\s*$/u, "").trim();
    }
    return resolved(parts.target, parts.area, "既有標示分句");
  }

  const pair = /^(.+?)(?:；|;|，形成)(.+)$/u.exec(normalized);
  if (pair && validTargetPhrase(pair[1].trim()) && validAreaPhrase(pair[2].trim())) {
    return resolved(pair[1], pair[2], "既有可明確拆分短語");
  }
  if (validAreaPhrase(normalized)) return resolved(null, normalized, "既有區域短語");
  if (validTargetPhrase(normalized)) return resolved(normalized, null, "既有目標短語");
  return { status: "exception", reason: "既有完整敘述無法安全拆分" };
}

export function renderSpellFields({ target, area }) {
  const lines = [];
  if (target) lines.push(`- **${TARGET_LABEL}**：${target}`);
  if (area) lines.push(`- **${AREA_LABEL}**：${area}`);
  return lines;
}

/** Remove only lexical Target/Area fields; used to prove no collateral edits. */
function normalizeEmbeddedAreaRange(line) {
  const match = /^(- \*\*施法距離 \(Range\)\*\*：)\s*自身\s*[（(].*(?:球|錐|立方|柱|線|光環|半球|半徑|直線|牆).*[）)]\s*$/u.exec(line);
  return match ? `${match[1]}自身` : line;
}

function splitLinesPreserveEndings(text) {
  const parts = String(text).split(/(\r\n|\n)/u);
  const lines = [];
  for (let index = 0; index < parts.length; index += 2) lines.push({ line: parts[index], eol: parts[index + 1] ?? "" });
  return lines;
}

function joinLinesPreserveEndings(lines) {
  return lines.map(({ line, eol }) => `${line}${eol}`).join("");
}

export function withoutSpellTargetArea(text, { normalizeEmbeddedRange = false } = {}) {
  const lines = splitLinesPreserveEndings(text);
  const remove = new Set(readSpellFields(text).filter((field) => ["target", "area", "combined"].includes(field.kind)).map((field) => field.line));
  return joinLinesPreserveEndings(lines
    .map(({ line, eol }) => ({ line: normalizeEmbeddedRange ? normalizeEmbeddedAreaRange(line) : line, eol }))
    .filter((_, index) => !remove.has(index)));
}

function exceptionFor(text) {
  const entityId = String(text).match(/^entity_id:\s*["']([^"']+)["']\s*$/mu)?.[1];
  return entityId ? TARGET_AREA_EXCEPTIONS[entityId] : undefined;
}

function replaceSpellFields(text, fields) {
  const lines = splitLinesPreserveEndings(text);
  const existing = readSpellFields(text);
  const range = existing.filter((field) => field.kind === "range");
  if (range.length !== 1) return { status: "exception", reason: range.length ? "Range 欄位重複" : "缺少 Range 欄位" };
  const remove = new Set(existing.filter((field) => ["target", "area", "combined"].includes(field.kind)).map((field) => field.line));
  const next = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (remove.has(index)) continue;
    const current = lines[index];
    next.push({ line: fields.area ? normalizeEmbeddedAreaRange(current.line) : current.line, eol: current.eol });
    if (index === range[0].line) next.push(...renderSpellFields(fields).map((line) => ({ line, eol: current.eol || "\n" })));
  }
  return { status: "resolved", text: joinLinesPreserveEndings(next) };
}

/** Build, but do not write, the migration for one page. */
export function planSpellTargetArea(text) {
  const existing = readSpellFields(text);
  const oldFields = existing.filter((field) => ["target", "area", "combined"].includes(field.kind));
  const kinds = oldFields.map((field) => field.kind);
  if (!oldFields.length) return { status: "unchanged", layout: "omitted", reason: "既有頁面未列 Target／Area", oldFields, text };
  if (new Set(kinds).size !== kinds.length || (kinds.includes("combined") && kinds.length > 1)) {
    return { status: "exception", reason: "Target／Area 欄位重複或新舊欄位並存", oldFields, text };
  }
  let proposal;
  const override = exceptionFor(text);
  if (override) proposal = resolved(override.target ?? null, override.area ?? null, override.omit ? "例外表明確省略" : "例外表核定值");
  else if (kinds[0] === "combined") proposal = splitCombinedTargetArea(oldFields[0].value);
  else {
    proposal = resolved(
      oldFields.find((field) => field.kind === "target")?.value,
      oldFields.find((field) => field.kind === "area")?.value,
      "既有分開欄位",
    );
  }
  if (proposal.status !== "resolved") return { ...proposal, oldFields, text };
  const replacement = replaceSpellFields(text, proposal);
  if (replacement.status !== "resolved") return { ...replacement, oldFields, text };
  const normalizeRange = Boolean(proposal.area);
  if (
    withoutSpellTargetArea(text, { normalizeEmbeddedRange: normalizeRange })
    !== withoutSpellTargetArea(replacement.text, { normalizeEmbeddedRange: normalizeRange })
  ) {
    return { status: "exception", reason: "保護檢查偵測到欄位外內容差異", oldFields, text };
  }
  return { ...proposal, oldFields, text: replacement.text, status: replacement.text === text ? "unchanged" : "change" };
}

/**
 * Rebuilders must not erase human-maintained Target/Area data. Existing absence is
 * also intentional: generated effect text never supplies a replacement value.
 */
export function preserveSpellFieldsForImport(existingText, generatedText) {
  const previous = readSpellFields(existingText).filter((field) => ["target", "area", "combined"].includes(field.kind));
  const generated = readSpellFields(generatedText);
  const range = generated.filter((field) => field.kind === "range");
  if (range.length !== 1) return { status: "unavailable", reason: "生成頁缺少唯一 Range 欄位", text: generatedText };
  const lines = splitLinesPreserveEndings(generatedText);
  const remove = new Set(generated.filter((field) => ["target", "area", "combined"].includes(field.kind)).map((field) => field.line));
  const next = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (remove.has(index)) continue;
    const current = lines[index];
    next.push(current);
    if (index === range[0].line) next.push(...previous.map((field) => ({ line: field.raw, eol: current.eol || "\n" })));
  }
  return { status: previous.length ? "preserved" : "omitted", text: joinLinesPreserveEndings(next) };
}

/** Compatibility export retained for existing callers during importer migration. */
export function normalizeTargetArea(value) {
  return normalizeSpellField(value);
}
