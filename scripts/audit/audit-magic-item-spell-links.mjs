import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const spellRoot = path.join(root, "wiki", "法術");
const itemRoot = path.join(root, "wiki", "魔法物品");

const spellTargets = new Set();
for (const relative of fs.readdirSync(spellRoot, { recursive: true })) {
  if (!relative.endsWith(".md")) continue;
  const target = relative.replaceAll("\\", "/").replace(/\.md$/, "");
  spellTargets.add(target);
  spellTargets.add(path.posix.basename(target));
}

const results = [];
for (const relative of fs.readdirSync(itemRoot, { recursive: true })) {
  if (!relative.endsWith(".md")) continue;
  const file = path.join(itemRoot, relative);
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const match of lines[index].matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
      let target = match[1].trim().replace(/^wiki\/法術\//, "");
      if (target.startsWith("法術/")) target = target.slice("法術/".length);
      if (!spellTargets.has(target)) continue;
      const context = lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 2)).join(" ");
      const castContext = /可施展法術|施展(?:下列|此|該|一道|法術)|可以透過此物品施展|施展\[\[/.test(context);
      const referenceContext = /解除方式|詛咒|類似魔法|成為.*目標/.test(context);
      results.push({ file: path.relative(root, file).replaceAll("\\", "/"), line: index + 1, target: match[1], castContext, referenceContext, text: lines[index].trim() });
    }
  }
}

const references = results.filter((result) => !result.castContext && result.referenceContext);
const uncertain = results.filter((result) => !result.castContext && !result.referenceContext);
console.log(`法術連結：${results.length} 處`);
console.log(`可施展法術語境：${results.filter((result) => result.castContext).length} 處`);
console.log(`其他法術引用：${references.length} 處`);
console.log(`需核對來源：${uncertain.length} 處`);
for (const result of uncertain) console.log(`${result.file}:${result.line} → ${result.target}\n  ${result.text}`);
