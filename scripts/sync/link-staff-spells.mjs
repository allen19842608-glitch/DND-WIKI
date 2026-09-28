import fs from "node:fs";
import path from "node:path";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = ROOT;
const spellRoot = path.join(root, "wiki", "法術");
const staffRoot = path.join(root, "wiki", "魔法物品", "法杖");
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const spells = new Map();
const pending = [];

for (const relative of fs.readdirSync(spellRoot, { recursive: true })) {
  if (!relative.endsWith(".md")) continue;
  const title = fs.readFileSync(path.join(spellRoot, relative), "utf8").match(/^title:\s+"(.+?)"\s*$/m)?.[1];
  const matched = title?.match(/^(.+?)\s+\((.+)\)$/);
  if (!matched) continue;
  spells.set(`${matched[1]} ${matched[2]}`, { chinese: matched[1], english: matched[2], target: `wiki/法術/${relative.replaceAll("\\", "/").replace(/\.md$/, "")}` });
}
// 原始資料偶有英文單複數誤植；別名僅用於辨識，顯示一律採法術頁的正式標題。
const aliases = new Map([
  ["燃燒之手 Burning Hand", "燃燒之手 Burning Hands"],
]);
for (const [alias, canonical] of aliases) {
  const spell = spells.get(canonical);
  if (spell) spells.set(alias, spell);
}
const labels = [...spells.keys()].sort((a, b) => b.length - a.length);
let linked = 0;
const files = [];
for (const name of fs.readdirSync(staffRoot)) {
  if (!name.endsWith(".md") || name.endsWith("索引.md")) continue;
  const file = path.join(staffRoot, name);
  const before = fs.readFileSync(file, "utf8");
  let count = 0;
  const after = before.split(/(\r?\n)/).map((line) => {
    if (!/^\|/.test(line) && !line.includes("施展_")) return line;
    const inTable = /^\|/.test(line);
    for (const label of labels) {
      const spell = spells.get(label);
      const raw = `_${label}_`;
      if (!line.includes(raw)) continue;
      const rendered = `[[${spell.target}${inTable ? "\\|" : "|"}${spell.chinese} (${spell.english})]]`;
      const occurrences = line.split(raw).length - 1;
      line = line.replaceAll(raw, rendered);
      count += occurrences;
    }
    return line;
  }).join("");
  if (!count) continue;
  linked += count;
  files.push(name);
  pending.push(candidateChange({ destination: file, before, after, operation: "link", source: "wiki/法術", locator: path.relative(root, file) }));
}
const plan = planCandidateBatch(pending, { root, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root });
if (options.apply) applyCandidateBatch(plan, { root, lint: lintWiki });
console.log(`${options.apply ? "已補上" : "可補上"} ${linked} 處法杖施展法術連結／${files.length} 個條目。`);
for (const name of files) console.log(`- ${name}`);
