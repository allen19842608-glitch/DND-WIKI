import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";

const ROOT = process.cwd();
const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

const publication = option("--publication");
const reportArg = option("--report");
if (!publication || !reportArg) {
  console.error("Usage: node scripts/audit/preview-mirror-image-wiki-candidates.mjs --publication <ID> --report <path>");
  process.exit(1);
}

const mirrorRoot = path.join(ROOT, "原始資料", "外部來源鏡像", publication);
const manifest = YAML.parse(fs.readFileSync(path.join(mirrorRoot, "manifest.yml"), "utf8"));
const snapshot = JSON.parse(fs.readFileSync(path.join(mirrorRoot, path.basename(manifest.snapshot.file)), "utf8"));
const reportPath = path.resolve(ROOT, reportArg);

function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function fileExists(relative) {
  return fs.existsSync(path.join(ROOT, relative));
}

function wiki(relative) {
  if (!fileExists(relative)) throw new Error(`候選 Wiki 條目不存在：${relative}`);
  return relative;
}

const targets = {
  artificer: wiki("wiki/職業/奇械師.md"),
  alchemist: wiki("wiki/職業/奇械師/煉金師.md"),
  armorer: wiki("wiki/職業/奇械師/裝甲師.md"),
  artillerist: wiki("wiki/職業/奇械師/魔炮師.md"),
  battleSmith: wiki("wiki/職業/奇械師/戰地匠師.md"),
  dragonmarks: wiki("wiki/專長/龍紋專長/龍紋專長索引.md"),
  eberron: wiki("wiki/戰役設定/艾伯倫/艾伯倫索引.md"),
  sharn: wiki("wiki/戰役設定/艾伯倫/地理/城市與聚居地/薩恩/薩恩索引.md"),
  inquisitives: wiki("wiki/戰役設定/艾伯倫/地理/城市與聚居地/薩恩/薩恩探事員索引.md"),
  houses: wiki("wiki/戰役設定/艾伯倫/組織與派系/龍紋家族索引.md"),
  morgrave: wiki("wiki/戰役設定/艾伯倫/事件/莫格雷夫遠征索引.md"),
  airships: wiki("wiki/戰役設定/艾伯倫/文化與族群/元素飛艇索引.md"),
  cannith: wiki("wiki/戰役設定/艾伯倫/組織與派系/坎尼斯家族.md"),
  deneith: wiki("wiki/戰役設定/艾伯倫/組織與派系/鄧內斯家族.md"),
  ghallanda: wiki("wiki/戰役設定/艾伯倫/組織與派系/伽蘭達家族.md"),
  jorasco: wiki("wiki/戰役設定/艾伯倫/組織與派系/喬拉斯科家族.md"),
  kundarak: wiki("wiki/戰役設定/艾伯倫/組織與派系/昆達拉克家族.md"),
  lyrandar: wiki("wiki/戰役設定/艾伯倫/組織與派系/黎蘭達家族.md"),
  medani: wiki("wiki/戰役設定/艾伯倫/組織與派系/梅丹尼家族.md"),
  orien: wiki("wiki/戰役設定/艾伯倫/組織與派系/歐瑞恩家族.md"),
  phiarlan: wiki("wiki/戰役設定/艾伯倫/組織與派系/費亞蘭家族.md"),
  sivis: wiki("wiki/戰役設定/艾伯倫/組織與派系/西維斯家族.md"),
  tharashk: wiki("wiki/戰役設定/艾伯倫/組織與派系/撒剌釋克家族.md"),
  vadalis: wiki("wiki/戰役設定/艾伯倫/組織與派系/瓦達利斯家族.md"),
  tarkanan: wiki("wiki/戰役設定/艾伯倫/組織與派系/塔卡南家族.md"),
  emeraldClaw: wiki("wiki/戰役設定/艾伯倫/組織與派系/翡翠利爪教團.md"),
};

const imageLocations = new Map();
function visit(value, context) {
  if (Array.isArray(value)) {
    value.forEach((item) => visit(item, context));
    return;
  }
  if (!value || typeof value !== "object") return;
  const next = value.name ? { ...context, heading: value.name } : context;
  if (value.type === "image" && value.href?.path) {
    const record = {
      chapter: context.chapter,
      heading: context.heading,
      title: value.title || "",
      credit: value.credit || "",
    };
    if (!imageLocations.has(value.href.path)) imageLocations.set(value.href.path, record);
  }
  for (const [key, child] of Object.entries(value)) {
    if (["href", "name", "title", "credit"].includes(key)) continue;
    visit(child, next);
  }
}

for (const section of snapshot.data ?? []) {
  visit(section.entries ?? [], { chapter: section.name || "未分類區段", heading: section.name || "未分類區段" });
  // Credits are intentionally omitted from the chapter mirror, but their images remain auditable.
  if (section.name === "Credits") visit(section, { chapter: "Credits（中繼資料）", heading: "Credits（中繼資料）" });
}

function candidateFor(item) {
  const text = `${item.path} ${item.location?.title ?? ""}`.toLowerCase();
  const direct = [
    [/house-cannith/, targets.cannith], [/house-deneith/, targets.deneith],
    [/house-ghallanda/, targets.ghallanda], [/house-jorasco/, targets.jorasco],
    [/house-kundarak/, targets.kundarak], [/house-lyrandar/, targets.lyrandar],
    [/house-medani/, targets.medani], [/house-orien/, targets.orien],
    [/house-phiarlan/, targets.phiarlan], [/house-sivis/, targets.sivis],
    [/house-tharashk/, targets.tharashk], [/house-vadalis/, targets.vadalis],
    [/tarkanan/, targets.tarkanan], [/emerald-claw/, targets.emeraldClaw],
    [/battle-smith/, targets.battleSmith], [/artillerist/, targets.artillerist],
    [/armorer/, targets.armorer], [/alchemist/, targets.alchemist],
    [/artificer|warforged|forging/, targets.artificer],
    [/dragonmarks?/, targets.dragonmarks],
    [/inquisitive/, targets.inquisitives], [/sharn|city-of-towers|criminals-of-sharn/, targets.sharn],
    [/morgrave/, targets.morgrave], [/airship/, targets.airships],
  ];
  if (["Credits", "Credits（中繼資料）"].includes(item.location?.chapter)) {
    return { status: "不建議嵌入", target: "—", reason: "封面預覽屬 Credits 中繼資料，未進入章節正文。" };
  }
  if (/mobile-bastion|magic-items-in-case/.test(text) || item.location?.chapter.includes("Bastions") || item.location?.chapter.includes("Magic Items")) {
    return { status: "範圍外", target: "—", reason: "本輪範圍排除堡壘與魔法物品。" };
  }
  for (const [pattern, target] of direct) {
    if (pattern.test(text)) return { status: "直接候選", target, reason: "檔名或替代文字可唯一對應既有條目；仍須人工確認是否適合該段落。" };
  }
  const chapter = item.location?.chapter ?? "";
  const target = chapter.includes("The Artificer") ? targets.artificer
    : chapter.includes("Character Options") ? targets.eberron
    : chapter.includes("Sharn") ? targets.sharn
    : chapter.includes("Dragonmarked") ? targets.houses
    : chapter.includes("Morgrave") ? targets.morgrave
    : chapter.includes("Elemental Airships") ? targets.airships
    : chapter.includes("Art of Eberron") ? targets.eberron
    : null;
  return target
    ? { status: "章節級候選", target, reason: "只能定位至來源章節；沒有足以唯一對應的現有細項條目。" }
    : { status: "待人工判定", target: "—", reason: "來源位置無法安全映射至既有 Wiki 條目。" };
}

const items = (manifest.images ?? []).map((image) => ({ ...image, location: imageLocations.get(image.path) }));
const counts = new Map();
for (const item of items) {
  item.candidate = candidateFor(item);
  counts.set(item.candidate.status, (counts.get(item.candidate.status) ?? 0) + 1);
}

const lines = [
  `# ${manifest.publication_title}：圖片 → Wiki 條目候選位置（預覽）`,
  "",
  `- 出版品：\`${publication}\``,
  `- 來源鏡像：\`${manifest.snapshot.file}\``,
  `- 產生時間：${new Date().toISOString()}`,
  `- 圖片總數：${items.length}`,
  "",
  "本報告僅供人工決定是否嵌入；未改動任何 `wiki/` 條目。候選只指向已存在的條目，且「直接候選」仍需確認其視覺內容與欲放置段落相符。",
  "",
  "| 判定 | 數量 |",
  "| :--- | ---: |",
  ...[...counts.entries()].map(([status, count]) => `| ${status} | ${count} |`),
  "",
  "| 圖片 | 原始位置 | 候選 Wiki 條目 | 判定與原因 | 建議 Markdown（相對候選頁） |",
  "| :--- | :--- | :--- | :--- | :--- |",
];

for (const item of items) {
  const location = item.location ?? { chapter: "未定位（可能為 Credits 中繼資料）", heading: "—", title: "" };
  const c = item.candidate;
  const alt = location.title || path.basename(item.path, path.extname(item.path));
  const imageRef = `原始資料/外部來源鏡像/${publication}/images/${item.path}`;
  const markdown = c.target !== "—"
    ? `![${alt}](${path.relative(path.dirname(c.target), path.join(ROOT, imageRef)).replaceAll("\\", "/")})`
    : "—";
  lines.push(`| \`${escapeCell(item.path)}\`<br>${escapeCell(alt)} | ${escapeCell(location.chapter)}<br>${escapeCell(location.heading)} | ${c.target === "—" ? "—" : `\`${c.target}\``} | **${c.status}**：${escapeCell(c.reason)} | ${markdown === "—" ? "—" : `\`${escapeCell(markdown)}\``} |`);
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
console.log(`已產生：${path.relative(ROOT, reportPath)}（${items.length} 張圖片）`);
console.log([...counts.entries()].map(([status, count]) => `${status}=${count}`).join("；"));
