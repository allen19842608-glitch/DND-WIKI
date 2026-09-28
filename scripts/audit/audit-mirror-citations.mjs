import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { candidateChange, parseOptions, planCandidateBatch } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_ROOT = path.join(ROOT, "wiki");
const MIRROR_ROOT = path.join(ROOT, "原始資料", "外部來源鏡像");

function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    return entry.isDirectory() ? walk(absolute) : entry.isFile() && entry.name.endsWith(".md") ? [absolute] : [];
  });
}

function rel(absolute) {
  return path.relative(ROOT, absolute).split(path.sep).join("/");
}

function extractFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: null, body: text, bodyOffset: 0 };
  const data = YAML.parse(match[1]);
  return { data, body: match[2], bodyOffset: match[0].length - match[2].length };
}

function publications() {
  const registry = YAML.parse(fs.readFileSync(path.join(ROOT, "config", "publications.yml"), "utf8"));
  const records = [];
  for (const [id, publication] of Object.entries(registry.publications ?? {})) {
    const manifestPath = path.join(MIRROR_ROOT, id, "manifest.yml");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
    const snapshot = path.posix.basename(manifest?.snapshot?.file ?? "");
    const bookId = snapshot.match(/^book-(.+)\.json$/i)?.[1] ?? "";
    const aliases = new Set([id, bookId, publication.title_en, publication.canonical_rules_source]
      .filter((value) => typeof value === "string" && value));
    records.push({ id, title: publication.title_zh, aliases, manifest, bookId, root: `原始資料/外部來源鏡像/${id}/` });
  }
  return records;
}

function mirrorPublicationsForPage(data, records) {
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  return records.filter((publication) => sources.some((source) => {
    const file = String(source?.file ?? "").replaceAll("\\", "/");
    const locator = String(source?.locator ?? "");
    const url = String(source?.url ?? "");
    return file.startsWith(publication.root)
      || locator.includes(publication.manifest?.publication_title ?? "")
      || url.toLowerCase().includes(`book-${publication.bookId.toLowerCase()}.json`)
      || /5e\.tools 補充來源/.test(locator) && [...publication.aliases].some((alias) => locator.includes(String(alias).replace(/ \(\d{4}\)$/, "")));
  }));
}

function citationPublication(token, eligible) {
  const normalized = token.trim().toLowerCase().replaceAll("’", "'");
  return eligible.find((publication) => [...publication.aliases].some((alias) => {
    const plain = String(alias).toLowerCase().replaceAll("’", "'");
    return normalized === plain || normalized === `${plain.toLowerCase()} 2025`;
  }));
}

function validPageText(value) {
  return /^(?:p\.|pp\.)\s*\d+(?:\s*(?:–|-|、|,|\uFF0C)\s*\d+)*$/i.test(value.trim());
}

function leadingPageText(value) {
  const match = value.trim().match(/^((?:p\.|pp\.)\s*\d+(?:\s*(?:–|-)\s*\d+)?)(?:\s*[；;].*)$/i);
  return match?.[1] ?? null;
}

export function normalizeMirrorCitations(text, eligible) {
  const changes = [];
  const unresolved = [];
  const output = text.replace(/（來源：([^，；）]+)，\s*([^）]+)）/g, (whole, source, locator, offset) => {
    const publication = citationPublication(source, eligible);
    if (!publication) return whole;
    const pageText = validPageText(locator) ? locator.trim() : leadingPageText(locator);
    if (!pageText) {
      unresolved.push({ source, locator: locator.trim(), offset });
      return whole;
    }
    const replacement = `（來源：《${publication.title}》，${pageText}）`;
    if (replacement !== whole) changes.push({ source, locator: locator.trim(), replacement, offset, trimmed_locator: pageText !== locator.trim() });
    return replacement;
  });
  return { text: output, changes, unresolved };
}

function sourceHealth(data, eligible) {
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const warnings = [];
  for (const publication of eligible) {
    const mirrorSources = sources.filter((source) => String(source?.file ?? "").replaceAll("\\", "/").startsWith(publication.root));
    for (const source of mirrorSources) {
      const file = String(source.file).replaceAll("\\", "/");
      if (!fs.existsSync(path.join(ROOT, ...file.split("/")))) warnings.push({ code: "MIRROR_SOURCE_MISSING", file, message: "鏡像來源檔不存在。" });
      if (!String(source.locator ?? "").trim()) warnings.push({ code: "MIRROR_LOCATOR_MISSING", file, message: "鏡像來源缺少 locator。" });
    }
  }
  return warnings;
}

export function auditMirrorCitations(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.apply) throw new Error("鏡像引用稽核為唯讀；請以預覽報告交由 wiki:apply 套用已審閱候選。 ");
  const publicationId = args.includes("--publication") ? options.publicationId : undefined;
  const only = options.only;
  const records = publications().filter((publication) => !publicationId || publication.id === publicationId);
  if (publicationId && !records.length) throw new Error(`找不到已鏡像的出版品：${publicationId}`);
  const pages = [];
  let pagesScanned = 0;
  const pending = [];
  const report = { schema_version: 2, mode: "preview", errors: [], warnings: [], information: [], translation_pending: [], source_conflicts: [], missing_page_citation: [], missing_stat_link: [] };
  for (const file of walk(WIKI_ROOT)) {
    const relative = rel(file);
    if (only && !relative.includes(only)) continue;
    const original = fs.readFileSync(file, "utf8");
    const { data, body } = extractFrontmatter(original);
    const eligible = mirrorPublicationsForPage(data, records);
    if (!eligible.length) continue;
    pagesScanned += 1;
    const normalized = normalizeMirrorCitations(body, eligible);
    const health = sourceHealth(data, eligible);
    report.warnings.push(...health.map((item) => ({ page: relative, ...item })));
    report.missing_page_citation.push(...normalized.unresolved.map((item) => ({ page: relative, publication_ids: eligible.map((publication) => publication.id), ...item })));
    if (normalized.changes.length) {
      pages.push({ page: relative, publications: eligible.map((publication) => publication.id), citations: normalized.changes });
      pending.push(candidateChange({ destination: file, before: original, after: `${original.slice(0, original.length - body.length)}${normalized.text}`, operation: "update", source: eligible.map((publication) => publication.root).join("、"), locator: "正文鏡像引用" }));
    }
  }
  report.summary = {
    publications: records.length,
    pages_scanned: pagesScanned,
    pages_changed: pages.length,
    citations_normalized: pages.reduce((total, page) => total + page.citations.length, 0),
    missing_page_citation: report.missing_page_citation.length,
    warnings: report.warnings.length,
  };
  report.information = pages;
  const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
  report.changes = plan.changes;
  report.summary = { ...report.summary, ...plan.summary };
  if (options.report) {
    const target = path.resolve(ROOT, options.report);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`預覽鏡像正文引用：出版品 ${report.summary.publications}；改寫 ${report.summary.citations_normalized} 處／${report.summary.pages_changed} 頁；缺頁碼 ${report.summary.missing_page_citation}；警告 ${report.summary.warnings}。\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { auditMirrorCitations(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
