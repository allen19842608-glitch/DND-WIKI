import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI = path.join(ROOT, "wiki");
const TODAY = "2026-09-07";
const AL_SOURCE = "原始資料/冒險者聯盟/D&D Adventurers League Players Guide v2026.4.pdf";
const AL_RULE = "D&D Adventurers League Player’s Guide v2026.4";
const ALL_CAMPAIGNS = ["FR", "DL", "EB", "RV", "CR"];
const PLAYER_CATEGORIES = new Set(["職業", "種族", "背景", "專長", "法術"]);
const COMPATIBILITY = new Set(["compatible", "conditional", "replaced", "review"]);

const AL_BY_TAG = new Map([
  ["珊娜薩的萬事指南2017", { categories: new Set(["職業", "專長", "法術"]), campaigns: ALL_CAMPAIGNS, locator: "p. 10：Additional Rules Sources；Xanathar’s Guide to Everything（C、F）" }],
  ["塔莎的萬事坩堝2020", { categories: new Set(["種族", "職業", "專長", "法術"]), campaigns: ALL_CAMPAIGNS, locator: "p. 10：Additional Rules Sources；Tasha’s Cauldron of Everything（S、C、F）" }],
  ["費資本的巨龍寶庫2021", { categories: new Set(["種族", "職業", "專長", "法術"]), campaigns: ["FR", "DL", "RV", "CR"], locator: "p. 9：Additional Rules Sources；Fizban’s Treasury of Dragons（S、C、F）" }],
  ["魔鄧肯鉅獻多元宇宙的怪物2022", { categories: new Set(["種族"]), campaigns: ALL_CAMPAIGNS, locator: "p. 10：Additional Rules Sources；Mordenkainen Presents: Monsters of the Multiverse（S）" }],
  ["畢格比鉅獻巨人之榮耀2023", { categories: new Set(["職業", "背景", "專長"]), campaigns: ALL_CAMPAIGNS, locator: "p. 9：Additional Rules Sources；Bigby Presents: Glory of the Giants（C、F、B）" }],
  ["劍灣冒險者指南2015", { categories: new Set(["職業", "背景"]), campaigns: ["FR"], locator: "p. 10：Additional Rules Sources；Sword Coast Adventurer’s Guide（S、C、B）" }],
]);

const PHB_ALLOWED = new Set([
  "自然領域 (Nature Domain，2014 Legacy)",
  "風暴領域 (Tempest Domain，2014 Legacy)",
  "咒法學派 (School of Conjuration，2014 Legacy)",
  "惑控學派 (School of Enchantment，2014 Legacy)",
  "死靈學派 (School of Necromancy，2014 Legacy)",
  "變化學派 (School of Transmutation，2014 Legacy)",
  "地下城探索者 (Dungeon Delver，2014 Legacy)",
  "武技專家 (Martial Adept，2014 Legacy)",
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : entry.name.endsWith(".md") ? [absolute] : [];
  });
}

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)/);
  if (!match) return null;
  return { file, text, yaml: match[2], data: YAML.parse(match[2]) ?? {}, prefix: match[1], suffix: match[3] };
}

function escapeYaml(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function alStatus(data) {
  if (data.compatibility_2024 === "replaced") {
    return { availability: "unavailable", campaigns: [], note: "此 2014 Legacy 條目已由 2024 對應條目取代；AL 使用現行條目。", locator: "p. 1：Character Creation；使用最新版本的 D&D 內容" };
  }
  if (data.tags?.[0] === "玩家手冊2014") {
    if (PHB_ALLOWED.has(data.title)) {
      return { availability: "available", campaigns: ALL_CAMPAIGNS, note: "AL 明列此未更新的 2014 選項可用。", locator: "p. 1：Character Creation；未更新的 2014 選項" };
    }
    return { availability: "unavailable", campaigns: [], note: "AL 未將此傳承選項列為可用；不得因一般 2024 相容而使用。", locator: "p. 1：Character Creation；傳承選項除非明列，否則不可用" };
  }
  if (data.title === "定製血統 (Custom Lineage，2014 Legacy)") {
    return { availability: "conditional", campaigns: ALL_CAMPAIGNS, note: "僅能取得一項起源專長或未分類專長。", locator: "p. 9：Additional Rules Sources；Tasha’s Cauldron of Everything 註記" };
  }
  const mapping = AL_BY_TAG.get(data.tags?.[0]);
  if (mapping?.categories.has(data.category)) {
    const note = mapping.campaigns.length === ALL_CAMPAIGNS.length
      ? "AL 附錄 A 將此出版品與選項類型列為可用。"
      : `AL 附錄 A 僅列於 ${mapping.campaigns.join("、")} 戰役。`;
    return { availability: "available", campaigns: mapping.campaigns, note, locator: mapping.locator };
  }
  return { availability: "review", campaigns: [], note: "現行 AL 玩家指南不足以唯一判定此選項；待人工覆核。", locator: "pp. 9–10：Additional Rules Sources" };
}

function formatCampaigns(campaigns) {
  return campaigns.length ? `\nal_campaigns:\n${campaigns.map((campaign) => `  - "${campaign}"`).join("\n")}\n` : "\n";
}

function updateYaml(record, al) {
  let yaml = record.yaml
    .replace(/^al_availability:.*\r?\n/m, "")
    .replace(/^al_note:.*\r?\n/m, "")
    .replace(/^al_campaigns:\r?\n(?:  - .*\r?\n)*/m, "")
    .replace(/^updated: ".*"$/m, `updated: "${TODAY}"`);
  const fields = `al_availability: "${al.availability}"${formatCampaigns(al.campaigns)}al_note: "${escapeYaml(al.note)}"\n`;
  yaml = yaml.replace(/^(compatibility_2024:.*\r?\n)/m, `$1${fields}`);
  if (!(record.data.sources ?? []).some((source) => source?.file === AL_SOURCE)) {
    const source = `  - file: "${AL_SOURCE}"\n    locator: "${al.locator}"\n    authority: "官方"\n    translation: "none"\n`;
    yaml = yaml.replace(/^source_type:/m, `${source}source_type:`);
  }
  return yaml;
}

function statusLabel(status) {
  return ({ compatible: "可用", conditional: "條件式相容", replaced: "已取代", review: "待覆核" })[status];
}

function alLabel(row) {
  return ({ available: "可用", conditional: "條件式可用", unavailable: "禁用", review: "待覆核" })[row.data.al_availability];
}

function alScope(row) {
  if (["unavailable", "review"].includes(row.data.al_availability)) return row.data.al_note;
  const campaigns = row.data.al_campaigns ?? [];
  const campaignText = campaigns.length === ALL_CAMPAIGNS.length ? "全部戰役" : campaigns.join("、");
  return row.data.al_availability === "conditional" ? `${campaignText}；${row.data.al_note}` : campaignText;
}

function wikiLink(file, title) {
  const target = path.relative(WIKI, file).replaceAll("\\", "/").replace(/\.md$/, "");
  return `[[${target}\\|${title}]]`;
}

function indexFrontmatter({ title, id, category, tag }) {
  return [
    "---", `title: \"${title}\"`, `entity_id: \"entry:PHB2024:compatibility-index:${id}\"`, `concept_id: \"concept:compatibility-index:${id}\"`,
    "ruleset: \"2024\"", "content_scope: \"core\"", "status: \"current\"", "index_scope: \"curated\"", `category: \"${category}\"`, "version: \"2024-Core\"",
    "tags:", "  - \"玩家手冊2024\"", `  - \"${tag}\"`, "sources:",
    "  - file: \"原始資料/Updates in the Player’s Handbook (2024).md\"", "    locator: \"Using This Book with Older Books\"", "    authority: \"官方\"", "    translation: \"none\"",
    `  - file: \"${AL_SOURCE}\"`, "    locator: \"pp. 1、9-10：Character Creation；Additional Rules Sources\"", "    authority: \"官方\"", "    translation: \"none\"",
    "source_type: \"official\"", "confidence: \"interpreted\"", "rules_sources:", "  - \"Player’s Handbook (2024)\"", `  - \"${AL_RULE}\"`, "errata: []", `updated: \"${TODAY}\"`, "---",
  ].join("\n");
}

function table(rows) {
  return ["| 選項 | 2024 狀態 | AL 狀態 | AL 戰役／限制 |", "| :--- | :--- | :--- | :--- |", ...rows.map((row) => `| ${wikiLink(row.file, row.data.title)} | ${statusLabel(row.data.compatibility_2024)} | ${alLabel(row)} | ${alScope(row)} |`)];
}

function renderCategoryIndex(category, rows, destination) {
  const title = category === "法術" ? "2024／AL 相容法術索引" : `2024／AL 相容${category === "職業" ? "子職" : category}索引`;
  const id = `legacy-${category === "職業" ? "subclasses" : category === "種族" ? "species" : category === "背景" ? "backgrounds" : category === "專長" ? "feats" : "spells"}-2024-al`;
  const sections = [indexFrontmatter({ title, id, category, tag: `${category}_索引` }), "", `# ${title}`, "", "> 本索引分開記錄一般 2024 規則關係與現行冒險者聯盟（AL）可用性；AL 禁用不代表一般 2024 規則不可使用。"];
  if (category === "法術") {
    const levels = ["戲法", "一環", "二環", "三環", "四環", "五環", "六環", "七環", "八環", "九環"];
    for (const level of levels) {
      const levelRows = rows.filter((row) => row.data.tags?.[1] === `法術_${level}` && row.data.compatibility_2024 !== "replaced");
      if (levelRows.length) sections.push("", `## ${level}`, "", ...table(levelRows));
    }
  } else {
    const visible = rows.filter((row) => row.data.compatibility_2024 !== "replaced");
    if (visible.length) sections.push("", "## 2024 相容選項", "", ...table(visible));
  }
  sections.push("", "## 🔗 相關連結", "", `- [[${category}/${category === "職業" ? "職業索引" : category === "法術" ? "法術索引" : `${category}索引`}\\|2014 Legacy ${category}索引]]`, "- [[規則/勘誤與版本/2014至2024/2024與冒險者聯盟相容性總覽索引|2024／AL 相容性總覽索引]]");
  return `${sections.join("\n")}\n`;
}

function renderOverview(groups) {
  const title = "2024／AL 相容性總覽索引";
  const rows = [...groups.entries()].map(([category, entries]) => {
    const counts = ["compatible", "conditional", "replaced", "review"].map((status) => `${statusLabel(status)} ${entries.filter((row) => row.data.compatibility_2024 === status).length}`).join("；");
    const target = category === "法術" ? "法術/2024相容法術索引" : `${category}/2024相容${category === "職業" ? "子職" : category}索引`;
    return `| [[${target}\\|${category}相容索引]] | ${entries.length} | ${counts} |`;
  });
  return `${indexFrontmatter({ title, id: "legacy-options-2024-al", category: "規則機制", tag: "規則_勘誤與版本" })}\n\n# ${title}\n\n> 「2024 狀態」判定規則版本關係；「AL 狀態」判定此 Legacy 條目能否在冒險者聯盟使用。兩者不可互相推導。\n\n| 類別 | 條目數 | 2024 狀態分布 |\n| :--- | --: | :--- |\n${rows.join("\n")}\n\n## 🔗 相關連結\n\n- [[2014至2024版本差異導覽|2014 至 2024 版本差異導覽]]\n- [[冒險者聯盟/玩家規則/戰役可用來源表|D&D 冒險者聯盟戰役可用來源表]]\n`;
}

function updateBody(record, al) {
  const headingPattern = /\n{0,2}#{2,3} (?:2024 與冒險者聯盟適用範圍|2024 與 AL 適用範圍|冒險者聯盟 2024 相容性)\r?\n[\s\S]*?(?=\n##(?:#| )|\s*$)/g;
  let body = record.text.slice(record.prefix.length + record.yaml.length + record.suffix.length);
  const rule = ({ compatible: "可使用此 Legacy 條目。", conditional: "可使用，但須遵守本條目記錄的 2024 調整。", replaced: "已由 2024 對應條目取代；應使用現行條目。", review: "尚待逐條覆核；不得視為已確認可用。" })[record.data.compatibility_2024];
  const campaigns = al.campaigns.length ? `；適用戰役：${al.campaigns.join("、")}` : "";
  const section = `\n## 2024 與 AL 適用範圍\n\n- **一般 2024 規則**：${statusLabel(record.data.compatibility_2024)}；${rule}\n- **冒險者聯盟**：${({ available: "可用", conditional: "條件式可用", unavailable: "禁用", review: "待覆核" })[al.availability]}${campaigns}；${al.note}（來源：${AL_RULE}，${al.locator}）\n`;
  const indexTitle = record.data.category === "職業" ? "2024／AL 相容子職索引" : `2024／AL 相容${record.data.category}索引`;
  const indexTarget = record.data.category === "職業" ? "職業/2024相容子職索引" : `${record.data.category}/2024相容${record.data.category}索引`;
  const backlink = `- [[${indexTarget}|${indexTitle}]]\n`;
  if (body.includes(section.trim()) && body.includes(backlink.trim())) return body;
  body = body.replace(headingPattern, "");
  body = body.replace(backlink, "");
  const anchor = /^## 🔗 相關連結/m;
  if (anchor.test(body)) return body.replace(anchor, `${section}\n## 🔗 相關連結\n\n${backlink}`);
  return `${body.trimEnd()}${section}\n## 🔗 相關連結\n\n${backlink}`;
}

const apply = process.argv.includes("--apply");
const records = walk(WIKI).map(parse).filter((record) => record
  && record.data.ruleset === "2014"
  && record.data.status === "legacy"
  && PLAYER_CATEGORIES.has(record.data.category)
  && COMPATIBILITY.has(record.data.compatibility_2024)
  && !String(record.data.title ?? "").includes("索引"));

const groups = new Map(["職業", "種族", "背景", "專長", "法術"].map((category) => [category, []]));
const changes = [];
for (const record of records) {
  const al = alStatus(record.data);
  const yaml = updateYaml(record, al);
  const data = YAML.parse(yaml);
  const body = updateBody(record, al);
  const next = `${record.prefix}${yaml}${record.suffix}${body}`;
  const nextRecord = { ...record, data };
  groups.get(record.data.category).push(nextRecord);
  if (next !== record.text) changes.push({ file: record.file, next });
}

const indexes = [
  ["職業", path.join(WIKI, "職業", "2024相容子職索引.md")],
  ["種族", path.join(WIKI, "種族", "2024相容種族索引.md")],
  ["背景", path.join(WIKI, "背景", "2024相容背景索引.md")],
  ["專長", path.join(WIKI, "專長", "2024相容專長索引.md")],
  ["法術", path.join(WIKI, "法術", "2024相容法術索引.md")],
];
for (const [category, destination] of indexes) {
  const next = renderCategoryIndex(category, groups.get(category), destination);
  const current = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : "";
  if (next !== current) changes.push({ file: destination, next });
}
const overview = path.join(WIKI, "規則", "勘誤與版本", "2014至2024", "2024與冒險者聯盟相容性總覽索引.md");
const overviewText = renderOverview(groups);
if (!fs.existsSync(overview) || fs.readFileSync(overview, "utf8") !== overviewText) changes.push({ file: overview, next: overviewText });

for (const change of changes) {
  process.stdout.write(`${apply ? "套用" : "預覽"}：${path.relative(ROOT, change.file).replaceAll("\\", "/")}\n`);
  if (apply) fs.writeFileSync(change.file, change.next, "utf8");
}
process.stdout.write(`${apply ? "已更新" : "預覽"}：${records.length} 個玩家選項；${changes.length} 個檔案待寫入。\n`);
