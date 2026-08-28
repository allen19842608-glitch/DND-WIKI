import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT } from "../core/ingest-publication-utils.mjs";

const WIKI_ROOT = path.join(ROOT, "wiki", "戰役設定");
const GLOSSARY = path.join(ROOT, "附件", "翻譯詞彙表.md");
const GLOSSARY_BY_CHINESE = new Map();

if (fs.existsSync(GLOSSARY)) {
  for (const line of fs.readFileSync(GLOSSARY, "utf8").split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*:?-{3,}/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 5 || cells[0] === "英文" || !cells[0] || !cells[1] || /譯名待確認/.test(cells[1])) continue;
    const values = GLOSSARY_BY_CHINESE.get(cells[1]) ?? [];
    values.push(cells[0]);
    GLOSSARY_BY_CHINESE.set(cells[1], values);
  }
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  });
}

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return undefined;
  try { return { text, frontmatter: match[1], body: match[2], data: YAML.parse(match[1]) }; } catch { return undefined; }
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function isCandidate(file, page) {
  return page?.data?.category === "戰役設定"
    && page.data.content_scope !== "organized_play"
    && !file.startsWith(path.join(WIKI_ROOT, "戰役創作"))
    && !/(?:索引|_index)\.md$/i.test(path.basename(file));
}

function escaped(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function chineseTitle(title) {
  return String(title ?? "").replace(/\s+\(.+\)\s*$/, "").trim();
}

function normalizedEnglish(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function englishFromSource(page) {
  const fromTitle = String(page.data.title ?? "").match(/\s+\((.+)\)\s*$/)?.[1]?.trim();
  if (fromTitle) return fromTitle;
  const fromHeading = String(page.body ?? "").match(/^#\s+[^\n()]+\s+\(([^()\n]+)\)\s*$/m)?.[1]?.trim();
  if (fromHeading) return fromHeading;
  const chinese = chineseTitle(page.data.title);
  if (!chinese) return undefined;
  for (const source of page.data.sources ?? []) {
    const locator = String(source?.locator ?? "");
    const inline = locator.match(/\*\*[^*\n]*?\s+([A-Za-z][^*\n]*?)\*\*/)?.[1]?.trim();
    if (inline) return inline;
    const fileName = String(source?.file ?? "").replaceAll("/", path.sep);
    if (!fileName.startsWith(`原始資料${path.sep}`) || fileName.includes(`${path.sep}外部來源鏡像${path.sep}`)) continue;
    const sourceFile = path.join(ROOT, fileName);
    if (!fs.existsSync(sourceFile)) continue;
    const text = fs.readFileSync(sourceFile, "utf8");
    const pattern = new RegExp(`(?:^|\\n)(?:#{1,6}\\s*|\\*{0,2})${escaped(chinese)}\\s*(?:\\(([^()\\n]+)\\)|([A-Za-z][^*\\n（）]+))`, "mi");
    const found = text.match(pattern);
    const name = found?.[1] ?? found?.[2];
    if (name?.trim()) return name.trim();
    const isSingleEntry = path.basename(sourceFile, path.extname(sourceFile)) === chinese || new RegExp(`(?:#|標題：)\\s*${escaped(chinese)}`).test(locator);
    if (isSingleEntry) {
      const heading = text.match(/^#{1,6}\s+[^\n]*?([A-Z][A-Za-z0-9'’.,:;!?()\- ]{2,})\s*$/m)?.[1]?.trim();
      if (heading) return heading;
    }
  }
  return undefined;
}

function findEntry(value, name, inheritedPage) {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEntry(item, name, inheritedPage);
      if (found) return found;
    }
    return undefined;
  }
  const page = Number.isInteger(value.page) ? value.page : inheritedPage;
  if (normalizedEnglish(value.name) === normalizedEnglish(name) && Number.isInteger(page)) return { ...value, page };
  for (const item of Object.values(value)) {
    const found = findEntry(item, name, page);
    if (found) return found;
  }
  return undefined;
}

function mirrorReference(page) {
  const publication = String(page.data.entity_id ?? "").match(/^entry:([^:]+):/)?.[1];
  if (!publication) return undefined;
  const manifestFile = path.join(ROOT, "原始資料", "外部來源鏡像", publication, "manifest.yml");
  if (!fs.existsSync(manifestFile)) return undefined;
  const manifest = YAML.parse(fs.readFileSync(manifestFile, "utf8"));
  const sourceFile = String(manifest?.snapshot?.file ?? "");
  if (!sourceFile) return undefined;
  const directEnglish = englishFromSource(page);
  const snapshot = path.join(ROOT, sourceFile);
  const candidates = [directEnglish, ...(GLOSSARY_BY_CHINESE.get(chineseTitle(page.data.title)) ?? [])].filter(Boolean);
  const document = fs.existsSync(snapshot) ? JSON.parse(fs.readFileSync(snapshot, "utf8")) : undefined;
  const entry = document ? candidates.map((candidate) => findEntry(document, candidate)).find(Boolean) : undefined;
  const book = String(manifest.publication_title ?? publication);
  return {
    file: sourceFile,
    url: String(manifest.upstream_url ?? ""),
    locator: entry ? `${book}, p. ${entry.page}：${entry.name}; 5e.tools 鏡像快照` : undefined,
    english: entry?.name ?? directEnglish,
  };
}

function quote(value) {
  return `"${String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function formatSources(sources) {
  return `sources:\n${sources.map((source) => {
    const lines = [`  - file: ${quote(source.file)}`];
    for (const key of ["locator", "url", "authority", "translation"]) if (source[key] != null && source[key] !== "") lines.push(`    ${key}: ${quote(source[key])}`);
    return lines.join("\n");
  }).join("\n")}\n`;
}

function rewrite(page) {
  const reference = mirrorReference(page);
  if (!reference) return { text: page.text, reason: "missing-manifest" };
  const existing = [...(page.data.sources ?? [])];
  const index = existing.findIndex((source) => String(source?.file ?? "").replaceAll("\\", "/") === reference.file);
  if (index < 0) return { text: page.text, reason: "missing-mirror-source" };
  const mirror = { ...existing[index] };
  if (reference.locator) mirror.locator = reference.locator;
  if (reference.url) mirror.url = reference.url;
  mirror.authority = "官方";
  mirror.translation = "none";
  const sources = [mirror, ...existing.filter((_, sourceIndex) => sourceIndex !== index)]
    .sort((left, right) => Number(!String(left.file ?? "").includes("原始資料/外部來源鏡像/")) - Number(!String(right.file ?? "").includes("原始資料/外部來源鏡像/")));
  const frontmatter = page.frontmatter.replace(/^sources:\n(?:  - [^\n]+\n(?:    [^\n]*\n)*)+/m, formatSources(sources));
  return { text: `---\n${frontmatter}\n---\n${page.body}`, reason: reference.locator ? "located" : "unresolved", english: reference.english };
}

function run(args = process.argv.slice(2)) {
  const apply = args.includes("--apply");
  const diff = args.includes("--diff");
  const summary = { checked: 0, changed: 0, located: 0, unresolved: [], skipped: [] };
  for (const file of walk(WIKI_ROOT).sort()) {
    const page = parse(file);
    if (!isCandidate(file, page)) continue;
    summary.checked += 1;
    const next = rewrite(page);
    if (next.reason === "missing-manifest" || next.reason === "missing-mirror-source") { summary.skipped.push({ page: rel(file), reason: next.reason }); continue; }
    if (next.reason === "located") summary.located += 1;
    else summary.unresolved.push({ page: rel(file), english: next.english ?? null });
    if (next.text === page.text) continue;
    summary.changed += 1;
    if (diff) process.stdout.write(`${rel(file)}\t${next.reason}\n`);
    if (apply) fs.writeFileSync(file, next.text, "utf8");
  }
  process.stdout.write(`鏡像來源正規化：${apply ? "已套用" : "預覽"}；檢查 ${summary.checked}；變更 ${summary.changed}；已定位 ${summary.located}；待定位 ${summary.unresolved.length}；略過 ${summary.skipped.length}。\n`);
  return summary;
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) run();

export { run };
