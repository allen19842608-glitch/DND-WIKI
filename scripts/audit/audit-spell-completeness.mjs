import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../core/ingest-publication-utils.mjs";
import { readWikiPages, isNavigationPage, englishTitle, writeReport } from "../core/wiki-records.mjs";
import { hasScalingText, sourceText } from "../core/spell-content.mjs";

export const SPELL_DATASET = "原始資料/外部來源鏡像/PHB2024/datasets/spells-xphb.json";

export function assessSpell(spell, page) {
  const findings = [];
  const add = (code, severity, reason, locator) => findings.push({ code, severity, reason, locator });
  const locator = `Player's Handbook (2024), p. ${spell.page}：spell:${spell.name}`;
  if (!page) return { name: spell.name, status: "missing", findings: [{ code: "PAGE_MISSING", severity: "warning", reason: "缺少對應 2024 法術正文頁", locator }] };
  // 排除來源清單與版本／裁量段落，避免把舊版升環說明誤認為本版規則。
  const body = page.body.replace(/^##\s+[^\n]*(?:版本|2014|來源|裁量|相關連結)[^\n]*\n[\s\S]*?(?=^##\s|(?![\s\S]))/gm, "");
  if (sourceText(spell.entriesHigherLevel).trim() && !hasScalingText(body)) {
    add("SCALING_REVIEW", "warning", "來源有升環效果，正文未辨識到升環說明；需核對是否已整合於其他句子", `${locator} > entriesHigherLevel`);
  }
  if (!/效果|法術效果|規則條文/.test(body)) add("EFFECT_REVIEW", "warning", "未辨識到法術效果區塊", `${locator} > entries`);
  const citations = (page.data.sources ?? []).filter(s => /\/PHB2024\//.test(s.file ?? "") && s.translation === "none");
  if (!citations.some(s => s.file === SPELL_DATASET)) add("DATASET_CITATION_REVIEW", "warning", "尚未引用含正文的法術資料集；書本 statblock 指標不代表規則正文", locator);
  for (const citation of citations) {
    const pageNumber = citation.locator?.match(/\bp\.\s*(\d+)/i)?.[1];
    if (pageNumber && Number(pageNumber) !== spell.page) add("PAGE_LOCATOR_REVIEW", "warning", `引用頁碼 ${pageNumber} 與資料集頁碼 ${spell.page} 不一致，需確認是否為其他適用段落`, locator);
  }
  const source = sourceText(spell.entries);
  if (/\b(?:can(?:not|'t)|must|only|unless|except|doesn't|can't)\b/i.test(source)) {
    add("LIMITATIONS_MANUAL_REVIEW", "review", "核對目標資格、例外、觸發與結束條件；中文摘要的語意涵蓋需人工判斷", `${locator} > entries`);
  }
  if ((spell.entries?.length ?? 0) > 1) add("ADDITIONAL_EFFECTS_MANUAL_REVIEW", "review", "來源有多段／子項，需逐段核對額外效果，不以字數或段落數自動判定缺漏", `${locator} > entries`);
  return { name: spell.name, page: page.file, status: findings.some(f => f.severity === "warning") ? "review" : findings.length ? "manual_review" : "no_mechanical_findings", source_file: SPELL_DATASET, locator, findings };
}

export function auditSpellCompleteness({ root = ROOT, report = false } = {}) {
  const dataset = path.join(root, SPELL_DATASET);
  const pages = readWikiPages(root).filter(p => p.data?.category === "法術" && p.data.ruleset === "2024" && !isNavigationPage(p));
  const blocked = !fs.existsSync(dataset);
  const spells = blocked ? [] : JSON.parse(fs.readFileSync(dataset, "utf8")).spell.filter(s => s.source === "XPHB");
  const entries = spells.map(spell => {
    const matches = pages.filter(p => englishTitle(p.data.title).toLowerCase() === spell.name.toLowerCase());
    if (matches.length > 1) return { name: spell.name, status: "ambiguous", candidates: matches.map(p => p.file), findings: [] };
    return assessSpell(spell, matches[0]);
  });
  const result = { schema_version: 1, generated_at: new Date().toISOString(), publication: "PHB2024", scope: "2024 法術；含 confirmed 頁", source_status: blocked ? "source-unavailable" : "available", entries,
    summary: { total: entries.length, missing: entries.filter(e => e.status === "missing").length, ambiguous: entries.filter(e => e.status === "ambiguous").length, review: entries.filter(e => e.status === "review").length, manual_review: entries.filter(e => e.status === "manual_review").length, no_mechanical_findings: entries.filter(e => e.status === "no_mechanical_findings").length } };
  if (report) {
    writeReport(root, "reports/spell-completeness-PHB2024.json", result);
    writeReport(root, "reports/spell-completeness-PHB2024.md", `# PHB2024 法術完整性覆核\n\n範圍：${result.scope}\n\n產生時間：${result.generated_at}\n\n來源狀態：${result.source_status}\n\n這是覆核候選，不是自動核定；未發現機械問題不代表全文已核對。\n\n${entries.map(e => `## ${e.name}\n\n- 目標：${e.page ?? e.status}\n- 來源：${e.source_file ?? SPELL_DATASET}；${e.locator ?? "spell:" + e.name}\n${e.findings.map(f => `- ${f.code}：${f.reason}（${f.locator}）`).join("\n")}`).join("\n\n")}\n`);
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(a => a !== "--report")) throw new Error("僅支援 --report；預設唯讀且限定 PHB2024。");
  const result = auditSpellCompleteness({ report: process.argv.includes("--report") });
  console.log(JSON.stringify({ source_status: result.source_status, ...result.summary }, null, 2));
}
