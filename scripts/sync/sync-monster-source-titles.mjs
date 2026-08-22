import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const wikiRoot = path.join(root, "wiki", "怪物");
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

function sourceCardTitle(source) {
  const lines = fs.readFileSync(path.join(root, source), "utf8").split(/\r?\n/);
  const ac = lines.findIndex((line) => /^\*\*AC\*\*/.test(line));
  if (ac < 0) return undefined;
  for (let index = ac - 1; index >= 0; index -= 1) {
    const match = lines[index].match(/^#{1,5}\s+(.+)$/);
    if (match) return match[1].trim();
  }
  return undefined;
}

function wikiTitle(sourceTitle) {
  const match = sourceTitle.match(/^(?<chinese>.*?)(?<english>[A-Za-z][A-Za-z0-9'’()\- ]*)$/);
  if (!match) return undefined;
  return `${match.groups.chinese.trim()} (${match.groups.english.trim()})`;
}

let changedCards = 0;
let changedIntroductions = 0;
for (const relative of fs.readdirSync(wikiRoot, { recursive: true }).filter((file) => file.endsWith(".md"))) {
  const file = path.join(wikiRoot, relative);
  let raw = fs.readFileSync(file, "utf8");
  const source = raw.match(/^\s*- file:\s*"(.+?)"\s*$/m)?.[1];
  if (!source?.startsWith("原始資料/怪物圖鑑2025/")) continue;

  if (/^\*\*AC\*\*/m.test(raw)) {
    if (!fs.existsSync(path.join(root, source))) continue;
    const title = sourceCardTitle(source);
    const replacement = title && wikiTitle(title);
    if (!replacement) continue;
    const oldTitle = raw.match(/^title:\s*"(.+?)"\s*$/m)?.[1];
    if (oldTitle === replacement) continue;
    raw = raw.replace(/^title:\s*".+?"\s*$/m, `title: "${replacement}"`)
      .replace(/^#\s+.+$/m, `# ${replacement}`)
      .replace(/^updated:\s*".+?"\s*$/m, `updated: "${updated}"`);
    fs.writeFileSync(file, raw);
    changedCards += 1;
    continue;
  }

  if (!relative.startsWith(`介紹${path.sep}`) || !source.endsWith("總.md")) continue;
  const replacement = source.replace(/總\.md$/, "介紹.md");
  if (!fs.existsSync(path.join(root, replacement))) continue;
  raw = raw.replace(source, replacement).replace(/^updated:\s*".+?"\s*$/m, `updated: "${updated}"`);
  fs.writeFileSync(file, raw);
  changedIntroductions += 1;
}
console.log(`已同步資料卡標題 ${changedCards} 筆；介紹頁來源 ${changedIntroductions} 筆。`);
