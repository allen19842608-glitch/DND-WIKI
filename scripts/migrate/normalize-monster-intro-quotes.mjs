import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const introRoot = path.join(root, "wiki", "怪物", "介紹");
let changed = 0;

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
  fs.writeFileSync(target, `${result.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`, "utf8");
  changed += 1;
  console.log(`修正：${path.relative(root, target)}`);
}

console.log(`完成：${changed} 個怪物介紹引言。`);
