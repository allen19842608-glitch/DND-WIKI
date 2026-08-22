import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const rawRoot = path.join(root, "原始資料", "玩家手冊2024", "專長");
const wikiRoot = path.join(root, "wiki", "專長");
const groups = [
  { raw: "起源專長.md", wiki: "起源專長", index: "起源專長索引.md" },
  { raw: "通用專長.md", wiki: "通用專長", index: "通用專長索引.md" },
  { raw: "傳奇恩惠專長.md", wiki: "史詩恩賜專長", index: "史詩恩賜專長索引.md" },
];

function normalizeEnglish(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function englishTitle(text) {
  const title = text.match(/^title:\s+"(.+)"\s*$/m)?.[1];
  return title?.match(/\(([^()]*)\)$/)?.[1];
}

function sourceEntries(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/).flatMap((line, index) => {
    const bold = line.match(/^\*\*([^*]+)\*\*/)?.[1]?.replace(/[。.:：]+$/, "").trim();
    if (!bold) return [];
    const ascii = bold.search(/[A-Z]/);
    if (ascii < 0) return [];
    const english = bold.slice(ascii).replace(/[。.:：]+$/, "").trim();
    return [{ english, label: bold, line: index + 1 }];
  });
}

function addPrimarySource(file, source, locator) {
  const original = fs.readFileSync(file, "utf8");
  const bom = original.startsWith("\uFEFF") ? "\uFEFF" : "";
  let text = original.replace(/^\uFEFF/, "");
  if (text.includes(`file: "${source}"`)) return false;
  const block = `sources:\n  - file: "${source}"\n    locator: "${locator.replaceAll('"', '\\"')}"\n    authority: "官方"\n    translation: "community"`;
  if (!/^sources:\s*$/m.test(text)) throw new Error(`缺少 sources：${path.relative(root, file)}`);
  text = text.replace(/^sources:\s*$/m, block);
  if (apply) fs.writeFileSync(file, `${bom}${text}`, "utf8");
  return true;
}

let matched = 0;
let changed = 0;
for (const group of groups) {
  const rawFile = path.join(rawRoot, group.raw);
  const source = path.relative(root, rawFile).replaceAll("\\", "/");
  const entries = sourceEntries(rawFile);
  const byEnglish = new Map(entries.map((entry) => [normalizeEnglish(entry.english), entry]));
  const wikiDirectory = path.join(wikiRoot, group.wiki);
  const pages = fs.readdirSync(wikiDirectory)
    .filter((name) => name.endsWith(".md") && name !== group.index)
    .map((name) => path.join(wikiDirectory, name));
  for (const page of pages) {
    const english = englishTitle(fs.readFileSync(page, "utf8").replace(/^\uFEFF/, ""));
    const entry = english ? byEnglish.get(normalizeEnglish(english)) : undefined;
    if (!entry) throw new Error(`來源找不到對應專長：${path.relative(root, page)} (${english ?? "無英文標題"})`);
    matched += 1;
    if (addPrimarySource(page, source, `L${entry.line} 專長：${entry.label}`)) changed += 1;
  }
  const indexFile = path.join(wikiDirectory, group.index);
  if (addPrimarySource(indexFile, source, `L1 標題：${path.basename(group.raw, ".md")}`)) changed += 1;
}

console.log(`${apply ? "已補入" : "預覽"}專長來源：對應 ${matched} 個專長頁；異動 ${changed} 個檔案。`);
