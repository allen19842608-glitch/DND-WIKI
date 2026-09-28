import fs from "node:fs";
import path from "node:path";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const root = ROOT;
const introRoot = path.join(root, "wiki", "怪物", "介紹");
let changed = 0;
const pending = [];

for (const file of fs.readdirSync(introRoot).filter((name) => name.endsWith(".md"))) {
  const target = path.join(introRoot, file);
  const lines = fs.readFileSync(target, "utf8").split(/\r?\n/);
  const result = [];
  let updated = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("——")) {
      result.push(line);
      continue;
    }
    let end = result.length - 1;
    while (end >= 0 && !result[end].trim()) end -= 1;
    let start = end;
    while (start >= 0 && result[start].trim()) start -= 1;
    const quoteLines = result.slice(start + 1, end + 1);
    if (!quoteLines.length || quoteLines.some((item) => /^(#|[-*] |\||> )/.test(item))) {
      result.push(line);
      continue;
    }
    result.splice(start + 1);
    if (result.at(-1)?.trim()) result.push("");
    result.push(`> [!QUOTE]- ${line.slice(2).trim()}`, ">", ...quoteLines.map((item) => `> ${item}`));
    updated = true;
  }
  if (!updated) continue;
  const original = fs.readFileSync(target, "utf8");
  const after = `${result.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
  pending.push(candidateChange({ destination: target, before: original, after, operation: "update", source: "wiki/怪物/介紹", locator: path.relative(root, target) }));
  changed += 1;
  console.log(`修正：${path.relative(root, target)}`);
}

console.log(`完成：${changed} 個怪物介紹引言。`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root: ROOT });
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用怪物介紹引言修正：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽怪物介紹引言修正：${plan.changes.length} 個候選變更；加入 --apply 才會寫入。`);
}
