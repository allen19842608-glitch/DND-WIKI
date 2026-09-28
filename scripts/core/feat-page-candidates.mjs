import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { ROOT, candidateChange, loadIngestProfile, planCandidateBatch } from "./ingest-publication-utils.mjs";
import { readWikiPages, englishTitle } from "./wiki-records.mjs";
import { lintWiki } from "./wiki-lint.mjs";

function escapePattern(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Keep every rule and manual paragraph untouched; change only the two mirror-source citations. */
export function prepareFeatPageSource({ text, english, page, bookFile, datasetFile, datasetUrl, publicationTitle }) {
  if (!Number.isInteger(page) || page <= 0) return { status: "ambiguous", reason: "english_mirror_entity_page_unresolved" };
  const frontmatterEnd = text.indexOf("\n---", 4);
  if (!text.startsWith("---\n") || frontmatterEnd < 0) return { status: "incomplete", reason: "wiki_frontmatter_missing" };
  const data = YAML.parse(text.slice(4, frontmatterEnd));
  const bookSources = data.sources?.filter((source) => source?.file === bookFile) ?? [];
  const datasetSources = data.sources?.filter((source) => source?.file === datasetFile) ?? [];
  if (bookSources.length !== 1 || datasetSources.length > 1) return { status: "conflict", reason: "mirror_source_not_unique" };
  if (!String(bookSources[0].locator ?? "").includes(english)) return { status: "conflict", reason: "book_source_entity_mismatch" };
  let after = text;
  const bookPattern = new RegExp(`(  - file: "${escapePattern(bookFile)}"\\r?\\n    locator: ")[^"\\r\\n]+`, "u");
  const bookMatch = after.match(bookPattern);
  if (!bookMatch) return { status: "incomplete", reason: "book_source_layout_unsupported" };
  const oldLocator = bookSources[0].locator;
  const cleanedLocator = oldLocator.replace(/, p\. \d+(?=：)/u, "");
  if (oldLocator.includes(", p. ") && cleanedLocator === oldLocator) return { status: "conflict", reason: "book_source_page_not_unique" };
  if (cleanedLocator !== oldLocator) after = after.replace(bookPattern, `${bookMatch[1]}${cleanedLocator}`);
  const expectedLocator = `${publicationTitle}, p. ${page}：${english}；5e.tools 鏡像資料集`;
  if (datasetSources.length) {
    const current = String(datasetSources[0].locator ?? "");
    const existingPage = Number(current.match(/, p\. (\d+)：/u)?.[1]);
    if (existingPage !== page || !current.includes(english)) return { status: "conflict", reason: "dataset_source_locator_mismatch" };
  } else {
    const block = `  - file: "${datasetFile}"\n    locator: "${expectedLocator}"\n    url: "${datasetUrl}"\n    authority: "官方"\n    translation: "none"\n`;
    after = after.replace(/^sources:\r?\n/mu, (line) => `${line}${block}`);
  }
  return { status: after === text ? "unchanged" : "ready", after };
}

export function featPageCandidates({ publicationId, root = ROOT } = {}) {
  if (!publicationId) throw new Error("專長頁碼候選必須指定 --publication。");
  const profile = loadIngestProfile(publicationId);
  const dataset = profile.canonical_mirror?.datasets?.filter((item) => item.locator_prefix === "feat:") ?? [];
  if (dataset.length !== 1) throw new Error(`${publicationId} 未唯一登錄英文專長資料集。`);
  const manifestFile = path.resolve(root, profile.canonical_mirror.output_root, "manifest.yml");
  const manifest = YAML.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.publication_id !== publicationId || !manifest.snapshot?.file || !manifest.publication_title) throw new Error("英文鏡像 manifest 與出版品不符。");
  const bookFile = manifest.snapshot.file.replaceAll("\\", "/");
  const datasetFile = dataset[0].file.replaceAll("\\", "/");
  const sourceCode = String(profile.canonical_mirror.book_id ?? "").toLowerCase();
  const records = JSON.parse(fs.readFileSync(path.resolve(root, datasetFile), "utf8")).feat;
  if (!Array.isArray(records) || !sourceCode || !dataset[0].url) throw new Error("英文專長資料集設定不完整。");
  const names = new Map();
  for (const record of records.filter((entry) => entry?.source?.toLowerCase() === sourceCode)) {
    const matches = names.get(record.name) ?? [];
    matches.push(record);
    names.set(record.name, matches);
  }
  const pages = readWikiPages(root).filter((item) => item.data?.category === "專長"
    && String(item.data?.entity_id ?? "").startsWith(`entry:${publicationId}:feat:`));
  const byEnglish = new Map();
  for (const item of pages) {
    const english = englishTitle(item.data.title);
    const matches = byEnglish.get(english) ?? [];
    matches.push(item);
    byEnglish.set(english, matches);
  }
  const changes = [], results = [];
  for (const [english, matches] of byEnglish) {
    const entities = names.get(english) ?? [];
    if (matches.length !== 1 || entities.length !== 1) {
      results.push({ english_name: english, status: entities.length ? "conflict" : "incomplete",
        reason: entities.length ? "wiki_or_dataset_entity_not_unique" : "english_mirror_entity_missing" });
      continue;
    }
    const item = matches[0], record = entities[0];
    const prepared = prepareFeatPageSource({ text: item.text, english, page: record.page, bookFile,
      datasetFile, datasetUrl: dataset[0].url, publicationTitle: manifest.publication_title });
    results.push({ english_name: english, target: item.file, mirror_page: record.page,
      status: prepared.status, reason: prepared.reason });
    if (prepared.status === "ready") changes.push(candidateChange({ destination: item.absolute, before: item.text,
      after: prepared.after, operation: "update", source: datasetFile, locator: `feat:${english}` }));
  }
  return { plan: planCandidateBatch(changes, { root, lint: lintWiki, sourceFiles: [datasetFile, bookFile,
    path.relative(root, manifestFile).replaceAll("\\", "/")] }), results };
}
