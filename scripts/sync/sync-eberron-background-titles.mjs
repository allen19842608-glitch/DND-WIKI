import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TODAY = new Date().toISOString().slice(0, 10);
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const MIRROR = "原始資料/外部來源鏡像/EBER2025/book-efa.json";
const MIRROR_URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-efa.json";
const entries = new Map([
  ["異種後裔", "Aberrant Heir"], ["考古學家", "Archaeologist"], ["家族代理人", "House Agent"],
  ["坎尼斯家族後裔", "House Cannith Heir"], ["鄧內斯家族後裔", "House Deneith Heir"],
  ["伽藍達家族後裔", "House Ghallanda Heir"], ["喬拉斯科家族後裔", "House Jorasco Heir"],
  ["昆達拉克家族後裔", "House Kundarak Heir"], ["黎蘭達家族後裔", "House Lyrandar Heir"],
  ["梅丹尼家族後裔", "House Medani Heir"], ["歐瑞恩家族後裔", "House Orien Heir"],
  ["費亞蘭家族後裔", "House Phiarlan Heir"], ["西維斯家族後裔", "House Sivis Heir"],
  ["薩拉釋克家族後裔", "House Tharashk Heir"], ["蘇蘭尼家族後裔", "House Thuranni Heir"],
  ["瓦達利斯家族後裔", "House Vadalis Heir"], ["探事員", "Inquisitive"],
]);

function update(text, chinese, english) {
  const title = `${chinese} (${english})`;
  let next = text.replace(/^title:\s*"[^"]+"$/m, `title: "${title}"`);
  next = next.replace(new RegExp(`^#\\s+${chinese.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}(?: \\([^\\n]+\\))?$`, "m"), `# ${title}`);
  if (!next.includes(`- file: "${MIRROR}"`)) {
    const source = `  - file: "${MIRROR}"\n    locator: "Eberron: Forge of the Artificer (2025), p. 25：Chapter 02: Character Options > Backgrounds > ${english} > ${english}；5e.tools 鏡像快照"\n    url: "${MIRROR_URL}"\n    authority: "官方"\n    translation: "none"\n`;
    next = next.replace(/sources:\r?\n/, `sources:\n${source}`);
  }
  next = next.replace(/^updated:\s*"[^"]+"$/m, `updated: "${TODAY}"`);
  return next;
}

const results = [];
const pending = [];
for (const [chinese, english] of entries) {
  const file = path.join(ROOT, "wiki", "背景", `${chinese}.md`);
  if (!fs.existsSync(file)) { results.push({ chinese, english, status: "missing_file" }); continue; }
  const before = fs.readFileSync(file, "utf8");
  const after = update(before, chinese, english);
  const changed = before !== after;
  if (changed) pending.push(candidateChange({ destination: file, before, after, operation: "update", source: MIRROR, locator: english }));
  results.push({ chinese, english, status: changed ? (options.apply ? "written" : "preview") : "unchanged" });
}
const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan({ ...plan, results }, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
const summary = results.reduce((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {});
process.stdout.write(`EBER2025 背景標題與鏡像同步${options.apply ? "套用" : "預覽"}：${JSON.stringify(summary)}\n`);
