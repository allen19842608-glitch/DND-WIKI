import fs from 'node:fs';
import path from 'node:path';
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from '../core/ingest-publication-utils.mjs';
import { lintWiki } from '../core/wiki-lint.mjs';

const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const root = path.join(ROOT, 'wiki', '魔法物品');
const pending = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : entry.name.endsWith('.md') ? [target] : [];
  });
}

let placeholderSections = 0;
let duplicateLimits = 0;
const changed = [];

for (const file of walk(root)) {
  const original = fs.readFileSync(file, 'utf8');
  let text = original.replace(
    /\r?\n## 💡 實戰應用與裁量 \(DM Ruling\)\r?\n\r?\n- \*\*常見誤區\*\*：啟用、充能與限制均依各效果的來源描述。\r?\n(?=\r?\n## |\s*$)/g,
    () => {
      placeholderSections += 1;
      return '\n';
    },
  );

  const lines = text.split(/\r?\n/);
  const cleaned = [];
  for (let index = 0; index < lines.length; index += 1) {
    const effect = lines[index].match(/^  - \*\*效果\*\*：(.*)$/);
    const limit = lines[index + 1]?.match(/^  - \*\*限制與恢復\*\*：(.*)$/);
    cleaned.push(lines[index]);
    if (effect && limit && effect[1].trim() === limit[1].trim()) {
      duplicateLimits += 1;
      index += 1;
    }
  }
  text = cleaned.join('\n');

  if (text !== original) {
    pending.push(candidateChange({ destination: file, before: original, after: text, operation: 'update', source: 'wiki/魔法物品', locator: path.relative(ROOT, file) }));
    changed.push(path.relative(process.cwd(), file));
  }
}

console.log(`已更新 ${changed.length} 個魔法物品條目。`);
console.log(`移除 ${placeholderSections} 個空白 DM 樣板區塊。`);
console.log(`移除 ${duplicateLimits} 個重複的限制列。`);
for (const file of changed) console.log(`- ${file}`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root: ROOT });
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用魔法物品結構清理：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽魔法物品結構清理：${plan.changes.length} 個候選變更；加入 --apply 才會寫入。`);
}
