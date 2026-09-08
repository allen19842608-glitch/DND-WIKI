import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : entry.name.endsWith(".md") ? [file] : [];
  });
}
function content(section = "") {
  return section.replace(/<!--[^]*?-->/g, "").replace(/\[\[[^\]]+\]\]/g, "").replace(/[\s*_`#|>-]/g, "");
}
function sections(text) {
  const out = new Map();
  for (const match of text.matchAll(/^##\s+(.+?)\r?\n([\s\S]*?)(?=^##\s|(?![\s\S]))/gm)) out.set(match[1].trim(), match[2]);
  return out;
}
export function auditLoreQuality({ apply = false } = {}) {
  const records = walk(path.join(ROOT, "wiki", "戰役設定")).flatMap(file => {
    const text = fs.readFileSync(file, "utf8");
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) return [];
    const data = YAML.parse(match[1]);
    if (data.category !== "戰役設定" || data.lore_type === "索引") return [];
    const s = sections(text);
    const overview = content(s.get("概覽") ?? s.get("適用情境") ?? "");
    const narrativeSections = [...s.entries()]
      .filter(([heading]) => !["概覽", "適用情境", "來源差異與不確定性", "🔗 相關連結"].includes(heading))
      .map(([, section]) => section)
      .join("\n");
    const details = content(narrativeSections);
    // 正式章節入口可用「如何使用／導覽與使用」交代閱讀路徑；它們不應被迫
    // 重複各子頁內容，但仍須保有足夠的可查閱說明。
    const hasNavigationGuidance = ["如何使用", "導覽與使用", "使用指引"].some(heading => s.has(heading));
    const minimumDetails = hasNavigationGuidance ? 100 : 180;
    const issues = [];
    // 導覽與地理條目的摘要可能很精煉；少於一個完整短句才視為不足。
    if (overview.length < 40) issues.push("摘要不足");
    if (details.length < minimumDetails) issues.push("可查閱內容不足");
    if (/^.{0,80}(?:（來源：[^)]*）)?$/u.test((s.get("概覽") ?? "").trim()) && /(?:^|\n)-?\s*(?:——|「|「?費資本)/u.test(narrativeSections)) issues.push("引言取代摘要");
    return [{ page: path.relative(ROOT, file).replaceAll("\\", "/"), setting: data.setting ?? "戰役創作", title: data.title, issues }];
  });
  const review = records.filter(record => record.issues.length);
  const report = { schema_version: 1, summary: { pages: records.length, review: review.length, by_setting: Object.groupBy(review, r => r.setting) }, review };
  if (apply) {
    fs.writeFileSync(path.join(ROOT, "reports", "lore-quality-current.json"), `${JSON.stringify(report, null, 2)}\n`);
    const markdown = `# 戰役設定內容品質覆核\n\n共 ${records.length} 頁；${review.length} 頁需內容覆核。此報告只判斷可查閱性，不判斷來源正確性。\n\n${review.map(r => `- ${r.page}：${r.issues.join("、")}`).join("\n")}\n`;
    fs.writeFileSync(path.join(ROOT, "reports", "lore-quality-current.md"), markdown);
  }
  console.log(`戰役設定內容品質：${records.length} 頁；待覆核 ${review.length} 頁`);
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) auditLoreQuality({ apply: process.argv.includes("--apply") });
