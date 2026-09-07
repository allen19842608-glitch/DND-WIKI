import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "yaml";
import { parseTargetAreaExceptions, planSpellTargetArea } from "../core/spell-target-area.mjs";
import { today } from "../core/ingest-publication-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPELL_ROOT = path.join(ROOT, "wiki", "法術");
const DEFAULT_REPORT = path.join(ROOT, "reports", "spell-target-area-current.json");
const EXCEPTION_IDS = new Set(Object.keys(parseTargetAreaExceptions(fs.readFileSync(path.join(ROOT, "config", "spell-target-area-exceptions.json"), "utf8"))));

function sha256(text) { return crypto.createHash("sha256").update(text).digest("hex"); }
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
  });
}
function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}
function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!match) return null;
  const document = parseDocument(match[1]);
  return document.errors.length ? null : document.toJS();
}
function relative(root, file) { return path.relative(root, file).replaceAll("\\", "/"); }
function touchUpdated(text) {
  return String(text).replace(/^(updated:\s*)["']?\d{4}-\d{2}-\d{2}["']?\s*$/mu, `$1"${today()}"`);
}
function reportMarkdown(report) {
  const rows = report.entries.map((entry) => `| ${entry.file} | ${entry.publication} | ${entry.status} | ${entry.layout ?? "—"} | ${String(entry.reason ?? "").replaceAll("|", "\\|")} |`).join("\n");
  const layouts = report.summary.layouts;
  return `# 法術 Target／Area 拆欄報告\n\n- 產生時間：${report.generated_at}\n- 模式：${report.mode}\n- 掃描頁數：${report.summary.selected}\n- 可套用：${report.summary.proposed}\n- 已套用：${report.summary.applied}\n- 保留例外：${report.summary.exceptions}\n\n## 版面分布\n\n- Target-only：${layouts.target_only}\n- Area-only：${layouts.area_only}\n- Target + Area：${layouts.both}\n- 省略欄位：${layouts.omitted}\n- 待確認舊欄位：${layouts.legacy_combined}\n\n| 檔案 | 出版品 | 結果 | 版面 | 原因 |\n| :--- | :--- | :--- | :--- | :--- |\n${rows}\n`;
}

export function parseMigrationArguments(argv) {
  const options = { apply: false, refreshUpdated: false, report: DEFAULT_REPORT, publication: null, paths: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--refresh-updated") options.refreshUpdated = true;
    else if (arg === "--publication") options.publication = argv[++index] ?? null;
    else if (arg === "--report") options.report = path.resolve(ROOT, argv[++index] ?? "");
    else if (arg.startsWith("--")) throw new Error(`未知選項：${arg}`);
    else options.paths.push(arg);
  }
  return options;
}

function selectedFiles({ root, paths, publication }) {
  const spellRoot = path.join(root, "wiki", "法術");
  const all = walk(spellRoot).filter((file) => !path.basename(file).includes("索引"));
  if (!paths.length) return all.filter((file) => !publication || parseFrontmatter(fs.readFileSync(file, "utf8"))?.entity_id?.split(":")[1] === publication);
  const result = new Set();
  for (const requested of paths) {
    const candidate = path.resolve(root, requested);
    if (!inside(path.join(root, "wiki"), candidate) || !inside(spellRoot, candidate)) throw new Error(`指定範圍必須位於 wiki/法術/：${requested}`);
    if (!fs.existsSync(candidate)) throw new Error(`找不到指定範圍：${requested}`);
    const stats = fs.statSync(candidate);
    const matches = stats.isDirectory() ? walk(candidate).filter((file) => file.endsWith(".md") && !path.basename(file).includes("索引")) : [candidate];
    for (const file of matches) {
      if (publication && parseFrontmatter(fs.readFileSync(file, "utf8"))?.entity_id?.split(":")[1] !== publication) continue;
      result.add(file);
    }
  }
  return [...result].sort();
}

/** Pure-ish runner with injectable root, used by tests and the CLI. */
export function migrateSpellTargetArea(options, { root = ROOT, beforeWrite } = {}) {
  const files = selectedFiles({ root, paths: options.paths ?? [], publication: options.publication });
  const entries = files.map((file) => {
    const before = fs.readFileSync(file, "utf8");
    const data = parseFrontmatter(before) ?? {};
    const plan = planSpellTargetArea(before);
    const refresh = options.refreshUpdated && EXCEPTION_IDS.has(data.entity_id);
    const plannedText = plan.status === "change" || refresh ? touchUpdated(plan.text) : plan.text;
    const status = plannedText !== before && (plan.status === "change" || refresh) ? "change" : plan.status;
    return {
      file: relative(root, file), absolute: file, publication: data.entity_id?.split(":")[1] ?? "未設定", entity_id: data.entity_id ?? null,
      title: data.title ?? path.basename(file, ".md"), status, layout: plan.layout ?? null, reason: refresh && plan.status === "unchanged" ? "例外表核定值更新日期" : plan.reason ?? null,
      old_fields: plan.oldFields?.map(({ label, value }) => ({ label, value })) ?? [], before_sha256: sha256(before),
      after_sha256: sha256(plannedText), protected_before_sha256: sha256(plan.status === "exception" ? before : planSpellTargetArea(before).text === before ? before : before.replace(/^- \*\*(?:目標 \(Target\)|效應區域 \(Area\)|目標／範圍 \(Target\/Area\))\*\*：.*\r?\n?/gmu, "")),
      text: plannedText,
    };
  });
  const layouts = { target_only: 0, area_only: 0, both: 0, omitted: 0, legacy_combined: 0 };
  for (const entry of entries) {
    if (entry.layout === "target-only") layouts.target_only += 1;
    else if (entry.layout === "area-only") layouts.area_only += 1;
    else if (entry.layout === "both") layouts.both += 1;
    else if (entry.layout === "omitted") layouts.omitted += 1;
    else layouts.legacy_combined += 1;
  }
  const summary = { selected: entries.length, proposed: entries.filter((entry) => entry.status === "change").length, applied: 0, unchanged: entries.filter((entry) => entry.status === "unchanged").length, exceptions: entries.filter((entry) => entry.status === "exception").length, conflicts: 0, layouts };
  if (options.apply) {
    beforeWrite?.(entries);
    for (const entry of entries.filter((item) => item.status === "change")) {
      const current = fs.readFileSync(entry.absolute, "utf8");
      if (sha256(current) !== entry.before_sha256) {
        entry.status = "conflict"; entry.reason = "預覽後檔案已變更，未覆寫"; summary.conflicts += 1; continue;
      }
      fs.writeFileSync(entry.absolute, entry.text, "utf8");
      entry.status = "applied"; summary.applied += 1;
    }
  }
  const report = { schema_version: 1, generated_at: new Date().toISOString(), mode: options.apply ? "apply" : "dry-run", publication: options.publication, summary, entries: entries.map(({ absolute, text, ...entry }) => entry) };
  if (options.report) {
    const reportPath = path.resolve(root, options.report);
    if (!inside(path.join(root, "reports"), reportPath)) throw new Error("報告必須寫入 reports/ 下。");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(reportPath.replace(/\.json$/u, ".md"), reportMarkdown(report), "utf8");
  }
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseMigrationArguments(process.argv.slice(2));
  const report = migrateSpellTargetArea(options);
  console.log(`${report.mode}: ${report.summary.proposed} 可套用、${report.summary.applied} 已套用、${report.summary.exceptions} 保留例外、${report.summary.selected} 頁。`);
}
