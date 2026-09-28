import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./ingest-publication-utils.mjs";
import { readWikiPages } from "./wiki-records.mjs";

const BLOCK = /\n?<!-- AUTO-INDEX:START -->[\s\S]*?<!-- AUTO-INDEX:END -->\n?/;
const key = file => file.replace(/^wiki\//, "").replace(/\.md$/, "");
export function pageCatalog(pages) {
  const exact = new Map(pages.map(page => [key(page.file), page]));
  const names = new Map();
  for (const page of pages) {
    const name = path.posix.basename(key(page.file));
    if (!names.has(name)) names.set(name, []);
    names.get(name).push(page);
  }
  return { exact, names };
}
// 同名裸連結沿用 lint 的唯一現行頁規則；無法確定者不任意選取。
export function resolvePage(target, catalog) {
  const normalized = key(target.replaceAll("\\", "/").trim());
  if (!normalized) return null;
  if (catalog.exact.has(normalized)) return catalog.exact.get(normalized);
  if (normalized.includes("/")) return null;
  const matches = catalog.names.get(normalized) ?? [];
  if (matches.length === 1) return matches[0];
  const current = matches.filter(page => !page.file.includes("/2014/"));
  return current.length === 1 ? current[0] : null;
}
function linkedPages(text, catalog) {
  return new Set([...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(match => resolvePage(match[1].replaceAll("\\|", "|").split(/[|#^]/)[0], catalog)?.file).filter(Boolean));
}
export function planGenericIndexes(pages, { changedDirectories = null } = {}) {
  const catalog = pageCatalog(pages), changes = new Map();
  let missing = 0;
  const textFor = page => changes.get(page.file) ?? page.text;
  for (const index of pages.filter(page => /索引\.md$/.test(page.file))) {
    if (index.data?.index_scope === "curated" || (index.file.startsWith("wiki/戰役設定/") && index.data?.lore_type === "索引")) continue;
    const directory = path.posix.dirname(index.file);
    if (changedDirectories && !changedDirectories.has(directory)) continue;
    const siblings = pages.filter(page => path.posix.dirname(page.file) === directory && !/索引\.md$/.test(page.file));
    const text = textFor(index), manual = text.replace(BLOCK, "\n"), manualTargets = linkedPages(manual, catalog);
    const allTargets = linkedPages(text, catalog);
    missing += siblings.filter(page => !allTargets.has(page.file)).length;
    const managed = siblings.filter(page => !manualTargets.has(page.file));
    const lines = managed.map(page => {
      const name = path.posix.basename(key(page.file));
      const target = catalog.names.get(name).length === 1 ? name : page.file.replace(/\.md$/, "");
      return `- [[${target}|${page.data?.title ?? name}]]`;
    });
    const block = lines.length ? `<!-- AUTO-INDEX:START -->\n## 自動維護條目\n\n${lines.join("\n")}\n<!-- AUTO-INDEX:END -->` : "";
    const match = text.match(BLOCK);
    let next = text;
    if (match) {
      const before = text.slice(0, match.index).trimEnd(), after = text.slice(match.index + match[0].length).trimStart();
      next = `${before}${block ? `\n\n${block}` : ""}${after ? `\n\n${after.trimEnd()}` : ""}\n`;
    } else if (block) next = `${text.trimEnd()}\n\n${block}\n`;
    if (next !== text) changes.set(index.file, next);
    for (const page of siblings) {
      const body = textFor(page);
      if (linkedPages(body, catalog).has(index.file)) continue;
      const link = `- [[${key(index.file)}|${index.data?.title ?? path.posix.basename(key(index.file))}]]`;
      const heading = /^## 🔗 相關連結[^\S\r\n]*$/m;
      changes.set(page.file, heading.test(body) ? body.replace(heading, `## 🔗 相關連結\n\n${link}`) : `${body.trimEnd()}\n\n## 🔗 相關連結\n\n${link}\n`);
    }
  }
  return { missing, changes: [...changes].map(([file, text]) => ({ file, text })) };
}
export function syncGenericIndexes({ root = ROOT, apply = false, changedDirectories = null } = {}) {
  if (apply && path.resolve(root) === path.resolve(ROOT)) {
    throw new Error("正式 Wiki 索引不得直接寫入；請使用 wiki:preview -- --category 索引 儲存候選。 ");
  }
  const plan = planGenericIndexes(readWikiPages(root), { changedDirectories });
  if (apply) for (const change of plan.changes) fs.writeFileSync(path.join(root, change.file), change.text);
  return plan;
}
