import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import YAML from "yaml";
import { ROOT, loadPublicationCatalog, formatPublicationTitle } from "./notion-wiki.mjs";

export const DATASET_FILES = {
  species: ["races.json", "race"], backgrounds: ["backgrounds.json", "background"],
  feats: ["feats.json", "feat"], items: ["items.json", "item"],
  baseitems: ["items-base.json", "baseitem"], variants: ["magicvariants.json", "magicvariant"],
};
export function normalizeEnglish(value) {
  return String(value ?? "").normalize("NFKC").replace(/[’‘]/gu, "'").replace(/[–—]/gu, "-").replace(/\s+/gu, " ").trim().toLowerCase();
}
export function parseBookPages(locator) {
  const match = String(locator ?? "").match(/(?:^|[\s,，;；])p{1,2}\.\s*(\d+(?:\s*[-–]\s*\d+)?(?:\s*[,、]\s*\d+(?:\s*[-–]\s*\d+)?)*)/iu);
  return match ? match[1].replace(/\s/gu, "").replaceAll("–", "-").replaceAll("、", ",") : null;
}
export function sourceFingerprint(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}
export function loadCharacterSources(root = ROOT, datasetDirectory = path.join(root, ".tmp", "character-rules")) {
  const catalog = loadPublicationCatalog(root);
  const profilesDirectory = path.join(root, "config", "ingest-profiles");
  const sourceCodeByPublication = new Map();
  const assets = [...catalog.assets];
  const evidence = [];
  const mirrorsDirectory = path.join(root, "原始資料", "外部來源鏡像");
  for (const folder of fs.readdirSync(mirrorsDirectory, { withFileTypes: true }).filter(e => e.isDirectory())) {
    const manifestFile = path.join(mirrorsDirectory, folder.name, "manifest.yml");
    if (!fs.existsSync(manifestFile)) continue;
    const manifest = YAML.parse(fs.readFileSync(manifestFile, "utf8"));
    const code = manifest.snapshot?.file?.match(/book-([^/]+)\.json$/u)?.[1];
    const publication = catalog.publications.find(p => p.id === manifest.publication_id);
    if (!publication || !code) continue;
    sourceCodeByPublication.set(publication.id, code.toUpperCase());
    assets.push({ publication, path: `原始資料/外部來源鏡像/${folder.name}`, asset: { role: "rules_text", translation: "none" } });
  }
  for (const file of fs.readdirSync(profilesDirectory).filter(name => name.endsWith(".yml"))) {
    const profile = YAML.parse(fs.readFileSync(path.join(profilesDirectory, file), "utf8"));
    const mirror = profile.canonical_mirror;
    if (!mirror?.book_id) continue;
    sourceCodeByPublication.set(profile.publication_id, mirror.book_id.toUpperCase());
    const publication = catalog.publications.find(p => p.id === profile.publication_id);
    if (publication && mirror.output_root) assets.push({ publication, path: mirror.output_root, asset: { role: "rules_text", translation: "none" } });
  }
  const datasets = {};
  for (const [kind, [file, key]] of Object.entries(DATASET_FILES)) {
    const absolute = path.join(datasetDirectory, file);
    if (!fs.existsSync(absolute)) { datasets[kind] = []; continue; }
    const data = JSON.parse(fs.readFileSync(absolute, "utf8"));
    if (!Array.isArray(data[key])) throw new Error(`${file} 缺少 ${key} 陣列`);
    const proof = { file: path.relative(root, absolute).replaceAll("\\", "/"),
      url: `https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/${file}`,
      sha256: sourceFingerprint(absolute), provider: "5e.tools 鏡像", role: "正式出版品原文鏡像" };
    evidence.push(proof);
    // Genasi 等種族變體位於同一份正式資料集的 subrace 陣列；未納入會讓
    // 已有明列頁碼的條目被誤判為缺少正式身分。
    const records = kind === "species" ? [...data.race, ...(data.subrace ?? [])]
      // DMG 的卷軸、腰帶、樂器等條目以 itemGroup 記錄共同規則與正式頁碼；
      // 它們不是缺少來源，必須與單件 item 一併參與名稱配對。
      : kind === "items" ? [...data.item, ...(data.itemGroup ?? [])]
      : data[key];
    datasets[kind] = records.map(item => ({ ...item, evidence: proof }));
  }
  assets.sort((a, b) => b.path.length - a.path.length);
  return { ...catalog, assets, sourceCodeByPublication, datasets, evidence };
}
// 對照僅限已核對的出版身分，不把任意標題轉換成來源事實。
export const SOURCE_IDENTITIES = {
  "entry:FTD2021:species:0cdb3ee075": "Dragonborn (Gem)",
  "entry:FTD2021:species:66ef6bf151": "Dragonborn (Chromatic)",
  "entry:FTD2021:species:9daad312d7": "Dragonborn (Metallic)",
  "entry:RTHW2026:background:haunted-one": "Haunted One",
  "entry:RTHW2026:background:investigator": "Investigator",
  "entry:RTHW2026:background:mist-wanderer": "Mist Wanderer",
  "entry:RTHW2026:background:spirit-medium": "Spirit Medium",
  "entry:FTD2021:magic-item:6a2bd5f1ff": "Gold Canary Figurine of Wondrous Power",
  "entry:DMG2024:entry:dbacd477f4": "Boots of the Winterlands",
  "entry:DMG2024:entry:01232bdfd8": "Plate Armor of Etherealness (*)",
  "entry:DMG2024:entry:8d26c4db7b": "Stone of Good Luck",
};
export const SOURCE_GROUPS = {
  "entry:BPGG2023:magic-item:759cbc51c8": ["Carnelian Triceratops", "Jasper Tyrannosaurus Rex", "Kyanite Pteranodon", "Pyrite Plesiosaurus"].map(n => `Prehistoric Figurine of Wondrous Power, ${n}`),
  "entry:TCE2020:magic-item:72a8550ba2": ["Small", "Medium", "Large"].map(n => `Barrier Tattoo (${n})`),
  "entry:FRAIF2025:magic-item:mechanical-wonders": ["Domestic", "Flying", "Gyrocopter", "Mobility"].map(n => `Mechanical Wonder (${n})`),
  "entry:DMG2024:entry:b9adf2f970": ["Air", "Earth", "Fire", "Water"].map(n => `Ring of Elemental Command (${n})`),
  ...Object.fromEntries([
    ["entry:TCE2020:magic-item:f6a0317b28", "Arcane Grimoire"],
    ["entry:TCE2020:magic-item:7031110f33", "All-Purpose Tool"],
    ["entry:TCE2020:magic-item:0f2a8a4159", "Amulet of the Devout"],
    ["entry:TCE2020:magic-item:b2ddf97971", "Bloodwell Vial"],
    ["entry:TCE2020:magic-item:3f2bfb4461", "Rhythm-Maker's Drum"],
    ["entry:TCE2020:magic-item:b2314474ac", "Moon Sickle"],
    ["entry:FTD2021:magic-item:f6203dc8bb", "Dragonhide Belt"],
    ["entry:DMG2024:entry:286fcecde6", "Rod of the Pact Keeper"],
    ["entry:DMG2024:entry:c3ef53c6db", "Ammunition"],
    ["entry:DMG2024:entry:f0972d58cc", "Weapon"],
    ["entry:DMG2024:entry:7016627019", "Shield (*)"],
    ["entry:DMG2024:entry:6ce606facf", "Armor"],
    ["entry:DMG2024:entry:5ee5cf6966", "Wand of the War Mage"],
  ].map(([id, name]) => [id, [1, 2, 3].map(n => `+${n} ${name}`)])),
};
export function expandSourceGroup(entry) {
  const names = entry.entityId?.split(":")[1] === entry.publicationId && SOURCE_GROUPS[entry.entityId];
  if (!names) return [entry];
  return names.map(englishName => ({ ...entry, parentEntityId: entry.entityId, englishName,
    entityId: `${entry.entityId}:variant:${crypto.createHash("sha256").update(`${entry.publicationId}|${normalizeEnglish(englishName)}`).digest("hex").slice(0, 16)}` }));
}
export function effectiveVariant(item) {
  return { ...item.inherits, ...item, source: item.source ?? item.inherits?.source,
    page: item.page ?? item.inherits?.page, sourceKind: "variant",
    sourceConflict: Boolean(item.source && item.inherits?.source && item.source.toUpperCase() !== item.inherits.source.toUpperCase()) };
}
export function findSourceEntity({ englishName, publicationId, category, entityId }, catalog) {
  const kind = ({ 種族: "species", 背景: "backgrounds", 專長: "feats", 魔法物品: "items", 裝備: "baseitems" })[category];
  const code = catalog.sourceCodeByPublication.get(publicationId);
  if (!code) return { status: "missing-publication-code", matches: [] };
  const mappedName = entityId?.split(":")[1] === publicationId ? SOURCE_IDENTITIES[entityId] : null;
  const name = normalizeEnglish(mappedName ?? englishName);
  const records = [...(catalog.datasets[kind] ?? []), ...(category === "魔法物品" ? (catalog.datasets.variants ?? []).map(effectiveVariant) : [])];
  const matches = records.filter(item => {
    const names = [item.name, item.raceName && item.name ? `${item.name} ${item.raceName}` : null,
      item.raceName && item.name ? `${item.raceName} ${item.name}` : null]
      .filter(Boolean).map(normalizeEnglish);
    return names.includes(name) && item.source?.toUpperCase() === code;
  });
  return { status: matches.length === 1 ? "matched" : matches.length ? "ambiguous" : "missing", matches };
}
// 禁止把 statblock 的上層章節頁碼當作該條目的頁碼；僅採資料集明列頁碼。
export function resolveRuleCitation(identity, catalog) {
  const publication = catalog.publications.find(p => p.id === identity.publicationId);
  if (!publication) return { status: "pending", reason: "出版品未登錄" };
  const match = findSourceEntity(identity, catalog);
  if (match.status !== "matched") return { status: "pending", reason: `正式資料集身分${match.status}`, candidates: match.matches.map(m => m.name) };
  const source = match.matches[0];
  if (source.sourceConflict) return { status: "pending", reason: "正式資料集身分與繼承來源衝突", candidates: [source.name] };
  if (!Number.isInteger(source.page) || source.page < 1) return { status: "pending", reason: "來源未提供可驗證的正式書籍頁碼" };
  return { status: "verified", publicationId: publication.id,
    display: `${formatPublicationTitle(publication)}，p. ${source.page}：${source.name}`,
    page: source.page, name: source.name, sourceCode: source.source, evidence: source.evidence,
    sourceEntry: source,
  };
}
