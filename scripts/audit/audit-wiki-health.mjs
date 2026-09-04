import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { extractFrontmatter } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_ROOT = path.join(ROOT, "wiki");
const MANIFEST = path.join(ROOT, ".wiki-cache", "source-manifest.json");
const REPORT_JSON = path.join(ROOT, "reports", "wiki-health-current.json");
const REPORT_MD = path.join(ROOT, "reports", "wiki-health-current.md");

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
  });
}

function countBy(values, key) {
  const counts = new Map();
  for (const value of values) {
    const name = key(value) ?? "未設定";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => String(left).localeCompare(String(right), "zh-Hant")));
}

export function sourceKind(file) {
  const ext = path.posix.extname(file).toLowerCase();
  if (path.posix.basename(file).match(/^manifest\.(?:ya?ml|json)$/i)) return "manifest";
  if ([".md", ".txt", ".html", ".htm", ".pdf"].includes(ext)) return "文字";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext)) return "圖片";
  return "其他";
}

export function publicationFor(file, publications) {
  const matches = publications
    .flatMap(([id, publication]) => (publication.source_assets ?? []).map((asset) => [id, asset.path]))
    .filter(([, sourceRoot]) => typeof sourceRoot === "string" && (file === sourceRoot || file.startsWith(`${sourceRoot}/`)))
    .sort((left, right) => right[1].length - left[1].length);
  return matches[0]?.[0] ?? "未登錄出版品";
}

export function assessPage(page) {
  const data = page.data ?? {};
  if (/索引/.test(page.file) || /索引/.test(page.title ?? "")) return null;
  const sources = Array.isArray(data.sources) ? data.sources : [];
  const official = sources.length > 0 && sources.every((source) => source?.authority === "官方");
  const locatable = sources.length > 0 && sources.every((source) => typeof source?.file === "string" && typeof source?.locator === "string" && source.locator.trim());
  const englishMirror = sources.some((source) => source?.authority === "官方"
    && source?.translation === "none"
    && typeof source?.file === "string"
    && source.file.startsWith("原始資料/外部來源鏡像/")
    && typeof source?.locator === "string" && source.locator.trim()
    && !source.locator.trim().startsWith("圖片："));
  const pendingTranslation = /譯名待確認/.test(page.body);
  const conflictSection = page.body.match(/^##\s*(?:來源差異與不確定性|來源差異|版本差異)([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
  const conflict = conflictSection
    ? hasSubstantiveConflict(conflictSection[1])
    : /(?:來源差異|版本差異|衝突|差異對比)/.test(page.body);
  if (data.version !== "2024-Core" || data.confidence !== "interpreted") return null;
  if (!official || !locatable || !englishMirror || page.mirrorRuleText === false || pendingTranslation) return { status: "待補條件", ...page, reason: "來源權威、定位、英文鏡像正文或譯名條件未滿足" };
  return { status: conflict ? "衝突候選" : "可核定候選", ...page, reason: conflict ? "需保留並核對來源差異" : "待逐頁核對規則主張與鏡像" };
}

function hasSubstantiveConflict(section) {
  const lines = section.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length || lines.every((line) => /^[-*]\s*無[。．.]?$/.test(line))) return false;
  return lines.some((line) => !/^[-*]\s*本頁保存\s*\d{4}\s*年來源所述的世界觀；跨出版品差異應保留來源與適用範圍[。．.]?$/.test(line)
    && !/^[-*]\s*\d{4}\s*與\s*\d{4}\s*來源對.+一致[。．]?.*$/.test(line));
}

function hasNamedRuleText(value, englishName) {
  if (Array.isArray(value)) return value.some((item) => hasNamedRuleText(item, englishName));
  if (!value || typeof value !== "object") return false;
  if (value.name === englishName && (Array.isArray(value.entries) && value.entries.length > 0 || typeof value.entry === "string" && value.entry.trim())) return true;
  return Object.values(value).some((item) => hasNamedRuleText(item, englishName));
}

function mirrorRuleTextFor(page, cache) {
  const englishName = String(page.data?.title ?? "").match(/\(([^()]+)\)$/)?.[1];
  if (!englishName) return null;
  const mirrorSources = (Array.isArray(page.data?.sources) ? page.data.sources : []).filter((source) => source?.authority === "官方" && source?.translation === "none" && typeof source?.file === "string" && source.file.startsWith("原始資料/外部來源鏡像/") && source.file.endsWith(".json"));
  if (!mirrorSources.length) return null;
  let inspected = false;
  for (const source of mirrorSources) {
    const absolute = path.join(ROOT, source.file);
    if (!fs.existsSync(absolute)) continue;
    inspected = true;
    let data = cache.get(absolute);
    if (data === undefined) { try { data = JSON.parse(fs.readFileSync(absolute, "utf8")); } catch { data = null; } cache.set(absolute, data); }
    if (data && hasNamedRuleText(data, englishName)) return true;
  }
  return inspected ? false : null;
}

export function buildHealthReport({ pages, manifest, publications, publicationId = null, generatedAt = new Date().toISOString() }) {
  const filteredPages = publicationId ? pages.filter((page) => page.publication === publicationId) : pages;
  const candidates = filteredPages.map(assessPage).filter(Boolean);
  const unreferenced = manifest.sources
    .filter((source) => !source.disposition && (!source.absorbed_by || source.absorbed_by.length === 0))
    .map((source) => ({ ...source, publication: publicationFor(source.file, publications), file_type: sourceKind(source.file) }))
    .filter((source) => !publicationId || source.publication === publicationId);
  return {
    schema_version: 1, generated_at: generatedAt, publication: publicationId,
    pages: { total: filteredPages.length, by_category: countBy(filteredPages, (page) => page.data?.category), by_version: countBy(filteredPages, (page) => page.data?.version), by_confidence: countBy(filteredPages, (page) => page.data?.confidence) },
    candidates: { by_status: countBy(candidates, (candidate) => candidate.status), entries: candidates.map(({ file, title, publication, status, reason }) => ({ file, title, publication, status, reason })) },
    unreferenced_sources: { total: unreferenced.length, by_publication: countBy(unreferenced, (source) => source.publication), by_file_type: countBy(unreferenced, (source) => source.file_type), entries: unreferenced },
    anomalies: { pages_without_sources: filteredPages.filter((page) => !Array.isArray(page.data?.sources) || !page.data.sources.length).map((page) => page.file), malformed_frontmatter: filteredPages.filter((page) => !page.data).map((page) => page.file) },
  };
}

function markdown(report) {
  const rows = (values) => Object.entries(values).map(([name, count]) => `| ${name} | ${count} |`).join("\n") || "| 無 | 0 |";
  return `# Wiki 健康度報告\n\n產生時間：${report.generated_at}\n\n> [!NOTE]\n> 「未引用來源」是來源追蹤佇列，不代表缺頁或尚未吸收。\n\n## 頁面\n\n- 總頁數：${report.pages.total}\n\n| 類別 | 頁數 |\n| :--- | ---: |\n${rows(report.pages.by_category)}\n\n## 2024 核定佇列\n\n| 狀態 | 頁數 |\n| :--- | ---: |\n${rows(report.candidates.by_status)}\n\n## 未引用來源\n\n- 總數：${report.unreferenced_sources.total}\n\n| 出版品 | 數量 |\n| :--- | ---: |\n${rows(report.unreferenced_sources.by_publication)}\n\n| 檔案類型 | 數量 |\n| :--- | ---: |\n${rows(report.unreferenced_sources.by_file_type)}\n\n## 異常摘要\n\n- 無 sources 頁面：${report.anomalies.pages_without_sources.length}\n- Frontmatter 無法解析頁面：${report.anomalies.malformed_frontmatter.length}\n`;
}

function main() {
  const args = process.argv.slice(2); const index = args.indexOf("--publication");
  if (args.some((arg, i) => arg !== "--publication" && i !== index + 1)) throw new Error("僅支援 --publication ID。");
  const publicationId = index < 0 ? null : args[index + 1];
  if (index >= 0 && !publicationId) throw new Error("--publication 必須指定 ID。");
  const refresh = spawnSync(process.execPath, ["scripts/core/wiki-maintenance.mjs", "manifest", "--update"], { cwd: ROOT, encoding: "utf8" });
  if (refresh.status !== 0) throw new Error(refresh.stderr || "來源 manifest 更新失敗。");
  const registry = parseDocument(fs.readFileSync(path.join(ROOT, "config", "publications.yml"), "utf8")).toJS().publications;
  if (publicationId && !registry[publicationId]) throw new Error(`未知出版品：${publicationId}`);
  const mirrorCache = new Map();
  const pages = walk(WIKI_ROOT).filter((file) => file.endsWith(".md")).map((absolute) => {
    const file = path.relative(ROOT, absolute).replaceAll("\\", "/"); const text = fs.readFileSync(absolute, "utf8"); const frontmatter = extractFrontmatter(text);
    let data = null; if (frontmatter) { const doc = parseDocument(frontmatter.yaml); if (!doc.errors.length) data = doc.toJS(); }
    const publication = String(data?.entity_id ?? "").match(/^entry:([^:]+):/)?.[1] ?? "未登錄出版品";
    const page = { file, title: data?.title ?? path.basename(file, ".md"), data, body: frontmatter?.body ?? text, publication };
    return { ...page, mirrorRuleText: mirrorRuleTextFor(page, mirrorCache) };
  });
  const report = buildHealthReport({ pages, manifest: JSON.parse(fs.readFileSync(MANIFEST, "utf8")), publications: Object.entries(registry), publicationId });
  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true }); fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`); fs.writeFileSync(REPORT_MD, markdown(report));
  console.log(`已覆寫 reports/wiki-health-current.json 與 .md：${report.pages.total} 頁，${report.unreferenced_sources.total} 筆未引用來源。`);
}
if (process.argv[1] && import.meta.url === new URL(`file:///${path.resolve(process.argv[1]).replaceAll("\\", "/")}`).href) main();
