import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_ROOT = path.join(ROOT, "wiki");
const LORE_CONFIG = YAML.parse(fs.readFileSync(path.join(ROOT, "config", "lore.yml"), "utf8"));

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function loreType(label) {
  const found = Object.entries(LORE_CONFIG.lore_types).find(([, value]) => value.label === label);
  if (!found) throw new Error(`未知故事資料類型：${label}`);
  return { id: found[0], ...found[1] };
}

function updateMetadata(text, destinationType) {
  const next = text
    .replace(/^lore_type: "[^"]+"$/m, `lore_type: "${destinationType.label}"`)
    .replace(/^(concept_id: "concept:setting:[^:]+:)[^:]+(:[^\"]+")$/m, `$1${destinationType.id}$2`);
  if (next === text) throw new Error("條目缺少可更新的 lore_type 或 concept_id。");
  return next;
}

const setting = valueAfter("--setting");
const from = valueAfter("--from");
const to = valueAfter("--to");
const only = new Set((valueAfter("--only") ?? "").split(",").map((item) => item.trim()).filter(Boolean));
const group = valueAfter("--group") ?? "";
const apply = process.argv.includes("--apply");

if (!setting || !from || !to || only.size === 0) {
  throw new Error("用法：--setting <世界> --from <類型> --to <類型> --only <檔名,...> [--group <子目錄>] [--apply]");
}
if (group && (!/^[^\\/]+(?:\/[^\\/]+)*$/u.test(group) || group.split("/").includes(".."))) {
  throw new Error("--group 必須是工作區內的相對子目錄。");
}

const world = Object.entries(LORE_CONFIG.worlds).find(([, value]) => value.label === setting)?.[1];
if (!world) throw new Error(`未知世界：${setting}`);
const sourceType = loreType(from);
const destinationType = loreType(to);
const sourceRoot = path.join(ROOT, ...`${world.root}/${sourceType.directory}`.split("/"));
const destinationRoot = path.join(ROOT, ...[world.root, destinationType.directory, group].filter(Boolean).join("/").split("/"));
const selected = walk(sourceRoot)
  .filter((file) => only.has(path.basename(file, ".md")))
  .sort((a, b) => a.localeCompare(b, "zh-Hant"));

if (selected.length !== only.size) {
  const found = new Set(selected.map((file) => path.basename(file, ".md")));
  throw new Error(`找不到指定條目：${[...only].filter((name) => !found.has(name)).join("、")}`);
}

const moves = selected.map((source) => {
  const target = path.join(destinationRoot, path.basename(source));
  if (fs.existsSync(target) && path.resolve(target) !== path.resolve(source)) throw new Error(`目標已存在：${relative(target)}`);
  return { source, target, content: updateMetadata(fs.readFileSync(source, "utf8"), destinationType) };
});

const mappings = moves.map(({ source, target }) => ({
  oldTarget: relative(source).replace(/^wiki\//, "").replace(/\.md$/, ""),
  newTarget: relative(target).replace(/^wiki\//, "").replace(/\.md$/, ""),
}));

if (apply) {
  for (const move of moves) {
    fs.mkdirSync(path.dirname(move.target), { recursive: true });
    if (path.resolve(move.source) === path.resolve(move.target)) fs.writeFileSync(move.source, move.content, "utf8");
    else {
      fs.writeFileSync(move.target, move.content, "utf8");
      fs.unlinkSync(move.source);
    }
  }
  for (const file of walk(WIKI_ROOT)) {
    const original = fs.readFileSync(file, "utf8");
    let next = original;
    for (const mapping of mappings) {
      next = next.replaceAll(`[[${mapping.oldTarget}|`, `[[${mapping.newTarget}|`);
      next = next.replaceAll(`[[${mapping.oldTarget}#`, `[[${mapping.newTarget}#`);
      next = next.replaceAll(`[[${mapping.oldTarget}]]`, `[[${mapping.newTarget}]]`);
    }
    if (next !== original) fs.writeFileSync(file, next, "utf8");
  }
}

process.stdout.write(`${apply ? "套用" : "預覽"}故事資料分類遷移：${moves.length} 頁\n`);
for (const move of moves) process.stdout.write(`- ${relative(move.source)} -> ${relative(move.target)}\n`);
