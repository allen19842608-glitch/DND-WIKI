import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { applyCandidateBatch, candidateChange, parseOptions, planCandidateBatch, writeCandidatePlan } from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_ROOT = path.join(ROOT, "wiki");
const LORE_ROOT = "wiki/戰役設定";
const GREYHAWK_LEGACY_ROOT = `${LORE_ROOT}/戰役創作/戰役設計/灰鷹`;
const options = parseOptions(process.argv.slice(2));
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function posix(value) {
  return value.split(path.sep).join("/");
}

function absolute(rel) {
  return path.join(ROOT, ...rel.split("/"));
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory()
      ? walk(target)
      : entry.isFile() && entry.name.endsWith(".md")
        ? [target]
        : [];
  });
}

const loreConfig = YAML.parse(fs.readFileSync(path.join(ROOT, "config", "lore.yml"), "utf8"));
const worlds = Object.fromEntries(
  Object.entries(loreConfig.worlds).map(([id, world]) => [world.label, { id, ...world }]),
);
const types = Object.fromEntries(
  Object.entries(loreConfig.lore_types).map(([id, loreType]) => [loreType.label, { id, ...loreType }]),
);

function worldFor(rel) {
  if (rel.startsWith(`${GREYHAWK_LEGACY_ROOT}/`)) return worlds.灰鷹;
  const match = rel.match(/^wiki\/戰役設定\/([^/]+)\//);
  if (!match || match[1] === "戰役創作") return null;
  return worlds[match[1]] ?? null;
}

function legacySubpath(rel, world) {
  const root = world.label === "灰鷹" && rel.startsWith(`${GREYHAWK_LEGACY_ROOT}/`)
    ? GREYHAWK_LEGACY_ROOT
    : world.root;
  return rel.slice(root.length + 1);
}

function representedType(world, subpath, basename) {
  // 世界根索引不屬於實體類型；分類結果只用來保留既有概念 ID 的類型尾碼。
  if (basename === path.posix.basename(world.index, ".md")) return "世界觀";
  const existingDirectory = subpath.split("/")[0];
  const configuredType = Object.values(types).find(
    (item) => item.id !== "index" && item.directory === existingDirectory,
  );
  if (configuredType) return configuredType.label;
  if (world.label === "多元宇宙") {
    if (/^位面-|位面$|位面-|物質領域|內層位面|外層位面|過渡位面/.test(basename)) return "地理";
    return "世界觀";
  }
  if (world.label === "被遺忘的國度") {
    if (subpath.startsWith("派系/") || /家族/.test(basename)) return "組織與派系";
    if (/巴爾|信仰|宗教|崇拜|神聖魔法|死後歸宿/.test(basename)) return "神祇與信仰";
    if (/國度傳說|古帝國|奧法帝國/.test(basename)) return "歷史";
    if (/哈普托斯曆/.test(basename)) return "文化與族群";
    if (/劍灣|北地|埃諾奧克|央土|無痕海|維洪海域|遺忘之地|陰謀之地/.test(basename)) return "地理";
    return "世界觀";
  }
  if (world.label === "鴉閣魔域") {
    return /迷霧之地/.test(basename) ? "地理" : "世界觀";
  }
  if (world.label === "灰鷹") {
    if (subpath.includes("灰鷹地理志/") || subpath.includes("自由城市灰鷹/")) return "地理";
    if (/灰鷹諸神/.test(basename)) return "神祇與信仰";
    if (/派系和組織/.test(basename)) return "組織與派系";
    if (/灰鷹的傳說/.test(basename)) return "歷史";
    if (/重要名詞/.test(basename)) return "文化與族群";
    return "世界觀";
  }
  if (world.label === "艾伯倫") {
    if (/艾伯倫歷史|終末戰爭/.test(basename)) return "歷史";
    if (/龍紋 NPC|龍紋角色|探事員角色|莫格雷夫角色|對手探險家/.test(basename)) return "人物";
    if (/哀傷故地|危險目的地|薩恩街區/.test(basename)) return "地理";
    if (/巨龍$|類地精|科瓦雷的生活/.test(basename)) return "文化與族群";
    if (/冒險主題|艾伯倫旅行|存在位面/.test(basename)) return "世界觀";
    if (/衝突|冒險$|爭奪戰|敵人的敵人/.test(basename)) return "事件";
    if (subpath.includes("探事員/") && /波羅馬氏族|達斯克|黑暗夢境/.test(basename)) return "組織與派系";
    if (subpath.startsWith("信仰/")) return "神祇與信仰";
    if (subpath.startsWith("科瓦雷/") || subpath.startsWith("遠方諸地/")) return "地理";
    if (subpath.startsWith("元素飛艇/")) return "文化與族群";
    if (subpath.startsWith("龍紋家族/")) return "組織與派系";
    if (subpath.startsWith("莫格雷夫遠征/")) return "事件";
    if (subpath.startsWith("冒險與勢力/")) return "組織與派系";
    if (subpath.startsWith("薩恩/")) return "地理";
    return "世界觀";
  }
  throw new Error(`未定義世界分類：${world.label}`);
}

function classification(world, subpath) {
  const basename = path.posix.basename(subpath, ".md");
  const represented = representedType(world, subpath, basename);
  const loreType = basename.includes("索引") ? "索引" : represented;
  return { loreType, represented };
}

function conceptTail(value, rel) {
  const tail = String(value ?? "").split(":").at(-1);
  if (/^[a-z0-9][a-z0-9-]*$/.test(tail ?? "")) return tail;
  return `source-${crypto.createHash("sha1").update(rel).digest("hex").slice(0, 12)}`;
}

function updateFrontmatter(text, entry) {
  const concept = text.match(/^concept_id: "([^"]+)"$/m)?.[1];
  const tail = entry.conceptTail ?? conceptTail(concept, entry.oldRel);
  const conceptId = `concept:setting:${entry.world.id}:${types[entry.loreType].id}:${tail}`;
  let next = text.replace(/^concept_id: "[^"]+"$/m, `concept_id: "${conceptId}"`);
  next = next.replace(
    /^category: "戰役設定"\r?\n(?:setting: "[^"]+"\r?\nlore_type: "[^"]+"\r?\n)?setting_continuity: "continuous"$/m,
    [
      'category: "戰役設定"',
      `setting: "${entry.world.label}"`,
      `lore_type: "${entry.loreType}"`,
      'setting_continuity: "continuous"',
    ].join(text.includes("\r\n") ? "\r\n" : "\n"),
  );
  next = next.replace(/^  - "戰役設定_[^"]+"$/m, `  - "戰役設定_${entry.world.label}"`);
  return next;
}

function extractBody(text) {
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("合併頁缺少合法 Frontmatter。");
  return match[1];
}

function mergeContinuousLore(canonical, older, { note, heading }) {
  const newline = canonical.includes("\r\n") ? "\r\n" : "\n";
  const olderSource = older.match(/^sources:\r?\n([\s\S]*?)^source_type:/m)?.[1];
  if (!olderSource) throw new Error("塔卡南家族舊頁缺少 sources。");
  let merged = canonical.replace(
    /^source_type:/m,
    `${olderSource.replace(/\r?\n/g, newline)}source_type:`,
  );
  if (!merged.includes('  - "Eberron: Rising from the Last War (2019)"')) {
    merged = merged.replace(
      /^errata:/m,
      `  - "Eberron: Rising from the Last War (2019)"${newline}errata:`,
    );
  }
  merged = merged.replace(/^updated: "[^"]+"$/m, 'updated: "2026-08-26"');
  let olderBody = extractBody(older)
      .replace(/^(?:\r?\n)*# [^\r\n]+\r?\n+/, "")
    .replace(/\r?\n## 🔗 相關連結[\s\S]*$/, "")
    .replace(/^(#{2,6}) /gm, (match, hashes) => `${"#".repeat(Math.min(6, hashes.length + 1))} `)
    .trim();
  olderBody = olderBody.replace(/\r?\n/g, newline);
  const supplement = [
    "## 來源差異與不確定性",
    "",
    `- ${note}`,
    "",
    `## ${heading}`,
    "",
    olderBody,
    "",
  ].join(newline);
  if (!merged.includes("## 來源差異與不確定性")) {
    merged = merged.replace(
      `${newline}## 🔗 相關連結`,
      `${newline}${supplement}${newline}## 🔗 相關連結`,
    );
  }
  return merged;
}

function mergeHouseTarkanan(canonical, older) {
  return mergeContinuousLore(canonical, older, {
    note: "2019 年來源將索拉・塔卡南描述為創始人兼領袖；2025 年來源則記載她已把領導權交給『凱伯之子』。本頁將此視為設定時間推進，而非互斥版本。",
    heading: "《從終末戰爭中崛起》（2019）補充",
  });
}

function mergeDragonmarkedHouses(canonical, older) {
  return mergeContinuousLore(canonical, older, {
    note: "2025 年來源明示以 2019 年出版品的基本資料為前提，再補充家族陰謀與聲望選項；兩者合併為同一連續設定頁。",
    heading: "《從終末戰爭中崛起》（2019）基本資料",
  });
}

let entries = walk(path.join(ROOT, "wiki", "戰役設定"))
  .map((file) => posix(path.relative(ROOT, file)))
  .map((oldRel) => {
    const world = worldFor(oldRel);
    if (!world) return null;
    const existing = fs.readFileSync(absolute(oldRel), "utf8");
    if (/^(?:"content_scope"|content_scope): "organized_play"$/m.test(existing)) return null;
    const existingSetting = existing.match(/^(?:"setting"|setting): "([^"]+)"$/m)?.[1];
    const existingLoreType = existing.match(/^(?:"lore_type"|lore_type): "([^"]+)"$/m)?.[1];
    // 現行三層架構已經有明確 metadata 時，不以舊式路徑啟發式覆蓋它；
    // 特別是索引頁無法可靠反推其所代表的實體類型。
    if (existingSetting === world.label && types[existingLoreType]) {
      return { oldRel, newRel: oldRel, world, loreType: existingLoreType, represented: existingLoreType === "索引" ? "世界觀" : existingLoreType, preserve: true, content: existing };
    }
    const subpath = legacySubpath(oldRel, world);
    const { loreType, represented } = classification(world, subpath);
    const basename = path.posix.basename(subpath);
    const worldIndexName = path.posix.basename(world.index);
    const destinationDirectory = basename === worldIndexName
      ? world.root
      : `${world.root}/${types[represented].directory}`;
    return {
      oldRel,
      newRel: `${destinationDirectory}/${basename}`,
      world,
      loreType,
      represented,
    };
  })
  .filter(Boolean);

const mergeSpecs = [{
  canonical: "wiki/戰役設定/艾伯倫/龍紋家族/塔卡南家族.md",
  duplicate: "wiki/戰役設定/艾伯倫/冒險與勢力/塔卡南家族.md",
  conceptTail: "house-tarkanan",
  merge: mergeHouseTarkanan,
}, {
  canonical: "wiki/戰役設定/艾伯倫/龍紋家族/龍紋家族.md",
  duplicate: "wiki/戰役設定/艾伯倫/冒險與勢力/龍紋家族.md",
  conceptTail: "dragonmarked-houses",
  merge: mergeDragonmarkedHouses,
}, {
  canonical: "wiki/戰役設定/艾伯倫/薩恩/探事員/波羅馬氏族.md",
  duplicate: "wiki/戰役設定/艾伯倫/冒險與勢力/波羅馬氏族.md",
  conceptTail: "boromar-clan",
  merge: (canonical, older) => mergeContinuousLore(canonical, older, {
    note: "2025 年來源聚焦波羅馬氏族在薩恩探事員戰役中的現況；2019 年來源另提供完整勢力、人物與冒險引子，兩者合併保存。",
    heading: "《從終末戰爭中崛起》（2019）勢力資料",
  }),
}, {
  canonical: "wiki/戰役設定/艾伯倫/薩恩/探事員/達斯克.md",
  duplicate: "wiki/戰役設定/艾伯倫/冒險與勢力/達斯克.md",
  conceptTail: "daask",
  merge: (canonical, older) => mergeContinuousLore(canonical, older, {
    note: "2025 年來源聚焦達斯克在薩恩探事員戰役中的陰謀；2019 年來源另提供組織全貌、人物與冒險引子，兩者合併保存。",
    heading: "《從終末戰爭中崛起》（2019）勢力資料",
  }),
}, {
  canonical: "wiki/戰役設定/艾伯倫/薩恩/探事員/黑暗夢境.md",
  duplicate: "wiki/戰役設定/艾伯倫/冒險與勢力/黑暗夢境.md",
  conceptTail: "dreaming-dark",
  merge: (canonical, older) => mergeContinuousLore(canonical, older, {
    note: "2025 年來源補充黑暗夢境滲透薩恩鄧內斯家族飛地的現況；2019 年來源另說明其跨洲目標與運作方式，兩者合併保存。",
    heading: "《從終末戰爭中崛起》（2019）勢力資料",
  }),
}];
const mergedAway = [];
for (const spec of mergeSpecs) {
  const canonical = entries.find((entry) => entry.oldRel === spec.canonical);
  const duplicate = entries.find((entry) => entry.oldRel === spec.duplicate);
  if (!canonical || !duplicate) continue;
  canonical.mergeFrom = { entry: duplicate, merge: spec.merge };
  canonical.conceptTail = spec.conceptTail;
  mergedAway.push({ oldRel: duplicate.oldRel, targetEntry: canonical });
  entries = entries.filter((entry) => entry !== duplicate);
}

const destinations = new Map();
const concepts = new Map();
const destinationConflicts = [];
for (const entry of entries) {
  const duplicate = destinations.get(entry.newRel);
  if (duplicate && duplicate !== entry.oldRel) {
    destinationConflicts.push(`${duplicate} 與 ${entry.oldRel} -> ${entry.newRel}`);
    continue;
  }
  destinations.set(entry.newRel, entry.oldRel);
  if (entry.oldRel !== entry.newRel && fs.existsSync(absolute(entry.newRel))) {
    throw new Error(`目標已存在，停止遷移：${entry.newRel}`);
  }
  let text = entry.content ?? fs.readFileSync(absolute(entry.oldRel), "utf8");
  if (entry.mergeFrom) {
    const older = fs.readFileSync(absolute(entry.mergeFrom.entry.oldRel), "utf8");
    text = entry.mergeFrom.merge(text, older);
  }
  const next = entry.preserve ? text : updateFrontmatter(text, entry);
  const concept = next.match(/^(?:"concept_id"|concept_id): "([^"]+)"$/m)?.[1];
  if (concepts.has(concept)) {
    throw new Error(`concept_id 衝突：${concepts.get(concept)} 與 ${entry.oldRel} -> ${concept}`);
  }
  concepts.set(concept, entry.oldRel);
  entry.content = next;
}
if (destinationConflicts.length > 0) {
  throw new Error(`目標路徑衝突：\n${destinationConflicts.join("\n")}`);
}

const counts = Object.values(worlds).map((world) => ({
  world: world.label,
  count: entries.filter((entry) => entry.world.label === world.label).length,
}));
const report = {
  mode: options.apply ? "apply" : "preview",
  entries: entries.length,
  moves: entries.filter((entry) => entry.oldRel !== entry.newRel).length,
  counts,
  merges: mergedAway.map((item) => ({ old: item.oldRel, target: item.targetEntry.newRel })),
  mappings: entries.map(({ oldRel, newRel, world, loreType, represented }) => ({
    old: oldRel,
    target: newRel,
    setting: world.label,
    lore_type: loreType,
    represented_type: represented,
  })),
};

const linkMappings = entries
  .filter((entry) => entry.oldRel !== entry.newRel)
  .map((entry) => ({
    oldTarget: entry.oldRel.replace(/^wiki\//, "").replace(/\.md$/, ""),
    newTarget: entry.newRel.replace(/^wiki\//, "").replace(/\.md$/, ""),
  }))
  .concat(mergedAway.map((item) => ({
    oldTarget: item.oldRel.replace(/^wiki\//, "").replace(/\.md$/, ""),
    newTarget: item.targetEntry.newRel.replace(/^wiki\//, "").replace(/\.md$/, ""),
  })))
  .sort((a, b) => b.oldTarget.length - a.oldTarget.length);

const pending = [];
for (const entry of entries) {
  const source = absolute(entry.oldRel);
  const destination = absolute(entry.newRel);
  const before = fs.readFileSync(source, "utf8");
  if (entry.oldRel === entry.newRel) {
    if (entry.content !== before) pending.push(candidateChange({ destination: source, before, after: entry.content, operation: "update", source: "config/lore.yml", locator: `${entry.world.label}／${entry.loreType}` }));
  }
  else {
    pending.push(candidateChange({ destination, before: null, after: entry.content, operation: "create", source: "config/lore.yml", locator: `${entry.world.label}／${entry.loreType}` }));
    pending.push(candidateChange({ destination: source, before, after: null, operation: "delete", source: "config/lore.yml", locator: `遷移至 ${entry.newRel}` }));
  }
}
for (const item of mergedAway) {
  const source = absolute(item.oldRel);
  pending.push(candidateChange({ destination: source, before: fs.readFileSync(source, "utf8"), after: null, operation: "delete", source: "連續設定合併", locator: `合併至 ${item.targetEntry.newRel}` }));
}
for (const file of walk(WIKI_ROOT)) {
  if (pending.some((change) => change.operation === "delete" && absolute(change.target) === file)) continue;
  const original = fs.readFileSync(file, "utf8");
  let next = original;
  for (const mapping of linkMappings) {
    next = next.replaceAll(`[[${mapping.oldTarget}|`, `[[${mapping.newTarget}|`);
    next = next.replaceAll(`[[${mapping.oldTarget}#`, `[[${mapping.newTarget}#`);
    next = next.replaceAll(`[[${mapping.oldTarget}]]`, `[[${mapping.newTarget}]]`);
  }
  if (next !== original) pending.push(candidateChange({ destination: file, before: original, after: next, operation: "link", source: "戰役目錄遷移", locator: "完整路徑連結" }));
}
const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
writeCandidatePlan({ ...plan, campaign_report: report }, options.report, { root: ROOT });
if (options.apply) applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
for (const item of counts) console.log(`${item.world}: ${item.count}`);
console.log(`${options.apply ? "套用" : "預覽"}：${report.entries} 頁，${report.moves} 個路徑移動；可套用 ${plan.summary.ready}；人工覆核 ${plan.summary.manual_review}。`);
