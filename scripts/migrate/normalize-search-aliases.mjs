import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";
import { readWikiPages } from "../core/wiki-records.mjs";
import { pageCatalog } from "../core/generic-indexes.mjs";
import { approvedTerms, proposedAliases } from "../sync/sync-search-metadata.mjs";

function replaceAliases(text, aliases) {
  const fm = text.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0];
  if (!fm) return text;
  const pattern = /^aliases:[^\r\n]*(?:\r?\n[ \t]+[^\r\n]*)*\r?\n/m;
  const block = aliases.length ? `aliases:\n${aliases.map(alias => `  - ${JSON.stringify(alias)}`).join("\n")}\n` : "";
  const nextFm = pattern.test(fm)
    ? fm.replace(pattern, block)
    : aliases.length
      ? fm.replace(/(\r?\n---(?:\r?\n|$))$/, `\n${block}$1`)
      // 清掉先前空 aliases 區塊遷移留下的一個多餘空行。
      : fm.replace(/(?:\r?\n){2,}(---\r?\n?)$/, "\n$1");
  return nextFm + text.slice(fm.length);
}
export function planAliasNormalization({ root = ROOT } = {}) {
  const pages = readWikiPages(root), catalog = pageCatalog(pages);
  const terms = approvedTerms(fs.readFileSync(path.join(root, "附件", "翻譯詞彙表.md"), "utf8"));
  const changes = [];
  for (const page of pages) {
    if (!page.data) continue;
    const title = String(page.data.title ?? "");
    const chinese = title.replace(/\s*\([\s\S]*$/, "").trim();
    const english = title.match(/\(([A-Za-z][\s\S]*)\)$/)?.[1]?.replace(/[，,]\s*(?:2014(?:\s*Legacy)?|2024(?:\s*Core)?|舊版).*$/i, "").trim() ?? "";
    // 僅移除本輪新增、且完全等於頁面標題的別名；保留其他人工 aliases。
    const retained = (page.data.aliases ?? []).filter(alias => alias !== chinese && alias !== english);
    const data = { ...page.data, aliases: retained };
    const aliases = proposedAliases({ ...page, data }, terms, catalog);
    const text = replaceAliases(page.text, aliases);
    if (text !== page.text) changes.push({ file: page.file, aliases, text });
  }
  return changes;
}
export function normalizeSearchAliases({ root = ROOT, apply = false, report = null } = {}) {
  const changes = planAliasNormalization({ root });
  if (apply && !report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
  const plan = planCandidateBatch(changes.map((change) => {
    const destination = path.join(root, change.file);
    return candidateChange({ destination, before: fs.readFileSync(destination, "utf8"), after: change.text, operation: "update", source: "aliases", locator: change.file });
  }), { root, lint: lintWiki });
  writeCandidatePlan(plan, report, { root });
  const result = apply ? applyCandidateBatch(plan, { root, lint: lintWiki }) : plan;
  console.log(`${apply ? "已套用" : "預覽"}：${changes.length} 頁 aliases 正規化${apply ? "" : "（--apply 寫入）"}`);
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseOptions(process.argv.slice(2));
  normalizeSearchAliases({ apply: options.apply, report: options.report });
}
