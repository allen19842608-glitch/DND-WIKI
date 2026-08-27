import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { ROOT } from "../core/ingest-publication-utils.mjs";

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

function sourceFragment(text, locator) {
  const locatorText = String(locator ?? "");
  const section = locatorText.match(/^\*\*([^*\n]{2,160})\*\*$/u)?.[1];
  const lineRange = locatorText.match(/^L(\d+)(?:[–-]L?(\d+))?[:：]/u);
  const namedEntry = lineRange ? null : locatorText.match(/^(.{2,160})：([^：\n]{2,160})$/u);
  let heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  let body = text.replace(/^#\s+.+(?:\r?\n|$)/, "").trim();
  if (section) {
    heading = section;
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`**${section}**`));
    if (start >= 0) {
      let end = lines.length;
      for (let index = start + 1; index < lines.length; index += 1) {
        if (/^\*\*[^*\n]{2,160}\*\*/u.test(lines[index])) { end = index; break; }
      }
      body = [lines[start].slice(`**${section}**`.length).trim(), ...lines.slice(start + 1, end)].filter(Boolean).join("\n").trim();
    }
  }
  if (namedEntry) {
    const [, parent, name] = namedEntry;
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`**${name}`));
    if (start >= 0) {
      let end = lines.length;
      for (let index = start + 1; index < lines.length; index += 1) {
        if (/^\*\*[^*\n]{2,160}\*\*/u.test(lines[index])) { end = index; break; }
      }
      heading = parent.trim();
      body = lines.slice(start, end).join("\n").trim();
    }
  }
  if (lineRange) {
    const [, startText, endText] = lineRange;
    const start = Number(startText) - 1;
    const end = Number(endText ?? startText);
    const lines = text.split(/\r?\n/).slice(start, end);
    if (/^#\s+/.test(lines[0] ?? "")) lines.shift();
    if (lines.length) body = lines.join("\n").trim();
  }
  if (/^new item$/iu.test(heading)) heading = text.match(/^\*\*([^*\n]{2,160})\*\*/mu)?.[1]?.trim() ?? heading;
  // 原始 H1 由 Wiki 頁的 H1 承擔；內部標題下移一級，保留其餘原文與表格。
  // 來源轉檔偶有以 H1／H2 重新開始的新聞、側欄標題；統一作為來源主題下的 H4，
  // 保留文字內容並避免打斷 Wiki 的大綱階層。
  body = body.replace(/^#{1,6}(?=\s)/gm, "####");
  return { heading, body };
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
  const apply = args.includes("--apply");
  const limit = Number(option(args, "--limit") ?? 25);
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error("--limit 必須是 1 到 25 的整數。");
  const tracked = untracked();
  const candidates = walk(WIKI_ROOT).map((file) => candidate(file, tracked)).filter(Boolean).sort((a, b) => a.relative.localeCompare(b.relative, "zh-Hant"));
  const selected = candidates.slice(0, limit);
  if (apply) for (const item of selected) fs.writeFileSync(path.join(ROOT, ...item.relative.split("/")), rebuilt(item), "utf8");
  const report = { schema_version: 1, mode: apply ? "apply" : "preview", summary: { candidates: candidates.length, selected: selected.length, remaining: candidates.length - selected.length }, information: selected.map((item) => ({ page: item.relative, sources: item.fragments.map((fragment) => ({ file: fragment.sourceFile, locator: fragment.locator })) })) };
  const reportPath = option(args, "--report");
  if (reportPath) fs.writeFileSync(path.resolve(ROOT, reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${apply ? "套用" : "預覽"}原始正文重建：候選 ${report.summary.candidates}；本批 ${report.summary.selected}；剩餘 ${report.summary.remaining}。\n`);
  return report;
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT) run();

export { run, sourceFragment };
