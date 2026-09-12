import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { ROOT, walkMarkdown } from "./ingest-publication-utils.mjs";

export function readWikiPages(root = ROOT) {
  return walkMarkdown(path.join(root, "wiki")).sort().map((absolute) => {
    const text = fs.readFileSync(absolute, "utf8");
    const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const data = match ? YAML.parse(match[1]) : null;
    return { absolute, file: path.relative(root, absolute).replaceAll("\\", "/"), text, data, body: match ? text.slice(match[0].length) : text };
  });
}

export function isNavigationPage(page) {
  return page.data?.lore_type === "索引" || page.data?.index_scope === "curated"
    || /(?:索引|_index)\.md$/i.test(page.file)
    || /索引|\bIndex\b/.test(page.data?.title ?? page.title ?? "");
}

export function englishTitle(title = "") {
  return title.match(/\(([A-Za-z][\s\S]*)\)$/)?.[1]
    ?.replace(/[，,]\s*(?:2014(?:\s*Legacy)?|2024(?:\s*Core)?|舊版).*$/i, "").trim() ?? "";
}

export function writeReport(root, relative, value) {
  const target = path.resolve(root, relative);
  const reports = path.resolve(root, "reports");
  if (!target.startsWith(`${reports}${path.sep}`)) throw new Error("報告必須輸出至 reports/。");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
}
