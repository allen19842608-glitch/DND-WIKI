import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findMirrorDatasetPage, findMirrorEntityPage, mirrorDatasetEntityPage, mirrorEntityPage, mirrorEvidenceFiles } from "../scripts/core/mirror-entity-page.mjs";
import { ROOT, loadIngestProfile } from "../scripts/core/ingest-publication-utils.mjs";

const book = {
  data: [{
    type: "section", name: "Chapter 01", page: 7, entries: [
      { type: "statblock", tag: "class", name: "Artificer", page: 7 },
      { type: "section", name: "Artificer Subclasses", page: 12, entries: [
        { type: "statblock", prop: "subclass", name: "Cartographer", className: "Artificer", page: 20 },
      ] },
    ],
  }],
};

test("entity page comes from the exact English mirror statblock", () => {
  assert.deepEqual(findMirrorEntityPage(book, { english: "Artificer", kind: "class" }), { status: "matched", page: 7 });
  assert.deepEqual(findMirrorEntityPage(book, { english: "Cartographer", kind: "subclass", parentClass: "Artificer" }), { status: "matched", page: 20 });
});

test("chapter or subclass-section page is never inherited", () => {
  const withoutPage = structuredClone(book);
  delete withoutPage.data[0].entries[1].entries[0].page;
  assert.deepEqual(findMirrorEntityPage(withoutPage, { english: "Cartographer", kind: "subclass", parentClass: "Artificer" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
});

test("戰役設定只取英文鏡像同名實體節點自身頁碼", () => {
  const lore = { data: [{ type: "section", name: "Chapter", page: 5, entries: [
    { type: "section", name: "The First World", page: 6, entries: [
      { type: "entries", name: "A Dragon Legend", entries: ["text"] },
    ] },
  ] }] };
  assert.deepEqual(findMirrorEntityPage(lore, { english: "The First World", kind: "lore" }), {
    status: "matched", page: 6,
  });
  assert.deepEqual(findMirrorEntityPage(lore, { english: "A Dragon Legend", kind: "lore" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
  lore.data[0].entries.push({ type: "entries", name: "The First World", page: 9 });
  assert.deepEqual(findMirrorEntityPage(lore, { english: "The First World", kind: "lore" }), {
    status: "conflict", reason: "english_mirror_entity_not_unique",
  });
  lore.data[0].entries[1].source = "OTHER";
  assert.deepEqual(findMirrorEntityPage(lore, { english: "The First World", kind: "lore", source: "FTD" }), {
    status: "matched", page: 6,
  });
  const ftd = mirrorEntityPage({ root: ROOT, profile: loadIngestProfile("FTD2021"), publicationId: "FTD2021",
    english: "The First World", kind: "lore" });
  assert.equal(ftd.status, "matched");
  assert.equal(ftd.page, 6);
  assert.match(ftd.locator, /p\. 6：The First World/u);
});

test("FTD 型 tag 子職也必須使用 statblock 自身頁碼", () => {
  const tagged = { data: [{ type: "section", page: 14, entries: [
    { type: "statblock", tag: "subclass", name: "Drakewarden", className: "Ranger" },
  ] }] };
  assert.deepEqual(findMirrorEntityPage(tagged, { english: "Drakewarden", kind: "subclass", parentClass: "Ranger" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
  tagged.data[0].entries[0].page = 15;
  assert.deepEqual(findMirrorEntityPage(tagged, { english: "Drakewarden", kind: "subclass", parentClass: "Ranger" }), {
    status: "matched", page: 15,
  });
});

test("同名子職的明示來源代碼必須符合出版品", () => {
  const editions = { data: [
    { type: "statblock", tag: "subclass", source: "OLD", name: "Drakewarden", className: "Ranger", page: 9 },
    { type: "statblock", tag: "subclass", source: "FTD", name: "Drakewarden", className: "Ranger", page: 15 },
  ] };
  assert.deepEqual(findMirrorEntityPage(editions, { english: "Drakewarden", kind: "subclass",
    parentClass: "Ranger", source: "FTD" }), { status: "matched", page: 15 });
  assert.deepEqual(findMirrorEntityPage(editions, { english: "Drakewarden", kind: "subclass",
    parentClass: "Ranger", source: "NEW" }), { status: "incomplete", reason: "english_mirror_entity_missing" });
});

test("same name is constrained by entity kind and parent, and duplicates block", () => {
  assert.deepEqual(findMirrorEntityPage(book, { english: "Cartographer", kind: "class" }), {
    status: "incomplete", reason: "english_mirror_entity_missing",
  });
  assert.deepEqual(findMirrorEntityPage(book, { english: "Cartographer", kind: "subclass", parentClass: "Wizard" }), {
    status: "incomplete", reason: "english_mirror_entity_missing",
  });
  const duplicate = structuredClone(book);
  duplicate.data[0].entries.push({ type: "statblock", tag: "class", name: "Artificer", page: 99 });
  assert.deepEqual(findMirrorEntityPage(duplicate, { english: "Artificer", kind: "class" }), {
    status: "conflict", reason: "english_mirror_entity_not_unique",
  });
});

test("species needs its own race statblock page, not the enclosing section page", () => {
  const speciesBook = { data: [{ type: "section", name: "Species", page: 27, entries: [
    { type: "statblock", tag: "race", name: "Changeling" },
    { type: "statblock", tag: "race", name: "Shifter", page: 36 },
  ] }] };
  assert.deepEqual(findMirrorEntityPage(speciesBook, { english: "Changeling", kind: "species" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
  assert.deepEqual(findMirrorEntityPage(speciesBook, { english: "Shifter", kind: "species" }), {
    status: "matched", page: 36,
  });
});

test("背景只接受同出版品的唯一實體自身頁碼", () => {
  const backgrounds = { data: [{ type: "section", name: "Backgrounds", page: 27, entries: [
    { type: "statblock", tag: "background", source: "OLD", name: "Shared", page: 28 },
    { type: "statblock", tag: "background", source: "NEW", name: "Shared", page: 29 },
    { type: "statblock", tag: "background", source: "NEW", name: "No Page" },
  ] }] };
  assert.deepEqual(findMirrorEntityPage(backgrounds, { english: "Shared", kind: "background", source: "NEW" }), {
    status: "matched", page: 29,
  });
  assert.deepEqual(findMirrorEntityPage(backgrounds, { english: "Shared", kind: "background", source: "OTHER" }), {
    status: "incomplete", reason: "english_mirror_entity_missing",
  });
  assert.deepEqual(findMirrorEntityPage(backgrounds, { english: "No Page", kind: "background", source: "NEW" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
  backgrounds.data[0].entries.push({ type: "statblock", tag: "background", source: "NEW", name: "Shared", page: 30 });
  assert.deepEqual(findMirrorEntityPage(backgrounds, { english: "Shared", kind: "background", source: "NEW" }), {
    status: "conflict", reason: "english_mirror_entity_not_unique",
  });
});

test("feat in a book snapshot needs its own page, never the feat chapter page", () => {
  const feats = { data: [{ type: "section", name: "Feats", page: 39, entries: [
    { type: "statblock", tag: "feat", name: "New Feat" },
    { type: "statblock", tag: "feat", name: "Other Feat", page: 41 },
  ] }] };
  assert.deepEqual(findMirrorEntityPage(feats, { english: "New Feat", kind: "feat" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
  assert.deepEqual(findMirrorEntityPage(feats, { english: "Other Feat", kind: "feat" }), { status: "matched", page: 41 });
});

test("magic item page never inherits the treasure chapter page", () => {
  const items = { data: [{ type: "section", name: "Treasure", page: 213, entries: [
    { type: "statblock", tag: "item", source: "XDMG", name: "Ring of Invisibility" },
    { type: "statblock", tag: "item", source: "XDMG", name: "Ring of Jumping", page: 296 },
  ] }] };
  assert.deepEqual(findMirrorEntityPage(items, { english: "Ring of Invisibility", kind: "magic-item" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
  assert.deepEqual(findMirrorEntityPage(items, { english: "Ring of Jumping", kind: "magic-item", source: "XDMG" }), { status: "matched", page: 296 });
  assert.deepEqual(findMirrorEntityPage(items, { english: "Ring of Jumping", kind: "magic-item", source: "EFA" }), {
    status: "incomplete", reason: "english_mirror_entity_missing",
  });
});

test("設定式新出版品從隔離快照取得實體頁碼與可追溯來源", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-mirror-entity-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const mirror = path.join(root, "原始資料", "外部來源鏡像", "TEST2026");
  fs.mkdirSync(mirror, { recursive: true });
  fs.writeFileSync(path.join(mirror, "manifest.yml"), [
    "publication_id: TEST2026", "publication_title: Test Book (2026)",
    "upstream_url: https://example.test/book.json", "snapshot:",
    "  file: 原始資料/外部來源鏡像/TEST2026/book.json", "",
  ].join("\n"));
  fs.writeFileSync(path.join(mirror, "book.json"), JSON.stringify(book));
  const result = mirrorEntityPage({ root, profile: { canonical_mirror: { output_root: "原始資料/外部來源鏡像/TEST2026" } },
    publicationId: "TEST2026", english: "Artificer", kind: "class" });
  assert.equal(result.status, "matched");
  assert.equal(result.page, 7);
  assert.equal(result.file, "原始資料/外部來源鏡像/TEST2026/book.json");
  assert.equal(result.manifest_file, "原始資料/外部來源鏡像/TEST2026/manifest.yml");
  assert.match(result.locator, /p\. 7：Artificer/);
});

test("零候選的鏡像證據只收同類別資料集或書籍快照", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-mirror-evidence-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, "原始資料", "外部來源鏡像", "TEST2026");
  fs.mkdirSync(path.join(directory, "datasets"), { recursive: true });
  fs.writeFileSync(path.join(directory, "manifest.yml"), "snapshot:\n  file: 原始資料/外部來源鏡像/TEST2026/book.json\n");
  fs.writeFileSync(path.join(directory, "book.json"), "{}");
  fs.writeFileSync(path.join(directory, "datasets", "spells.json"), "{}");
  fs.writeFileSync(path.join(directory, "datasets", "feats.json"), "{}");
  const profile = { canonical_mirror: { output_root: "原始資料/外部來源鏡像/TEST2026", datasets: [
    { file: "原始資料/外部來源鏡像/TEST2026/datasets/spells.json", locator_prefix: "spell:" },
    { file: "原始資料/外部來源鏡像/TEST2026/datasets/feats.json", locator_prefix: "feat:" },
  ] } };
  const manifest = "原始資料/外部來源鏡像/TEST2026/manifest.yml";
  assert.deepEqual(mirrorEvidenceFiles({ root, profile, kind: "spell" }),
    [manifest, "原始資料/外部來源鏡像/TEST2026/datasets/spells.json"]);
  assert.deepEqual(mirrorEvidenceFiles({ root, profile, kind: "feat" }),
    [manifest, "原始資料/外部來源鏡像/TEST2026/datasets/feats.json"]);
  assert.deepEqual(mirrorEvidenceFiles({ root, profile, kind: "class" }),
    [manifest, "原始資料/外部來源鏡像/TEST2026/book.json"]);
  assert.throws(() => mirrorEvidenceFiles({ root, profile: { canonical_mirror: { output_root: "../outside" } }, kind: "class" }),
    /越出原始資料/);
});

test("英文鏡像快照不可經目錄接點讀取原始資料外的內容", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-mirror-junction-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const mirror = path.join(root, "原始資料", "外部來源鏡像", "TEST2026");
  const outside = path.join(root, "outside");
  fs.mkdirSync(mirror, { recursive: true });
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "book.json"), JSON.stringify(book));
  fs.writeFileSync(path.join(outside, "spells.json"), JSON.stringify({ spell: [{ name: "Test Spell", source: "TST", page: 8 }] }));
  try { fs.symlinkSync(outside, path.join(mirror, "linked"), "junction"); }
  catch (error) { if (["EPERM", "EACCES"].includes(error.code)) return context.skip("此環境不可建立目錄接點"); throw error; }
  fs.writeFileSync(path.join(mirror, "manifest.yml"), [
    "publication_id: TEST2026", "publication_title: Test Book (2026)",
    "upstream_url: https://example.test/book.json", "snapshot:",
    "  file: 原始資料/外部來源鏡像/TEST2026/linked/book.json", "",
  ].join("\n"));
  const profile = { canonical_mirror: { output_root: "原始資料/外部來源鏡像/TEST2026" } };
  assert.deepEqual(mirrorEntityPage({ root, profile, publicationId: "TEST2026", english: "Artificer", kind: "class" }),
    { status: "conflict", reason: "english_mirror_outside_raw_sources" });
  assert.throws(() => mirrorEvidenceFiles({ root, profile, kind: "class" }), /越出原始資料/);
  const datasetProfile = { canonical_mirror: { ...profile.canonical_mirror, book_id: "TST", datasets: [{
    file: "原始資料/外部來源鏡像/TEST2026/linked/spells.json", locator_prefix: "spell:", url: "https://example.test/spells.json",
  }] } };
  assert.deepEqual(mirrorDatasetEntityPage({ root, profile: datasetProfile, publicationId: "TEST2026",
    english: "Test Spell", kind: "spell" }), { status: "conflict", reason: "english_mirror_outside_raw_sources" });
});

test("法術資料集必須同英文名稱且同出版品，並使用實體自身頁碼", () => {
  const records = [
    { name: "Shared Spell", source: "OLD", page: 11 },
    { name: "Shared Spell", source: "NEW", page: 42 },
  ];
  assert.deepEqual(findMirrorDatasetPage(records, { english: "Shared Spell", source: "NEW" }), { status: "matched", page: 42 });
  assert.deepEqual(findMirrorDatasetPage(records, { english: "Shared Spell", source: "OTHER" }), {
    status: "incomplete", reason: "english_mirror_entity_missing",
  });
  assert.deepEqual(findMirrorDatasetPage([{ name: "No Page", source: "NEW" }], { english: "No Page", source: "NEW" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
});

test("法術設定只接受已登錄的隔離資料集與來源定位", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-mirror-spell-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, "原始資料", "外部來源鏡像", "TEST2026");
  fs.mkdirSync(path.join(directory, "datasets"), { recursive: true });
  fs.writeFileSync(path.join(directory, "manifest.yml"), "publication_id: TEST2026\npublication_title: Test Book (2026)\n");
  fs.writeFileSync(path.join(directory, "datasets", "spells.json"), JSON.stringify({ spell: [{ name: "New Spell", source: "TST", page: 31 }] }));
  const result = mirrorDatasetEntityPage({ root, publicationId: "TEST2026", english: "New Spell", kind: "spell", profile: {
    canonical_mirror: { output_root: "原始資料/外部來源鏡像/TEST2026", book_id: "tst", datasets: [
      { file: "原始資料/外部來源鏡像/TEST2026/datasets/spells.json", url: "https://example.test/spells.json", locator_prefix: "spell:" },
    ] },
  } });
  assert.equal(result.status, "matched");
  assert.equal(result.page, 31);
  assert.match(result.locator, /p\. 31：New Spell/);
  assert.equal(result.file, "原始資料/外部來源鏡像/TEST2026/datasets/spells.json");
});

test("專長資料集只以同出版品實體頁碼配對，跨書同名不混用", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-mirror-feat-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, "原始資料", "外部來源鏡像", "TEST2026");
  fs.mkdirSync(path.join(directory, "datasets"), { recursive: true });
  fs.writeFileSync(path.join(directory, "manifest.yml"), "publication_id: TEST2026\npublication_title: Test Book (2026)\n");
  fs.writeFileSync(path.join(directory, "datasets", "feats.json"), JSON.stringify({ feat: [
    { name: "Shared Feat", source: "OLD", page: 11 },
    { name: "Shared Feat", source: "TST", page: 42 },
    { name: "No Page", source: "TST" },
  ] }));
  const profile = { canonical_mirror: { output_root: "原始資料/外部來源鏡像/TEST2026", book_id: "tst", datasets: [
    { file: "原始資料/外部來源鏡像/TEST2026/datasets/feats.json", url: "https://example.test/feats.json", locator_prefix: "feat:" },
  ] } };
  const match = mirrorDatasetEntityPage({ root, profile, publicationId: "TEST2026", english: "Shared Feat", kind: "feat" });
  assert.equal(match.status, "matched");
  assert.equal(match.page, 42);
  assert.match(match.locator, /p\. 42：Shared Feat/);
  assert.deepEqual(mirrorDatasetEntityPage({ root, profile, publicationId: "TEST2026", english: "No Page", kind: "feat" }), {
    status: "ambiguous", reason: "english_mirror_entity_page_unresolved",
  });
});

test("EBER2025 共用英文專長資料集提供 EFA 實體頁碼", () => {
  const profile = loadIngestProfile("EBER2025");
  const result = mirrorDatasetEntityPage({ root: ROOT, profile, publicationId: "EBER2025",
    english: "Greater Mark of Handling", kind: "feat" });
  assert.equal(result.status, "matched");
  assert.equal(result.page, 43);
  assert.match(result.locator, /p\. 43：Greater Mark of Handling/);
  assert.deepEqual(mirrorDatasetEntityPage({ root: ROOT, profile, publicationId: "EBER2025",
    english: "Alert", kind: "feat" }), { status: "incomplete", reason: "english_mirror_entity_missing" });
});
