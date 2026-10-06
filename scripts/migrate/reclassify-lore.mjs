import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const WIKI_ROOT = path.join(ROOT, "wiki");
const LORE_CONFIG = YAML.parse(fs.readFileSync(path.join(ROOT, "config", "lore.yml"), "utf8"));
const relative = (file) => path.relative(ROOT, file).split(path.sep).join("/");
function walk(directory) { if (!fs.existsSync(directory)) return []; return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => { const target = path.join(directory, entry.name); return entry.isDirectory() ? walk(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : []; }); }
function loreType(label) { const found = Object.entries(LORE_CONFIG.lore_types).find(([, value]) => value.label === label); if (!found) throw new Error(`未知故事資料類型：${label}`); return { id: found[0], ...found[1] }; }
function updateMetadata(text, destinationType) { const next = text.replace(/^lore_type: "[^"]+"$/m, `lore_type: "${destinationType.label}"`).replace(/^(concept_id: "concept:setting:[^:]+:)[^:]+(:[^\"]+")$/m, `$1${destinationType.id}$2`); if (next === text) throw new Error("條目缺少可更新的 lore_type 或 concept_id。"); return next; }
function rewriteLinks(text, mappings) { let next = text; for (const mapping of mappings) { next = next.replaceAll(`[[${mapping.oldTarget}|`, `[[${mapping.newTarget}|`).replaceAll(`[[${mapping.oldTarget}#`, `[[${mapping.newTarget}#`).replaceAll(`[[${mapping.oldTarget}]]`, `[[${mapping.newTarget}]]`); } return next; }

export function run(args = process.argv.slice(2)) {
  const options = parseOptions(args, { extraValueOptions: ["--setting", "--from", "--to", "--group"] });
  if (options.apply) throw new Error("舊分類遷移入口已退役，不再直接寫入 Wiki；請使用 wiki:preview 建立候選計畫，再以 wiki:apply 套用。");
  const value = (name) => args[args.indexOf(name) + 1];
  const setting = value("--setting"); const from = value("--from"); const to = value("--to"); const group = value("--group") ?? "";
  const only = new Set((options.only ?? "").split(",").map((item) => item.trim()).filter(Boolean));
  if (!setting || !from || !to || !only.size) throw new Error("用法：--setting <世界> --from <類型> --to <類型> --only <檔名,...> [--group <子目錄>] [--report reports/<plan>.json]");
  if (group && (!/^[^\\/]+(?:\/[^\\/]+)*$/u.test(group) || group.split("/").includes(".."))) throw new Error("--group 必須是工作區內的相對子目錄。");
  const world = Object.entries(LORE_CONFIG.worlds).find(([, item]) => item.label === setting)?.[1]; if (!world) throw new Error(`未知世界：${setting}`);
  const sourceType = loreType(from); const destinationType = loreType(to);
  const sourceRoot = path.join(ROOT, ...`${world.root}/${sourceType.directory}`.split("/"));
  const destinationRoot = path.join(ROOT, ...[world.root, destinationType.directory, group].filter(Boolean).join("/").split("/"));
  const selected = walk(sourceRoot).filter((file) => only.has(path.basename(file, ".md"))).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  if (selected.length !== only.size) { const found = new Set(selected.map((file) => path.basename(file, ".md"))); throw new Error(`找不到指定條目：${[...only].filter((name) => !found.has(name)).join("、")}`); }
  const moves = selected.map((source) => { const target = path.join(destinationRoot, path.basename(source)); if (fs.existsSync(target) && path.resolve(target) !== path.resolve(source)) throw new Error(`目標已存在：${relative(target)}`); const before = fs.readFileSync(source, "utf8"); return { source, target, before, content: updateMetadata(before, destinationType) }; });
  const mappings = moves.map(({ source, target }) => ({ oldTarget: relative(source).replace(/^wiki\//, "").replace(/\.md$/, ""), newTarget: relative(target).replace(/^wiki\//, "").replace(/\.md$/, "") }));
  const pending = [];
  for (const move of moves) {
    if (path.resolve(move.source) === path.resolve(move.target)) pending.push(candidateChange({ destination: move.source, before: move.before, after: move.content, operation: "update", source: "config/lore.yml", locator: `${from} -> ${to}` }));
    else { pending.push(candidateChange({ destination: move.target, before: null, after: move.content, operation: "create", source: "config/lore.yml", locator: `${from} -> ${to}` })); pending.push(candidateChange({ destination: move.source, before: move.before, after: null, operation: "delete", source: "config/lore.yml", locator: "已遷移至新分類" })); }
  }
  for (const file of walk(WIKI_ROOT)) { if (moves.some((move) => path.resolve(move.source) === path.resolve(file) && path.resolve(move.source) !== path.resolve(move.target))) continue; const before = fs.readFileSync(file, "utf8"); const after = rewriteLinks(before, mappings); if (after !== before) pending.push(candidateChange({ destination: file, before, after, operation: "link", source: "分類遷移連結重寫", locator: `${from} -> ${to}` })); }
  const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki }); writeCandidatePlan(plan, options.report, { root: ROOT }); if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  process.stdout.write(`${options.apply ? "套用" : "預覽"}故事資料分類遷移：${moves.length} 頁；候選 ${plan.summary.ready}；人工覆核 ${plan.summary.manual_review}。\n`); for (const move of moves) process.stdout.write(`- ${relative(move.source)} -> ${relative(move.target)}\n`);
  return plan;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) run();
