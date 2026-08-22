import fs from "node:fs";
import path from "node:path";
import { ROOT, defaultSource, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const publication = loadPublication(options.publicationId);
const profile = loadIngestProfile(options.publicationId);
const sourceRoot = options.source ? path.resolve(ROOT, options.source) : defaultSource(publication);
const inputDir = path.join(sourceRoot, profile.inputs.spells ?? "法術詳述");
const outputRoot = path.resolve(options.output ? path.join(ROOT, options.output) : path.join(ROOT, profile.outputs.spells ?? "wiki/法術"));

if (!fs.existsSync(inputDir)) throw new Error(`找不到法術來源目錄：${inputDir}`);

const numerals = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const classNames = new Map([
  ["吟遊詩人", "吟遊詩人"], ["牧師", "牧師"], ["德魯伊", "德魯伊"], ["聖武士", "聖騎士"],
  ["聖騎士", "聖騎士"], ["遊俠", "遊俠"], ["術士", "術士"], ["魔契師", "契術師"],
  ["契術師", "契術師"], ["法師", "法師"], ["奇械師", "奇械師"],
]);

function ringForFile(file) {
  if (file === "戲法.md" || file === "0環.md") return { number: 0, name: "戲法", directory: "戲法" };
  const number = Number(file.match(/^(\d+)環\.md$/)?.[1]);
  if (!Number.isInteger(number) || number < 1 || number > 9) return null;
  return { number, name: `${numerals[number]}環`, directory: `${number}環` };
}

function sourceLocator(english) {
  return `#${english.replaceAll(" ", "_").replaceAll("'", "")}`;
}

function pageName(chinese) {
  return chinese.replaceAll("/", "-").replaceAll("\\", "-");
}

function metadata(meta, ring) {
  const school = meta.match(/^([^\s（(]+)\s+(?:[一二三四五六七八九0-9]+環|戲法)/)?.[1]?.trim()
    ?? meta.match(/(?:[一二三四五六七八九0-9]+環|戲法)\s+([^（(]+)/)?.[1]?.trim()
    ?? "待確認";
  const parenthetical = meta.match(/[（(]([^）)]+)[）)]/)?.[1] ?? "";
  const ritual = /儀式/.test(parenthetical);
  const classes = parenthetical
    .replace(/儀式[；;,、]*/g, "")
    .split(/[、，,；;]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => classNames.get(name) ?? name);
  return { school, ritual, classes, ring };
}

function field(block, name) {
  const line = block.find((item) => item.startsWith(`**${name}`));
  return line?.replace(/^\*\*[^：:]+[：:]\*\*\s*/, "").trim() ?? "依來源確認";
}

function componentsDetail(components) {
  if (!/(?:^|、)M(?:[（(]|$)/.test(components)) return null;
  const material = components.match(/M[（(]([^）)]+)[）)]/)?.[1]?.trim();
  return material ? `${material}；未標示成本／不消耗` : "含材料成分；成本與消耗依來源確認";
}

function rulesText(block) {
  const body = block.filter((line) => !/^_|^\*\*(施法時間|施法距離|法術成分|持續時間)[：:]/.test(line));
  const higher = body.find((line) => /^\*\*升環施法[。.]?\*\*/.test(line));
  const effect = body.filter((line) => line !== higher).join(" ").replace(/\s+/g, " ").trim();
  return {
    effect,
    higher: higher?.replace(/^\*\*升環施法[。.]?\*\*\s*/, "").trim(),
  };
}

function targetArea(effect) {
  const sentence = effect.match(/^.+?[。！？]/)?.[0]?.trim();
  return sentence || "依來源效果敘述確認。";
}

function spellPage({ spell, source, ring, block }) {
  const metaLine = block.find((line) => /^_[^_]+_$/.test(line.trim()))?.replace(/^_|_$/g, "")
    ?? block.find((line) => /^(?:[一二三四五六七八九0-9]+環|[^\s]+\s+戲法)\s+/.test(line.trim()))
    ?? "";
  const details = metadata(metaLine, ring);
  const castingTime = field(block, "施法時間");
  const range = field(block, "施法距離");
  const components = field(block, "法術成分");
  const duration = field(block, "持續時間");
  const material = componentsDetail(components);
  const { effect, higher } = rulesText(block);
  const target = targetArea(effect);
  const concentration = /^專注[，,]/.test(duration) ? "是" : "否";
  const ritual = details.ritual || /儀式/.test(castingTime) ? "是" : "否";
  const classes = details.classes.length ? details.classes.join("、") : "依來源確認";
  const spellTag = `法術_${ring.name}`;
  const indexName = ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`;
  const sourceLabel = `${publication.title_zh} ${publication.year}`;
  const lines = [
    frontmatter({ publicationId: options.publicationId, publication, kind: "spell", concept: spell.english, title: `${spell.chinese} (${spell.english})`, category: "法術", tag: spellTag, source, locator: sourceLocator(spell.english) }),
    "",
    `# ${spell.chinese} (${spell.english})`,
    "",
    `- **環階**：${ring.name}`,
    `- **學派**：${details.school}`,
    `- **施法時間 (Casting Time)**：${castingTime}`,
    `- **施法距離 (Range)**：${range}`,
    `- **目標／範圍 (Target/Area)**：${target}`,
    `- **法術成分 (Components)**：${components}`,
    ...(material ? [`- **材料成本與消耗**：${material}`] : []),
    `- **持續時間 (Duration)**：${duration}`,
    `- **專注 (Concentration)**：${concentration}`,
    `- **儀式 (Ritual)**：${ritual}`,
    `- **施法職業**：${classes}`,
    "",
    "## 🔮 法術效果描述",
    "",
    `- **效果**：${effect || "請依可定位來源補齊效果。"}（來源：${sourceLabel}，法術詳述，${sourceLocator(spell.english)}）`,
    ...(higher ? [`- **升環施法 (At Higher Levels)**：${higher}`] : []),
    "",
    "## 💡 實戰應用與裁量 (DM Ruling)",
    "",
    "> [!NOTE] DM 裁定",
    `> 使用 2014 規則時，依《${sourceLabel}》的可定位條文裁定。`,
    "",
    "## 🔗 相關連結",
    "",
    `- [[法術/2014/${ring.directory}/${indexName}|${indexName} (2014 Legacy)]]`,
    "",
  ];
  return lines.join("\n");
}

const spellsByRing = new Map();
for (const input of fs.readdirSync(inputDir).filter((name) => ringForFile(name))) {
  const ring = ringForFile(input);
  const sourcePath = path.join(inputDir, input);
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = line.match(/^####\s+(.+?)[｜|]\s*([A-Za-z][A-Za-z '\-]+)/);
    return match ? [{ index, chinese: match[1].trim(), english: match[2].trim() }] : [];
  });
  const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
  const spells = headings.map((spell, position) => {
    const end = headings[position + 1]?.index ?? lines.length;
    const block = lines.slice(spell.index + 1, end).filter((line) => line.trim());
    const page = spellPage({ spell, source, ring, block });
    writableCandidate({ destination: path.join(outputRoot, ring.directory, `${pageName(spell.chinese)}.md`), content: page, options });
    return spell;
  });
  spellsByRing.set(ring.number, { ring, spells, source });
}

for (const { ring, spells, source } of spellsByRing.values()) {
  const indexName = ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`;
  const entries = spells.map((spell) => `- [[法術/2014/${ring.directory}/${pageName(spell.chinese)}|${spell.chinese} (${spell.english}，2014 Legacy)]]`).join("\n");
  const content = `${frontmatter({ publicationId: options.publicationId, publication, kind: "spell-index", concept: `${ring.name}-spells`, title: `${ring.name}法術索引 (2014 ${ring.name} Spells Index)`, category: "法術", tag: "法術_索引", source, locator: `${ring.name}法術詳述` })}\n\n# ${ring.name}法術索引 (2014 ${ring.name} Spells Index)\n\n> 收錄《${publication.title_zh} ${publication.year}》的 ${ring.name} 法術。\n\n${entries}\n\n## 🔗 相關連結\n\n- [[法術/2014/法術索引|2014 法術索引 (2014 Spells Index)]]\n`;
  writableCandidate({ destination: path.join(outputRoot, ring.directory, `${indexName}.md`), content, options });
}

if (spellsByRing.size) {
  const source = [...spellsByRing.values()][0].source;
  const rows = [...spellsByRing.values()].sort((a, b) => a.ring.number - b.ring.number).map(({ ring }) => {
    const name = ring.number === 0 ? "戲法法術索引" : `${ring.name}法術索引`;
    return `| ${ring.number} | [[法術/2014/${ring.directory}/${name}\\|${name} (2014 Legacy)]] |`;
  }).join("\n");
  const content = `${frontmatter({ publicationId: options.publicationId, publication, kind: "spell-index", concept: "spells-index-2014", title: "2014 法術索引 (2014 Spells Index)", category: "法術", tag: "法術_索引", source, locator: "法術詳述 0–9 環" })}\n\n# 2014 法術索引 (2014 Spells Index)\n\n> 收錄《${publication.title_zh} ${publication.year}》的法術規則。與 2024 規則存在差異，或尚未完成逐條同一性確認的法術，保留在本 Legacy 索引。\n\n| 環階 | 索引 |\n| :---: | :--- |\n${rows}\n\n## 🔗 相關連結\n\n- [[法術索引|法術索引 (Spells Index)]]\n`;
  writableCandidate({ destination: path.join(outputRoot, "法術索引.md"), content, options });
}
