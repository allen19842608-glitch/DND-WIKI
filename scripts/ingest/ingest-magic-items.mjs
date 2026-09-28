import fs from "node:fs";
import path from "node:path";
import { ROOT, candidateChange, frontmatter, loadIngestProfile, loadPublication, option as publicationOption, planCandidateBatch, resolveRawInputPath, validateCliOptions, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { withIndexEffects } from "../core/index-candidates.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";
import { mirrorEntityPage } from "../core/mirror-entity-page.mjs";
import { matchExistingMagicItem } from "../core/magic-item-identity.mjs";
import { readWikiPages } from "../core/wiki-records.mjs";

const root = ROOT;
const cliArgs = process.argv.slice(2);
validateCliOptions(cliArgs, { extraBooleanOptions: ["--force"] });
if (cliArgs.includes("--source") || cliArgs.includes("--output")) throw new Error("魔法物品解析器的來源與輸出只由出版品設定提供。");
const positionals = [];
for (let index = 0; index < cliArgs.length; index += 1) {
  if (["--only", "--publication", "--report"].includes(cliArgs[index])) { index += 1; continue; }
  if (!cliArgs[index].startsWith("--")) positionals.push(cliArgs[index]);
}
if (positionals.length > 1) throw new Error("魔法物品解析器最多只能指定一種類型。");
const requestedType = positionals[0];
if (requestedType && ([".", ".."].includes(requestedType) || /[\\/]/.test(requestedType))) {
  throw new Error(`魔法物品類型必須是單一來源目錄名稱：${requestedType}`);
}
const force = process.argv.includes("--force") || process.argv.includes("--replace");
const apply = process.argv.includes("--apply");
if (apply) throw new Error("魔法物品解析器不直接寫入 Wiki；請使用 wiki:preview 產生候選，再以 wiki:apply 套用。");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : undefined;
const report = publicationOption(process.argv.slice(2), "--report");
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const publicationId = publicationOption(process.argv.slice(2), "--publication") ?? "DMG2024";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const sourceRoot = profile.inputs.magic_items ? resolveRawInputPath({ root, sourceRoot: profile.source_root, input: profile.inputs.magic_items }) : null;
const itemTypes = sourceRoot && requestedType ? [requestedType] : sourceRoot && fs.existsSync(sourceRoot)
  ? fs.readdirSync(sourceRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  : [];
const sourceFiles = profile.outputs.magic_items ? itemTypes.flatMap((itemType) => {
  const sourceDir = path.join(sourceRoot, itemType);
  return fs.existsSync(sourceDir)
    ? fs.readdirSync(sourceDir, { recursive: true }).filter((name) => name.endsWith(".md")).map((name) => ({ itemType, sourcePath: path.join(sourceDir, name) }))
    : [];
}) : [];
const rawBoundary = `${path.resolve(root, "原始資料")}${path.sep}`;
for (const { sourcePath } of sourceFiles) {
  if (!fs.realpathSync(sourcePath).startsWith(rawBoundary)) throw new Error(`魔法物品來源越出原始資料/：${sourcePath}`);
}
const existingPages = readWikiPages(root, { directory: "wiki/魔法物品" });
const candidates = [];
const results = [];
if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  results.push({
    category: "魔法物品",
    status: "incomplete",
    reason: sourceRoot ? `設定的來源輸入不存在：${path.relative(root, sourceRoot).replaceAll("\\", "/")}` : "缺少 inputs.magic_items",
  });
}
if (!profile.outputs.magic_items) results.push({ category: "魔法物品", status: "incomplete", reason: "缺少 outputs.magic_items" });
for (const itemType of itemTypes) {
  if (sourceFiles.some((item) => item.itemType === itemType)) continue;
  results.push({ category: "魔法物品", item_type: itemType, status: "incomplete", reason: "source_type_missing_or_empty" });
}

function effectName(text) {
  const boldName = text.match(/^(?:\*\s+)?\*\*([^*]+?)\*\*[。.]?/);
  if (boldName) return boldName[1].replace(/\s+[A-Za-z].*$/, "").trim();
  if (/固定在原處/.test(text)) return "固定權杖";
  if (/從氣元素位面召喚/.test(text)) return "召喚氣巨靈";
  if (/被召喚期間.*態度友好/.test(text)) return "氣巨靈命令";
  if (/氣巨靈消失後/.test(text)) return "召喚限制";
  if (/X 射線視覺/.test(text)) return "X 射線視覺";
  if (/閱讀你的思想/.test(text)) return "心靈防護";
  if (/無法被察覺/.test(text)) return "隱匿戒指";
  if (/靈魂將進入戒指/.test(text)) return "靈魂寄宿";
  if (/施展\*水上行走/.test(text)) return "施展水上行走";
  if (/舞光術.*光亮術/.test(text)) return "施展光照法術";
  if (/球體都出現.*維持專注/.test(text)) return "球狀閃電持續時間";
  if (/困難地形.*麻痺.*束縛/.test(text)) return "自由行動";
  if (/墜落時每輪/.test(text)) return "羽落";
  if (/施展\*跳躍術/.test(text)) return "施展跳躍術";
  if (/寒冷傷害.*減少/.test(text)) return "寒冷傷害減免";
  if (/0 華氏度/.test(text)) return "低溫防護";
  if (/替代該目標成為此次攻擊的目標/.test(text)) return "吸矢";
  if (/感知距你最近.*類型相同的龍類/.test(text)) return "感知龍類";
  if (/使其活化/.test(text) && /盾牌/.test(text)) return "活化";
  if (/敏捷（隱匿）檢定具有劣勢.*力量屬性具有要求/.test(text)) return "秘銀輕量化";
  if (/魔法硬頭鎚/.test(text)) return "魔法硬頭鎚";
  if (/魔契師法術.*加值/.test(text)) return "魔契法術加值";
  if (/恢復一個法術位/.test(text)) return "恢復法術位";
  if (/吸收.*法術/.test(text)) return "吸收法術";
  if (/知曉.*吸收.*能量/.test(text)) return "儲存能量";
  if (/轉化為法術位/.test(text)) return "轉化法術能量";
  if (/激活.*半位面/.test(text)) return "庇護半位面";
  if (/生命骰/.test(text)) return "半位面休養";
  if (/停留時間耗盡/.test(text)) return "返回原處";
  if (/停止發光.*結束這個效應/.test(text)) return "防護靈光持續時間";
  if (/重擊.*普通命中/.test(text)) return "重擊防護";
  if (/魔法.*動作.*脫下.*護甲/.test(text)) return "快速脫甲";
  if (/\bAC\b.*加值|護甲等級.*加值/.test(text)) return "護甲等級加值";
  if (/游泳速度/.test(text)) return "游泳速度";
  if (/無法恢復生命值/.test(text)) return "阻礙生命恢復";
  if (/恢復.*生命值|生命值.*恢復/.test(text)) return "生命恢復";
  if (/施展.*祈願術/.test(text)) return "祈願術";
  if (/施展.*心靈遙控/.test(text)) return "心靈遙控";
  if (/施展.*法術/.test(text)) return "施展法術";
  if (/隱形/.test(text)) return "隱形";
  if (/抗性/.test(text)) return "傷害抗性";
  if (/充能/.test(text)) return "充能效果";
  if (/豁免/.test(text)) return "豁免防護";
  if (/護甲等級/.test(text)) return "護甲防護";
  if (/先攻.*優勢|察覺.*優勢/.test(text)) return "警戒優勢";
  return "特殊能力";
}

function normalizeText(text) {
  return text
    .replace(/(\d)(?:尺)/g, "$1 呎")
    .replace(/(\d)(?:磅)/g, "$1 磅")
    .replace(/\bDC(\d+)/g, "DC $1")
    .replace(/(\d)(?:充能)/g, "$1 充能");
}

function limitRecovery(text) {
  const sentences = normalizeText(text).match(/[^。]*。/g) ?? [];
  const limits = sentences.filter((sentence) => /直至|每日黎明|每天|長休|短休|充能耗盡|無法再次使用|死亡|消失/.test(sentence));
  return limits.length ? `\n  - **限制與恢復**：${limits.join("")}` : "";
}

function isDescription(text) {
  if (/可以使用以下額外詞條/.test(text)) return true;
  if (/具有以下詞條/.test(text)) return true;
  if (/正面呈現出一張臉.*改變.*表情/.test(text)) return true;
  if (/通常由.*象徵贈予/.test(text)) return true;
  if (/連接著四個元素位面之一/.test(text)) return true;
  if (/具有以下兩種詞條/.test(text)) return true;
  return /(?:是以.*製成|飾有.*紋樣|外表|傳說.*製作|由.*強化|無害無味.*煙霧|無害.*煙霧|永遠不會髒|正面呈現出一張臉.*改變.*表情)/.test(text)
    && !/(?:獲得|可以|能夠|具有|當你|受到|執行|消耗|恢復)/.test(text);
}

for (const { itemType, sourcePath } of sourceFiles) {
  const outputDir = path.join(root, profile.outputs.magic_items, itemType);
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  let entities = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^#{2,6}\s+(.+?)\s+([A-Za-z].*)$/);
    if (!match) continue;
    entities += 1;
    const [, chinese, english] = match;
    const filename = chinese.replace(/[\\/:*?"<>|\[\]()]/g, "");
    const destination = path.join(outputDir, `${filename}.md`);
    const meta = lines.slice(i + 1, i + 4).map((line) => line.trim()).find((line) => /^(?:\*|_).+(?:\*|_)$/.test(line)) ?? "";
    const metaText = meta.replace(/^[*_]|[*_]$/g, "");
    if (!/(?:普通|非普通|珍稀|極珍稀|傳說|神器|多種稀有度)/.test(metaText)) {
      results.push({ item_type: itemType, english_name: english.trim(), source: path.relative(root, sourcePath).replaceAll("\\", "/"), status: "out_of_scope", reason: "non_magic_item_heading" });
      continue;
    }
    if (only && !filename.includes(only) && !english.toLowerCase().includes(only.toLowerCase())) {
      results.push({ item_type: itemType, english_name: english.trim(), target: path.relative(root, destination).replaceAll("\\", "/"), status: "out_of_scope", reason: "only_filter" });
      continue;
    }
    const mirror = mirrorEntityPage({ root, profile, publicationId, english: english.trim(), kind: "magic-item" });
    if (mirror.status !== "matched") {
      results.push({ item_type: itemType, english_name: english.trim(), target: path.relative(root, destination).replaceAll("\\", "/"), status: mirror.status, reason: mirror.reason });
      continue;
    }
    const destinationTarget = path.relative(root, destination).replaceAll("\\", "/");
    const identity = matchExistingMagicItem(existingPages, { english: english.trim(), target: destinationTarget,
      publicationId, sourceRoot: profile.source_root, mirrorRoot: profile.canonical_mirror?.output_root, ruleset: profile.ruleset });
    if (["conflict", "ambiguous"].includes(identity.status)) {
      results.push({ item_type: itemType, english_name: english.trim(), mirror_page: mirror.page, target: destinationTarget,
        status: identity.status, reason: identity.reason, matches: identity.matches });
      continue;
    }
    if (identity.status === "matched" && (!force || !identity.same_target)) {
      results.push({ item_type: itemType, english_name: english.trim(), mirror_page: mirror.page, target: identity.target,
        status: "matched", reason: "same_publication_page_preserved" });
      continue;
    }
    const itemCategory = metaText.match(/^(.+?)(?:，)?(?:普通|非普通|珍稀|極珍稀|傳說|神器|多種稀有度)(?:（[^）]+）)?$/)?.[1] ?? itemType;
    const rarity = metaText.match(/[），](普通|非普通|珍稀|極珍稀|傳說|神器)/)?.[1] ?? path.basename(sourcePath, ".md");
    const attunement = meta.includes("需同調") ? "需要" : "不需要";
    const paragraphs = [];
    const tables = [];
    let table = [];
    for (let j = i + 1; j < lines.length && !/^#{2,6}\s+/.test(lines[j]); j += 1) {
      const text = lines[j].trim();
      if (text.startsWith("|")) { table.push(text); continue; }
      if (table.length) { tables.push(table.join("\n")); table = []; }
      if (text && !/^(?:\*|_).+(?:\*|_)$/.test(text)) {
        if (/^\*\s+/.test(text) && paragraphs.length) paragraphs[paragraphs.length - 1] += `\n${text}`;
        else paragraphs.push(text);
      }
    }
    if (table.length) tables.push(table.join("\n"));
    const descriptions = paragraphs.filter(isDescription);
    const effectParagraphs = paragraphs.filter((text) => !isDescription(text));
    const activation = {
      "護甲": `著裝${attunement === "需要" ? "並同調" : ""}期間；依效果所列時機。`,
      "武器": `持握${attunement === "需要" ? "並同調" : ""}期間；依效果所列時機。`,
      "戒指": `佩戴${attunement === "需要" ? "並同調" : ""}期間；依效果所列時機。`,
      "權杖": `持握${attunement === "需要" ? "並同調" : ""}期間；依效果所列時機。`,
      "法杖": `持握${attunement === "需要" ? "並同調" : ""}期間；依效果所列時機。`,
      "魔杖": `持握${attunement === "需要" ? "並同調" : ""}期間；依效果所列時機。`,
    }[itemType] ?? "依效果所列時機。";
    const effects = effectParagraphs.map((text) => `- **${effectName(text)}**：\n  - **啟用／觸發**：${activation}\n  - **效果與數值**：${normalizeText(text).replace(/\n/g, "\n    ")}${limitRecovery(text)}`).join("\n\n");
    const source = path.relative(root, sourcePath).split(path.sep).join("/");
    const randomTables = tables.length ? `\n### 隨機表\n\n${tables.join("\n\n")}\n` : "";
    const descriptionSection = descriptions.length ? `\n## 物品描述\n\n${descriptions.join("\n\n")}\n` : "";
    const effectsSection = effects ? `\n### 物品效果\n\n${effects}` : "";
    const dmSection = effects ? `\n## 💡 實戰應用與裁量 (DM Ruling)\n\n- **常見誤區**：啟用、充能與限制均依各效果的來源描述。\n` : "";
    const page = `---\ntitle: "${chinese} (${english})"\ncategory: "魔法物品"\nversion: "2024-Core"\ntags:\n  - "城主指南2024"\n  - "魔法物品_${itemType}"\nsources:\n  - file: "${source}"\n    locator: "L${i + 1} 標題：${chinese}"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Dungeon Master's Guide (2024)"\nerrata: []\nupdated: "${updated}"\n---\n\n# ${chinese} (${english})${descriptionSection}\n## ⚙️ 規則條文 (Rule Text)\n\n### 物品資料\n\n| 項目 | 內容 |\n| :--- | :--- |\n| 類別 (Category) | ${itemCategory} |\n| 稀有度 (Rarity) | ${rarity} |\n| 同調 (Attunement) | ${attunement} |\n| 消耗品 (Consumable) | 否 |\n| 充能 (Charges) | 依效果說明 |\n${effectsSection}${randomTables}${dmSection}\n## 🔗 相關連結\n\n- 無。\n`;
    const headerEnd = page.indexOf("\n---", 4);
    const output = `${frontmatter({ publicationId, publication, kind: "magic-item", concept: english, title: `${chinese} (${english})`, category: "魔法物品", tag: `魔法物品_${itemType}`, source, locator: `L${i + 1} 標題：${chinese}`, mirror })}${page.slice(headerEnd + 4)}`;
    const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
    candidates.push(candidateChange({ destination, before, after: output, operation: before === null ? "create" : "update", source, locator: `L${i + 1} 標題：${chinese}`, status: "manual_review", review: ["magic_item_template_and_terminology_review_required"] }));
    results.push({ item_type: itemType, english_name: english.trim(), mirror_page: mirror.page, target: path.relative(root, destination).replaceAll("\\", "/"), status: "manual_review", reason: "magic_item_template_and_terminology_review_required" });
  }
  if (!entities) results.push({ item_type: itemType, source: path.relative(root, sourcePath).replaceAll("\\", "/"), status: "incomplete", reason: "source_structure_unsupported" });
}

const plan = {
  ...planCandidateBatch(withIndexEffects(candidates, { root, source: "magic-item-index" }), { root, lint: lintWiki,
    sourceFiles: [...sourceFiles.map((item) => path.relative(root, item.sourcePath).replaceAll("\\", "/")),
      ...(profile.canonical_mirror?.output_root ? ["manifest.yml", `book-${profile.canonical_mirror.book_id}.json`]
        .map((name) => path.join(profile.canonical_mirror.output_root, name).replaceAll("\\", "/")).filter((name) => fs.existsSync(path.join(root, name))) : [])] }),
  publication_id: publicationId,
  category: "魔法物品",
  item_types: itemTypes,
  results,
};
if (report) writeCandidatePlan(plan, report, { root });
