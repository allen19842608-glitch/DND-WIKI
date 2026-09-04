import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractTargetArea, isStandardTargetAreaLine, normalizeTargetArea } from "../core/spell-target-area.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI = path.join(ROOT, "wiki", "法術");
const apply = process.argv.includes("--apply");
const today = new Date().toISOString().slice(0, 10);
const requested = process.argv.filter((arg) => arg.startsWith("wiki/"))
  .map((arg) => path.resolve(ROOT, arg));
const files = [];
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, item.name); if (item.isDirectory()) walk(full); else if (item.name.endsWith(".md") && !item.name.includes("索引")) files.push(full); } }
walk(WIKI);
const selected = requested.length ? files.filter((file) => requested.includes(file)) : files;
for (const file of requested) if (!files.includes(file)) throw new Error(`不是可同步的法術頁：${path.relative(ROOT, file)}`);
let changed = 0; let unresolved = 0;
for (const file of selected) {
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/); const rangeAt = lines.findIndex((line) => /^- \*\*施法距離(?: \(Range\))?\*\*：/.test(line));
  if (rangeAt < 0) { unresolved++; console.log(`unresolved\t${path.relative(ROOT,file)}\t缺少 Range`); continue; }
  const areaAt = lines.findIndex((line) => /目標.*範圍/.test(line));
  const existing = areaAt >= 0 ? lines[areaAt].replace(/^.*?：/, "") : null;
  // 已是符合新格式的人工核定值時，絕不以啟發式結果覆寫；只在必要時移至 Range 後。
  if (areaAt >= 0 && isStandardTargetAreaLine(lines[areaAt]) && normalizeTargetArea(existing) === existing) {
    if (areaAt === rangeAt + 1) continue;
    console.log(`reposition\t${path.relative(ROOT,file)}\t${existing}`);
    if (!apply) continue;
    const [line] = lines.splice(areaAt, 1);
    lines.splice(rangeAt + 1, 0, line);
    const updatedAt = lines.findIndex((line) => /^updated:\s*"?\d{4}-\d{2}-\d{2}"?$/.test(line));
    if (updatedAt >= 0) lines[updatedAt] = `updated: "${today}"`;
    fs.writeFileSync(file, lines.join(source.includes("\r\n") ? "\r\n" : "\n"), "utf8"); changed++;
    continue;
  }
  const proposal = extractTargetArea({ range: lines[rangeAt].replace(/^.*?：/, ""), effect: source.match(/- \*\*效果\*\*：(.+)/)?.[1] ?? "" });
  if (proposal.confidence !== "high-confidence") { unresolved++; console.log(`unresolved\t${path.relative(ROOT,file)}\t${proposal.reason}`); continue; }
  const next = proposal.value ? `- **目標／範圍 (Target/Area)**：${normalizeTargetArea(proposal.value)}` : null;
  if ((existing ?? null) === (proposal.value ?? null) && (areaAt < 0 || isStandardTargetAreaLine(lines[areaAt]))) continue;
  console.log(`change\t${path.relative(ROOT,file)}\t${existing ?? "(none)"}\t=>\t${proposal.value ?? "omit"}`);
  if (!apply) continue;
  if (areaAt >= 0) { if (next) lines[areaAt] = next; else lines.splice(areaAt, 1); } else if (next) lines.splice(rangeAt + 1, 0, next);
  const updatedAt = lines.findIndex((line) => /^updated:\s*"?\d{4}-\d{2}-\d{2}"?$/.test(line));
  if (updatedAt >= 0) lines[updatedAt] = `updated: "${today}"`;
  fs.writeFileSync(file, lines.join(source.includes("\r\n") ? "\r\n" : "\n"), "utf8"); changed++;
}
console.log(`${apply ? "applied" : "dry-run"}: ${changed} changes, ${unresolved} unresolved, ${selected.length} spell pages.`);
