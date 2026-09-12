import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../core/ingest-publication-utils.mjs";
import { readWikiPages, englishTitle, writeReport } from "../core/wiki-records.mjs";
import { pageCatalog, resolvePage } from "../core/generic-indexes.mjs";

export function approvedTerms(text) {
  return text.split(/\r?\n/).filter(line => line.startsWith("|")).map(line => line.split("|").slice(1, -1).map(cell => cell.trim()))
    .filter(cells => cells.length === 5 && cells[4] === "approved").map(([english, chinese, source, locator]) => ({ english, chinese, source, locator }));
}
export function proposedAliases(page, terms, catalog) {
  if (!page.data) return [];
  const title = page.data.title ?? "", chinese = title.replace(/\s*\([\s\S]*$/, "").trim(), english = englishTitle(title);
  const aliases = new Set(Array.isArray(page.data.aliases) ? page.data.aliases : []);
  // 標題已可被 Obsidian 搜尋，不把中英文標題重複塞進 aliases。只有核定詞彙
  // 與頁面名稱不同時才補入，並以版本別名處理同名跨版的搜尋歧義。
  const names = [];
  for (const term of terms) {
    if (english && term.english === english && term.chinese !== chinese) names.push(term.chinese);
    if (!english && term.chinese === chinese && term.english !== chinese) names.push(term.english);
  }
  for (const name of names) aliases.add(name);
  if ((catalog.names.get(path.posix.basename(page.file, ".md"))?.length ?? 0) > 1 && ["2014", "2024"].includes(page.data.ruleset)) {
    for (const name of [english, !/譯名待確認/.test(chinese) ? chinese : ""].filter(Boolean)) aliases.add(`${name}（${page.data.ruleset}）`);
  }
  return [...aliases].filter(Boolean);
}
function selectLinkTarget(target, label, page, catalog) {
  const candidates = catalog.names.get(target) ?? [];
  const explicitVersion = label.match(/\b(2014|2024)\b/)?.[1];
  const versionCandidates = explicitVersion ? candidates.filter(p => p.data?.ruleset === explicitVersion) : candidates;
  if (explicitVersion && versionCandidates.length === 1) return { page: versionCandidates[0], reason: "連結顯示文字的版本" };
  const local = versionCandidates.filter(p => path.posix.dirname(p.file) === path.posix.dirname(page.file));
  if (local.length === 1) return { page: local[0], reason: "同資料夾唯一條目" };
  const sameVersion = versionCandidates.filter(p => p.data?.ruleset === (explicitVersion ?? page.data?.ruleset));
  const sameCategory = sameVersion.filter(p => p.data?.category === page.data?.category);
  if (sameCategory.length === 1) return { page: sameCategory[0], reason: "同類型及版本唯一條目" };
  if (sameVersion.length === 1) return { page: sameVersion[0], reason: "同版本唯一條目" };
  if (explicitVersion) return null;
  const resolved = resolvePage(target, catalog);
  return resolved ? { page: resolved, reason: "既有 lint 唯一現行頁解析" } : null;
}
export function planSearchMetadata(pages, terms, { category = null } = {}) {
  const catalog = pageCatalog(pages), changes = [], review = [];
  for (const page of pages) {
    if (category && page.data?.category !== category) continue;
    if (!page.data) { review.push({ file: page.file, reason: "無法解析 Frontmatter" }); continue; }
    const aliases = proposedAliases(page, terms, catalog), added = aliases.filter(name => !(page.data.aliases ?? []).includes(name));
    let next = page.text;
    if (added.length) {
      const fm = next.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)[0];
      const block = `aliases:\n${aliases.map(name => `  - ${JSON.stringify(name)}`).join("\n")}\n`;
      const previous = /^aliases:[^\r\n]*(?:\r?\n[ \t]+[^\r\n]*)*\r?\n/m;
      const updated = previous.test(fm) ? fm.replace(previous, block) : fm.replace(/(\r?\n---(?:\r?\n|$))$/, `\n${block}$1`);
      next = updated + next.slice(fm.length);
    }
    const links = [];
    next = next.replace(/\[\[([^\]]+)\]\]/g, (full, inner, offset) => {
      const parts = inner.match(/^([^#^|\\]+)((?:[#^][^|]*?)?)(\\?\|[\s\S]*)?$/);
      if (!parts) return full;
      const target = parts[1].trim();
      if (target.includes("/") || (catalog.names.get(target)?.length ?? 0) < 2) return full;
      const choice = selectLinkTarget(target, parts[3] ?? "", page, catalog);
      if (!choice) { review.push({ file: page.file, target, reason: "同名連結無法唯一判定；保留原文" }); return full; }
      const explicit = choice.page.file.replace(/^wiki\//, "").replace(/\.md$/, "");
      links.push({ from: target, to: explicit, reason: choice.reason });
      // Markdown 表格中的別名直線必須跳脫；一般段落則維持原樣。
      let suffix = parts[3] ?? `|${target}`;
      const lineStart = next.lastIndexOf("\n", offset) + 1;
      if (next.slice(lineStart, offset).trimStart().startsWith("|") && suffix.startsWith("|")) suffix = `\\${suffix}`;
      return `[[${explicit}${parts[2]}${suffix}]]`;
    });
    if (next !== page.text) changes.push({ file: page.file, category: page.data.category, aliases_added: added, links, text: next });
  }
  return { changes, review };
}
export function syncSearchMetadata({ root = ROOT, category = null, apply = false, report = false } = {}) {
  const pages = readWikiPages(root);
  if (category && !pages.some(p => p.data?.category === category)) throw new Error(`未知類別：${category}`);
  const plan = planSearchMetadata(pages, approvedTerms(fs.readFileSync(path.join(root, "附件/翻譯詞彙表.md"), "utf8")), { category });
  if (apply) for (const change of plan.changes) fs.writeFileSync(path.join(root, change.file), change.text);
  const result = { generated_at: new Date().toISOString(), scope: category ?? "全庫", mode: apply ? "apply" : "preview", changes: plan.changes.map(({ text, ...change }) => change), review: plan.review };
  if (report) writeReport(root, `reports/search-${category ?? "all"}-${apply ? "apply" : "preview"}.json`, result);
  const byCategory = {};
  for (const change of plan.changes) byCategory[change.category] = (byCategory[change.category] ?? 0) + 1;
  console.log(JSON.stringify({ scope: result.scope, mode: result.mode, pages: result.changes.length, by_category: byCategory, manual_review: result.review.length }, null, 2));
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), at = args.indexOf("--category");
  if (args.some((a, i) => !["--category", "--apply", "--report"].includes(a) && !(at >= 0 && i === at + 1))) throw new Error("僅支援 --category 類別、--apply、--report。");
  if (at >= 0 && (!args[at + 1] || args[at + 1].startsWith("--"))) throw new Error("--category 必須指定類別。");
  syncSearchMetadata({ category: at >= 0 ? args[at + 1] : null, apply: args.includes("--apply"), report: args.includes("--report") });
}
