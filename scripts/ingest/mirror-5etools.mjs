import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT, loadIngestProfile, loadPublication } from "../core/ingest-publication-utils.mjs";

const SCRIPT = fileURLToPath(import.meta.url);
const DEFAULT_TIMEOUT_MS = 30_000;
const BOOK_MAP = YAML.parse(fs.readFileSync(path.join(ROOT, "config", "5etools-book-map.yml"), "utf8")).books ?? {};
const NON_CHAPTER_SECTIONS = new Set(["credits"]);

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function posix(value) {
  return value.split(path.sep).join("/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeName(value) {
  return String(value).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function appendixName(title) {
  const match = String(title).trim().match(/^appendix\s*([A-Z])?\s*:\s*(.+)$/i);
  if (!match) return `appendix-${safeName(title)}`;
  return match[1]
    ? `appendix ${match[1].toUpperCase()}- ${safeName(match[2])}`
    : `appendix-${safeName(match[2])}`;
}

function headingText(entry) {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && typeof entry.name === "string") return entry.name;
  return "";
}

function sectionKind(entry) {
  return /^appendix(?:\s|:)/i.test(headingText(entry).trim()) ? "appendix" : "chapter";
}

function imageMarkdown(entry) {
  const imagePath = String(entry?.href?.path ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
  if (!imagePath || imagePath.split("/").some((part) => !part || part === "." || part === "..")) return "";
  const fallback = imagePath.split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? "image";
  const alt = String(entry.title ?? fallback).replaceAll("[", "\\[").replaceAll("]", "\\]");
  return `![${alt}](../images/${imagePath})`;
}

export function isChapterSection(entry) {
  const title = headingText(entry).trim().toLowerCase();
  return entry?.type === "section" && title && !NON_CHAPTER_SECTIONS.has(title);
}

export function entriesToMarkdown(entries, level = 1) {
  if (!Array.isArray(entries)) return "";
  const lines = [];
  for (const entry of entries) {
    if (typeof entry === "string") {
      lines.push(entry);
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    if (entry.type === "image") {
      const markdown = imageMarkdown(entry);
      if (markdown) lines.push(markdown);
      continue;
    }
    const name = headingText(entry);
    if (name) lines.push(`${"#".repeat(Math.min(level, 6))} ${name}`);
    if (typeof entry.entries === "string") lines.push(entry.entries);
    else if (Array.isArray(entry.entries)) lines.push(entriesToMarkdown(entry.entries, name ? level + 1 : level));
    if (Array.isArray(entry.items)) {
      for (const item of entry.items) {
        if (item?.type === "image") {
          const markdown = imageMarkdown(item);
          if (markdown) lines.push(markdown);
        } else lines.push(`- ${typeof item === "string" ? item : headingText(item)}`);
      }
    }
    if (Array.isArray(entry.images)) {
      for (const image of entry.images) {
        const markdown = imageMarkdown(image);
        if (markdown) lines.push(markdown);
      }
    }
  }
  return lines.filter(Boolean).join("\n\n").trim();
}

export function chapterDocuments(book, chapters) {
  const entries = Array.isArray(book?.data) ? book.data : [];
  return chapters.map((chapter) => {
    const normalized = String(chapter.title).toLowerCase();
    const matched = entries.find((entry) => String(headingText(entry)).toLowerCase() === normalized)
      ?? entries.find((entry) => String(headingText(entry)).toLowerCase().includes(normalized));
    const body = matched ? entriesToMarkdown([matched]) : "";
    return { ...chapter, found: Boolean(matched), markdown: body };
  });
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "DND-WIKI-source-mirror" } });
    if (!response.ok) throw new Error(`下載失敗：HTTP ${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function readSource(args, mirror) {
  const sourceFile = option(args, "--source-file");
  if (sourceFile) return fs.readFileSync(path.resolve(ROOT, sourceFile), "utf8");
  return fetchText(mirror.url);
}

function withMirror(profile) {
  if (profile.canonical_mirror) return profile;
  const bookId = BOOK_MAP[profile.publication_id];
  if (!bookId) return profile;
  return { ...profile, canonical_mirror: {
    provider: "5e.tools",
    book_id: bookId,
    url: `https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-${bookId}.json`,
    output_root: `原始資料/外部來源鏡像/${profile.publication_id}`,
  } };
}

function profiles() {
  const directory = path.join(ROOT, "config", "ingest-profiles");
  return fs.readdirSync(directory).filter((file) => file.endsWith(".yml")).sort()
    .map((file) => withMirror(YAML.parse(fs.readFileSync(path.join(directory, file), "utf8"))))
    .filter((profile) => profile?.canonical_mirror?.provider === "5e.tools");
}

function outputFiles(profile, mirror, rawText, documents) {
  const root = mirror.output_root;
  const snapshot = `${root}/book-${String(mirror.book_id).toLowerCase()}.json`;
  const manifest = `${root}/manifest.yml`;
  const chapterFiles = documents.map((chapter) => ({
    chapter,
    file: chapter.kind === "appendix"
      ? `${root}/chapters/${appendixName(chapter.title)}.md`
      : `${root}/chapters/${String(chapter.number).padStart(2, "0")}-${safeName(chapter.title)}.md`,
  }));
  const existingManifestPath = path.join(ROOT, ...manifest.split("/"));
  let preservedDatasets = [];
  let preservedImages = [];
  if (fs.existsSync(existingManifestPath)) {
    try {
      const existing = YAML.parse(fs.readFileSync(existingManifestPath, "utf8"));
      if (Array.isArray(existing?.datasets)) preservedDatasets = existing.datasets;
      if (Array.isArray(existing?.images)) preservedImages = existing.images;
    } catch {
      // A malformed prior manifest will be replaced by the verified new manifest.
    }
  }
  const manifestData = {
    schema_version: 1,
    publication_id: profile.publication_id,
    publication_title: loadPublication(profile.publication_id).canonical_rules_source,
    provider: "5e.tools",
    upstream_url: mirror.url,
    retrieved_at: new Date().toISOString(),
    snapshot: { file: snapshot, sha256: sha256(rawText) },
    chapters: chapterFiles.map(({ chapter, file }) => ({ kind: chapter.kind ?? "chapter", number: chapter.number, title: chapter.title, page: chapter.page, file, status: chapter.found ? "complete" : "missing" })),
  };
  const configuredDatasets = Array.isArray(mirror.datasets) ? mirror.datasets : [];
  if (configuredDatasets.length || preservedDatasets.length) {
    manifestData.datasets = configuredDatasets.length ? configuredDatasets : preservedDatasets;
  }
  if (preservedImages.length) manifestData.images = preservedImages;
  return { snapshot, manifest, chapterFiles, manifestText: YAML.stringify(manifestData) };
}

function writeAll(files, rawText) {
  const staged = [
    { relative: files.snapshot, content: rawText.endsWith("\n") ? rawText : `${rawText}\n` },
    { relative: files.manifest, content: files.manifestText },
    ...files.chapterFiles.map(({ chapter, file }) => ({
      relative: file,
      content: `# ${chapter.title}\n\n> 英文原文鏡像；對應《${chapter.title}》p. ${chapter.page}。來源提供者：5e.tools。\n\n${chapter.markdown || "<!-- CHAPTER_NOT_FOUND -->"}\n`,
    })),
  ];
  for (const item of staged) {
    const absolute = path.join(ROOT, ...item.relative.split("/"));
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, item.content, "utf8");
  }
  // Credits is publication metadata, not a book chapter. Remove only the
  // obsolete auto-generated file within this mirror's own chapters directory.
  const chaptersDirectory = path.join(ROOT, ...`${path.posix.dirname(files.snapshot)}/chapters`.split("/"));
  if (fs.existsSync(chaptersDirectory)) {
    for (const name of fs.readdirSync(chaptersDirectory)) {
      if (/-(credits)\.md$/i.test(name)) fs.unlinkSync(path.join(chaptersDirectory, name));
    }
  }
  return staged.map((item) => item.relative);
}

function previewDiff(files, rawText) {
  const staged = [
    { relative: files.snapshot, content: rawText.endsWith("\n") ? rawText : `${rawText}\n` },
    { relative: files.manifest, content: files.manifestText },
    ...files.chapterFiles.map(({ chapter, file }) => ({ relative: file, content: chapter.markdown })),
  ];
  const summary = { added: 0, changed: 0, unchanged: 0 };
  for (const item of staged) {
    const absolute = path.join(ROOT, ...item.relative.split("/"));
    const state = !fs.existsSync(absolute) ? "added" : fs.readFileSync(absolute, "utf8") === item.content ? "unchanged" : "changed";
    summary[state] += 1;
  }
  process.stdout.write(`差異預覽：新增 ${summary.added}；變更 ${summary.changed}；未變 ${summary.unchanged}。\n`);
  return summary;
}

export async function mirrorPublication(args = process.argv.slice(2)) {
  const requested = option(args, "--publication");
  const selected = requested ? [withMirror(loadIngestProfile(requested))] : args.includes("--all") ? profiles() : [];
  if (!selected.length) throw new Error("請指定 --publication <ID>，或使用 --all；--all 只處理已登錄 5e.tools 鏡像的出版品。");
  const apply = args.includes("--apply");
  const allowRawOutput = args.includes("--allow-raw-output");
  const onlyMissing = args.includes("--only-missing");
  const chapterFilter = option(args, "--chapter");
  const reports = [];
  for (const profile of selected) {
    const mirror = profile.canonical_mirror;
    if (!mirror || mirror.provider !== "5e.tools") {
      reports.push({ publication_id: profile.publication_id, status: "unmapped", reason: "未登錄唯一 5e.tools 書籍映射。" });
      continue;
    }
    if (apply && mirror.output_root.startsWith("原始資料/") && !allowRawOutput) {
      throw new Error("原始資料/ 為唯讀輸入；如已取得本次精確目錄的明示授權，才可加上 --allow-raw-output 寫入鏡像。");
    }
    const rawText = await readSource(args, mirror);
    let parsed;
    try { parsed = JSON.parse(rawText); } catch { throw new Error(`${profile.publication_id} 的來源不是有效 JSON。`); }
    const inferredChapters = (parsed.data ?? [])
      .filter(isChapterSection)
      .map((entry, index) => ({ kind: sectionKind(entry), number: index + 1, title: entry.name, page: entry.page ?? null }));
    const allDocuments = chapterDocuments(parsed, mirror.chapters?.length ? mirror.chapters : inferredChapters);
    let documents = allDocuments;
    if (chapterFilter) documents = documents.filter((chapter) => String(chapter.number) === chapterFilter || chapter.title.includes(chapterFilter));
    if (onlyMissing) documents = documents.filter((chapter) => !fs.existsSync(path.join(ROOT, ...`${mirror.output_root}/chapters/${String(chapter.number).padStart(2, "0")}-${safeName(chapter.title)}.md`.split("/"))));
    const files = outputFiles(profile, mirror, rawText, documents);
    const missing = documents.filter((chapter) => !chapter.found).map((chapter) => chapter.title);
    const diff = args.includes("--diff") ? previewDiff(files, rawText) : null;
    const written = apply ? writeAll(files, rawText) : [];
    reports.push({ publication_id: profile.publication_id, status: missing.length ? "incomplete" : "complete", output_root: mirror.output_root, sha256: sha256(rawText), refreshed: args.includes("--refresh"), diff, chapters: documents.map((chapter) => ({ number: chapter.number, title: chapter.title, page: chapter.page, status: chapter.found ? "complete" : "missing" })), written });
  }
  const result = { schema_version: 1, mode: apply ? "apply" : "preview", reports, errors: reports.filter((item) => item.status === "incomplete" || item.status === "unmapped") };
  const report = option(args, "--report");
  if (report) fs.writeFileSync(path.resolve(ROOT, report), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  for (const item of reports) process.stdout.write(`${apply ? "套用" : "預覽"} ${item.publication_id}：${item.status}${item.written ? `；寫入 ${item.written.length} 檔` : ""}\n`);
  return result;
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT) {
  mirrorPublication().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
