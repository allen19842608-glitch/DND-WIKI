import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { extractFrontmatter } from "../core/wiki-lint.mjs";
import { sourceManifestSnapshot } from "../core/wiki-maintenance.mjs";
import { englishTitle, isNavigationPage } from "../core/wiki-records.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_ROOT = path.join(ROOT, "wiki");
export function healthReportPaths(root, publicationId = null) {
  if (publicationId && !/^[A-Za-z0-9_-]+$/.test(publicationId)) throw new Error("出版品 ID 格式錯誤。");
  const base = path.join(root, "reports", `wiki-health-${publicationId ? `${publicationId}-` : ""}current`);
  return { json: `${base}.json`, markdown: `${base}.md` };
}

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

export function isSourcePlaceholder(file) {
  return /^原始資料\/待匯入出版品\/[^/]+\/\.gitkeep$/u.test(String(file).replaceAll("\\", "/"));
}

export function sourcePriority(source) {
  if (/怪物|monster/i.test(String(source.file ?? ""))) return "low";
  if (/(2024|2025|2026)/.test(String(source.publication ?? ""))) return "high";
  return "medium";
}

export function publicationFor(file, publications) {
  const mirrorMatch = String(file).replaceAll("\\", "/").match(/^原始資料\/外部來源鏡像\/([^/]+)\//);
  if (mirrorMatch && publications.some(([id]) => id === mirrorMatch[1])) return mirrorMatch[1];
  const matches = publications
    .flatMap(([id, publication]) => (publication.source_assets ?? []).map((asset) => [id, asset.path]))
    .filter(([, sourceRoot]) => typeof sourceRoot === "string" && (file === sourceRoot || file.startsWith(`${sourceRoot}/`)))
    .sort((left, right) => right[1].length - left[1].length);
  return matches[0]?.[0] ?? "未登錄出版品";
}

export function assessPage(page) {
  const data = page.data ?? {};
  if (isNavigationPage(page)) return null;
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
  // `mirrorRuleText` is set only after inspecting the cited JSON.  A locator to
  // a 5etools statblock reference is not itself the English rule text.
  const missingConditions = [];
  if (!official) missingConditions.push("來源未全為官方");
  if (!locatable) missingConditions.push("來源缺少可定位 locator");
  if (!englishMirror) missingConditions.push("未引用可定位的官方英文鏡像");
  if (englishMirror && page.mirrorRuleText === false) missingConditions.push("英文鏡像未含同名規則正文（可能僅有指標）");
  if (englishMirror && page.mirrorRuleText !== true && page.mirrorRuleText !== false) missingConditions.push("英文鏡像檔無法讀取或尚未提供");
  if (pendingTranslation) missingConditions.push("存在譯名待確認");
  if (missingConditions.length) return { status: "待補條件", ...page, reason: missingConditions.join("；") };
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
  // Book JSON contains both actual rule entries and lightweight statblock/item
  // references.  The latter can share a name with the rule but do not supply
  // enough English text for a confirmation pass.
  const referenceOnly = ["statblock", "item", "image"].includes(value.type);
  if (!referenceOnly && value.name === englishName
    && (Array.isArray(value.entries) && value.entries.length > 0 || typeof value.entry === "string" && value.entry.trim())) return true;
  return Object.values(value).some((item) => hasNamedRuleText(item, englishName));
}

function mirrorRuleTextFor(page, cache) {
  // Legacy titles append a localized status inside the English-name
  // parentheses, e.g. "Earth Tremor，2014 Legacy".
  const englishName = englishTitle(page.data?.title);
  if (!englishName) return null;
  const mirrorSources = (Array.isArray(page.data?.sources) ? page.data.sources : []).filter((source) => source?.authority === "官方" && source?.translation === "none" && typeof source?.file === "string" && source.file.startsWith("原始資料/外部來源鏡像/") && source.file.endsWith(".json"));
  if (!mirrorSources.length) return null;
  let inspected = false;
  for (const source of mirrorSources) {
    const absolute = path.join(ROOT, source.file);
    if (!fs.existsSync(absolute)) continue;
    inspected = true;
    // Book JSON often contains a named flavour paragraph or a statblock token
    // but not the separate rules dataset. Treating either as rule text creates
    // false confirmation candidates (notably 2014 species).
    if (!/\/datasets\/[^/]+\.json$/u.test(source.file.replaceAll("\\", "/"))) continue;
    let data = cache.get(absolute);
    if (data === undefined) { try { data = JSON.parse(fs.readFileSync(absolute, "utf8")); } catch { data = null; } cache.set(absolute, data); }
    if (data && hasNamedRuleText(data, englishName)) return true;
  }
  return inspected ? false : null;
}

export function buildHealthReport({ pages, manifest, publications, publicationId = null, generatedAt = new Date().toISOString() }) {
  const filteredPages = publicationId ? pages.filter((page) => page.publication === publicationId || (page.data?.sources ?? []).some(source => publicationFor(source.file ?? "", publications) === publicationId)) : pages;
  const candidates = filteredPages.map(assessPage).filter(Boolean);
  const legacyBacklog = filteredPages
    .filter((page) => page.data?.ruleset === "2014"
      && page.data?.status === "legacy"
      && ["compatible", "conditional"].includes(page.data?.compatibility_2024)
      && page.data?.confidence !== "confirmed"
      && page.data?.category !== "怪物"
      && !/索引/.test(page.file)
      && !/索引/.test(String(page.title ?? "")))
    .map((page) => ({
      file: page.file,
      title: page.title,
      publication: page.publication,
      category: page.data.category,
      compatibility_2024: page.data.compatibility_2024,
      priority: "medium",
      replacement_status: "not_replaced",
      // A citation alone is insufficient: a book JSON can contain only a
      // statblock pointer.  The audit pre-computes this flag from actual
      // named English rule text in the cited mirror.
      english_mirror: page.mirrorRuleText === true,
    }))
    .map((entry) => ({ ...entry, next_action: entry.english_mirror ? "逐頁核對並確認版本" : "補具定位的官方英文鏡像" }))
    .sort((left, right) => `${left.publication}\u0000${left.category}\u0000${left.title}`.localeCompare(`${right.publication}\u0000${right.category}\u0000${right.title}`, "zh-Hant"));
  const unreferenced = manifest.sources
    .filter((source) => !isSourcePlaceholder(source.file))
    .filter((source) => !source.disposition && (!source.absorbed_by || source.absorbed_by.length === 0))
    .map((source) => ({ ...source, publication: publicationFor(source.file, publications), file_type: sourceKind(source.file) }))
    .map((source) => ({ ...source, priority: sourcePriority(source) }))
    .filter((source) => !publicationId || source.publication === publicationId);
  return {
    schema_version: 2, generated_at: generatedAt, publication: publicationId,
    scope: { type: publicationId ? "publication" : "global", publication: publicationId, selection: "entity_id 或來源登錄對應；同頁去重" },
    source_status: { inspected_at: manifest.generated_at ?? generatedAt, mode: "live-read-only", total: manifest.sources.filter(source => !publicationId || publicationFor(source.file, publications) === publicationId).length, by_status: countBy(manifest.sources.filter(source => !publicationId || publicationFor(source.file, publications) === publicationId), source => source.status ?? "unknown") },
    pages: { total: filteredPages.length, by_category: countBy(filteredPages, (page) => page.data?.category), by_version: countBy(filteredPages, (page) => page.data?.version), by_confidence: countBy(filteredPages, (page) => page.data?.confidence) },
    candidates: {
      by_status: countBy(candidates, (candidate) => candidate.status),
      by_reason: countBy(candidates, (candidate) => candidate.reason),
      entries: candidates.map(({ file, title, publication, status, reason }) => ({ file, title, publication, status, reason })),
    },
    legacy_backlog: { total: legacyBacklog.length, by_category: countBy(legacyBacklog, (entry) => entry.category), by_mirror_status: countBy(legacyBacklog, (entry) => entry.english_mirror ? "已有可核對英文鏡像" : "待補英文鏡像正文"), entries: legacyBacklog },
    unreferenced_sources: { total: unreferenced.length, by_publication: countBy(unreferenced, (source) => source.publication), by_file_type: countBy(unreferenced, (source) => source.file_type), entries: unreferenced },
    anomalies: { pages_without_sources: filteredPages.filter((page) => !Array.isArray(page.data?.sources) || !page.data.sources.length).map((page) => page.file), malformed_frontmatter: filteredPages.filter((page) => !page.data).map((page) => page.file) },
  };
}

function markdown(report) {
  const rows = (values) => Object.entries(values).map(([name, count]) => `| ${name} | ${count} |`).join("\n") || "| 無 | 0 |";
  return `# Wiki 健康度報告\n\n產生時間：${report.generated_at}\n\n> [!NOTE]\n> 「未引用來源」是來源追蹤佇列，不代表缺頁或尚未吸收。\n\n## 頁面\n\n- 總頁數：${report.pages.total}\n\n| 類別 | 頁數 |\n| :--- | ---: |\n${rows(report.pages.by_category)}\n\n## 2024 核定佇列\n\n| 狀態 | 頁數 |\n| :--- | ---: |\n${rows(report.candidates.by_status)}\n\n| 待補原因 | 頁數 |\n| :--- | ---: |\n${rows(report.candidates.by_reason)}\n\n## 未引用來源\n\n- 總數：${report.unreferenced_sources.total}\n\n| 出版品 | 數量 |\n| :--- | ---: |\n${rows(report.unreferenced_sources.by_publication)}\n\n| 檔案類型 | 數量 |\n| :--- | ---: |\n${rows(report.unreferenced_sources.by_file_type)}\n\n## 異常摘要\n\n- 無 sources 頁面：${report.anomalies.pages_without_sources.length}\n- Frontmatter 無法解析頁面：${report.anomalies.malformed_frontmatter.length}\n`;
}

function main() {
  const args = process.argv.slice(2); const index = args.indexOf("--publication");
  if (args.some((arg, i) => !["--publication", "--apply"].includes(arg) && !(index >= 0 && i === index + 1))) throw new Error("僅支援 --publication ID、--apply。");
  const publicationId = index < 0 ? null : args[index + 1];
  if (index >= 0 && (!publicationId || publicationId.startsWith("--"))) throw new Error("--publication 必須指定 ID。");
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
  const report = buildHealthReport({ pages, manifest: sourceManifestSnapshot(), publications: Object.entries(registry), publicationId });
  const paths = healthReportPaths(ROOT, publicationId);
  const legacySection = `\n## 舊版未被取代佇列\n\n> [!NOTE]\n> 僅列出尚未核定、非魔物、2014 Legacy 且標示為 \`compatible\` 或 \`conditional\` 的條目；這是待維護佇列，不代表缺頁。\n\n- 總數：${report.legacy_backlog.total}\n\n| 類別 | 數量 |\n| :--- | ---: |\n${Object.entries(report.legacy_backlog.by_category).map(([name, count]) => `| ${name} | ${count} |`).join("\\n") || "| 無 | 0 |"}\n`;
  const scope = publicationId ?? "全庫";
  const intro = `範圍：${scope}；來源狀態：本次唯讀掃描 ${report.source_status.total} 個檔案。\n\n> 檢查通過不代表全文已核實；核定候選仍需人工覆核。\n\n`;
  if (args.includes("--apply")) {
    fs.mkdirSync(path.dirname(paths.json), { recursive: true });
    fs.writeFileSync(paths.json, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(paths.markdown, markdown(report).replace("產生時間：", `${intro}產生時間：`).replace("\n## 未引用來源", `${legacySection.replaceAll("\\n", "\n")}\n## 未引用來源`));
  }
  console.log(`${args.includes("--apply") ? "已寫入" : "預覽（--apply 寫入）"} ${path.relative(ROOT, paths.json)} 與 .md；範圍：${scope}；${report.pages.total} 頁，${report.unreferenced_sources.total} 筆未引用來源。`);
}
if (process.argv[1] && import.meta.url === new URL(`file:///${path.resolve(process.argv[1]).replaceAll("\\", "/")}`).href) main();
