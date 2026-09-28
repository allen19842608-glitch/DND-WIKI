import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = ROOT;
const scopeRoot = path.join(root, "wiki", "冒險者聯盟");
const UPDATED = "2026-08-31";

const publications = [
  { aliases: ["玩家指南 v2026.4"], title: "《冒險者聯盟玩家指南 v2026.4》" },
  { aliases: ["地下城主指南 v2026.2"], title: "《冒險者聯盟地下城主指南 v2026.2》" },
  { aliases: ["調整指南 v2026.2"], title: "《冒險者聯盟調整指南 v2026.2》" },
  { aliases: ["Service Rewards v2026.1", "D&D Adventurers League Service Rewards v2026.1"], title: "《冒險者聯盟服務獎勵 v2026.1》" },
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : entry.name.endsWith(".md") ? [target] : [];
  });
}

export function normalizeSourceText(source) {
  const titles = [];
  if (source.includes("三份指南")) titles.push(...publications.slice(0, 3).map((publication) => publication.title));
  for (const publication of publications) {
    if (publication.aliases.some((alias) => source.includes(alias))) titles.push(publication.title);
  }
  const unique = [...new Set(titles)];
  if (!unique.length) return { value: source, changed: false, unresolved: /\bp{1,2}\.\s*\d+/iu.test(source) };
  return { value: unique.join("；"), changed: unique.join("；") !== source, unresolved: false };
}

export function normalizeDocument(text) {
  const frontmatter = text.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/u);
  if (!frontmatter) throw new Error("缺少 Frontmatter。");
  const head = frontmatter[1];
  const body = text.slice(head.length);
  const unresolved = [];
  let changed = false;
  const normalizedBody = body.replace(/（來源：([^）]+)）/gu, (whole, source) => {
    const result = normalizeSourceText(source);
    if (result.unresolved) unresolved.push(source);
    if (result.changed) changed = true;
    return result.changed ? `（來源：${result.value}）` : whole;
  });
  if (unresolved.length) return { text, changed: false, unresolved };
  const normalizedHead = changed ? head.replace(/^updated:\s+"[^"]+"\s*$/mu, `updated: "${UPDATED}"`) : head;
  return { text: `${normalizedHead}${normalizedBody}`, changed, unresolved: [] };
}

export function run({ apply = false, report = null } = {}) {
  if (apply && !report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
  const changed = [];
  const unresolved = [];
  for (const filename of walk(scopeRoot)) {
    const text = fs.readFileSync(filename, "utf8");
    const result = normalizeDocument(text);
    if (result.unresolved.length) unresolved.push({ filename, sources: result.unresolved });
    if (result.changed) changed.push({ filename, text: result.text });
  }
  if (unresolved.length) throw new Error(`有未辨識的 AL 頁碼引用：${unresolved.map((item) => item.filename).join("、")}`);
  const plan = planCandidateBatch(changed.map((item) => candidateChange({ destination: item.filename, before: fs.readFileSync(item.filename, "utf8"), after: item.text, operation: "update", source: "AL-citations", locator: path.relative(root, item.filename) })), { root, lint: lintWiki });
  writeCandidatePlan({ ...plan, unresolved }, report, { root });
  if (apply) applyCandidateBatch(plan, { root, lint: lintWiki });
  return { ...plan, unresolved };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseOptions(process.argv.slice(2));
  const result = run({ apply: options.apply, report: options.report });
  console.log(`${options.apply ? "已套用" : "預覽"}：${result.changes.length} 頁`);
  for (const change of result.changes) console.log(change.target);
}
