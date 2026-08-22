import fs from "node:fs";
import path from "node:path";
import { ROOT, parseOptions } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const spellsRoot = path.join(ROOT, "wiki", "法術");
const classFiles = new Map([
  ["吟遊詩人", "wiki/職業/吟遊詩人.md"], ["牧師", "wiki/職業/牧師.md"], ["聖騎士", "wiki/職業/聖騎士.md"],
  ["德魯伊", "wiki/職業/德魯伊.md"], ["遊俠", "wiki/職業/遊俠.md"], ["術士", "wiki/職業/術士.md"],
  ["契術師", "wiki/職業/契術師.md"], ["法師", "wiki/職業/法師.md"], ["奇械師", "wiki/職業/奇械師.md"],
]);
const englishName = (title) => title.match(/\(([^()]+)\)$/)?.[1] ?? title;
const chineseLevel = { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九" };
const field = (body, label) => body.match(new RegExp(`^- \\*\\*${label}\\*\\*：(.+)$`, "m"))?.[1]?.trim() ?? "";
const publicationCode = (body) => body.includes("原始資料/被遺忘的國度：費倫英雄") ? "FRHOF2025" : "EBER2025";
const classLinks = (classes) => classes.map((name) => `[[${name}|${name} (${({ 吟遊詩人: "Bard", 牧師: "Cleric", 聖騎士: "Paladin", 德魯伊: "Druid", 遊俠: "Ranger", 術士: "Sorcerer", 契術師: "Warlock", 法師: "Wizard", 奇械師: "Artificer" })[name]})]]`).join("");
const spellFiles = fs.readdirSync(spellsRoot, { recursive: true }).filter((item) => typeof item === "string" && item.endsWith(".md"));
const additions = [];
for (const relative of spellFiles) {
  const file = path.join(spellsRoot, relative); const body = fs.readFileSync(file, "utf8");
  if (!body.includes('version: "2024-Core"') || !/(被遺忘的國度：費倫英雄|艾伯倫：奇械鍛爐)/.test(body)) continue;
  const title = body.match(/^# (.+)$/m)?.[1]; const level = field(body, "環階").match(/^(\d+) 環$/)?.[1]; const school = field(body, "學派");
  const listed = field(body, "施法職業"); const classes = [...classFiles.keys()].filter((name) => listed.includes(name));
  if (!title || !level || !school || !classes.length) continue;
  const special = [field(body, "專注 \(Concentration\)") === "是" ? "C" : "", field(body, "儀式 \(Ritual\)") === "是" ? "R" : "", field(body, "法術成分 \(Components\)").includes("M") ? "M" : ""].filter(Boolean).join(",") || "—";
  const normalized = body.replace(/^- \*\*施法職業\*\*：.+$/m, `- **施法職業**：${classLinks(classes)}`);
  if (normalized !== body && options.apply) fs.writeFileSync(file, normalized, "utf8");
  additions.push({ title, english: englishName(title), level, school, special, classes, publication: publicationCode(body) });
}
for (const [className, relative] of classFiles) {
  const file = path.join(ROOT, relative); let body = fs.readFileSync(file, "utf8"); let changed = false;
  for (const spell of additions.filter((item) => item.classes.includes(className))) {
    const headers = [`#### ${spell.level} 環${className}法術`, `### ${chineseLevel[spell.level]}環${className}法術`];
    const header = headers.find((item) => body.includes(item)); const start = header ? body.indexOf(header) : -1; if (start < 0) continue;
    const next = body.slice(start + header.length).search(/\n#{3,4} /);
    const sectionEnd = next < 0 ? body.length : start + header.length + next;
    const section = body.slice(start, sectionEnd);
    const lines = section.split("\n"); const tableStart = lines.findIndex((line) => line === "| 法術 | 學派 | 特殊 |");
    if (tableStart < 0) continue;
    let tableEnd = tableStart + 2; while (tableEnd < lines.length && lines[tableEnd].startsWith("|")) tableEnd++;
    const target = spell.title.split(" (")[0];
    const row = `| [[${target}\\|${spell.title}]]（${spell.publication}） | ${spell.school} | ${spell.special} |`;
    const existing = lines.findIndex((line, index) => index >= tableStart + 2 && index < tableEnd && line.includes(`[[${target}\\|`));
    if (existing >= 0) {
      if (lines[existing] === row) continue;
      lines[existing] = row;
      body = `${body.slice(0, start)}${lines.join("\n")}${body.slice(sectionEnd)}`; changed = true;
      continue;
    }
    const rows = [...lines.slice(tableStart + 2, tableEnd), row].sort((a, b) => englishName(a.match(/\| \[\[[^|]+\\\|([^\]]+)\]\]/)?.[1] ?? a).localeCompare(englishName(b.match(/\| \[\[[^|]+\\\|([^\]]+)\]\]/)?.[1] ?? b), "en"));
    lines.splice(tableStart + 2, tableEnd - (tableStart + 2), ...rows);
    body = `${body.slice(0, start)}${lines.join("\n")}${body.slice(sectionEnd)}`; changed = true;
  }
  if (changed && options.apply) fs.writeFileSync(file, body, "utf8");
  console.log(`${changed ? "已同步" : "無變更"}：${relative}`);
}
console.log(`2024 擴充法術：${additions.length} 頁。`);
