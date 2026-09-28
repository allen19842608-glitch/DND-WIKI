import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = "原始資料/外部來源鏡像/MPMM2022/chapters/02-Fantastical Races.md";
const URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-mpmm.json";

function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => { const f = path.join(dir, e.name); return e.isDirectory() ? walk(f) : e.isFile() && f.endsWith(".md") ? [f] : []; }); }
function parse(file) { const text = fs.readFileSync(file, "utf8"); const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/); if (!m) return null; try { return { text, yaml: m[1], data: YAML.parse(m[1]) }; } catch { return null; } }
function english(title) { return String(title ?? "").match(/\(([^()，]+)(?:，2014 Legacy)?\)$/)?.[1]?.trim() ?? ""; }
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const rows = walk(path.join(ROOT, "wiki")).flatMap((file) => { const page = parse(file); if (!page || page.data?.entity_id?.split(":")[1] !== "MPMM2022" || page.data?.category !== "種族" || page.data?.ruleset !== "2014" || page.data?.status !== "legacy" || !["compatible", "conditional"].includes(page.data?.compatibility_2024)) return []; if (!fs.existsSync(path.join(ROOT, SOURCE)) || (page.data.sources ?? []).some((s) => s?.file === SOURCE)) return []; const name = english(page.data.title); if (!name) return []; const source = `  - file: "${SOURCE}"\n    locator: "Mordenkainen Presents: Monsters of the Multiverse (2022), p. 8：${name}"\n    url: "${URL}"\n    authority: "官方"\n    translation: "none"\n`; return [{ file, name, next: page.text.replace(page.yaml, page.yaml.replace(/\nsources:\n/, `\nsources:\n${source}`)) }]; });
const plan = planCandidateBatch(rows.map((row) => candidateChange({ destination: row.file, before: fs.readFileSync(row.file, "utf8"), after: row.next, operation: "update", source: SOURCE, locator: row.name })), { root: ROOT, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
for (const row of rows) console.log(`${options.apply ? "套用" : "預覽"}：${path.relative(ROOT, row.file).replaceAll("\\", "/")}（${row.name}）`);
console.log(`${options.apply ? "已更新" : "預覽"}：${rows.length} 頁。`);
