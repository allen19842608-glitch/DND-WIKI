import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, defaultSource, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const publication = loadPublication(options.publicationId);
const profile = loadIngestProfile(options.publicationId);
const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
const inputDir = path.join(sourceRoot, profile.inputs.feats ?? "專長");
const outputRoot = path.resolve(options.output ? path.join(ROOT, options.output) : path.join(ROOT, profile.outputs.feats ?? "wiki/專長"));
const directFeatFile = profile.inputs.feats_file ? path.join(sourceRoot, profile.inputs.feats_file) : undefined;
if (!directFeatFile && !fs.existsSync(inputDir)) throw new Error(`找不到專長來源目錄：${inputDir}`);
if (directFeatFile && !fs.existsSync(directFeatFile)) throw new Error(`找不到專長來源：${directFeatFile}`);
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
  : Object.keys(featTypes).filter((name) => fs.existsSync(path.join(inputDir, name))).map((input) => ({ input, sourcePath: path.join(inputDir, input), type: featTypes[input] }));

function traditional(text) {
  const language = publication.source_assets?.find((asset) => asset.format === "directory" && asset.status === "available")?.language;
  if (language !== "zh-Hans") return text;
  if (!fs.existsSync(openccRoot)) throw new Error(`找不到 OpenCC：${openccRoot}`);
  return execFileSync(python, ["-c", openccProgram, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
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
function addCurrentBacklink(current, legacyTarget, legacyTitle) {
  if (!current) return;
  let content = fs.readFileSync(current, "utf8");
  const link = `[[${legacyTarget}|${legacyTitle}]]`;
  if (content.includes(link)) return;
  content = content.replace(/(## 🔗 相關連結\r?\n\r?\n)/, `$1- ${link}\n`);
  fs.writeFileSync(current, content, "utf8");
}

for (const { input, sourcePath, type } of inputs) {
  const lines = normalize(fs.readFileSync(sourcePath, "utf8")).split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = line.match(/^\*\*([^*]+?)\s+([A-Za-z][A-Za-z '\-]+)/);
    const annotation = lines[index + 1]?.trim() ?? "";
    return match && match[1].trim() !== "專長" && (directFeatFile || /專長/.test(annotation))
      ? [{ index, chinese: match[1].trim(), english: match[2].trim() }]
      : [];
  });
  for (const [position, feat] of headings.entries()) {
    const end = headings[position + 1]?.index ?? lines.length;
    const body = lines.slice(feat.index + 1, end).filter((line) => line.trim());
    const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
    const prerequisite = body.find((line) => /^_先決條件[：:]/.test(line.trim()))?.replace(/^_+|_+$/g, "").replace(/^先決條件[：:]\s*/, "") ?? "無";
    const effect = body.filter((line) => !/^_先決條件[：:]/.test(line.trim())).map((line) => line.trim().replace(/^·\s*/, "- ")).join("\n");
    const current = currentCounterpart(feat.english);
    const currentLink = current ? `- [[${wikiTarget(current)}|${fs.readFileSync(current, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? path.basename(current, ".md")}]]\n` : "";
    const title = `${feat.chinese} (${feat.english}，2014 Legacy)`;
    const page = `${frontmatter({ publicationId: options.publicationId, publication, kind: "feat", concept: feat.english, title, category: "專長", tag: type.tag, source, locator: `**${feat.chinese} ${feat.english}**` })}\n\n# ${title}\n\n- **前置條件 (Prerequisite)**：${prerequisite}\n\n## 🌟 專長效果描述\n\n${effect}\n\n## 🔗 相關連結\n\n- [[專長/2014/專長索引|專長索引 (2014 Legacy)]]\n${currentLink}`;
    const destination = path.join(outputRoot, type.directory, `${pageName(feat.chinese)}.md`);
    writableCandidate({ destination, content: page, options });
    if (options.apply && current) addCurrentBacklink(current, `專長/2014/${type.directory}/${pageName(feat.chinese)}`, title);
  }
}
