import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { classifyEntity, compactCoverage, createAuditReport, extractSourceEntities } from "../scripts/core/character-options-lib.mjs";
import { ROOT, loadIngestProfile, loadPublication, writableCandidate } from "../scripts/core/ingest-publication-utils.mjs";
import { ensureFeatBacklink, featReference, mergeBackgroundContent, parseBackgroundSource, runBackgroundIngest, splitEquipment } from "../scripts/ingest/ingest-backgrounds.mjs";
import { updateCharacterOptionSource } from "../scripts/ingest/sync-character-option-sources.mjs";

test("角色選項來源同步只經共用預覽產生具來源與設定指紋的計畫", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-character-source-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.relative(ROOT, path.join(directory, "plan.json"));
  const preview = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "角色選項來源",
    "--publication", "EBER2025", "--only", "__none__", "--report", report], { cwd: ROOT, encoding: "utf8" });
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, report), "utf8"));
  assert.equal(plan.summary.ready, 0);
  assert.ok(plan.results.every((entry) => entry.status === "out_of_scope"));
  assert.ok(Object.keys(plan.source_fingerprints).some((file) => file.endsWith("book-efa.json")));
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/EBER2025.yml"]);
  assert.ok(fs.existsSync(path.join(directory, "plan.summary.md")));
  const directApply = spawnSync(process.execPath, ["scripts/ingest/sync-character-option-sources.mjs", "--publication", "EBER2025", "--apply"], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.equal(directApply.status, 1);
  assert.match(directApply.stderr, /只產生候選/);
});

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

test("龍裔變體的括號式鏡像名稱只對應同一變體而非泛稱龍裔", () => {
  const chromatic = { target: "wiki/種族/2014/色彩龍裔.md", english: "Chromatic Dragonborn",
    text: "## 種族特質\n體型：中型；速度：30 呎。", data: { category: "種族", version: "2014-Legacy",
      entity_id: "entry:FTD2021:species:chromatic-dragonborn", concept_id: "concept:species:chromatic-dragonborn",
      sources: [{ file: mirrorFile }] } };
  const gem = { ...chromatic, target: "wiki/種族/2014/寶石龍裔.md", english: "Gem Dragonborn",
    data: { ...chromatic.data, entity_id: "entry:FTD2021:species:gem-dragonborn", concept_id: "concept:species:gem-dragonborn" } };
  const result = classifyEntity({ category: "species", english_name: "Dragonborn (Chromatic)", source_file: mirrorFile,
    locator: "test", page: 10 }, [chromatic, gem], { publicationId: "FTD2021", ruleset: "2014", mirrorFile });
  assert.equal(result.wiki_target, chromatic.target);
  assert.equal(result.status, "matched");
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

test("專長稽核以同出版品資料集的實體頁碼取代書籍章節頁碼", () => {
  const book = { data: [{ type: "section", name: "Feats", page: 39, entries: [
    { type: "statblock", tag: "feat", name: "Greater Mark of Handling" },
  ] }] };
  const settings = {
    publicationId: "EBER2025",
    manifest: { publication_title: "Eberron: Forge of the Artificer (2025)", snapshot: { file: mirrorFile }, character_options: ["feats"] },
  };
  const withoutDataset = extractSourceEntities(book, settings);
  assert.equal(withoutDataset[0].page, null);
  const withDataset = extractSourceEntities(book, { ...settings, datasets: [{ file: "原始資料/外部來源鏡像/PHB2024/datasets/feats.json",
    url: "https://example.invalid/feats.json", locator_prefix: "feat:", feats: [
      { name: "Greater Mark of Handling", source: "EFA", page: 43 },
      { name: "Greater Mark of Handling", source: "XPHB", page: 200 },
    ] }] });
  assert.equal(withDataset.length, 1);
  assert.equal(withDataset[0].source_shape, "dataset");
  assert.equal(withDataset[0].page, 43);
});

test("來源資料卡及引用標籤不繼承章節頁碼；未有實體頁碼不可標 matched", () => {
  const book = { data: [{ type: "section", name: "Feats", page: 39, entries: [
    { type: "statblock", tag: "feat", name: "Sample Feat" },
    "{@feat Other Feat|EFA}",
  ] }] };
  const entities = extractSourceEntities(book, { publicationId: "EBER2025",
    manifest: { publication_title: "Test Book", snapshot: { file: mirrorFile }, character_options: ["feats"] } });
  assert.deepEqual(entities.map((item) => item.page), [null, null]);
  const featPage = page({ title: "樣本專長 (Sample Feat)", entity_id: "entry:EBER2025:feat:sample-feat" });
  featPage.english = "Sample Feat";
  assert.equal(classifyEntity(entities[0], [featPage], { publicationId: "EBER2025", mirrorFile }).status, "ambiguous");
});

test("新出版品可由設定來源代碼配對同名跨書專長，不需寫死出版品 ID", () => {
  const entities = extractSourceEntities({}, {
    publicationId: "TEST2026", sourceCode: "tst",
    manifest: { publication_title: "Test Book", snapshot: { file: mirrorFile }, character_options: ["feats"] },
    datasets: [{ file: "原始資料/外部來源鏡像/TEST/feats.json", feats: [
      { name: "Shared Feat", source: "OLD", page: 11 },
      { name: "Shared Feat", source: "TST", page: 42 },
    ] }],
  });
  assert.equal(entities.length, 1);
  assert.equal(entities[0].page, 42);
});

test("書籍快照的子職 statblock 以職業與自身頁碼列入實體清單", () => {
  const book = { data: [{ type: "section", name: "Character Classes", page: 7, entries: [
    { type: "statblock", prop: "subclass", name: "Cartographer", className: "Artificer", source: "EFA", page: 20 },
  ] }] };
  const entities = extractSourceEntities(book, { publicationId: "EBER2025",
    manifest: { publication_title: "Eberron", snapshot: { file: mirrorFile }, character_options: ["subclasses"] } });
  assert.deepEqual(entities.map((item) => ({ name: item.english_name, parent: item.parent_class, page: item.page })), [
    { name: "Cartographer", parent: "Artificer", page: 20 },
  ]);
});

test("子職資料卡的職業前綴與同書引用合併為同一實體", () => {
  const book = { data: [{ type: "section", name: "Character Creation", entries: [
    { type: "statblock", prop: "subclass", name: "Monk: Way of the Ascendant Dragon", className: "monk", source: "FTD" },
    "{@class monk||Way of the Ascendant Dragon||FTD}",
  ] }] };
  const entities = extractSourceEntities(book, { publicationId: "FTD2021", sourceCode: "FTD",
    manifest: { publication_title: "Fizban", snapshot: { file: mirrorFile }, character_options: ["subclasses"] } });
  assert.equal(entities.length, 1);
  assert.equal(entities[0].english_name, "Way of the Ascendant Dragon");
  assert.equal(entities[0].parent_class, "monk");
  assert.equal(entities[0].source_shape, "statblock");
});

test("同書兩處子職引用的職業前綴不產生重複實體", () => {
  const book = { data: [
    { name: "Character Creation", entries: ["{@class monk||Monk: Way of the Ascendant Dragon||FTD}"] },
    { name: "Followers", entries: ["{@class monk||Way of the Ascendant Dragon||FTD}"] },
  ] };
  const entities = extractSourceEntities(book, { publicationId: "FTD2021", sourceCode: "FTD",
    manifest: { publication_title: "Fizban", snapshot: { file: mirrorFile }, character_options: ["subclasses"] } });
  assert.deepEqual(entities.map((item) => [item.english_name, item.parent_class]), [["Way of the Ascendant Dragon", "monk"]]);
});

test("同出版品子職沿用 entry 類別識別碼時列明類別問題，不自行改 ID", () => {
  const subclass = { ...entity, category: "subclasses", english_name: "Alchemist", parent_class: "Artificer", page: 12 };
  const existing = page({ title: "煉金師 (Alchemist)", category: "職業", entry_type: "子職",
    entity_id: "entry:EBER2025:entry:alchemist" });
  existing.english = "Alchemist";
  existing.text = "## 子職特性\n- 3 級：煉金師";
  const result = classifyEntity(subclass, [existing], { publicationId: "EBER2025", mirrorFile });
  assert.equal(result.status, "stale");
  assert.ok(result.reasons.some((reason) => reason.includes("類別不是 subclass")));
  assert.equal(existing.data.entity_id, "entry:EBER2025:entry:alchemist");
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

test("具備法術正文資料集時，艾伯倫法術可列入正常稽核", () => {
  const eber = createAuditReport({ publicationId: "EBER2025", publication: loadPublication("EBER2025"), profile: loadIngestProfile("EBER2025"), pages: [] });
  assert.equal(eber.mirror.status, "available");
  const spells = eber.mirror.datasets.find((dataset) => dataset.file.endsWith("/spells-efa.json"));
  const feats = eber.mirror.datasets.find((dataset) => dataset.file.endsWith("/feats.json"));
  assert.equal(spells.file, "原始資料/外部來源鏡像/EBER2025/datasets/spells-efa.json");
  assert.equal(spells.url, "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-efa.json");
  assert.equal(feats.file, "原始資料/外部來源鏡像/PHB2024/datasets/feats.json");
  assert.ok(eber.entities.some((item) => item.status === "missing"));
  assert.ok(eber.entities.some((item) => item.category === "spells" && item.status === "missing"));
  assert.ok(!eber.entities.some((item) => item.category === "spells" && item.status === "blocked"));
  const dmg = createAuditReport({ publicationId: "DMG2024", publication: loadPublication("DMG2024"), profile: loadIngestProfile("DMG2024"), pages: [] });
  assert.deepEqual(dmg.entities.map((item) => item.status), ["out_of_scope"]);
});

test("稽核身分 matched 不會吞掉獨立的未核定譯名待辦", () => {
  const report = createAuditReport({ publicationId: "EBER2025", publication: loadPublication("EBER2025"),
    profile: loadIngestProfile("EBER2025"), category: "feats" });
  assert.equal(report.summary.matched, 28);
  assert.ok(report.entities.some((item) => item.review_flags?.includes("translation_unapproved")));
  const compact = compactCoverage(report);
  assert.ok(compact.categories[0].review_total > 0);
});

test("已設定適用類別卻無實體不得標 out_of_scope；資料集缺失須阻擋", () => {
  const publication = loadPublication("EBER2025");
  const profile = loadIngestProfile("EBER2025");
  const empty = createAuditReport({ publicationId: "EBER2025", publication,
    profile: { ...profile, character_options: ["dependencies"] }, category: "dependencies", pages: [] });
  assert.equal(empty.entities.length, 1);
  assert.equal(empty.entities[0].status, "incomplete");
  const absent = createAuditReport({ publicationId: "EBER2025", publication,
    profile: { ...profile, canonical_mirror: { ...profile.canonical_mirror, datasets: [
      { file: "原始資料/外部來源鏡像/EBER2025/datasets/not-present-feats.json", locator_prefix: "feat:" },
    ] } }, category: "feats", pages: [] });
  assert.ok(absent.entities.some((item) => item.status === "blocked"));
  assert.ok(!absent.entities.some((item) => item.status === "matched"));
});

test("出版品涵蓋摘要保留未完成原因與剩餘數，不把未引用來源當缺頁", () => {
  const report = { publication_id: "TEST2026", character_options: ["feats"], entities: [
    { category: "feats", english_name: "A", status: "matched", review_flags: ["translation_unapproved"] },
    { category: "feats", english_name: "B", status: "ambiguous", source: { page: null }, reasons: ["實體頁碼未定"] },
    { category: "feats", english_name: "C", status: "incomplete", source: { page: 42 }, reasons: ["來源結構未支援"] },
  ] };
  const summary = compactCoverage(report, { maxItems: 1 });
  assert.equal(summary.categories[0].statuses.matched, 1);
  assert.equal(summary.categories[0].statuses.ambiguous, 1);
  assert.equal(summary.categories[0].review_items[0].english_name, "A");
  assert.deepEqual(summary.categories[0].review_items[0].review_flags, ["translation_unapproved"]);
  assert.equal(summary.categories[0].review_items_remaining, 2);
});

test("必要資料卡不會把一般怪物章節納入", () => {
  const book = { data: [
    { name: "Chapter 1: Character Options", entries: ["{@creature Helper|ABH}"] },
    { name: "Bestiary", entries: [{ type: "statblock", tag: "creature", source: "ABH", name: "Ordinary Monster" }] },
  ] };
  const entities = extractSourceEntities(book, { publicationId: "ABH2025", manifest: { publication_title: "Test", snapshot: { file: mirrorFile }, character_options: ["dependencies"] } });
  assert.deepEqual(entities, []);
});

test("PHB 附錄必要怪物只接受資料卡自身頁碼，不繼承附錄頁碼", () => {
  const book = { data: [{ name: "Appendix B: Creature Stat Blocks", page: 345, entries: [
    { type: "statblock", tag: "creature", name: "Helper A", source: "XPHB" },
    { type: "statblock", tag: "creature", name: "Helper B", source: "XPHB", page: 346 },
  ] }] };
  const entities = extractSourceEntities(book, { publicationId: "PHB2024",
    manifest: { publication_title: "Player's Handbook (2024)", snapshot: { file: mirrorFile }, character_options: ["dependencies"] } });
  assert.deepEqual(entities.map((item) => [item.english_name, item.page]), [["Helper A", null], ["Helper B", 346]]);
});

test("同出版品同名資料卡的自身頁碼衝突列 ambiguous，不取第一筆", () => {
  const book = { data: [{ name: "Feats", entries: [
    { type: "statblock", tag: "feat", name: "Shared Feat", source: "TST", page: 20 },
    { type: "statblock", tag: "feat", name: "Shared Feat", source: "TST", page: 22 },
  ] }] };
  const entities = extractSourceEntities(book, { publicationId: "TEST2026", sourceCode: "TST",
    manifest: { publication_title: "Test Book", snapshot: { file: mirrorFile }, character_options: ["feats"] } });
  assert.equal(entities.length, 1);
  assert.deepEqual(entities[0].source_conflicts.map((item) => item.page), [20, 22]);
  const result = classifyEntity(entities[0], [page()], { publicationId: "TEST2026", mirrorFile });
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.source_candidates.map((item) => item.page), [20, 22]);
  const compact = compactCoverage({ publication_id: "TEST2026", character_options: ["feats"], entities: [result] });
  assert.deepEqual(compact.categories[0].review_items[0].source_candidates.map((item) => item.page), [20, 22]);
});

test("舊版背景資料卡會列入稽核，但不繼承章節頁碼", () => {
  const book = { data: [{ name: "Backgrounds", page: 145, entries: [{ type: "statblock", tag: "background", source: "SCAG", name: "City Watch" }] }] };
  const entities = extractSourceEntities(book, {
    publicationId: "SCAG2015",
    manifest: { publication_title: "Sword Coast Adventurer's Guide (2015)", snapshot: { file: mirrorFile }, character_options: ["backgrounds"] },
  });
  assert.equal(entities.length, 1);
  assert.equal(entities[0].category, "backgrounds");
  assert.equal(entities[0].english_name, "City Watch");
  assert.equal(entities[0].page, null);
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

test("背景與起源專長反向連結會納入候選而不直寫", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-background-link-"));
  const feat = path.join(root, "feat.md");
  const background = path.join(root, "background.md");
  try {
    fs.writeFileSync(feat, "# 警覺\n\n## 🔗 相關連結\n", "utf8");
    const before = fs.readFileSync(feat, "utf8");
    const options = { apply: false, replace: true, candidates: [], results: [] };
    ensureFeatBacklink({ file: feat }, background, "測試背景 (Test Background)", options, {
      writeCandidate: ({ content }) => { options.candidates.push({ after: content }); return "preview"; },
    });
    assert.equal(fs.readFileSync(feat, "utf8"), before);
    assert.equal(options.candidates.length, 1);
    assert.match(options.candidates[0].after, /測試背景 \(Test Background\)/);
    assert.equal(options.results.at(-1).reason, "background_origin_feat_backlink");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("背景解析器拒絕直接套用", () => {
  assert.throws(
    () => runBackgroundIngest(["--apply"]),
    /背景解析器不直接寫入 Wiki/,
  );
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
