import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { classifyEntity, createAuditReport, extractSourceEntities } from "../scripts/audit/character-options-lib.mjs";
import { loadIngestProfile, loadPublication, writableCandidate } from "../scripts/core/ingest-publication-utils.mjs";
import { ensureFeatBacklink, featReference, mergeBackgroundContent, parseBackgroundSource, splitEquipment } from "../scripts/ingest/ingest-backgrounds.mjs";
import { updateCharacterOptionSource } from "../scripts/ingest/sync-character-option-sources.mjs";

const mirrorFile = "原始資料/外部來源鏡像/TEST/book-test.json";
const entity = {
  category: "feats", english_name: "Alert", source_file: mirrorFile, locator: "Test Book, p. 1：Alert", page: 1,
};
function page(overrides = {}) {
  return {
    target: "wiki/專長/起源專長/警覺.md",
    english: "Alert",
    text: "## 🌟 專長效果描述\n\n- **效果**：測試",
    data: {
      category: "專長",
      title: "警覺 (Alert)",
      entity_id: "entry:TEST:feat:alert",
      concept_id: "concept:feat:alert",
      sources: [{ file: mirrorFile }],
      ...overrides,
    },
  };
}

test("角色選項稽核可精確匹配英文名稱與 concept_id", () => {
  assert.equal(classifyEntity(entity, [page()], { publicationId: "TEST", mirrorFile }).status, "matched");
});

test("角色選項稽核接受同出版品登錄的英文資料集", () => {
  const datasetFile = "原始資料/外部來源鏡像/TEST/datasets/feats.json";
  const datasetPage = page({ sources: [{ file: datasetFile }] });
  assert.equal(classifyEntity(entity, [datasetPage], { publicationId: "TEST", mirrorFiles: new Set([mirrorFile, datasetFile]) }).status, "matched");
});

test("法術英文資料集可取代書籍中的簡略 statblock 引用", () => {
  const entities = extractSourceEntities({}, {
    publicationId: "EBER2025",
    manifest: { publication_title: "Eberron: Forge of the Artificer (2025)", snapshot: { file: mirrorFile }, character_options: ["spells"] },
    datasets: [{ file: "原始資料/外部來源鏡像/EBER2025/datasets/spells-efa.json", url: "https://example.invalid/spells-efa.json", locator_prefix: "spell:", spells: [{ name: "Homunculus Servant", source: "EFA", page: 21 }] }],
  });
  assert.deepEqual(entities, [{
    category: "spells",
    english_name: "Homunculus Servant",
    source_file: "原始資料/外部來源鏡像/EBER2025/datasets/spells-efa.json",
    source_url: "https://example.invalid/spells-efa.json",
    page: 21,
    ancestors: ["Spells"],
    source_shape: "dataset",
    locator: "spell:Homunculus Servant",
  }]);
});

test("同名不同概念有多個候選時標為 ambiguous", () => {
  const second = page({ entity_id: "entry:TEST:feat:other", concept_id: "concept:feat:other" });
  second.target = "wiki/專長/通用專長/另一個警覺.md";
  assert.equal(classifyEntity(entity, [page(), second], { publicationId: "TEST", mirrorFile }).status, "ambiguous");
});

test("較新版正式條目會排除於舊版補全佇列", () => {
  const legacyEntity = { ...entity, category: "classes", english_name: "Barbarian" };
  const currentPage = page({
    title: "野蠻人 (Barbarian)",
    category: "職業",
    entry_type: "職業",
    entity_id: "entry:PHB2024:class:barbarian",
    sources: [{ file: "原始資料/外部來源鏡像/PHB2024/book-phb.json" }],
  });
  const result = classifyEntity(legacyEntity, [currentPage], {
    publicationId: "PHB2014",
    ruleset: "2014",
    mirrorFiles: new Set([mirrorFile]),
  });
  assert.equal(result.status, "out_of_scope");
  assert.match(result.reasons[0], /已被取代/u);
});

test("舊版稽核優先選擇同概念的 2014 條目", () => {
  const spellEntity = { ...entity, category: "spells", english_name: "Test Spell" };
  const legacyPage = page({
    title: "測試法術 (Test Spell，2014 Legacy)",
    category: "法術",
    version: "2014-Legacy",
    entity_id: "entry:PHB2014:spell:test-spell",
    sources: [{ file: mirrorFile }],
  });
  legacyPage.english = "Test Spell";
  legacyPage.target = "wiki/法術/2014/1環/測試法術.md";
  legacyPage.text = "- **環階**：一環\n- **施法時間**：1 動作\n## 法術效果";
  const currentPage = page({
    title: "測試法術 (Test Spell)",
    category: "法術",
    version: "2024-Core",
    entity_id: "entry:PHB2024:spell:test-spell",
    sources: [{ file: "原始資料/外部來源鏡像/PHB2024/book-phb.json" }],
  });
  currentPage.english = "Test Spell";
  currentPage.target = "wiki/法術/1環/測試法術.md";
  currentPage.text = legacyPage.text;
  const result = classifyEntity(spellEntity, [legacyPage, currentPage], {
    publicationId: "PHB2014",
    ruleset: "2014",
    mirrorFiles: new Set([mirrorFile]),
  });
  assert.equal(result.status, "matched");
  assert.equal(result.wiki_target, legacyPage.target);
});

test("已標記為 replaced 的舊版條目不會進入補全佇列", () => {
  const spellEntity = { ...entity, category: "spells", english_name: "Test Spell" };
  const legacyPage = page({
    title: "測試法術 (Test Spell，2014 Legacy)",
    category: "法術",
    version: "2014-Legacy",
    compatibility_2024: "replaced",
    entity_id: "entry:PHB2014:spell:test-spell",
    sources: [{ file: mirrorFile }],
  });
  legacyPage.english = "Test Spell";
  legacyPage.text = "- **環階**：一環\n- **施法時間**：1 動作\n## 法術效果";
  const result = classifyEntity(spellEntity, [legacyPage], {
    publicationId: "PHB2014",
    ruleset: "2014",
    mirrorFiles: new Set([mirrorFile]),
  });
  assert.equal(result.status, "out_of_scope");
  assert.match(result.reasons[0], /未取代/u);
});

test("出版品章節鏡像可作為角色選項的英文來源", () => {
  const chapterFile = "原始資料/外部來源鏡像/PHB2014/chapters/12-Spells.md";
  const spellEntity = { ...entity, category: "spells", english_name: "Test Spell" };
  const citedPage = page({
    title: "測試法術 (Test Spell)",
    category: "法術",
    entity_id: "entry:PHB2014:spell:test-spell",
    sources: [{ file: chapterFile }],
  });
  citedPage.text = "- **環階**：一環\n- **施法時間**：1 動作\n## 法術效果";
  const result = classifyEntity(spellEntity, [citedPage], {
    publicationId: "PHB2014",
    ruleset: "2014",
    mirrorFiles: new Set([mirrorFile, chapterFile]),
  });
  assert.equal(result.status, "matched");
});

test("重印後 entity_id 未更新時標為 stale", () => {
  const old = page({ entity_id: "entry:OLD:feat:alert" });
  assert.equal(classifyEntity(entity, [old], { publicationId: "TEST", mirrorFile }).status, "stale");
});

test("缺漏、不完整與來源衝突有固定狀態", () => {
  assert.equal(classifyEntity(entity, [], { publicationId: "TEST", mirrorFile }).status, "missing");
  const incomplete = page();
  incomplete.text = "# 警覺 (Alert)";
  assert.equal(classifyEntity(entity, [incomplete], { publicationId: "TEST", mirrorFile }).status, "incomplete");
  const conflict = page({ audit_status: "conflict" });
  assert.equal(classifyEntity(entity, [conflict], { publicationId: "TEST", mirrorFile }).status, "conflict");
});

test("缺少法術正文資料集時，書籍中的法術名稱指標會明確標為 blocked", () => {
  const eber = createAuditReport({ publicationId: "EBER2025", publication: loadPublication("EBER2025"), profile: loadIngestProfile("EBER2025"), pages: [] });
  assert.equal(eber.mirror.status, "available");
  assert.equal(eber.mirror.datasets.length, 1);
  assert.equal(eber.mirror.datasets[0].file, "原始資料/外部來源鏡像/EBER2025/datasets/spells-efa.json");
  assert.equal(eber.mirror.datasets[0].url, "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-efa.json");
  assert.ok(eber.entities.some((item) => item.status === "missing"));
  assert.ok(eber.entities.some((item) => item.category === "spells" && item.status === "blocked"));
  const dmg = createAuditReport({ publicationId: "DMG2024", publication: loadPublication("DMG2024"), profile: loadIngestProfile("DMG2024"), pages: [] });
  assert.deepEqual(dmg.entities.map((item) => item.status), ["out_of_scope"]);
});

test("必要資料卡不會把一般怪物章節納入", () => {
  const book = { data: [
    { name: "Chapter 1: Character Options", entries: ["{@creature Helper|ABH}"] },
    { name: "Bestiary", entries: [{ type: "statblock", tag: "creature", source: "ABH", name: "Ordinary Monster" }] },
  ] };
  const entities = extractSourceEntities(book, { publicationId: "ABH2025", manifest: { publication_title: "Test", snapshot: { file: mirrorFile }, character_options: ["dependencies"] } });
  assert.deepEqual(entities, []);
});

test("舊版書籍快照的背景資料卡會列入稽核範圍", () => {
  const book = { data: [{ name: "Backgrounds", page: 145, entries: [{ type: "statblock", tag: "background", source: "SCAG", name: "City Watch" }] }] };
  const entities = extractSourceEntities(book, {
    publicationId: "SCAG2015",
    manifest: { publication_title: "Sword Coast Adventurer's Guide (2015)", snapshot: { file: mirrorFile }, character_options: ["backgrounds"] },
  });
  assert.equal(entities.length, 1);
  assert.equal(entities[0].category, "backgrounds");
  assert.equal(entities[0].english_name, "City Watch");
  assert.equal(entities[0].page, 145);
});

test("身高體重表中的種族參照不會誤列為角色選項", () => {
  const book = {
    data: [{
      name: "Personality and Background",
      entries: [{
        name: "Character Details",
        entries: [{
          name: "Height and Weight",
          entries: ["{@race Dwarf (hill)|PHB}"],
        }],
      }],
    }],
  };
  const entities = extractSourceEntities(book, {
    publicationId: "PHB2014",
    manifest: { publication_title: "Player’s Handbook (2014)", snapshot: { file: mirrorFile }, character_options: ["species"] },
  });
  assert.deepEqual(entities, []);
});

test("地下城主工具中的法術參照不會誤列為角色選項", () => {
  const book = { data: [{ name: "Dungeon Master's Tools", entries: [{ name: "Falling", entries: ["{@spell fly|XGE}"] }] }] };
  const entities = extractSourceEntities(book, {
    publicationId: "XGE2017",
    manifest: { publication_title: "Xanathar’s Guide to Everything (2017)", snapshot: { file: mirrorFile }, character_options: ["spells"] },
  });
  assert.deepEqual(entities, []);
});

test("背景來源解析保留裝備 A 與 B", () => {
  const parsed = parseBackgroundSource("# 測試 Test Background\n\n**屬性值：**力量、敏捷、體質\n**專長：**警覺\n**技能熟練：**察覺和隱匿\n**工具熟練：**一種工具\n**裝備：**選擇 A 或 B：(A)背包、10GP；或(B)50GP。\n\n人工描述");
  assert.equal(parsed.english, "Test Background");
  assert.deepEqual(splitEquipment(parsed.equipment), { a: "背包、10GP", b: "50GP" });
});

test("背景匯入保留起源專長的職業限定", () => {
  const reference = featReference("魔法學徒（牧師）（見第五章）");
  assert.match(reference.link, /Magic Initiate\)\]\]（牧師）/);
});

test("預覽模式零寫入", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-background-preview-"));
  const target = path.join(root, "page.md");
  try {
    const options = { apply: false, replace: false, results: [] };
    assert.equal(writableCandidate({ destination: target, content: "test", options }), "preview");
    assert.equal(fs.existsSync(target), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("背景增量合併保留人工區塊且第二次無差異", () => {
  const original = `---\nsources:\n  - file: "中文.md"\n---\n# 測試 (Test)\n\n- **屬性值**：舊值\n- **起源專長**：舊專長\n- **技能熟練**：舊技能\n- **工具熟練**：舊工具\n- **裝備**：舊裝備\n\n## 💡 人工裁量\n\n保留這段。\n`;
  const data = { abilities: "力量", skills: "察覺", tools: "工具", equipmentA: "A", equipmentB: "B" };
  const mirror = { file: mirrorFile, locator: "Test, p. 1", url: "https://example.invalid/test.json" };
  const once = mergeBackgroundContent(original, data, "[[警覺|警覺 (Alert)]]", mirror);
  const twice = mergeBackgroundContent(once, data, "[[警覺|警覺 (Alert)]]", mirror);
  assert.match(once, /裝備 A.*A/);
  assert.match(once, /裝備 B.*B/);
  assert.match(once, /保留這段/);
  assert.equal(twice, once);
});

test("背景與起源專長可建立反向連結", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-background-link-"));
  const feat = path.join(root, "feat.md");
  const background = path.join(root, "background.md");
  try {
    fs.writeFileSync(feat, "# 警覺\n\n## 🔗 相關連結\n", "utf8");
    const options = { apply: true, results: [] };
    ensureFeatBacklink({ file: feat }, background, "測試背景 (Test Background)", options);
    assert.match(fs.readFileSync(feat, "utf8"), /測試背景 \(Test Background\)/);
    assert.equal(options.results.at(-1).reason, "background_origin_feat_backlink");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("來源同步第二次套用無差異並保留人工正文", () => {
  const publication = { canonical_rules_source: "Test Book" };
  const auditEntity = { category: "feats", english_name: "Alert", source: { locator: "Test Book, p. 1：Alert" } };
  const original = `---\nentity_id: "entry:OLD:feat:alert"\nconcept_id: "concept:feat:alert"\nsources:\n  - file: "中文.md"\nrules_sources:\n  - "Old Book"\nupdated: "2020-01-01"\n---\n# 人工正文\n`;
  const once = updateCharacterOptionSource(original, auditEntity, { publicationId: "TEST", publication, mirror: { file: mirrorFile, url: "https://example.invalid/test.json" } });
  const twice = updateCharacterOptionSource(once, auditEntity, { publicationId: "TEST", publication, mirror: { file: mirrorFile, url: "https://example.invalid/test.json" } });
  assert.match(once, /# 人工正文/);
  assert.equal(twice, once);
});

test("舊出版品來源同步不會把重印 entity_id 降回舊版", () => {
  const publication = { canonical_rules_source: "Old Book" };
  const auditEntity = { category: "species", english_name: "Dhampir", source: { locator: "Old Book：Dhampir" } };
  const original = `---\nentity_id: "entry:RTHW2026:species:dhampir"\nconcept_id: "concept:species:dhampir"\nsources:\n  - file: "${mirrorFile}"\n    locator: "Old Book：Dhampir"\n    url: "https://example.invalid/test.json"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nrules_sources:\n  - "Old Book"\nupdated: "${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date())}"\n---\n# 半血裔 (Dhampir)\n`;
  const next = updateCharacterOptionSource(original, auditEntity, { publicationId: "ABH2025", publication, mirror: { file: mirrorFile, url: "https://example.invalid/test.json" } });
  assert.match(next, /entry:RTHW2026:species:dhampir/);
});
