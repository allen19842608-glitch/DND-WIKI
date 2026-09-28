import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ROOT, applyCandidateBatch, candidateChange, loadIngestProfile, parseOptions, planCandidateBatch, today, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const WIKI_ROOT = path.join(ROOT, "wiki", "法術", "2014");

function slug(value) {
  return String(value).toLowerCase().replace(/^the\s+/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function quote(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

function mirrorInfo(publicationId) {
  const profile = loadIngestProfile(publicationId);
  const dataset = profile.canonical_mirror?.datasets?.find((entry) => /spells/i.test(String(entry?.file ?? "")));
  if (!dataset?.file || !dataset?.url) throw new Error(`${publicationId} 未設定獨立法術鏡像資料集。`);
  return { file: String(dataset.file).replaceAll("\\", "/"), url: String(dataset.url) };
}

function sourceBlock(english, mirror) {
  return [
    `  - file: "${mirror.file}"`,
    `    locator: "spell:${quote(english)}"`,
    `    url: "${mirror.url}"`,
    '    authority: "官方"',
    '    translation: "none"',
  ].join("\n");
}

function updatePage(text, english, mirror) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const normalized = text.replaceAll("\r\n", "\n");
  if (normalized.includes(`file: "${mirror.file}"`)) return { text, changed: false, reason: "already_present" };
  const sources = normalized.match(/^sources:\n/m);
  const sourceType = normalized.match(/^source_type:\s*\S.*$/m);
  if (!sources || !sourceType || sources.index > sourceType.index) return { text, changed: false, reason: "sources_block_missing" };
  const next = `${normalized.slice(0, sources.index + sources[0].length)}${sourceBlock(english, mirror)}\n${normalized.slice(sources.index + sources[0].length)}`
    .replace(/^(updated:\s*)"?\d{4}-\d{2}-\d{2}"?\s*$/m, `$1"${today()}"`);
  return { text: next.replaceAll("\n", newline), changed: true, reason: "added" };
}

function englishFromTitle(text) {
  const title = text.match(/^title:\s*"(.+?)"\s*$/m)?.[1];
  if (!title) return undefined;
  const open = title.lastIndexOf("(");
  const close = title.lastIndexOf(")");
  if (open < 0 || close <= open) return undefined;
  return title.slice(open + 1, close).replace(/，?2014 Legacy$/, "").trim();
}

function normalizedName(value) {
  return String(value).toLowerCase().replaceAll("’", "'").replace(/[^a-z0-9]+/g, "");
}

function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  const publicationId = options.publicationId === "PHB2024" ? "XGE2017" : options.publicationId;
  if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
  const mirror = mirrorInfo(publicationId);
  const mirrorPath = path.join(ROOT, ...mirror.file.split("/"));
  if (!fs.existsSync(mirrorPath)) throw new Error(`找不到鏡像資料集：${mirror.file}`);
  const dataset = JSON.parse(fs.readFileSync(mirrorPath, "utf8"));
  const spells = Array.isArray(dataset.spell) ? dataset.spell : [];
  const byName = new Map(spells.map((spell) => [normalizedName(spell.name), spell.name]));
  // The 5e.tools entry uses the published plural while the existing Wiki
  // title follows the Chinese source's singular English heading.
  if (publicationId === "XGE2017") byName.set(normalizedName("Summon Lesser Demon"), "Summon Lesser Demons");
  const report = { total: 0, preview: 0, written: 0, skipped: [] };
  const pending = [];
  for (const file of walk(WIKI_ROOT)) {
    const original = fs.readFileSync(file, "utf8");
    const entity = original.match(new RegExp(`^entity_id:\\s*"entry:${publicationId}:spell:([^\\"]+)"\\s*$`, "m"));
    if (!entity) continue;
    report.total += 1;
    const english = byName.get(normalizedName(englishFromTitle(original) ?? ""));
    if (!english) {
      report.skipped.push({ file: path.relative(ROOT, file).replaceAll(path.sep, "/"), reason: "dataset_entity_missing", entity_id: entity[1] });
      continue;
    }
    const result = updatePage(original, english, mirror);
    if (!result.changed) {
      if (result.reason !== "already_present") report.skipped.push({ file: path.relative(ROOT, file).replaceAll(path.sep, "/"), reason: result.reason });
      continue;
    }
    report.preview += 1;
    pending.push(candidateChange({ destination: file, before: original, after: result.text, operation: "update", source: mirror.file, locator: `spell:${english}` }));
  }
  const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
  const fullReport = { ...plan, publication_id: publicationId, ...report };
  writeCandidatePlan(fullReport, options.report, { root: ROOT });
  if (options.apply) {
    const applied = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
    report.written = applied.applied.length;
  }
  process.stdout.write(`${options.apply ? "套用" : "預覽"} ${publicationId} 法術資料集引用：總計 ${report.total}；${options.apply ? `寫入 ${report.written}` : `預計 ${report.preview}`}；跳過 ${report.skipped.length}。\n`);
  if (report.skipped.length) process.stdout.write(`${JSON.stringify(report.skipped, null, 2)}\n`);
  return fullReport;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();

export { main, slug, updatePage };
