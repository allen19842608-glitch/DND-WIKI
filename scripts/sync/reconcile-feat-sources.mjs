import fs from "node:fs";
import path from "node:path";
import {
  ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const root = ROOT;
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const rawRoot = path.join(root, "原始資料", "玩家手冊2024", "專長");
const wikiRoot = path.join(root, "wiki", "專長");
const groups = [
  { raw: "起源專長.md", wiki: "起源專長", index: "起源專長索引.md" },
  { raw: "通用專長.md", wiki: "通用專長", index: "通用專長索引.md" },
  { raw: "傳奇恩惠專長.md", wiki: "史詩恩賜專長", index: "史詩恩賜專長索引.md" },
];

function normalizeEnglish(value) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function englishTitle(text) { return text.match(/^title:\s+"(.+)"\s*$/m)?.[1]?.match(/\(([^()]*)\)$/)?.[1]; }
function sourceEntries(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/).flatMap((line, index) => {
    const bold = line.match(/^\*\*([^*]+)\*\*/)?.[1]?.replace(/[。.:：]+$/, "").trim();
    if (!bold) return [];
    const ascii = bold.search(/[A-Z]/);
    if (ascii < 0) return [];
    return [{ english: bold.slice(ascii).replace(/[。.:：]+$/, "").trim(), label: bold, line: index + 1 }];
  });
}

function withPrimarySource(file, original, source, locator) {
  const bom = original.startsWith("\uFEFF") ? "\uFEFF" : "";
  const text = original.replace(/^\uFEFF/, "");
  if (text.includes(`file: "${source}"`)) return null;
  if (!/^sources:\s*$/m.test(text)) throw new Error(`缺少 sources：${path.relative(root, file)}`);
  const block = `sources:\n  - file: "${source}"\n    locator: "${locator.replaceAll('"', '\\"')}"\n    authority: "官方"\n    translation: "community"`;
  return `${bom}${text.replace(/^sources:\s*$/m, block)}`;
}

let matched = 0;
const pending = [];
for (const group of groups) {
  const rawFile = path.join(rawRoot, group.raw);
  const source = path.relative(root, rawFile).replaceAll("\\", "/");
  const byEnglish = new Map(sourceEntries(rawFile).map((entry) => [normalizeEnglish(entry.english), entry]));
  const wikiDirectory = path.join(wikiRoot, group.wiki);
  const pages = fs.readdirSync(wikiDirectory).filter((name) => name.endsWith(".md") && name !== group.index).map((name) => path.join(wikiDirectory, name));
  for (const page of pages) {
    const before = fs.readFileSync(page, "utf8");
    const english = englishTitle(before.replace(/^\uFEFF/, ""));
    const entry = english ? byEnglish.get(normalizeEnglish(english)) : undefined;
    if (!entry) {
      pending.push(candidateChange({
        destination: page, before, after: before, operation: "unchanged", status: "manual_review",
        review: [`玩家手冊 2024 的 ${group.raw} 找不到英文標題 ${english ?? "（無英文標題）"}；保留既有來源，請人工確認該頁所屬出版品。`],
      }));
      continue;
    }
    matched += 1;
    const after = withPrimarySource(page, before, source, `L${entry.line} 專長：${entry.label}`);
    if (after) pending.push(candidateChange({ destination: page, before, after, operation: "update", source, locator: `L${entry.line}` }));
  }
  const indexFile = path.join(wikiDirectory, group.index);
  const before = fs.readFileSync(indexFile, "utf8");
  const after = withPrimarySource(indexFile, before, source, `L1 標題：${path.basename(group.raw, ".md")}`);
  if (after) pending.push(candidateChange({ destination: indexFile, before, after, operation: "update", source, locator: "L1" }));
}
const plan = planCandidateBatch(pending, { root, lint: lintWiki });
writeCandidatePlan(plan, options.report, { root });
if (options.apply) applyCandidateBatch(plan, { root, lint: lintWiki });
console.log(`${options.apply ? "已套用" : "預覽"}專長來源：對應 ${matched} 個專長頁；候選 ${pending.length} 個檔案。`);
