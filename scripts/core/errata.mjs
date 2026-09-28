import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { approvedTranslationMap, assessApprovedTranslation } from "./approved-translation.mjs";
import { ROOT, assertWikiTarget, today, walkMarkdown } from "./ingest-publication-utils.mjs";
import { deriveSourceType, parseWikiLink, resolveWikiTarget } from "./wiki-lint.mjs";

function fail(message) { throw new Error(message); }

function pageParts(text, target) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) fail(`${target} 缺少合法 Frontmatter。`);
  let data;
  try { data = YAML.parse(match[1]); } catch (error) { fail(`${target} 的 Frontmatter 無法解析：${error.message}`); }
  if (!data || typeof data !== "object" || !Array.isArray(data.sources) || !Array.isArray(data.errata)) {
    fail(`${target} 的 sources 與 errata 必須是陣列。`);
  }
  return { frontmatter: match[1], data, body: text.slice(match[0].length), newline: text.includes("\r\n") ? "\r\n" : "\n" };
}

function sectionRange(body, heading, target) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...body.matchAll(new RegExp(`^#{1,6}\\s+${escaped}\\s*$`, "gmi"))];
  if (matches.length !== 1) fail(`${target} 的章節「${heading}」必須唯一（目前 ${matches.length} 個）。`);
  const start = matches[0].index;
  const level = matches[0][0].match(/^#+/)[0].length;
  const next = body.slice(start + matches[0][0].length).search(new RegExp(`^#{1,${level}}\\s+`, "m"));
  return { start, end: next < 0 ? body.length : start + matches[0][0].length + next };
}

function sequenceInsert(lines, field, entry) {
  const indices = lines.flatMap((line, index) => line.startsWith(`${field}:`) ? [index] : []);
  if (indices.length !== 1) fail(`Frontmatter 的 ${field} 必須唯一。`);
  const index = indices[0];
  const value = lines[index].slice(field.length + 1).trim();
  if (value && value !== "[]") fail(`Frontmatter 的 ${field} 必須使用區塊陣列或 []。`);
  lines[index] = `${field}:`;
  lines.splice(index + 1, 0, ...entry);
}

function scalarSet(lines, field, value) {
  const indices = lines.flatMap((line, index) => line.startsWith(`${field}:`) ? [index] : []);
  if (indices.length !== 1) fail(`Frontmatter 的 ${field} 必須唯一。`);
  lines[indices[0]] = `${field}: ${JSON.stringify(value)}`;
}

/** One exact text replacement plus its source and errata metadata.
 * Version replacement, AL applicability and unlisted proper nouns are not inferred. */
export function prepareErrata(input, { root = ROOT } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("勘誤輸入必須是物件。");
  for (const field of ["target", "heading", "old_text", "new_text", "source_file", "source_locator"]) {
    if (typeof input[field] !== "string" || !input[field].trim()) fail(`勘誤輸入缺少 ${field}。`);
  }
  for (const field of ["target", "heading", "source_file", "source_locator"]) {
    if (/[\r\n]/.test(input[field])) fail(`勘誤 ${field} 不可包含換行。`);
  }
  if (input.source_authority !== "官方") fail("勘誤來源必須明確標示 source_authority: 官方。");
  if (!["none", "community"].includes(input.source_translation)) fail("勘誤來源必須指定 source_translation: none 或 community。");
  if (!Array.isArray(input.terms)) fail("勘誤輸入必須列明 terms 清單；無專有名詞時使用 []。");
  if (input.id !== undefined && (typeof input.id !== "string" || !/^[A-Za-z0-9_-]+$/.test(input.id))) {
    fail("勘誤 id 只允許英數字、底線及連字號。");
  }
  const targetName = assertWikiTarget(input.target);
  const rootPath = path.resolve(root);
  const source = path.resolve(rootPath, input.source_file);
  const rawRoot = `${path.resolve(rootPath, "原始資料")}${path.sep}`;
  if (!input.source_file.startsWith("原始資料/") || !source.startsWith(rawRoot)
    || !fs.existsSync(source) || !fs.statSync(source).isFile() || !fs.realpathSync(source).startsWith(rawRoot)) {
    fail(`勘誤來源必須是原始資料/ 中存在的檔案：${input.source_file}`);
  }
  const target = path.resolve(rootPath, targetName);
  const wikiRoot = `${path.resolve(rootPath, "wiki")}${path.sep}`;
  if (!fs.existsSync(target) || !fs.realpathSync(target).startsWith(wikiRoot)) fail(`勘誤目標不存在或越出 wiki/：${input.target}`);
  const glossary = path.join(rootPath, "附件", "翻譯詞彙表.md");
  if (input.terms.length && !fs.existsSync(glossary)) fail("找不到核定翻譯詞彙表。");
  const translations = input.terms.length ? approvedTranslationMap(fs.readFileSync(glossary, "utf8")) : new Map();
  for (const term of input.terms) {
    if (!term || typeof term.english !== "string" || !term.english.trim() || typeof term.chinese !== "string" || !term.chinese.trim()) {
      fail("勘誤 terms 每項必須有 english 與 chinese。");
    }
    const verdict = assessApprovedTranslation(translations, term.english, term.chinese);
    if (verdict.status !== "matched") fail(`勘誤譯名未核定或衝突：${term.english} → ${term.chinese}（${verdict.reason}）。`);
  }
  const before = fs.readFileSync(target, "utf8");
  const { frontmatter, data, body, newline } = pageParts(before, targetName);
  const range = sectionRange(body, input.heading, targetName);
  const section = body.slice(range.start, range.end);
  const markerId = input.id ?? crypto.createHash("sha256")
    .update(JSON.stringify([targetName, input.heading, input.old_text, input.new_text, input.source_file, input.source_locator]))
    .digest("hex").slice(0, 20);
  const marker = `<!-- ERRATA:${markerId} -->`;
  const note = `官方勘誤 ${markerId}：${input.source_file}（${input.source_locator}）`;
  if (before.includes(marker)) {
    if (!section.includes(marker) || !section.includes(input.new_text)
      || !data.errata.includes(note)
      || !data.sources.some((item) => item?.file === input.source_file && item?.locator === input.source_locator
        && item?.authority === "官方" && item?.translation === input.source_translation)) {
      fail(`${targetName} 的既有勘誤標記與正文或來源紀錄不一致，需人工覆核。`);
    }
    return { target: targetName, before, after: before, operation: "unchanged", status: "unchanged",
      source: input.source_file, locator: input.source_locator, review: [] };
  }
  const occurrences = section.split(input.old_text).length - 1;
  if (occurrences !== 1) fail(`${targetName} 的指定舊文必須在唯一章節中恰好出現一次（目前 ${occurrences} 次）。`);
  const replaced = `${section.slice(0, section.indexOf(input.old_text))}${input.new_text}${section.slice(section.indexOf(input.old_text) + input.old_text.length)}`;
  const errataNote = `${newline}${newline}${marker}${newline}> [!NOTE] 勘誤：依 ${input.source_file}（${input.source_locator}）替換本段指定文字。${newline}`;
  const lines = frontmatter.split(/\r?\n/);
  const hasSource = data.sources.some((item) => item?.file === input.source_file && item?.locator === input.source_locator);
  if (hasSource && !data.sources.some((item) => item?.file === input.source_file && item?.locator === input.source_locator
    && item?.authority === "官方" && item?.translation === input.source_translation)) {
    fail(`${targetName} 的既有勘誤來源權威標記衝突，需人工覆核。`);
  }
  if (!hasSource) sequenceInsert(lines, "sources", [
    `  - file: ${JSON.stringify(input.source_file)}`,
    `    locator: ${JSON.stringify(input.source_locator)}`,
    '    authority: "官方"',
    `    translation: ${JSON.stringify(input.source_translation)}`,
  ]);
  if (!data.errata.every((item) => typeof item === "string")) fail(`${targetName} 的 errata 必須是字串陣列。`);
  if (!data.errata.includes(note)) sequenceInsert(lines, "errata", [`  - ${JSON.stringify(note)}`]);
  scalarSet(lines, "source_type", deriveSourceType([...data.sources, ...(hasSource ? [] : [{ authority: "官方" }])]));
  scalarSet(lines, "updated", today());
  const after = `---${newline}${lines.join(newline)}${newline}---${newline}${body.slice(0, range.start)}${replaced}${errataNote}${body.slice(range.end)}`;
  const links = (text) => [...text.matchAll(/\[\[[^\]]+\]\]/g)].map((match) => match[0]).sort();
  const linksChanged = JSON.stringify(links(input.old_text)) !== JSON.stringify(links(input.new_text));
  return { target: targetName, before, after, operation: "update", status: linksChanged ? "manual_review" : "ready", source: input.source_file,
    locator: input.source_locator, review: ["2014／2024 替代關係與 AL 適用性須另行覆核",
      ...(linksChanged ? ["勘誤改變 Wiki 連結；須先把必要反向連結與索引加入同一候選計畫。"] : [])] };
}

function linkCatalog(root) {
  const records = walkMarkdown(path.join(root, "wiki")).map((absolute) => ({ rel: path.relative(root, absolute).replaceAll("\\", "/") }));
  const exact = new Map(records.map((record) => [record.rel, record]));
  const byBasename = new Map();
  for (const record of records) {
    const basename = path.posix.basename(record.rel, ".md");
    const matches = byBasename.get(basename) ?? [];
    matches.push(record);
    byBasename.set(basename, matches);
  }
  return { exact, byBasename };
}

function linkTargets(text, catalog) {
  const targets = new Set();
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const { target } = parseWikiLink(match[1]);
    const clean = target.replace(/^wiki\//, "");
    if (!clean.includes("/") && (catalog.byBasename.get(clean)?.length ?? 0) > 1) {
      return { reason: `連結 ${target} 有多個同名頁；請使用完整中文路徑。` };
    }
    const result = resolveWikiTarget(target, catalog);
    if (result.status !== "ok") return { reason: `連結 ${target} 無法唯一定位（${result.status}）。` };
    targets.add(result.record.rel);
  }
  return { targets };
}

function backlinkChange({ root, target, sourceTarget, sourceTitle, action, source, locator, catalog }) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute) || !fs.realpathSync(absolute).startsWith(`${path.resolve(root, "wiki")}${path.sep}`)) {
    fail(`勘誤反向連結目標不存在或越出 wiki/：${target}`);
  }
  const before = fs.readFileSync(absolute, "utf8");
  const { body, newline } = pageParts(before, target);
  const range = sectionRange(body, "🔗 相關連結", target);
  const section = body.slice(range.start, range.end);
  const lines = section.split(/\r?\n/);
  const existing = lines.flatMap((line, index) => {
    const match = line.match(/^\s*-\s*\[\[([^\]]+)\]\]\s*$/);
    if (!match) return [];
    const linked = resolveWikiTarget(parseWikiLink(match[1]).target, catalog);
    return linked.status === "ok" && linked.record.rel === sourceTarget ? [index] : [];
  });
  if (existing.length > 1) fail(`${target} 有多條指向 ${sourceTarget} 的反向連結，需人工覆核。`);
  if (action === "add") {
    if (existing.length === 1) return null;
    if (/[|\[\]\r\n]/.test(sourceTitle)) fail(`${sourceTarget} 的標題不能安全用作反向連結別名。`);
    const link = `- [[${sourceTarget.slice(0, -3)}|${sourceTitle}]]`;
    let insertion = lines.length;
    while (insertion > 0 && !lines[insertion - 1].trim()) insertion -= 1;
    lines.splice(insertion, 0, link);
  } else {
    if (existing.length !== 1) fail(`${target} 找不到唯一的 ${sourceTarget} 反向連結可移除。`);
    lines.splice(existing[0], 1);
  }
  const after = `${before.slice(0, before.length - body.length)}${body.slice(0, range.start)}${lines.join(newline)}${body.slice(range.end)}`;
  return { target, before, after, operation: "update", status: "ready", source, locator,
    review: ["勘誤相依頁的反向連結；與主頁同批審閱。"] };
}

/** Include explicit, uniquely resolved backlink effects in one transaction.
 * A changed link without a matching decision remains manual_review. */
export function prepareErrataBatch(input, { root = ROOT } = {}) {
  const primary = prepareErrata(input, { root });
  if (primary.operation === "unchanged") return [primary];
  const catalog = linkCatalog(root);
  const oldLinks = linkTargets(input.old_text, catalog);
  const newLinks = linkTargets(input.new_text, catalog);
  if (oldLinks.reason || newLinks.reason) {
    return [{ ...primary, status: "manual_review", review: [...primary.review, oldLinks.reason ?? newLinks.reason] }];
  }
  const added = [...newLinks.targets].filter((target) => !oldLinks.targets.has(target));
  const removed = [...oldLinks.targets].filter((target) => !newLinks.targets.has(target));
  const expected = new Map([...added.map((target) => [target, "add"]), ...removed.map((target) => [target, "remove"])]);
  const backlinks = input.backlinks ?? [];
  if (!Array.isArray(backlinks)) fail("勘誤 backlinks 必須是清單。");
  if (!expected.size && backlinks.length) fail("勘誤未改變連結目標，不得額外修改反向連結。");
  if (expected.size !== backlinks.length) {
    return [{ ...primary, status: "manual_review", review: [...primary.review, "每個變更的連結目標都須在 backlinks 明列新增或移除決定。"] }];
  }
  const byTarget = new Map();
  for (const item of backlinks) {
    if (!item || typeof item !== "object" || typeof item.target !== "string") fail("勘誤 backlinks 每項須指定 target 與 action。");
    const target = assertWikiTarget(item.target);
    if (!catalog.exact.has(target) || target === primary.target || !["add", "remove"].includes(item.action)
      || expected.get(target) !== item.action || byTarget.has(target)) {
      fail(`勘誤 backlinks 與變更的連結目標不一致：${target}`);
    }
    byTarget.set(target, item.action);
  }
  const sourceTitle = pageParts(primary.before, primary.target).data.title;
  if (typeof sourceTitle !== "string" || !sourceTitle.trim()) fail(`${primary.target} 缺少可用的標題。`);
  const changes = [{ ...primary, status: "ready", review: primary.review.filter((reason) => !reason.includes("必要反向連結與索引")) }];
  try {
    for (const [target, action] of byTarget) {
      const change = backlinkChange({ root, target, sourceTarget: primary.target, sourceTitle,
        action, source: input.source_file, locator: input.source_locator, catalog });
      if (change) changes.push(change);
    }
  } catch (error) {
    return [{ ...primary, status: "manual_review", review: [...primary.review, `反向連結無法安全產生：${error.message}`] }];
  }
  return changes;
}
