import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  ROOT, candidateChange, defaultSource, frontmatter, loadIngestProfile, loadPublication,
  parseOptions, planCandidateBatch, writeIngestReport,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";
import { mirrorDatasetEntityPage, mirrorEntityPage, mirrorEvidenceFiles } from "../core/mirror-entity-page.mjs";
import { approvedTranslationMap, assessApprovedTranslation } from "../core/approved-translation.mjs";
import { withIndexEffects } from "../core/index-candidates.mjs";
import { collectFeatHeadings } from "./feat-heading-utils.mjs";

const options = parseOptions();
if (options.apply) throw new Error("專長解析器不直接寫入 Wiki；請先以 wiki:preview 儲存候選計畫，再以 wiki:apply 套用。");
const pending = [];
const staged = new Map();
const mirrorSources = new Set();
const approvedTranslations = approvedTranslationMap(fs.readFileSync(path.join(ROOT, "附件", "翻譯詞彙表.md"), "utf8"));
const publication = loadPublication(options.publicationId);
const profile = loadIngestProfile(options.publicationId);
const legacy = publication.ruleset === "2014";
const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
const inputDir = path.join(sourceRoot, profile.inputs.feats ?? "專長");
const outputRoot = path.resolve(options.output ? path.join(ROOT, options.output) : path.join(ROOT, profile.outputs.feats ?? "wiki/專長"));
const directFeatFile = profile.inputs.feats_file ? path.join(sourceRoot, profile.inputs.feats_file) : undefined;
const featSourceLanguage = profile.inputs.feats_language
  ?? publication.source_assets?.find((asset) => asset.format === "directory" && asset.status === "available")?.language;
if (featSourceLanguage && !["zh-Hans", "zh-Hant"].includes(featSourceLanguage)) {
  throw new Error(`不支援的專長來源語言：${featSourceLanguage}`);
}
const missingInput = !directFeatFile && !fs.existsSync(inputDir) ? inputDir
  : directFeatFile && !fs.existsSync(directFeatFile) ? directFeatFile
    : null;
if (missingInput) {
  options.results.push({
    source: path.relative(ROOT, missingInput).split(path.sep).join("/"),
    status: "incomplete",
    reason: "configured_feat_input_missing",
  });
  writeIngestReport({ options, publicationId: options.publicationId, category: "feats" });
  console.log(`待處理：找不到設定的專長來源：${missingInput}`);
  process.exit(0);
}
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const openccProgram = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";

const featTypes = {
  "起源專長.md": { directory: "起源專長", tag: "專長_起源" },
  "通用專長.md": { directory: "通用專長", tag: "專長_通用" },
  "戰鬥風格專長.md": { directory: "戰鬥風格專長", tag: "專長_戰鬥風格" },
  "傳奇恩惠專長.md": { directory: "史詩恩賜專長", tag: "專長_史詩恩賜" },
};
const inputs = directFeatFile
  ? [{ input: path.basename(directFeatFile), sourcePath: directFeatFile, type: { directory: "通用專長", tag: "專長_通用" } }]
  : Array.isArray(profile.inputs.feat_sources)
    ? profile.inputs.feat_sources.map(({ file, directory, tag }) => ({ input: file, sourcePath: path.join(inputDir, file), type: { directory, tag } }))
    : Object.keys(featTypes).filter((name) => fs.existsSync(path.join(inputDir, name))).map((input) => ({ input, sourcePath: path.join(inputDir, input), type: featTypes[input] }));
const requirePrerequisiteHeading = profile.inputs.feats_require_prerequisite === true;

function traditional(text) {
  if (featSourceLanguage !== "zh-Hans") return text;
  try {
    if (!fs.existsSync(openccRoot)) throw new Error("OpenCC missing");
    return execFileSync(python, ["-c", openccProgram, openccRoot], {
      input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    const failure = new Error("簡體來源轉換工具不可用；此來源未完成解析。");
    failure.code = "translation_converter_unavailable";
    throw failure;
  }
}
function normalize(text) {
  return traditional(text).replace(/(\d+)\s*尺/g, "$1 呎").replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replaceAll("尺", "呎").replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function pageName(chinese) { return chinese.replace(/[\\/:*?"<>|]/g, "-").trim(); }
function walkMarkdown(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walkMarkdown(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}
function currentCounterpart(english) {
  return walkMarkdown(path.join(ROOT, "wiki", "專長")).find((file) => !file.includes(`${path.sep}2014${path.sep}`)
    && (fs.readFileSync(file, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? "").includes(`(${english})`));
}
function wikiTarget(file) { return path.relative(path.join(ROOT, "wiki"), file).split(path.sep).join("/").replace(/\.md$/, ""); }
function addCurrentBacklink(current, legacyTarget, legacyTitle, source) {
  if (!current) return;
  let content = staged.get(current) ?? fs.readFileSync(current, "utf8");
  const link = `[[${legacyTarget}|${legacyTitle}]]`;
  if (content.includes(link)) return;
  content = content.replace(/(## 🔗 相關連結\r?\n\r?\n)/, `$1- ${link}\n`);
  queueWrite(current, content, source, "現行專長反向連結");
}

function queueWrite(destination, content, source, locator = null, status = "ready", review = []) {
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === content || staged.get(destination) === content) return;
  staged.set(destination, content);
  const change = candidateChange({ destination, before, after: content, operation: before === null ? "create" : "update", source, locator, status, review });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}

for (const { input, sourcePath, type } of inputs) {
  if (!fs.existsSync(sourcePath)) {
    options.results.push({ source: path.relative(ROOT, sourcePath).replaceAll("\\", "/"),
      status: "incomplete", reason: "configured_feat_input_missing" });
    continue;
  }
  let lines;
  try {
    lines = normalize(fs.readFileSync(sourcePath, "utf8")).split(/\r?\n/);
  } catch (error) {
    if (error.code !== "translation_converter_unavailable") throw error;
    options.results.push({ source: path.relative(ROOT, sourcePath).split(path.sep).join("/"),
      status: "incomplete", reason: error.code, review: [error.message] });
    continue;
  }
  const headings = collectFeatHeadings(lines, { directFeatFile: Boolean(directFeatFile), requirePrerequisiteHeading });
  const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
  if (!headings.length) {
    options.results.push({ source, status: "incomplete", reason: "feat_headings_unresolved" });
    continue;
  }
  for (const [position, feat] of headings.entries()) {
    const end = headings[position + 1]?.index ?? lines.length;
    const body = lines.slice(feat.index + 1, end).filter((line) => line.trim());
    const prerequisiteLine = body.find((line) => /^_先決條件[：:]/.test(line.trim()) || /[（(]先決[：:]/.test(line));
    const prerequisite = prerequisiteLine?.match(/[（(]先決[：:]\s*([^）)]+)[）)]/)?.[1]
      ?? prerequisiteLine?.replace(/^_+|_+$/g, "").replace(/^先決條件[：:]\s*/, "") ?? "無";
    const effect = body.filter((line) => line !== prerequisiteLine && !/^_你獲得以下增益。?_$/.test(line.trim()))
      .map((line) => line.trim().replace(/^·\s*/, "- ")).join("\n");
    const destination = path.join(outputRoot, type.directory, `${pageName(feat.chinese)}.md`);
    const target = path.relative(ROOT, destination).replaceAll("\\", "/");
    const filter = String(options.only ?? "").normalize("NFKC").toLowerCase();
    if (filter && ![feat.chinese, feat.english, source, destination].some((value) => value.normalize("NFKC").toLowerCase().includes(filter))) {
      options.results.push({ target, english_name: feat.english, status: "filtered", reason: "only_filter" });
      continue;
    }
    const mirror = profile.canonical_mirror?.datasets?.some((dataset) => dataset.locator_prefix === "feat:")
      ? mirrorDatasetEntityPage({ root: ROOT, profile, publicationId: options.publicationId, english: feat.english, kind: "feat" })
      : mirrorEntityPage({ root: ROOT, profile, publicationId: options.publicationId, english: feat.english, kind: "feat" });
    const translation = assessApprovedTranslation(approvedTranslations, feat.english, feat.chinese);
    if (mirror.status !== "matched") {
      options.results.push({ source, target, english_name: feat.english, status: mirror.status, reason: mirror.reason,
        review: translation.status === "matched" ? [] : [translation.reason] });
      continue;
    }
    if (translation.status !== "matched") {
      options.results.push({ source, target, english_name: feat.english, mirror_page: mirror.page, ...translation });
      continue;
    }
    const existingNameMatch = !legacy ? currentCounterpart(feat.english) : null;
    if (existingNameMatch && existingNameMatch !== destination) {
      options.results.push({ source, target, english_name: feat.english, mirror_page: mirror.page,
        existing_target: path.relative(ROOT, existingNameMatch).replaceAll("\\", "/"),
        status: "conflict", reason: "same_english_feat_existing_at_different_target" });
      continue;
    }
    const current = legacy ? currentCounterpart(feat.english) : null;
    const currentLink = current ? `- [[${wikiTarget(current)}|${fs.readFileSync(current, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? path.basename(current, ".md")}]]\n` : "";
    const title = legacy ? `${feat.chinese} (${feat.english}，2014 Legacy)` : `${feat.chinese} (${feat.english})`;
    const indexLink = legacy ? "專長/2014/專長索引|專長索引 (2014 Legacy)" : "專長/專長索引|專長索引";
    const page = `${frontmatter({ publicationId: options.publicationId, publication, kind: "feat", concept: feat.english, title, category: "專長", tag: type.tag, source, locator: `**${feat.chinese} ${feat.english}**`, mirror })}\n\n# ${title}\n\n- **前置條件 (Prerequisite)**：${prerequisite}\n\n## 🌟 專長效果描述\n\n${effect}\n\n## 🔗 相關連結\n\n- [[${indexLink}]]\n${currentLink}`;
    if (fs.existsSync(destination) && !options.replace) {
      options.results.push({ target, english_name: feat.english, mirror_page: mirror.page, status: "skipped", reason: "existing_page_preserved" });
    } else {
      const replacement = fs.existsSync(destination);
      queueWrite(destination, page, source, mirror.locator, replacement ? "manual_review" : "ready",
        replacement ? ["既有專長頁可能有人工內容、版本與 AL 資訊；整頁重建僅供差異覆核。"] : []);
      mirrorSources.add(mirror.file);
      mirrorSources.add(mirror.manifest_file);
      if (!replacement && current) addCurrentBacklink(current, `專長/2014/${type.directory}/${pageName(feat.chinese)}`, title, source);
      options.results.push({ target, english_name: feat.english, mirror_page: mirror.page,
        status: replacement ? "manual_review" : "preview", reason: replacement ? "feat_rebuild_requires_content_review" : undefined });
    }
  }
}

const plan = planCandidateBatch(withIndexEffects(pending, { root: ROOT, source: "feat-index" }), {
  root: ROOT, lint: lintWiki,
  sourceFiles: [...inputs.filter(({ sourcePath }) => fs.existsSync(sourcePath))
    .map(({ sourcePath }) => path.relative(ROOT, sourcePath).split(path.sep).join("/")),
  ...mirrorEvidenceFiles({ root: ROOT, profile, kind: "feat" }), ...mirrorSources],
  dependencyFiles: [`config/ingest-profiles/${options.publicationId}.yml`, "config/publications.yml", "附件/翻譯詞彙表.md"],
});
if (options.report) {
  writeIngestReport({ options, publicationId: options.publicationId, category: "feats", extra: { changes: plan.changes,
    source_fingerprints: plan.source_fingerprints, dependency_fingerprints: plan.dependency_fingerprints,
    summary: plan.summary, lint: plan.lint } });
}
const incomplete = options.results.filter((item) => item.status === "incomplete");
console.log(`預覽專長匯入：${plan.changes.length} 個候選變更、${incomplete.length} 項來源未完成；${plan.changes.length
  ? "審閱後才可用 wiki:apply 套用已儲存計畫。" : "沒有可套用候選，仍須檢查實體結果。"}`);
const resultCounts = options.results.reduce((counts, item) => {
  counts[item.status] = (counts[item.status] ?? 0) + 1;
  return counts;
}, {});
console.log(`實體結果：${Object.entries(resultCounts).map(([status, count]) => `${status} ${count}`).join("；") || "無可辨識實體"}`);
for (const item of incomplete) console.log(`待處理：${item.source}：${item.reason}`);
