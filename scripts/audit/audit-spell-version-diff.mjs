import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../core/ingest-publication-utils.mjs";

const sourceDirectories = {
  "2014": path.join(ROOT, "原始資料", "玩家手冊2014", "魔法", "法術詳述"),
  "2024": path.join(ROOT, "原始資料", "玩家手冊2024", "法術詳述"),
};

function parseDirectory(directory) {
  const spells = [];
  for (const file of fs.readdirSync(directory).filter((name) => /^(戲法|\d+環)\.md$/.test(name))) {
    const lines = fs.readFileSync(path.join(directory, file), "utf8").split(/\r?\n/);
    const headings = lines.flatMap((line, index) => {
      const match = line.match(/^####\s+(.+?)[｜|]\s*([A-Za-z][A-Za-z '\-]+)/);
      return match ? [{ index, chinese: match[1].trim(), english: match[2].trim() }] : [];
    });
    for (const [position, heading] of headings.entries()) {
      const end = headings[position + 1]?.index ?? lines.length;
      spells.push({
        ...heading,
        file,
        locator: `#${heading.english.replaceAll(" ", "_").replaceAll("'", "")}`,
        text: lines.slice(heading.index + 1, end).filter((line) => line.trim()).join("\n"),
      });
    }
  }
  return spells;
}

// 只忽略排版差異；詞彙、數字、標點以外的文字均保留，以免把規則改動誤判為相同。
function normalize(value) {
  return value
    .normalize("NFKC")
    .replace(/^_[\s\S]*?_$\n?/gm, (line) => line.replace(/_/g, ""))
    .replace(/\*\*/g, "")
    .replace(/>\s*/g, "")
    .replace(/\s+/g, "")
    .replace(/[，、。；：！？「」『』（）()]/g, "")
    .toLocaleLowerCase("en-US");
}

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

const legacy = parseDirectory(sourceDirectories["2014"]);
const current = parseDirectory(sourceDirectories["2024"]);
const currentByEnglish = new Map(current.map((spell) => [spell.english, spell]));
const rows = legacy.map((oldSpell) => {
  const newSpell = currentByEnglish.get(oldSpell.english);
  if (!newSpell) return { status: "僅 2014", oldSpell, newSpell: null };
  return {
    status: normalize(oldSpell.text) === normalize(newSpell.text) ? "文字一致" : "需逐條規則比對",
    oldSpell,
    newSpell,
  };
});

const grouped = Object.groupBy(rows, (row) => row.status);
for (const [status, items] of Object.entries(grouped)) console.log(`${status}：${items.length}`);
console.log(`2014 總數：${legacy.length}`);
console.log(`2024 總數：${current.length}`);

if (process.argv.includes("--report")) {
  const report = [
    "# 玩家手冊法術 2014／2024 嚴格比對報告",
    "",
    "> 比對只忽略 Markdown 排版與標點；任何詞彙、數字、施法資料或效果文字差異均列為「需逐條規則比對」，不會自動視為相同。",
    "",
    "| 結果 | 項目數 |",
    "| :--- | ---: |",
    ...Object.entries(grouped).map(([status, items]) => `| ${status} | ${items.length} |`),
    "",
    "## 明細",
    "",
    ...rows.map((row) => {
      const currentSource = row.newSpell ? `；2024：${row.newSpell.file} ${row.newSpell.locator}` : "";
      return `- **${row.status}**：${row.oldSpell.chinese} (${row.oldSpell.english})；2014：${row.oldSpell.file} ${row.oldSpell.locator}${currentSource}`;
    }),
    "",
  ].join("\n");
  const reportPath = path.join(ROOT, "reports", "玩家手冊法術2014-2024嚴格比對.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, "utf8");
  console.log(`報告：${path.relative(ROOT, reportPath)}`);
}

if (process.argv.includes("--examples")) {
  const example = rows.find((row) => row.status === "需逐條規則比對");
  if (example) {
    console.log(`\n2014 ${example.oldSpell.english}\n${compact(example.oldSpell.text)}`);
    console.log(`\n2024 ${example.newSpell.english}\n${compact(example.newSpell.text)}`);
  }
}

const selectedIndex = process.argv.indexOf("--fields");
if (selectedIndex >= 0) {
  const selected = process.argv[selectedIndex + 1]?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  const detail = (spell) => {
    if (!spell) return "未收錄";
    const lines = spell.text.split("\n");
    const meta = lines.find((line) => /環|戲法/.test(line) && /[（(]/.test(line))?.replaceAll("_", "").trim() ?? "無施法資料列";
    const fields = ["施法時間", "施法距離", "法術成分", "持續時間"]
      .map((name) => lines.find((line) => line.includes(name))?.replace(/\*\*/g, "").trim() ?? "")
      .filter(Boolean)
      .join("；");
    return `${spell.file} ${meta}；${fields}`;
  };
  for (const english of selected) {
    const oldSpell = legacy.find((spell) => spell.english === english);
    const newSpell = currentByEnglish.get(english);
    console.log(`\n${english}\n2014 ${detail(oldSpell)}\n2024 ${detail(newSpell)}`);
  }
}

const textIndex = process.argv.indexOf("--text");
if (textIndex >= 0) {
  const selected = process.argv[textIndex + 1]?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  for (const english of selected) {
    const oldSpell = legacy.find((spell) => spell.english === english);
    const newSpell = currentByEnglish.get(english);
    console.log(`\n===== ${english}｜2014 =====\n${oldSpell?.text ?? "未收錄"}`);
    console.log(`\n===== ${english}｜2024 =====\n${newSpell?.text ?? "未收錄"}`);
  }
}
