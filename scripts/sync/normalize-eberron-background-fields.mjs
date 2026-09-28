import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const map = new Map([
  ["異種後裔", "異種後裔.md"], ["考古學家", "考古學家.md"], ["家族代理人", "家族代理人.md"],
  ["坎尼斯家族後裔", "坎尼斯家族後裔.md"], ["鄧內斯家族後裔", "鄧內斯家族後裔.md"], ["伽藍達家族後裔", "伽藍達家族後裔.md"],
  ["喬拉斯科家族後裔", "喬拉斯科家族後裔.md"], ["昆達拉克家族後裔", "昆達拉克家族後裔.md"], ["黎蘭達家族後裔", "黎蘭達家族後裔.md"],
  ["梅丹尼家族後裔", "梅丹尼家族後裔.md"], ["歐瑞恩家族後裔", "歐瑞恩家族後裔.md"], ["費亞蘭家族後裔", "費亞蘭家族後裔.md"],
  ["西維斯家族後裔", "西維斯家族後裔.md"], ["薩拉釋克家族後裔", "薩拉釋克家族後裔.md"], ["蘇蘭尼家族後裔", "蘇蘭尼家族後裔.md"],
  ["瓦達利斯家族後裔", "瓦達利斯家族後裔.md"], ["探事員", "探事員.md"],
]);
const featEnglish = new Map([
  ["異種龍紋", "Aberrant Dragonmark"], ["熟習", "Skilled"], ["幸運", "Lucky"], ["警戒", "Alert"],
  ["畜牧龍紋", "Mark of Handling"], ["抄錄龍紋", "Mark of Scribing"], ["招待龍紋", "Mark of Hospitality"],
  ["創造龍紋", "Mark of Making"], ["守禦龍紋", "Mark of Warding"], ["偵測龍紋", "Mark of Detection"],
  ["醫療龍紋", "Mark of Healing"], ["陰影龍紋", "Mark of Shadow"], ["通行龍紋", "Mark of Passage"],
  ["哨戒龍紋", "Mark of Sentinel"], ["暴風龍紋", "Mark of Storm"], ["探尋龍紋", "Mark of Finding"],
]);
function transform(text) {
  let next = text.replace(/^- \*\*專長\*\*：/m, "- **起源專長**：");
  const equipment = next.match(/^- \*\*裝備\*\*：選擇 A 或 B：\(A\)(.+?)；或\(B\)(.+?)。\r?$/m);
  if (equipment) {
    next = next.replace(equipment[0], `- **裝備 A**：${equipment[1]}\n- **裝備 B**：${equipment[2]}`);
  }
  next = next.replace(/(起源專長\*\*：)([^\n]+)/, (whole, label, value) => {
    const match = value.match(/\[\[專長\/[^|]+\|([^ (]+)/);
    const chinese = match?.[1] ?? value.match(/^([^（(]+)/)?.[1]?.trim();
    const english = featEnglish.get(chinese);
    if (!english || value.includes("]]")) return whole;
    return `${label}[[專長/${chinese}|${chinese} (${english})]]`;
  });
  return next;
}
const results = [];
const pending = [];
for (const [chinese, filename] of map) {
  const file = path.join(ROOT, "wiki", "背景", filename);
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  const changed = before !== after;
  if (changed) pending.push(candidateChange({ destination: file, before, after, operation: "update", source: "EBER2025-background-fields", locator: chinese }));
  results.push({ chinese, status: changed ? (options.apply ? "written" : "preview") : "unchanged" });
}
const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan({ ...plan, results }, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
process.stdout.write(`EBER2025 背景欄位正規化${options.apply ? "套用" : "預覽"}：${JSON.stringify(results)}\n`);
