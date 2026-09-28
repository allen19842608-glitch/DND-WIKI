import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { sourceFragment } from "../core/source-fragment.mjs";

const SCRIPT = fileURLToPath(import.meta.url);
const WIKI_ROOT = path.join(ROOT, "wiki", "戰役設定");

function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : (entry.isFile() && file.endsWith(".md") ? [file] : []);
  });
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function comparable(text) {
  return String(text ?? "").replace(/^#{1,6}\s+/gmu, "").replace(/[\r\n\s]+/gu, "").replace(/[#*_`]/gu, "");
}

function untracked() {
  const result = spawnSync("git", ["-c", "core.quotepath=false", "ls-files", "--others", "--exclude-standard", "--", "wiki/戰役設定"], { cwd: ROOT, encoding: "utf8" });
  return new Set(result.status === 0 ? result.stdout.split(/\r?\n/).filter(Boolean) : []);
}

function readPage(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  if (!match) return null;
  try { return { text, frontmatter: match[1], body: match[2], data: YAML.parse(match[1].replace(/^---\r?\n|\r?\n---\r?\n$/g, "")) }; } catch { return null; }
}

function candidate(file, tracked) {
  const page = readPage(file);
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  if (!tracked.has(relative) || page?.data?.category !== "戰役設定" || page.data.lore_type === "索引" || !Array.isArray(page.data.sources)) return null;
  const fragments = [];
  for (const source of page.data.sources) {
    const sourceFile = String(source?.file ?? "");
    if (!sourceFile.startsWith("原始資料/")) continue;
    const absolute = path.join(ROOT, ...sourceFile.split("/"));
    if (!fs.existsSync(absolute)) continue;
    const fragment = sourceFragment(fs.readFileSync(absolute, "utf8"), source.locator);
    if (!fragment.body || fragments.some((item) => item.key === `${sourceFile}\u0000${source.locator}`)) continue;
    fragments.push({ key: `${sourceFile}\u0000${source.locator}`, sourceFile, locator: source.locator, ...fragment });
  }
  if (!fragments.length || fragments.every((fragment) => comparable(page.body).includes(comparable(fragment.body)))) return null;
  return { relative, page, fragments };
}

function rebuilt(item) {
  const title = item.page.body.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(item.relative, ".md");
  const statBlock = item.page.body.match(/^## 怪物資料卡\s*$[\s\S]*?(?=^## |\z)/m)?.[0]?.trimEnd() ?? "";
  const links = item.page.body.match(/^## 🔗 相關連結\s*$[\s\S]*$/m)?.[0]?.trimEnd() ?? "";
  const sections = item.fragments.map((fragment) => `### ${fragment.heading}\n\n${fragment.body}`).join("\n\n");
  const prefix = item.page.frontmatter.replace(/^updated: "[^"]+"$/m, `updated: "${new Date().toISOString().slice(0, 10)}"`);
  return `${prefix}\n# ${title}\n\n## 原始資料內容\n\n> 本節直接保留可定位來源的正文；未以自動摘要取代。\n\n${sections}${statBlock ? `\n\n${statBlock}` : ""}\n\n## 來源差異與不確定性\n\n- 無。\n${links ? `\n${links}\n` : ""}`;
}

function run(args = process.argv.slice(2)) {
  if (args.includes("--apply")) {
    throw new Error("此遷移器已停用：Wiki 不再複製完整原始正文。請保留可定位來源，並以編輯整理的概覽、重點與時間線更新條目。");
  }
  const apply = false;
  const limit = Number(option(args, "--limit") ?? 25);
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error("--limit 必須是 1 到 25 的整數。");
  const tracked = untracked();
  const candidates = walk(WIKI_ROOT).map((file) => candidate(file, tracked)).filter(Boolean).sort((a, b) => a.relative.localeCompare(b.relative, "zh-Hant"));
  const selected = candidates.slice(0, limit);
  // 保留來源切片工具與候選報告，供人工整理時核對；不得再將原文回填 Wiki。
  const report = { schema_version: 1, mode: apply ? "apply" : "preview", summary: { candidates: candidates.length, selected: selected.length, remaining: candidates.length - selected.length }, information: selected.map((item) => ({ page: item.relative, sources: item.fragments.map((fragment) => ({ file: fragment.sourceFile, locator: fragment.locator })) })) };
  const reportPath = option(args, "--report");
  if (reportPath) writeCandidatePlan(report, reportPath, { root: ROOT });
  process.stdout.write(`預覽原始正文重建候選（已停用回填）：候選 ${report.summary.candidates}；本批 ${report.summary.selected}；剩餘 ${report.summary.remaining}。\n`);
  return report;
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT) run();

export { run, sourceFragment };
