import fs from "node:fs";
import path from "node:path";
import { ROOT, defaultSource, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate, writeIngestReport } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const publication = loadPublication(options.publicationId);
const profile = loadIngestProfile(options.publicationId);
const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
const inputDir = path.join(sourceRoot, profile.inputs.species ?? "角色起源/種族");
const outputRoot = path.resolve(options.output ? path.join(ROOT, options.output) : path.join(ROOT, profile.outputs.species ?? "wiki/種族"));

if (!fs.existsSync(inputDir)) throw new Error(`找不到種族來源目錄：${inputDir}`);

for (const input of fs.readdirSync(inputDir, { withFileTypes: true })) {
  if (!input.isFile() || !input.name.endsWith(".md") || /詳述/.test(input.name)) continue;
  const sourcePath = path.join(inputDir, input.name);
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  const heading = lines.find((line) => /^#{1,2}\s+/.test(line))?.replace(/^#{1,2}\s+/, "").trim();
  const headingMatch = heading?.match(/^(.+?)\s+([A-Za-z][A-Za-z '\-]+)$/);
  const chinese = headingMatch?.[1] ?? heading;
  const traitLine = lines.find((line) => /特質\s+[A-Za-z]/.test(line));
  const english = headingMatch?.[2] ?? traitLine?.match(/特質\s+([A-Za-z][A-Za-z '\-]+)/)?.[1]?.replace(/\s+Traits?$/, "").trim();
  if (!chinese || !english) {
    console.warn(`略過：${path.relative(ROOT, sourcePath)}（無法解析中英文標題）`);
    continue;
  }
  const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
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
  const firstParagraph = lines.slice(1, Math.max(1, lines.findIndex((line) => /特質\s+[A-Za-z]/.test(line)))).filter((line) => line.trim()).join(" ").trim();
  const size = value("體型").replace(/（約[^）]+）/g, "").replace("，在選取此種族時選擇", "");
  const speed = value("速度").replaceAll("尺", " 呎").replace(/\s+/g, " ").trim();
  const page = `${frontmatter({ publicationId: options.publicationId, publication, kind: "species", concept: english, title: `${chinese} (${english})`, category: "種族", tag: `種族_${chinese}`, source, locator: `標題：${chinese}` })}\n\n# ${chinese} (${english})\n\n## ⚙️ 規則條文 (Rule Text)\n\n> [!IMPORTANT]\n> **種族摘要**：${firstParagraph || "依可定位來源確認。"}\n\n### 基本資料\n\n| 生物類型 | 體型 | 速度 |\n| :--- | :--- | :--- |\n| ${value("生物類型")} | ${size} | ${speed} |\n\n### 種族特質 (Species Traits)\n\n${traitText || "依可定位來源補齊特質。"}\n\n## 🔗 相關連結\n\n- [[種族索引|種族索引 (Species Index)]]\n`;
  writableCandidate({ destination: path.join(outputRoot, `${chinese}.md`), content: page, options, matchValues: [chinese, english, source] });
}

writeIngestReport({ options, publicationId: options.publicationId, category: "species" });
