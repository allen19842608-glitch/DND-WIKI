import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, parseOptions } from "../core/ingest-publication-utils.mjs";
import { readWikiPages, isNavigationPage, writeReport } from "../core/wiki-records.mjs";

const INTRO = {
  世界觀: ["世界概貌"], 歷史: ["時間與地點"], 事件: ["時間與地點"],
  神祇與信仰: ["神職與象徵"], 地理: ["所屬區域與地點性質"],
  人物: ["身分"], 組織與派系: ["宗旨與活動範圍"], 文化與族群: ["分布"],
};
function content(text) {
  return text.replace(/<!--[^]*?-->/g, "").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2$1").replace(/[\s*_`#|>-]/g, "");
}
export function assessLorePage(page) {
  const data = page.data ?? {};
  if (data.category !== "戰役設定" || isNavigationPage(page)) return null;
  const sections = [...page.body.matchAll(/^##\s+(.+?)\r?\n([\s\S]*?)(?=^##\s|(?![\s\S]))/gm)];
  const narrative = sections.filter(match => !/來源|版本|相關連結|引用/.test(match[1]));
  const accepted = [...(INTRO[data.lore_type] ?? []), "概覽", "適用情境", "如何使用", "導覽與使用", "使用指引"];
  const chars = content(narrative.map(match => match[2]).join("\n")).length;
  const issues = [], hints = [];
  if (!chars) issues.push("無可查閱正文");
  // 篇幅與段落名稱只供人工判讀，不能由字數或模板差異核定完整性。
  if (chars && chars < 180) hints.push(`正文精簡（${chars} 字元），請按來源判斷是否足夠`);
  if (!sections.some(match => accepted.includes(match[1].trim()))) hints.push("未使用類型模板的入門段落，請人工檢視閱讀順序");
  if (/\{\{[^}]+\}\}/.test(page.body)) issues.push("正文仍有模板占位符");
  return { page: page.file, setting: data.setting ?? "戰役創作", title: data.title, lore_type: data.lore_type, issues, hints };
}
export function auditLoreQuality({ root = ROOT, reportPath = null } = {}) {
  const records = readWikiPages(root).filter(page => page.file.startsWith("wiki/戰役設定/")).map(assessLorePage).filter(Boolean);
  const review = records.filter(record => record.issues.length), hints = records.filter(record => record.hints.length);
  const bySetting = {};
  for (const record of review) (bySetting[record.setting] ??= []).push(record);
  const report = { schema_version: 2, generated_at: new Date().toISOString(), scope: "戰役設定正文（排除索引與精選導覽）", summary: { pages: records.length, review: review.length, hints: hints.length, by_setting: bySetting }, review, hints };
  if (reportPath) {
    writeReport(root, reportPath, report);
    writeReport(root, reportPath.replace(/\.json$/u, ".md"), `# 戰役設定內容品質覆核\n\n產生時間：${report.generated_at}\n\n${report.scope}：${records.length} 頁；結構問題 ${review.length} 頁；人工提示 ${hints.length} 頁。字數不判定完整性；通過不代表來源或全文已核實。\n\n## 結構問題\n\n${review.map(r => `- ${r.page}：${r.issues.join("、")}`).join("\n") || "無。"}\n\n## 人工提示\n\n${hints.map(r => `- ${r.page}：${r.hints.join("、")}`).join("\n") || "無。"}\n`);
  }
  console.log(`戰役設定正文：${records.length} 頁；結構問題 ${review.length}；人工提示 ${hints.length}`);
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseOptions();
  if (options.apply) throw new Error("戰役設定內容品質稽核為唯讀；請使用 --report reports/<name>.json。 ");
  auditLoreQuality({ reportPath: options.report });
}
