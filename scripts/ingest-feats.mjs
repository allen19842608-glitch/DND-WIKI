import fs from "node:fs";
import path from "node:path";
import { ROOT, defaultSource, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "./ingest-publication-utils.mjs";

const options = parseOptions();
const publication = loadPublication(options.publicationId);
const profile = loadIngestProfile(options.publicationId);
const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
const inputDir = path.join(sourceRoot, profile.inputs.feats ?? "專長");
const outputRoot = path.resolve(options.output ? path.join(ROOT, options.output) : path.join(ROOT, profile.outputs.feats ?? "wiki/專長"));
if (!fs.existsSync(inputDir)) throw new Error(`找不到專長來源目錄：${inputDir}`);

const featTypes = {
  "起源專長.md": { directory: "起源專長", tag: "專長_起源" },
  "通用專長.md": { directory: "通用專長", tag: "專長_通用" },
  "戰鬥風格專長.md": { directory: "戰鬥風格專長", tag: "專長_戰鬥風格" },
  "傳奇恩惠專長.md": { directory: "史詩恩賜專長", tag: "專長_史詩恩賜" },
};
for (const input of Object.keys(featTypes).filter((name) => fs.existsSync(path.join(inputDir, name)))) {
  const sourcePath = path.join(inputDir, input);
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = line.match(/^\*\*([^*]+?)\s+([A-Za-z][A-Za-z '\-]+)/);
    return match ? [{ index, chinese: match[1].trim(), english: match[2].trim() }] : [];
  });
  for (const [position, feat] of headings.entries()) {
    const end = headings[position + 1]?.index ?? lines.length;
    const body = lines.slice(feat.index + 1, end).filter((line) => line.trim());
    const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
    const type = featTypes[input];
    const page = `${frontmatter({ publicationId: options.publicationId, publication, kind: "feat", concept: feat.english, title: `${feat.chinese} (${feat.english})`, category: "專長", tag: type.tag, source, locator: `標題：${feat.chinese}` })}\n\n# ${feat.chinese} (${feat.english})\n\n## 🌟 專長效果描述\n\n${body.map((line) => line.trim()).join("\n")}\n\n## 🔗 相關連結\n\n- [[專長索引|專長索引 (Feats Index)]]\n`;
    writableCandidate({ destination: path.join(outputRoot, type.directory, `${feat.chinese}.md`), content: page, options });
  }
}
