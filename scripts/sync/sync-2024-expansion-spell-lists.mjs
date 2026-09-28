import fs from "node:fs";
import path from "node:path";
import {
  ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const spellsRoot = path.join(ROOT, "wiki", "法術");
const classFiles = new Map([
  ["吟遊詩人", "wiki/職業/吟遊詩人.md"], ["牧師", "wiki/職業/牧師.md"], ["聖騎士", "wiki/職業/聖騎士.md"],
  ["德魯伊", "wiki/職業/德魯伊.md"], ["遊俠", "wiki/職業/遊俠.md"], ["術士", "wiki/職業/術士.md"],
  ["契術師", "wiki/職業/契術師.md"], ["法師", "wiki/職業/法師.md"], ["奇械師", "wiki/職業/奇械師.md"],
]);
const englishNames = { 吟遊詩人: "Bard", 牧師: "Cleric", 聖騎士: "Paladin", 德魯伊: "Druid", 遊俠: "Ranger", 術士: "Sorcerer", 契術師: "Warlock", 法師: "Wizard", 奇械師: "Artificer" };
const chineseLevel = { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九" };
const englishName = (title) => title.match(/\(([^()]+)\)$/)?.[1] ?? title;
const field = (body, label) => body.match(new RegExp(`^- \\*\\*${label}\\*\\*：(.+)$`, "m"))?.[1]?.trim() ?? "";
const publicationCode = (body) => body.includes("原始資料/被遺忘的國度：費倫英雄") ? "FRHOF2025" : "EBER2025";
const classLinks = (classes) => classes.map((name) => `[[${name}|${name} (${englishNames[name]})]]`).join("");

function updateClassTable(body, className, spell) {
  const headers = [`#### ${spell.level} 環${className}法術`, `### ${chineseLevel[spell.level]}環${className}法術`];
  const header = headers.find((item) => body.includes(item));
  const start = header ? body.indexOf(header) : -1;
  if (start < 0) return body;
  const next = body.slice(start + header.length).search(/\n#{3,4} /);
  const sectionEnd = next < 0 ? body.length : start + header.length + next;
  const section = body.slice(start, sectionEnd);
  const lines = section.split("\n");
  const tableStart = lines.findIndex((line) => line === "| 法術 | 學派 | 特殊 |");
  if (tableStart < 0) return body;
  let tableEnd = tableStart + 2;
  while (tableEnd < lines.length && lines[tableEnd].startsWith("|")) tableEnd += 1;
  const target = spell.title.split(" (")[0];
  const row = `| [[${target}\\|${spell.title}]]（${spell.publication}） | ${spell.school} | ${spell.special} |`;
  const existing = lines.findIndex((line, index) => index >= tableStart + 2 && index < tableEnd && line.includes(`[[${target}\\|`));
  if (existing >= 0) {
    if (lines[existing] === row) return body;
    lines[existing] = row;
  } else {
    const rows = [...lines.slice(tableStart + 2, tableEnd), row].sort((a, b) => englishName(a.match(/\| \[\[[^|]+\\\|([^\]]+)\]\]/)?.[1] ?? a).localeCompare(englishName(b.match(/\| \[\[[^|]+\\\|([^\]]+)\]\]/)?.[1] ?? b), "en"));
    lines.splice(tableStart + 2, tableEnd - (tableStart + 2), ...rows);
  }
  return `${body.slice(0, start)}${lines.join("\n")}${body.slice(sectionEnd)}`;
}

const pending = new Map();
const additions = [];
for (const relative of fs.readdirSync(spellsRoot, { recursive: true }).filter((item) => typeof item === "string" && item.endsWith(".md"))) {
  const file = path.join(spellsRoot, relative);
  const before = fs.readFileSync(file, "utf8");
  if (!before.includes('version: "2024-Core"') || !/(被遺忘的國度：費倫英雄|艾伯倫：奇械鍛爐)/.test(before)) continue;
  const title = before.match(/^# (.+)$/m)?.[1]; const level = field(before, "環階").match(/^(\d+) 環$/)?.[1]; const school = field(before, "學派");
  const listed = field(before, "施法職業"); const classes = [...classFiles.keys()].filter((name) => listed.includes(name));
  if (!title || !level || !school || !classes.length) continue;
  const special = [field(before, "專注 \\(Concentration\\)") === "是" ? "C" : "", field(before, "儀式 \\(Ritual\\)") === "是" ? "R" : "", field(before, "法術成分 \\(Components\\)").includes("M") ? "M" : ""].filter(Boolean).join(",") || "—";
  const after = before.replace(/^- \\*\\*施法職業\\*\\*：.+$/m, `- **施法職業**：${classLinks(classes)}`);
  if (after !== before) pending.set(file, { before, after, source: relative, locator: "施法職業" });
  additions.push({ title, english: englishName(title), level, school, special, classes, publication: publicationCode(before) });
}
for (const [className, relative] of classFiles) {
  const file = path.join(ROOT, relative);
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  for (const spell of additions.filter((item) => item.classes.includes(className))) after = updateClassTable(after, className, spell);
  if (after !== before) pending.set(file, { before, after, source: "wiki/法術", locator: `${className} 法術表` });
}
const changes = [...pending.entries()].map(([destination, change]) => candidateChange({ destination, ...change, operation: "link" }));
const plan = planCandidateBatch(changes, { root: ROOT, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
console.log(`${options.apply ? "已套用" : "預覽"} 2024 擴充法術：${additions.length} 頁；候選 ${changes.length} 個檔案。`);
