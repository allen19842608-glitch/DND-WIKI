import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = ROOT;
const spellRoot = path.join(root, "wiki", "法術");
const monsterRoot = path.join(root, "wiki", "怪物");
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const pending = [];

const spells = new Map();
for (const relative of fs.readdirSync(spellRoot, { recursive: true })) {
  if (!relative.endsWith(".md")) continue;
  const file = path.join(spellRoot, relative);
  const title = fs.readFileSync(file, "utf8").match(/^title:\s+"(.+?)"\s*$/m)?.[1];
  const matched = title?.match(/^(.+?)\s+\((.+)\)$/);
  if (!matched) continue;
  spells.set(`${matched[1]} ${matched[2]}`, { chinese: matched[1], english: matched[2], target: `wiki/法術/${relative.replaceAll("\\", "/").replace(/\.md$/, "")}` });
}

// 原始怪物資料偶爾有英文單複數或拼寫誤植；只收錄可無歧義對應既有法術頁的變體。
const aliases = new Map([
  ["反制法術 Counterspell", "法術反制 Counterspell"],
  ["動物交談 Speak with Animal", "動物交談 Speak with Animals"],
  ["療傷術 Cure Wound", "療傷術 Cure Wounds"],
  ["馬友夫強酸箭 Melf‘s Acid Arrow", "馬友夫強酸箭 Melf's Acid Arrow"],
  ["以太化 Etheralness", "以太化 Etherealness"],
  ["奇術 Thaumatutgy", "奇術 Thaumaturgy"],
  ["易容術 Disguise Seelf", "易容術 Disguise Self"],
  ["隱身術 Invisiblity", "隱形術 Invisibility"],
  ["隱形術 Invisiblity", "隱形術 Invisibility"],
  ["驅逐善惡 Dispel Evil or Good", "驅逐善惡 Dispel Evil and Good"],
  ["羽落術 Feather", "羽落術 Feather Fall"],
  ["黑暗 Darkness", "黑暗術 Darkness"],
  ["灼熱射線 Scorching", "灼熱射線 Scorching Ray"],
  ["偵測魔法 detect magic", "偵測魔法 Detect Magic"],
]);
const variants = new Map(spells);
for (const [alias, canonical] of aliases) {
  const spell = spells.get(canonical);
  if (spell) variants.set(alias, spell);
}
const labels = [...variants.keys()].sort((a, b) => b.length - a.length);

const results = { linked: 0, files: 0, unmatched: {} };
for (const relative of fs.readdirSync(monsterRoot, { recursive: true })) {
  if (!relative.endsWith(".md")) continue;
  const file = path.join(monsterRoot, relative);
  const before = fs.readFileSync(file, "utf8");
  let matches = 0;
  const after = before.replace(/_([^_\n]+?)_/g, (raw, inner, offset) => {
    let linkedInner = inner;
    let innerMatches = 0;
    for (const label of labels) {
      const spell = variants.get(label);
      if (!linkedInner.includes(label)) continue;
      // Obsidian aliases in a Markdown table must escape their pipe, otherwise
      // the rendered link changes the table's column count.
      const lineStart = before.lastIndexOf("\n", offset) + 1;
      const inTable = before.slice(lineStart, offset).trimStart().startsWith("|");
      const rendered = `[[${spell.target}${inTable ? "\\|" : "|"}${spell.chinese} (${spell.english})]]`;
      const occurrences = linkedInner.split(label).length - 1;
      linkedInner = linkedInner.replaceAll(label, rendered);
      matches += occurrences;
      innerMatches += occurrences;
    }
    if (!innerMatches) {
      const normalized = inner.replace(/\s+/g, " ").trim();
      if (/[A-Za-z]/.test(normalized) && /[\u3400-\u9fff]/.test(normalized)) {
        const key = normalized;
        results.unmatched[key] = (results.unmatched[key] ?? 0) + 1;
      }
      return raw;
    }
    return linkedInner;
  });
  if (!matches) continue;
  results.files += 1;
  results.linked += matches;
  pending.push(candidateChange({ destination: file, before, after, operation: "link", source: "wiki/法術", locator: path.relative(root, file) }));
}
const plan = planCandidateBatch(pending, { root, lint: lintWiki });
const report = { ...plan, spell_pages: spells.size, ...results, unmatched: Object.entries(results.unmatched).sort((a, b) => b[1] - a[1]) };
console.log(`法術頁：${report.spell_pages}`);
console.log(`可精確連結：${report.linked} 處／${report.files} 個怪物頁`);
console.log(`未比對雙語斜體片段：${report.unmatched.length}`);
for (const [term, count] of report.unmatched.slice(0, 20)) console.log(`  ${count}× ${term}`);
writeCandidatePlan(report, options.report, { root });
if (options.apply) applyCandidateBatch(plan, { root, lint: lintWiki });
