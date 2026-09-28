import fs from "node:fs";
import path from "node:path";
import { ROOT, candidateChange, defaultSource, frontmatter, loadIngestProfile, loadPublication, parseOptions, planCandidateBatch, writeIngestReport } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";
import { mirrorEntityPage, mirrorEvidenceFiles } from "../core/mirror-entity-page.mjs";
import { approvedTranslationMap, assessApprovedTranslation } from "../core/approved-translation.mjs";
import { withIndexEffects } from "../core/index-candidates.mjs";

const options = parseOptions();
if (options.apply) throw new Error("種族解析器不直接寫入 Wiki；請先以 wiki:preview 儲存候選計畫，再以 wiki:apply 套用。");
const publication = loadPublication(options.publicationId);
const profile = loadIngestProfile(options.publicationId);
const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
const inputDir = path.join(sourceRoot, profile.inputs.species ?? "角色起源/種族");
const outputRoot = path.resolve(options.output ? path.join(ROOT, options.output) : path.join(ROOT, profile.outputs.species ?? "wiki/種族"));
const missingIntroductions = [];
const pending = [];
const mirrorSources = new Set();
const approvedTranslations = approvedTranslationMap(fs.readFileSync(path.join(ROOT, "附件", "翻譯詞彙表.md"), "utf8"));

if (!fs.existsSync(inputDir)) {
  options.results.push({
    source: path.relative(ROOT, inputDir).split(path.sep).join("/"),
    status: "incomplete",
    reason: "configured_species_input_missing",
  });
  writeIngestReport({ options, publicationId: options.publicationId, category: "species" });
  console.log(`待處理：找不到設定的種族來源目錄：${inputDir}`);
  process.exit(0);
}

for (const input of fs.readdirSync(inputDir, { withFileTypes: true })) {
  if (!input.isFile() || !input.name.endsWith(".md") || /詳述/.test(input.name)) continue;
  const sourcePath = path.join(inputDir, input.name);
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  const heading = lines.find((line) => /^#{1,2}\s+/.test(line))?.replace(/^#{1,2}\s+/, "").trim();
  const headingMatch = heading?.match(/^(.+?)\s+([A-Za-z][A-Za-z '\-]+)$/);
  const chinese = headingMatch?.[1] ?? heading;
  const traitLine = lines.find((line) => /特質\s+[A-Za-z]/.test(line));
  const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
  if (!traitLine) {
    options.results.push({ source, status: "out_of_scope", reason: "not_species_trait_source" });
    continue;
  }
  const english = headingMatch?.[2] ?? traitLine?.match(/特質\s+([A-Za-z][A-Za-z '\-]+)/)?.[1]?.replace(/\s+Traits?$/, "").trim();
  if (!chinese || !english) {
    options.results.push({ source, status: "incomplete", reason: "species_title_unresolved" });
    continue;
  }
  const value = (label) => lines.find((line) => line.startsWith(`**${label}：**`))?.replace(`**${label}：**`, "").trim() ?? "依來源確認";
  const traitStart = lines.findIndex((line) => /作為一名.+，你(?:擁有|具有)以下特殊特(?:質|性)。/.test(line));
  const traitLines = traitStart >= 0 ? lines.slice(traitStart + 1) : [];
  const traitBlocks = [];
  let current;
  for (const line of traitLines) {
    const match = line.trim().match(/^\*\*([^*。]+?)\s+([A-Za-z][A-Za-z '\-]+)。?\*\*\s*(.*)$/);
    if (match) {
      if (current) traitBlocks.push(current);
      current = { chinese: match[1].trim(), english: match[2].trim(), body: [match[3].trim()].filter(Boolean) };
    } else if (current && line.trim()) {
      current.body.push(line.trim());
    }
  }
  if (current) traitBlocks.push(current);
  const traitText = traitBlocks.map((trait) => `#### ${trait.chinese} (${trait.english})\n\n- **效果**：${trait.body.join(" ") || "依來源確認。"}`).join("\n\n");
  const size = value("體型").replace(/（約[^）]+）/g, "").replace("，在選取此種族時選擇", "");
  const speed = value("速度").replaceAll("尺", " 呎").replace(/\s+/g, " ").trim();
  // Background text needs editorial source review.  Never treat a source prefix as
  // a complete introduction or emit a placeholder sentence as published content.
  missingIntroductions.push({ chinese, source });
  const destination = path.join(outputRoot, `${chinese}.md`);
  const target = path.relative(ROOT, destination).split(path.sep).join("/");
  const filter = String(options.only ?? "").normalize("NFKC").toLowerCase();
  if (filter && ![chinese, english, source, target].some((value) => value.normalize("NFKC").toLowerCase().includes(filter))) {
    options.results.push({ target, status: "filtered" });
    continue;
  }
  const mirror = mirrorEntityPage({ root: ROOT, profile, publicationId: options.publicationId, english, kind: "species" });
  const translation = assessApprovedTranslation(approvedTranslations, english, chinese);
  if (mirror.status !== "matched") {
    options.results.push({ source, target, english_name: english, status: mirror.status, reason: mirror.reason,
      review: translation.status === "matched" ? [] : [translation.reason] });
    continue;
  }
  if (translation.status !== "matched") {
    options.results.push({ source, target, english_name: english, mirror_page: mirror.page, ...translation });
    continue;
  }
  if (fs.existsSync(destination) && !options.replace) {
    options.results.push({ target, english_name: english, mirror_page: mirror.page, status: "skipped", reason: "existing_page_preserved" });
    continue;
  }
  const page = `${frontmatter({ publicationId: options.publicationId, publication, kind: "species", concept: english, title: `${chinese} (${english})`, category: "種族", tag: `種族_${chinese}`, source, locator: `標題：${chinese}`, mirror })}\n\n# ${chinese} (${english})\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 基本資料\n\n| 生物類型 | 體型 | 速度 |\n| :--- | :--- | :--- |\n| ${value("生物類型")} | ${size} | ${speed} |\n\n### 種族特質 (Species Traits)\n\n${traitText || "依可定位來源補齊特質。"}\n\n## 🔗 相關連結\n\n- [[種族索引|種族索引 (Species Index)]]\n`;
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === page) {
    options.results.push({ target, status: "unchanged" });
    continue;
  }
  const replacement = before !== null;
  pending.push(candidateChange({ destination, before, after: page, operation: replacement ? "update" : "create", source, locator: `標題：${chinese}`,
    status: replacement ? "manual_review" : "ready",
    review: replacement ? ["整頁重建可能移除既有人工內容、版本與 AL 判定；須改成保留內容的增量候選。"] : [] }));
  mirrorSources.add(mirror.file);
  mirrorSources.add(mirror.manifest_file);
  options.results.push({ target, english_name: english, mirror_page: mirror.page, status: replacement ? "manual_review" : "preview", reason: replacement ? "species_rebuild_requires_content_review" : undefined });
}
const plan = planCandidateBatch(withIndexEffects(pending, { root: ROOT, source: "species-index" }), {
  root: ROOT, lint: lintWiki,
  sourceFiles: [path.relative(ROOT, inputDir).replaceAll("\\", "/"), ...mirrorEvidenceFiles({ root: ROOT, profile, kind: "species" }), ...mirrorSources],
  dependencyFiles: [`config/ingest-profiles/${options.publicationId}.yml`, "config/publications.yml", "附件/翻譯詞彙表.md"],
});
if (options.report) {
  options.candidates = pending;
  writeIngestReport({ options, publicationId: options.publicationId, category: "species", extra: { changes: plan.changes,
    source_fingerprints: plan.source_fingerprints, dependency_fingerprints: plan.dependency_fingerprints,
    summary: plan.summary, lint: plan.lint } });
}
for (const item of missingIntroductions) console.warn(`種族介紹需編輯覆核：${item.chinese}（${item.source}）`);
