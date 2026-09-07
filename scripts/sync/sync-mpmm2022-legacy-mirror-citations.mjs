import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = "原始資料/外部來源鏡像/MPMM2022/chapters/02-Fantastical Races.md";
const URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-mpmm.json";

function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => { const f = path.join(dir, e.name); return e.isDirectory() ? walk(f) : e.isFile() && f.endsWith(".md") ? [f] : []; }); }
function parse(file) { const text = fs.readFileSync(file, "utf8"); const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/); if (!m) return null; try { return { text, yaml: m[1], data: YAML.parse(m[1]) }; } catch { return null; } }
function english(title) { return String(title ?? "").match(/\(([^()，]+)(?:，2014 Legacy)?\)$/)?.[1]?.trim() ?? ""; }
const apply = process.argv.includes("--apply");
const rows = walk(path.join(ROOT, "wiki")).flatMap((file) => { const page = parse(file); if (!page || page.data?.entity_id?.split(":")[1] !== "MPMM2022" || page.data?.category !== "種族" || page.data?.ruleset !== "2014" || page.data?.status !== "legacy" || !["compatible", "conditional"].includes(page.data?.compatibility_2024)) return []; if (!fs.existsSync(path.join(ROOT, SOURCE)) || (page.data.sources ?? []).some((s) => s?.file === SOURCE)) return []; const name = english(page.data.title); if (!name) return []; const source = `  - file: "${SOURCE}"\n    locator: "Mordenkainen Presents: Monsters of the Multiverse (2022), p. 8：${name}"\n    url: "${URL}"\n    authority: "官方"\n    translation: "none"\n`; return [{ file, name, next: page.text.replace(page.yaml, page.yaml.replace(/\nsources:\n/, `\nsources:\n${source}`)) }]; });
for (const row of rows) { console.log(`${apply ? "套用" : "預覽"}：${path.relative(ROOT, row.file).replaceAll("\\", "/")}（${row.name}）`); if (apply) fs.writeFileSync(row.file, row.next, "utf8"); }
console.log(`${apply ? "已更新" : "預覽"}：${rows.length} 頁。`);
