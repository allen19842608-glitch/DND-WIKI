import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI = path.join(ROOT, "wiki");
const APPLY = process.argv.includes("--apply");
const COMPATIBLE_PHB = new Set([
  "knowledge domain", "nature domain", "tempest domain",
  "school of conjuration", "school of enchantment", "school of necromancy", "school of transmutation",
  "half-elf", "half-orc", "dungeon delver", "linguist", "martial adept",
]);
const RENAMED_2024 = new Map([
  ["path of the totem warrior", "path of the wild heart"],
  ["way of the four elements", "warrior of the elements"],
  ["the celestial", "celestial patron"],
  ["aberrant mind", "aberrant sorcery"],
  ["clockwork soul", "clockwork sorcery"],
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : entry.name.endsWith(".md") ? [file] : [];
  });
}
function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? { text, yaml: match[1], data: YAML.parse(match[1]) ?? {} } : null;
}
function english(title) {
  const matches = [...String(title ?? "").matchAll(/\(([^()]*)\)/g)];
  return matches.at(-1)?.[1]?.replace(/，\s*2014 Legacy$/i, "").trim().toLowerCase() ?? "";
}
function publication(data) { return String(data.entity_id ?? "").split(":")[1] ?? ""; }
function isTarget(data) {
  return data.ruleset === "2014" && data.status === "legacy"
    && ["PHB2014", "XGE2017", "TCE2020", "FTD2021"].includes(publication(data))
    && ["法術", "專長", "種族", "背景", "職業"].includes(data.category)
    && !String(data.title ?? "").includes("索引");
}
function setField(yaml, field, value) {
  const line = `${field}: \"${value}\"`;
  return new RegExp(`^${field}:.*$`, "m").test(yaml)
    ? yaml.replace(new RegExp(`^${field}:.*$`, "m"), line)
    : yaml.replace(/^(status: ".*"\r?\n)/m, `$1${line}\n`);
}
function classify(data, current) {
  const pub = publication(data);
  const name = english(data.title);
  if (pub === "PHB2014") return COMPATIBLE_PHB.has(name) ? "compatible" : "replaced";
  if (pub === "FTD2021" && data.category === "法術") return "compatible";
  if (!["法術", "專長"].includes(data.category) && data.entry_type !== "子職") return null;
  const currentName = RENAMED_2024.get(name) ?? name;
  return current.has(`${data.category}|${currentName}`) ? "replaced" : "compatible";
}

const rows = walk(WIKI).map((file) => ({ file, ...parse(file) })).filter((row) => row.data);
const current = new Set(rows.filter((row) => row.data.version === "2024-Core")
  .map((row) => `${row.data.category}|${english(row.data.title)}`));
const updates = [];
for (const row of rows.filter((row) => isTarget(row.data))) {
  const compatibility = classify(row.data, current);
  if (!compatibility) continue;
  let yaml = setField(row.yaml, "compatibility_2024", compatibility);
  yaml = yaml.replace(/^updated: ".*"$/m, 'updated: "2026-09-07"');
  const next = row.text.replace(row.yaml, yaml);
  if (next !== row.text) updates.push({ ...row, compatibility, next });
}
for (const row of updates) {
  process.stdout.write(`${path.relative(ROOT, row.file).replaceAll("\\\\", "/")} -> ${row.compatibility}\n`);
  if (APPLY) fs.writeFileSync(row.file, row.next, "utf8");
}
const summary = Object.fromEntries(["PHB2014", "XGE2017", "TCE2020", "FTD2021"].map((id) => [id, {
  replaced: updates.filter((row) => publication(row.data) === id && row.compatibility === "replaced").length,
  compatible: updates.filter((row) => publication(row.data) === id && row.compatibility === "compatible").length,
}]));
process.stdout.write(`${APPLY ? "已套用" : "預覽"}：${updates.length} 頁。${JSON.stringify(summary)}\n`);
