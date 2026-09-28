import fs from "node:fs";
import path from "node:path";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = ROOT;
const directory = path.join(root, "wiki", "魔法物品", "法杖");
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const changed = [];
const pending = [];

for (const name of fs.readdirSync(directory)) {
  if (!name.endsWith(".md") || name.endsWith("索引.md")) continue;
  const file = path.join(directory, name);
  const before = fs.readFileSync(file, "utf8");
  if (before.includes("### 使用、充能與恢復")) continue;
  const after = before.replace(
    /\n- \*\*重獲充能\*\*：\n  - \*\*啟用／觸發\*\*：[^\n]*\n  - \*\*效果\*\*：(.*)\n(?:  - \*\*限制與恢復\*\*：.*\n)?/,
    (_, effect) => `\n### 使用、充能與恢復\n\n- **恢復與耗盡**：${effect}\n`,
  );
  if (after === before) continue;
  changed.push(path.relative(root, file).replaceAll("\\", "/"));
  pending.push(candidateChange({ destination: file, before, after, operation: "update", source: "wiki/魔法物品/法杖", locator: path.relative(root, file) }));
}

const plan = planCandidateBatch(pending, { root, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root });
if (options.apply) applyCandidateBatch(plan, { root, lint: lintWiki });
console.log(`${options.apply ? "已更新" : "可更新"} ${changed.length} 個法杖條目。`);
for (const file of changed) console.log(`- ${file}`);
