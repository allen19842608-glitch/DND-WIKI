import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_ROOT = path.join(ROOT, "原始資料");
const WIKI_ROOT = path.join(ROOT, "wiki");
const GLOSSARY = path.join(ROOT, "附件", "翻譯詞彙表.md");
const POLICY = path.join(ROOT, ".agents", "詳細維護規範.md");
const CACHE_ROOT = path.join(ROOT, ".wiki-cache");
const MANIFEST = path.join(CACHE_ROOT, "source-manifest.json");
const DISPOSITIONS = path.join(ROOT, "config", "source-dispositions.json");
const TEXT_EXTENSIONS = new Set([".md", ".txt", ".html", ".htm", ".json", ".yaml", ".yml", ".csv", ".tsv"]);

function posix(value) {
  return value.split(path.sep).join("/");
}

function relative(value) {
  return posix(path.relative(ROOT, value));
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...walk(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

function argumentsOf(values) {
  const options = new Map();
  const positional = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const [name, inline] = value.split("=", 2);
    if (inline !== undefined) options.set(name, inline);
    else if (values[index + 1] && !values[index + 1].startsWith("--")) options.set(name, values[++index]);
    else options.set(name, true);
  }
  return { options, positional };
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function splitMarkdownRow(line) {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function policyShow(values) {
  const query = values.join(" ").trim();
  if (!query) throw new Error("請提供章節名稱，例如：npm run policy:show -- \"翻譯對照規則\"");
  const lines = fs.readFileSync(POLICY, "utf8").split(/\r?\n/);
  const start = lines.findIndex((line) => /^#{1,6}\s+/.test(line) && line.toLowerCase().includes(query.toLowerCase()));
  if (start < 0) {
    const itemStart = lines.findIndex((line) => /^-\s+/.test(line) && line.toLowerCase().includes(query.toLowerCase()));
    if (itemStart < 0) throw new Error(`找不到規範章節或項目：${query}`);
    let itemEnd = lines.length;
    for (let index = itemStart + 1; index < lines.length; index += 1) {
      if (/^#{1,6}\s+|^-\s+/.test(lines[index])) {
        itemEnd = index;
        break;
      }
    }
    process.stdout.write(`${lines.slice(itemStart, itemEnd).join("\n").trimEnd()}\n`);
    return;
  }
  if (query.includes("筆記生成規範")) {
    const taskStart = lines.findIndex((line, index) => index > start && /^##\s+.*任務指令/.test(line));
    process.stdout.write(`${lines.slice(start, taskStart < 0 ? lines.length : taskStart).join("\n").trimEnd()}\n`);
    return;
  }
  const level = lines[start].match(/^#+/)?.[0].length ?? 1;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#+)\s+/);
    if (heading && heading[1].length <= level) {
      end = index;
      break;
    }
  }
  process.stdout.write(`${lines.slice(start, end).join("\n").trimEnd()}\n`);
}

function sourceFind(values) {
  const { options, positional } = argumentsOf(values);
  const query = positional.join(" ").trim();
  if (!query) throw new Error("請提供搜尋文字。");
  const sourceFilter = String(options.get("--source") ?? "").toLowerCase();
  const maximum = positiveInteger(options.get("--max"), 30);
  const context = Math.min(5, positiveInteger(options.get("--context"), 2));
  const needle = query.toLowerCase();
  let matches = 0;
  for (const file of walk(RAW_ROOT).filter((candidate) => TEXT_EXTENSIONS.has(path.extname(candidate).toLowerCase()))) {
    const rel = relative(file);
    if (sourceFilter && !rel.toLowerCase().includes(sourceFilter)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].toLowerCase().includes(needle)) continue;
      const from = Math.max(0, index - context);
      const to = Math.min(lines.length, index + context + 1);
      process.stdout.write(`\n${rel}:L${index + 1}\n`);
      for (let line = from; line < to; line += 1) {
        process.stdout.write(`${line + 1 === index + 1 ? ">" : " "} ${line + 1}: ${lines[line]}\n`);
      }
      matches += 1;
      if (matches >= maximum) {
        process.stdout.write(`\n已達上限 ${maximum} 筆；可用 --source 或 --max 縮小範圍。\n`);
        return;
      }
    }
  }
  if (matches === 0) process.stdout.write("找不到相符的可搜尋文字來源；PDF 等二進位來源需先使用既有文字化來源。\n");
  else process.stdout.write(`\n共 ${matches} 筆。\n`);
}

function glossaryLookup(values) {
  const { options, positional } = argumentsOf(values);
  const query = positional.join(" ").trim().toLowerCase();
  if (!query) throw new Error("請提供英文或中文詞彙。");
  const maximum = positiveInteger(options.get("--max"), 20);
  const rows = fs.readFileSync(GLOSSARY, "utf8").split(/\r?\n/)
    .filter((line) => /^\s*\|/.test(line))
    .map(splitMarkdownRow)
    .filter((cells) => cells.length >= 5 && cells[0] !== "英文" && !/^:?-+:?$/.test(cells[0]));
  const exact = rows.filter((cells) => cells[0].toLowerCase() === query || cells[1].toLowerCase() === query);
  const partial = rows.filter((cells) => !exact.includes(cells) && cells.some((cell) => cell.toLowerCase().includes(query)));
  const selected = [...exact, ...partial].slice(0, maximum);
  if (!selected.length) {
    process.stdout.write(`詞彙表找不到：${positional.join(" ")}\n`);
    return;
  }
  process.stdout.write("英文\t本 Wiki 標準譯名\t來源 ID\t定位\t狀態\n");
  for (const cells of selected) process.stdout.write(`${cells.slice(0, 5).join("\t")}\n`);
  if (exact.length + partial.length > selected.length) process.stdout.write(`另有 ${exact.length + partial.length - selected.length} 筆，請用 --max 調整。\n`);
}

function extractWikiSourceFiles(text) {
  const normalized = text.replace(/^\uFEFF/, "");
  const frontmatter = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return [];
  const document = parseDocument(frontmatter[1], { prettyErrors: false });
  if (document.errors.length) return [];
  const data = document.toJS();
  return (Array.isArray(data?.sources) ? data.sources : [])
    .map((source) => typeof source?.file === "string" ? source.file.replace(/\\/g, "/") : null)
    .filter(Boolean);
}

function wikiSourceMap() {
  const sources = new Map();
  for (const file of walk(WIKI_ROOT).filter((candidate) => candidate.endsWith(".md"))) {
    for (const key of extractWikiSourceFiles(fs.readFileSync(file, "utf8"))) {
      const pages = sources.get(key) ?? [];
      pages.push(relative(file));
      sources.set(key, pages);
    }
  }
  return sources;
}

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function currentManifest() {
  const references = wikiSourceMap();
  return walk(RAW_ROOT).sort().map((file) => {
    const rel = relative(file);
    return {
      file: rel,
      sha256: hashFile(file),
      size: fs.statSync(file).size,
      absorbed_by: references.get(rel) ?? [],
    };
  });
}

function readPreviousManifest() {
  if (!fs.existsSync(MANIFEST)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    return Array.isArray(parsed?.sources) ? parsed.sources : [];
  } catch {
    return [];
  }
}

function readDispositions() {
  if (!fs.existsSync(DISPOSITIONS)) return new Map();
  const parsed = JSON.parse(fs.readFileSync(DISPOSITIONS, "utf8"));
  return new Map(Object.entries(parsed?.sources ?? {}));
}

function manifestCommand(values, unabsorbedOnly = false) {
  const { options } = argumentsOf(values);
  const maximum = positiveInteger(options.get("--max"), 100);
  const previous = new Map(readPreviousManifest().map((record) => [record.file, record]));
  const dispositions = readDispositions();
  const sources = currentManifest();
  const records = sources.map((record) => ({
    ...record,
    disposition: dispositions.get(record.file) ?? null,
    status: !previous.has(record.file) ? "new" : previous.get(record.file).sha256 === record.sha256 ? "unchanged" : "changed",
  }));
  const newFiles = records.filter((record) => record.status === "new");
  const changed = records.filter((record) => record.status === "changed");
  const excluded = records.filter((record) => record.absorbed_by.length === 0 && record.disposition);
  const unabsorbed = records.filter((record) => record.absorbed_by.length === 0 && !record.disposition);
  if (options.has("--update")) {
    fs.mkdirSync(CACHE_ROOT, { recursive: true });
    fs.writeFileSync(MANIFEST, `${JSON.stringify({ schema_version: 1, sources: records }, null, 2)}\n`, "utf8");
  }
  if (options.has("--json")) {
    process.stdout.write(`${JSON.stringify({ total: records.length, new: newFiles, changed, excluded, unabsorbed }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`來源總數：${records.length}；新增：${newFiles.length}；變更：${changed.length}；已記錄排除：${excluded.length}；尚無 Wiki 引用：${unabsorbed.length}\n`);
  const selected = unabsorbedOnly ? unabsorbed : [...newFiles, ...changed];
  const label = unabsorbedOnly ? "尚無 Wiki 引用" : "新增或變更";
  if (!selected.length) process.stdout.write(`${label}：無\n`);
  else {
    process.stdout.write(`${label}：\n`);
    for (const record of selected.slice(0, maximum)) process.stdout.write(`- ${record.file}\n`);
    if (selected.length > maximum) process.stdout.write(`- ……另有 ${selected.length - maximum} 筆，請用 --max 調整。\n`);
  }
  if (options.has("--update")) process.stdout.write(`已更新快取：${relative(MANIFEST)}\n`);
}

function changedWikiDirectories() {
  const commands = [
    ["diff", "--name-only", "HEAD"],
    ["ls-files", "--others", "--exclude-standard"],
  ];
  const files = commands.flatMap((args) => {
    const result = spawnSync("git", ["-c", "core.quotepath=false", ...args], { cwd: ROOT, encoding: "utf8" });
    return result.status === 0 ? result.stdout.split(/\r?\n/) : [];
  });
  return new Set(files
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter((line) => line.startsWith("wiki/") && line.endsWith(".md"))
    .map((line) => path.posix.dirname(line)));
}

function wikiLinkTargets(text) {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)]
    .map((match) => {
      const inner = match[1].replace(/\\\|/g, "|");
      const target = inner.split(/[|#^]/, 1)[0].trim();
      return path.posix.basename(target);
    });
}

function pageTitle(file) {
  const text = fs.readFileSync(file, "utf8");
  return text.match(/^title:\s+"([^"]+)"/m)?.[1] ?? text.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(file, ".md");
}

function backlinkPage(file, indexFile) {
  let text = fs.readFileSync(file, "utf8");
  const indexName = path.basename(indexFile, ".md");
  if (wikiLinkTargets(text).includes(indexName)) return false;
  const title = pageTitle(indexFile);
  const link = `- [[${indexName}|${title}]]`;
  if (/^## 🔗 相關連結\s*$/m.test(text)) text = text.replace(/^## 🔗 相關連結\s*$/m, `## 🔗 相關連結\n\n${link}`);
  else text = `${text.trimEnd()}\n\n## 🔗 相關連結\n\n${link}\n`;
  fs.writeFileSync(file, text, "utf8");
  return true;
}

function indexesCommand(values) {
  const { options } = argumentsOf(values);
  const apply = options.has("--apply");
  const changedOnly = options.has("--changed");
  const changedDirectories = changedOnly ? changedWikiDirectories() : null;
  let missingCount = 0;
  let updatedCount = 0;
  for (const indexFile of walk(WIKI_ROOT).filter((file) => file.endsWith("索引.md")).sort()) {
    const directory = path.dirname(indexFile);
    const directoryRel = relative(directory);
    if (changedOnly && !changedDirectories.has(directoryRel)) continue;
    const siblings = fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && !entry.name.endsWith("索引.md"))
      .map((entry) => path.join(directory, entry.name));
    let indexText = fs.readFileSync(indexFile, "utf8");
    const existing = new Set(wikiLinkTargets(indexText));
    const missing = siblings.filter((file) => !existing.has(path.basename(file, ".md")));
    missingCount += missing.length;
    if (!apply) {
      for (const file of missing) process.stdout.write(`${relative(indexFile)} 缺少 ${path.basename(file)}\n`);
      continue;
    }
    const start = "<!-- AUTO-INDEX:START -->";
    const end = "<!-- AUTO-INDEX:END -->";
    const lines = missing.map((file) => `- [[${path.basename(file, ".md")}|${pageTitle(file)}]]`);
    const block = missing.length ? `${start}\n## 自動維護條目\n\n${lines.join("\n")}\n${end}` : "";
    const pattern = /\n?<!-- AUTO-INDEX:START -->[\s\S]*?<!-- AUTO-INDEX:END -->\n?/;
    const next = pattern.test(indexText)
      ? indexText.replace(pattern, block ? `\n\n${block}\n` : "\n")
      : block ? `${indexText.trimEnd()}\n\n${block}\n` : indexText;
    if (next !== indexText) {
      fs.writeFileSync(indexFile, next, "utf8");
      updatedCount += 1;
      indexText = next;
    }
    for (const file of missing) if (backlinkPage(file, indexFile)) updatedCount += 1;
  }
  process.stdout.write(`索引缺漏：${missingCount}；${apply ? `已更新檔案：${updatedCount}` : "使用 --apply 可自動補入"}\n`);
}

function help() {
  process.stdout.write(`可用指令：\n  policy <章節>\n  source-find <文字> [--source 範圍] [--max 30] [--context 2]\n  glossary <詞彙> [--max 20]\n  manifest [--update] [--json] [--max 100]\n  unabsorbed [--json] [--max 100]\n  indexes [--changed] [--apply]\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const [command, ...values] = process.argv.slice(2);
  try {
    if (command === "policy") policyShow(values);
    else if (command === "source-find") sourceFind(values);
    else if (command === "glossary") glossaryLookup(values);
    else if (command === "manifest") manifestCommand(values);
    else if (command === "unabsorbed") manifestCommand(values, true);
    else if (command === "indexes") indexesCommand(values);
    else help();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

export { extractWikiSourceFiles, splitMarkdownRow, wikiLinkTargets };
