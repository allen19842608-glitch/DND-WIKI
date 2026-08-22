import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const directory = path.join(root, "wiki", "魔法物品", "法杖");
const apply = process.argv.includes("--apply");
const changed = [];

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
  if (apply) fs.writeFileSync(file, after);
}

console.log(`${apply ? "已更新" : "可更新"} ${changed.length} 個法杖條目。`);
for (const file of changed) console.log(`- ${file}`);
