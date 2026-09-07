import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { nonEntityReason, parseBilingualTitle } from "../scripts/ingest/ingest-lore.mjs";
import { sourceFragment } from "../scripts/migrate/restore-lore-source-text.mjs";
import {
  deriveSourceType,
  collectLintTargets,
  extractFrontmatter,
  lintWiki,
  parseWikiLink,
  resolveWikiTarget,
  validateSubclassSpellTables,
  validateDragonmarkSpellTables,
  validateMagicItemStructure,
  validateSpellTargetArea,
} from "../scripts/core/wiki-lint.mjs";
import { parseTargetAreaExceptions, planSpellTargetArea, preserveSpellFieldsForImport, splitCombinedTargetArea, validateSpellField } from "../scripts/core/spell-target-area.mjs";
import { normalizeMirrorCitations } from "../scripts/audit/audit-mirror-citations.mjs";
import { buildHealthReport, isSourcePlaceholder, publicationFor, sourcePriority } from "../scripts/audit/audit-wiki-health.mjs";
import { collectFeatHeadings } from "../scripts/ingest/feat-heading-utils.mjs";
import { rebuildLore } from "../scripts/ingest/rebuild-lore.mjs";
import { audit as auditLorePlacement } from "../scripts/audit/audit-lore-placement.mjs";
import { buildFrwikiCandidate, collectPagePayloads, extractClaimCandidates, extractDiscoveryIndex, extractOfficialCitations, publicationRecords, sourceAcquisitionQueue } from "../scripts/ingest/discover-frwiki-lore.mjs";

test("Target／Area 只拆既有資料、略去自身目標並保留自身起源區域", () => {
  const both = splitCombinedTargetArea("目標：施法距離內一點；效應區域：以該點為中心的 20 呎半徑球狀區域");
  assert.deepEqual({ target: both.target, area: both.area, layout: both.layout }, { target: "施法距離內一點", area: "以該點為中心的 20 呎半徑球狀區域", layout: "both" });
  assert.equal(splitCombinedTargetArea("目標：自身").layout, "omitted");
  assert.equal(splitCombinedTargetArea("效應區域：以自身為原點的 5 呎光環").layout, "area-only");
  assert.equal(validateSpellField("target", "自身").ok, false);
  const source = "- **施法距離 (Range)**：60 呎\r\n- **目標／範圍 (Target/Area)**：施法距離內 1 名生物\r\n- **法術成分 (Components)**：V\r\n正文不變\r\n";
  const plan = planSpellTargetArea(source);
  assert.equal(plan.status, "change");
  assert.match(plan.text, /- \*\*目標 \(Target\)\*\*：施法距離內 1 名生物\r\n/);
  assert.match(plan.text, /正文不變\r\n$/);
});

test("子職授法表要求每個法術各占一列", () => {
  const record = {
    rel: "wiki/職業/測試子職.md",
    bodyStartLine: 20,
    data: { category: "職業", entry_type: "子職" },
    body: [
      "| 職業等級 | 法術 |",
      "| :--: | :--- |",
      "| 3 | [[法術甲\\|法術甲 (Spell A)]]、[[法術乙\\|法術乙 (Spell B)]] |",
    ].join("\n"),
  };
  const diagnostics = [];
  validateSubclassSpellTables(record, diagnostics);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "SUBCLASS_SPELL_TABLE_CELL");

  record.body = [
    "| 職業等級 | 法術 |",
    "| :--: | :--- |",
    "| 3 | [[法術甲\\|法術甲 (Spell A，2014 Legacy)]] |",
    "| 3 | [[法術乙\\|法術乙 (Spell B)]] |",
  ].join("\n");
  const validDiagnostics = [];
  validateSubclassSpellTables(record, validDiagnostics);
  assert.equal(validDiagnostics.length, 0);
});

test("龍紋法術表要求每個法術各占一列", () => {
  const record = {
    rel: "wiki/專長/龍紋專長/測試龍紋.md",
    bodyStartLine: 20,
    data: { category: "專長" },
    body: [
      "**測試龍紋法術 Test Mark Spells of the Mark**",
      "",
      "| 法術環階 | 法術 |",
      "| :--: | :--- |",
      "| 一環 | [[法術甲\\|法術甲 (Spell A)]]、[[法術乙\\|法術乙 (Spell B)]] |",
    ].join("\n"),
  };
  const diagnostics = [];
  validateDragonmarkSpellTables(record, diagnostics);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "DRAGONMARK_SPELL_TABLE_CELL");

  record.body = [
    "**測試龍紋法術 Test Mark Spells of the Mark**",
    "",
    "| 法術環階 | 法術 |",
    "| :--: | :--- |",
    "| 一環 | [[法術甲\\|法術甲 (Spell A)]] |",
    "| 一環 | [[法術乙\\|法術乙 (Spell B)]] |",
  ].join("\n");
  const validDiagnostics = [];
  validateDragonmarkSpellTables(record, validDiagnostics);
  assert.equal(validDiagnostics.length, 0);
});

test("Target／Area 例外表可依 entity_id 套用核定值", () => {
  const source = "entity_id: \"entry:PHB2014:spell:374fd53303\"\n- **施法距離 (Range)**：60 呎\n- **目標／範圍 (Target/Area)**：你以施法距離內一點為中心創造一片半徑 20 尺的球狀濃霧。\n- **法術成分 (Components)**：V, S\n";
  const plan = planSpellTargetArea(source);
  assert.equal(plan.status, "change");
  assert.equal(plan.layout, "both");
  assert.match(plan.text, /目標 \(Target\)\*\*：施法距離內一點/);
  assert.match(plan.text, /效應區域 \(Area\)\*\*：以該點為中心的 20 呎半徑球狀區域/);
});

test("Target／Area 例外表拒絕重複 entity_id", () => {
  const duplicate = [
    "{",
    '  "entry:XGE2017:spell:create-bonfire": { "target": "第一值" },',
    '  "entry:XGE2017:spell:create-bonfire": { "target": "覆蓋值" }',
    "}",
  ].join("\n");
  assert.throws(() => parseTargetAreaExceptions(duplicate), /重複 entity_id/u);
});

test("Target／Area 移出 Range 區域尺寸時保留混合換行且可冪等重跑", () => {
  const source = [
    "---\nentity_id: \"entry:TCE2020:spell:712083631e\"\n---",
    "- **施法距離 (Range)**：自身（半徑5 呎）",
    "- **目標／範圍 (Target/Area)**：你製造出一圈臨時的半透明利刃迅速橫掃你的周圍。",
    "- **法術成分 (Components)**：V",
  ].join("\r\n").replace("---\r\n- **施法距離", "---\n- **施法距離");
  const plan = planSpellTargetArea(source);
  assert.equal(plan.status, "change");
  assert.match(plan.text, /Range\)\*\*：自身\r\n/);
  assert.match(plan.text, /效應區域 \(Area\)\*\*：以自身為原點的 5 呎光環\r\n/);
  assert.match(plan.text, /^---\nentity_id:[\s\S]*?---\n- \*\*施法距離/u);
  assert.equal(planSpellTargetArea(plan.text).status, "unchanged");
});

test("法術重建保留既有欄位與刻意省略", () => {
  const existing = "- **施法距離 (Range)**：60 呎\n- **目標 (Target)**：一名生物\n- **法術成分 (Components)**：V\n";
  const generated = "- **施法距離 (Range)**：60 呎\n- **目標／範圍 (Target/Area)**：不應保留\n- **法術成分 (Components)**：V\n";
  const preserved = preserveSpellFieldsForImport(existing, generated);
  assert.equal(preserved.status, "preserved");
  assert.match(preserved.text, /目標 \(Target\)\*\*：一名生物/);
  assert.doesNotMatch(preserved.text, /目標／範圍/);
  const absent = preserveSpellFieldsForImport("- **施法距離 (Range)**：60 呎\n", generated);
  assert.equal(absent.status, "omitted");
  assert.doesNotMatch(absent.text, /目標／範圍/);
});

test("鏡像正文引用改用中文書名與頁碼，無頁碼引用保留待補", () => {
  const publication = { id: "FRAIF2025", title: "被遺忘的國度：費倫冒險", aliases: new Set(["FRAiF", "FRAIF2025", "Forgotten Realms: Adventures in Faerûn (2025)"]) };
  const result = normalizeMirrorCitations("摘要。（來源：FRAiF 2025，pp. 58–59）\n未定。（來源：FRAiF，第二章）", [publication]);
  assert.match(result.text, /（來源：《被遺忘的國度：費倫冒險》，pp\. 58–59）/);
  assert.equal(result.changes.length, 1);
  assert.equal(result.unresolved.length, 1);
});

test("Fandom 註腳只把可對照的官方出版品送入補充佇列", () => {
  const config = {
    provider: { label: "Forgotten Realms Wiki", authority: "社群", role: "entity-discovery-and-citation-index", base_url: "https://example.test/wiki/" },
    watchlists: { person: { setting: "被遺忘的國度", lore_type: "人物" } },
  };
  const records = [
    { id: "ABH2025", aliases: ["astarionsbookofhungers"], locallyAvailable: true },
    { id: "FRCS2001", aliases: ["forgottenrealmscampaignsetting"], locallyAvailable: false },
  ];
  const citations = extractOfficialCitations("<ref>{{Cite book/Astarion's Book of Hungers|42}}</ref><ref>{{Cite book|title=Forgotten Realms Campaign Setting|page=12}}</ref>", records);
  assert.equal(citations[0].status, "本機官方原書待逐段核對");
  assert.equal(citations[0].title, "Astarion's Book of Hungers");
  assert.equal(citations[0].page, "42");
  assert.equal(citations[1].status, "官方註腳尚無本機來源");
  const candidate = buildFrwikiCandidate({ title: "Cazador_Szarr", revisionId: "123", wikitext: "<ref>{{Cite book/Astarion's Book of Hungers|42}}</ref>", type: "person", config, records });
  assert.equal(candidate.disposition, "可進入官方原文校對佇列");
  assert.equal(candidate.community_index.authority, "社群");
});

test("Fandom 註腳有明示書名時不得以文內關鍵字猜測成另一出版品", () => {
  const records = [
    { id: "SCAG2015", aliases: ["swordcoastadventurersguide"], locallyAvailable: true },
  ];
  const [citation] = extractOfficialCitations("<ref>{{Cite book|title=Faiths & Avatars|page=30}} Sword Coast Adventurer's Guide</ref>", records);
  assert.equal(citation.title, "Faiths & Avatars");
  assert.deepEqual(citation.publication_ids, []);
  assert.equal(citation.status, "未映射註腳");
});

test("Fandom 書名變體只映射至明確登錄的既有出版品", () => {
  const phb2014 = publicationRecords().find((record) => record.id === "PHB2014");
  const [citation] = extractOfficialCitations("<ref>{{Cite book|title=Player's Handbook 5th edition|page=121}}</ref>", [phb2014]);
  assert.deepEqual(citation.publication_ids, ["PHB2014"]);
  assert.equal(citation.status, "本機官方原書待逐段核對");
});

test("Fandom 資訊框的別名、關係與事件只作為盤點提示", () => {
  const discovery = extractDiscoveryIndex("| aliases = [[The Lady of Mysteries]]\n| portfolio = [[Magic]]\n| born = -339 DR");
  assert.deepEqual(discovery.aliases, ["The Lady of Mysteries"]);
  assert.deepEqual(discovery.relationships, [{ field: "portfolio", value: "Magic" }]);
  assert.deepEqual(discovery.events, [{ field: "born", value: "-339 DR" }]);
});

test("Fandom 具名註腳會產生可審核的段落候選，而非直接寫入主張", () => {
  const citations = extractOfficialCitations("<ref name=\"SCAG\">{{Cite book/Sword Coast Adventurer's Guide|35}}</ref>", [{ id: "SCAG2015", aliases: ["swordcoastadventurersguide"], locallyAvailable: true }]);
  const claims = extractClaimCandidates("== Faith ==\nMystra tends the Weave.<ref name=\"SCAG\" />", citations);
  assert.deepEqual(claims, [{
    section: "Faith",
    excerpt: "Mystra tends the Weave.",
    citation_reference: 1,
    publication_ids: ["SCAG2015"],
    locally_available_ids: ["SCAG2015"],
    disposition: "比對本機官方原文後可補入",
  }]);
});

test("Fandom 未取得原文的出版品註腳會彙整為來源取得佇列", () => {
  const queue = sourceAcquisitionQueue([
    {
      entity: { english_name: "Mystra" },
      official_citations: [
        { title: "Faiths & Avatars", page: "42", status: "官方註腳尚無本機來源" },
        { title: "Faiths & Avatars", page: "42", status: "官方註腳尚無本機來源" },
        { title: "Sword Coast Adventurer's Guide", page: "35", status: "本機官方原書待逐段核對" },
      ],
    },
    {
      entity: { english_name: "Selûne" },
      official_citations: [{ title: "Faiths & Avatars", page: "77", status: "官方註腳尚無本機來源" }],
    },
  ]);
  assert.deepEqual(queue, [{
    publication_title: "Faiths & Avatars",
    entities: ["Mystra", "Selûne"],
    pages: ["42", "77"],
    statuses: ["官方註腳尚無本機來源"],
    citations: 3,
  }]);
});

test("Fandom 全頁盤點會保留成功頁並回報個別頁面失敗", async () => {
  const result = await collectPagePayloads(["可用頁", "失效頁"], async (title) => {
    if (title === "失效頁") throw new Error("找不到 wikitext");
    return { title, revisionId: "1", wikitext: "" };
  });
  assert.equal(result.payloads.length, 1);
  assert.deepEqual(result.errors, [{ page: "失效頁", error: "找不到 wikitext" }]);
});

test("lint 不允許把 Forgotten Realms Wiki 標示為官方來源", () => {
  const original = fs.readFileSync("wiki/戰役設定/被遺忘的國度/地理/北地.md", "utf8");
  const candidate = original.replace(
    /url: "https:\/\/raw\.githubusercontent\.com\/5etools-mirror-3\/5etools-src\/main\/data\/book\/book-frhof\.json"/,
    'url: "https://forgottenrealms.fandom.com/wiki/North"',
  );
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: ["wiki/戰役設定/被遺忘的國度/地理/北地.md"], overrides: new Map([["wiki/戰役設定/被遺忘的國度/地理/北地.md", candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.code === "FANDOM_AUTHORITY"));
  } finally {
    console.log = originalLog;
  }
});

test("lint 限制 Forgotten Realms Wiki 連結只能作為來源差異中的社群索引", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original.replace("# 北地", "# 北地\n\n參考：https://forgottenrealms.fandom.com/wiki/North");
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.code === "FANDOM_BODY_PLACEMENT"));
  } finally {
    console.log = originalLog;
  }
});

test("lint 會標示鏡像條目內未正規化的英文書籍代號引用", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original
    .replace(/file: "原始資料\/[^"]+"/, 'file: "原始資料/外部來源鏡像/FRAIF2025/chapters/02-The Dalelands.md"')
    .replace(/locator: "[^"]+"/, 'locator: "Forgotten Realms: Adventures in Faerûn (2025), p. 45"')
    .replace("# 北地", "# 北地\n\n摘要。（來源：FRAIF2025，p. 45)");
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "MIRROR_CITATION_FORMAT"));
  } finally {
    console.log = originalLog;
  }
});

test("戰役設定重建器預設只選取一批，且不會寫入", () => {
  const originalLog = process.stdout.write;
  process.stdout.write = () => true;
  try {
    const report = rebuildLore(["--setting", "被遺忘的國度"]);
    assert.ok(report.summary.selected <= 25);
    assert.equal(report.mode, "preview");
  } finally {
    process.stdout.write = originalLog;
  }
});

test("故事資料稽核將中英文題名視為同一來源主題", () => {
  const originalLog = process.stdout.write;
  process.stdout.write = () => true;
  try {
    const report = auditLorePlacement([]);
    assert.equal(report.warnings.filter((item) => item.code === "TITLE_SOURCE_MISMATCH").length, 0);
  } finally {
    process.stdout.write = originalLog;
  }
});

test("故事匯入會以 New Item 轉檔的首個雙語題名作為實體名稱", () => {
  assert.deepEqual(
    parseBilingualTitle("# New Item\n\n**定製龍類 Customizing Dragons**\n\n內容。\n", "定製龍類"),
    { chinese: "定製龍類", english: "Customizing Dragons" },
  );
});

test("故事匯入排除章節題名、前言與泛稱人物頁", () => {
  assert.match(nonEntityReason({ chinese: "第四章：構建艾伯倫冒險", locator: "# 第四章：構建艾伯倫冒險" }), /章節題名/);
  assert.match(nonEntityReason({ chinese: "前言：通往冒險的無盡之門", locator: "# 前言：通往冒險的無盡之門" }), /前置說明/);
  assert.match(nonEntityReason({ chinese: "龍紋角色", locator: "# 龍紋角色" }), /泛稱/);
  assert.match(nonEntityReason({ chinese: "龍紋", english: "NPC", locator: "# 龍紋 NPC" }), /泛稱/);
  assert.equal(nonEntityReason({ chinese: "班恩", locator: "# 班恩 Bane" }), null);
});

test("原始正文重建可依父段落與人物定位切出單一人物資料", () => {
  const source = [
    "# 卡扎多爾·扎爾的家族",
    "",
    "卡扎多爾的子嗣 Cazador's Spawn",
    "",
    "**安特溫·都弗雷 Antwun Dufay，** 曾是人類，是卡扎多爾信任的管家。",
    "**阿斯代倫·安庫因 Astarion Ancunín，** 曾是精靈治安官。",
  ].join("\n");
  assert.deepEqual(
    sourceFragment(source, "卡扎多爾的子嗣 Cazador's Spawn：安特溫·都弗雷"),
    {
      heading: "卡扎多爾的子嗣 Cazador's Spawn",
      body: "**安特溫·都弗雷 Antwun Dufay，** 曾是人類，是卡扎多爾信任的管家。",
    },
  );
});

test("原始正文重建可依行號定位切出人物資料", () => {
  const source = [
    "# 卡扎多爾·扎爾的家族",
    "",
    "**安特溫·都弗雷 Antwun Dufay，** 曾是人類，是卡扎多爾信任的管家。",
    "**阿斯代倫·安庫因 Astarion Ancunín，** 曾是精靈治安官。",
  ].join("\n");
  assert.equal(
    sourceFragment(source, "L3：安特溫·都弗雷 Antwun Dufay").body,
    "**安特溫·都弗雷 Antwun Dufay，** 曾是人類，是卡扎多爾信任的管家。",
  );
});

test("extractFrontmatter separates YAML and body", () => {
  const result = extractFrontmatter('---\ntitle: "測試"\n---\n# 測試\n');
  assert.equal(result.yaml, 'title: "測試"');
  assert.equal(result.body, "# 測試\n");
});

test("deriveSourceType follows authority formula", () => {
  assert.equal(deriveSourceType([{ authority: "官方" }]), "official");
  assert.equal(deriveSourceType([{ authority: "官方" }, { authority: "社群" }]), "mixed");
  assert.equal(deriveSourceType([{ authority: "UA" }]), "ua");
});

test("parseWikiLink handles escaped table aliases", () => {
  assert.deepEqual(parseWikiLink("長休\\|長休 (Long Rest)"), {
    target: "長休",
    alias: "長休 (Long Rest)",
  });
});

test("parseWikiLink removes heading fragments", () => {
  assert.deepEqual(parseWikiLink("職業/奇械師/煉金師#特性|煉金師"), {
    target: "職業/奇械師/煉金師",
    alias: "煉金師",
  });
});

test("lint 指定檔案與目錄只展開 wiki 內 Markdown", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-lint-"));
  const wikiRoot = path.join(root, "wiki");
  fs.mkdirSync(path.join(wikiRoot, "規則", "子目錄"), { recursive: true });
  fs.writeFileSync(path.join(wikiRoot, "規則", "甲.md"), "# 甲");
  fs.writeFileSync(path.join(wikiRoot, "規則", "子目錄", "乙.md"), "# 乙");
  fs.writeFileSync(path.join(wikiRoot, "規則", "略過.txt"), "略過");
  try {
    assert.deepEqual(collectLintTargets(["wiki/規則/甲.md"], { root, wikiRoot }), ["wiki/規則/甲.md"]);
    assert.deepEqual(new Set(collectLintTargets(["wiki/規則"], { root, wikiRoot })), new Set(["wiki/規則/甲.md", "wiki/規則/子目錄/乙.md"]));
    assert.throws(() => collectLintTargets(["原始資料/甲.md"], { root, wikiRoot }), /wiki\/ 內/);
    assert.throws(() => collectLintTargets(["wiki/../原始資料/甲.md"], { root, wikiRoot }), /wiki\/ 內/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("完整 Wiki 路徑接受單一 wiki 前綴並拒絕重複與副檔名", () => {
  const record = { rel: "wiki/規則/甲.md" };
  const catalog = { exact: new Map([[record.rel, record]]), byBasename: new Map([["甲", [record]]]) };
  assert.equal(resolveWikiTarget("規則/甲", catalog).status, "ok");
  assert.equal(resolveWikiTarget("wiki/規則/甲", catalog).status, "ok");
  assert.equal(resolveWikiTarget("wiki/wiki/規則/甲", catalog).status, "duplicate-prefix");
  assert.equal(resolveWikiTarget("wiki/規則/甲.md", catalog).status, "invalid-extension");
});

test("健康度報告按出版品與檔案類型分組，並排除 disposition 來源", () => {
  const report = buildHealthReport({
    generatedAt: "2026-09-01T00:00:00.000Z",
    publications: [["PHB2024", { source_assets: [{ path: "原始資料/玩家手冊2024" }] }]],
    pages: [
      { file: "wiki/法術/甲.md", title: "甲", publication: "PHB2024", body: "正文", mirrorRuleText: true, data: { category: "法術", version: "2024-Core", confidence: "interpreted", sources: [{ authority: "官方", translation: "none", file: "原始資料/外部來源鏡像/PHB2024/datasets/spells-xphb.json", locator: "spell:甲" }, { authority: "官方", file: "原始資料/玩家手冊2024/甲.md", locator: "L1" }] } },
      { file: "wiki/法術/乙.md", title: "乙", publication: "PHB2024", body: "來源差異", mirrorRuleText: true, data: { category: "法術", version: "2024-Core", confidence: "interpreted", sources: [{ authority: "官方", translation: "none", file: "原始資料/外部來源鏡像/PHB2024/datasets/spells-xphb.json", locator: "spell:乙" }, { authority: "官方", file: "原始資料/玩家手冊2024/乙.md", locator: "L1" }] } },
      { file: "wiki/法術/丙.md", title: "丙", publication: "PHB2024", body: "正文", data: { category: "法術", version: "2024-Core", confidence: "interpreted", sources: [{ authority: "官方", translation: "community", file: "原始資料/玩家手冊2024/丙.md", locator: "L1" }] } },
      { file: "wiki/法術/丁.md", title: "丁", publication: "PHB2024", body: "正文", data: { category: "法術", version: "2024-Core", confidence: "interpreted", sources: [{ authority: "官方", translation: "none", file: "原始資料/外部來源鏡像/PHB2024/book-xphb.json", locator: "圖片：book/XPHB/cover.webp" }] } },
      { file: "wiki/法術/戊.md", title: "戊", publication: "PHB2024", body: "正文", mirrorRuleText: false, data: { category: "法術", version: "2024-Core", confidence: "interpreted", sources: [{ authority: "官方", translation: "none", file: "原始資料/外部來源鏡像/PHB2024/book-xphb.json", locator: "Chapter > Feats > 戊" }] } },
      { file: "wiki/法術/庚.md", title: "庚", publication: "PHB2024", body: "正文", data: { category: "法術", version: "2024-Core", confidence: "interpreted", sources: [{ authority: "官方", translation: "none", file: "原始資料/外部來源鏡像/PHB2024/book-xphb.json", locator: "Chapter > Feats > 庚" }] } },
      { file: "wiki/法術/己.md", title: "己", publication: "PHB2024", body: "## 來源差異與不確定性\n- 本頁保存 2025 年來源所述的世界觀；跨出版品差異應保留來源與適用範圍。", data: { category: "法術", version: "2024-Core", confidence: "interpreted", sources: [{ authority: "官方", translation: "none", file: "原始資料/外部來源鏡像/PHB2024/datasets/spells-xphb.json", locator: "spell:己" }, { authority: "官方", file: "原始資料/玩家手冊2024/己.md", locator: "L1" }] } },
      { file: "wiki/背景/2014/甲.md", title: "甲", publication: "PHB2014", body: "正文", mirrorRuleText: true, data: { category: "背景", ruleset: "2014", status: "legacy", compatibility_2024: "compatible", sources: [{ authority: "官方", translation: "none", file: "原始資料/外部來源鏡像/PHB2014/chapters/02-Chapter 4- Personality and Background.md", locator: "p.1" }] } },
      { file: "wiki/背景/2014/已核定.md", title: "已核定", publication: "PHB2014", body: "正文", mirrorRuleText: true, data: { category: "背景", ruleset: "2014", status: "legacy", compatibility_2024: "compatible", confidence: "confirmed", sources: [{ authority: "官方", translation: "none", file: "原始資料/外部來源鏡像/PHB2014/chapters/02-Chapter 4- Personality and Background.md", locator: "p.2" }] } },
      { file: "wiki/怪物/2014/乙.md", title: "乙", publication: "PHB2014", body: "正文", data: { category: "怪物", ruleset: "2014", status: "legacy", compatibility_2024: "compatible", sources: [] } },
    ],
    manifest: { sources: [
      { file: "原始資料/玩家手冊2024/缺口.md", absorbed_by: [], disposition: null },
      { file: "原始資料/玩家手冊2024/封面.webp", absorbed_by: [], disposition: null },
      { file: "原始資料/玩家手冊2024/重複.md", absorbed_by: [], disposition: { status: "duplicate" } },
    ] },
  });
  assert.equal(report.unreferenced_sources.total, 2);
  assert.deepEqual(report.unreferenced_sources.by_file_type, { "圖片": 1, "文字": 1 });
  assert.deepEqual(report.candidates.by_status, { "可核定候選": 1, "待補條件": 5, "衝突候選": 1 });
  assert.equal(report.candidates.by_reason["英文鏡像未含同名規則正文（可能僅有指標）"], 1);
  assert.equal(report.candidates.by_reason["未引用可定位的官方英文鏡像"], 2);
  const missingRuleBody = report.candidates.entries.find((entry) => entry.file === "wiki/法術/戊.md");
  assert.equal(missingRuleBody.reason, "英文鏡像未含同名規則正文（可能僅有指標）");
  const missingMirror = report.candidates.entries.find((entry) => entry.file === "wiki/法術/丙.md");
  assert.equal(missingMirror.reason, "未引用可定位的官方英文鏡像");
  assert.equal(report.legacy_backlog.total, 1);
  assert.deepEqual(report.legacy_backlog.by_category, { "背景": 1 });
  assert.equal(report.legacy_backlog.entries[0].priority, "medium");
  assert.equal(report.legacy_backlog.entries[0].replacement_status, "not_replaced");
  assert.deepEqual(report.legacy_backlog.by_mirror_status, { "已有可核對英文鏡像": 1 });
  assert.equal(report.legacy_backlog.entries[0].english_mirror, true);
});

test("來源優先級將現行出版品置高、魔物置低", () => {
  assert.equal(sourcePriority({ publication: "PHB2024", file: "原始資料/玩家手冊2024/甲.md" }), "high");
  assert.equal(sourcePriority({ publication: "PHB2014", file: "原始資料/玩家手冊2014/甲.md" }), "medium");
  assert.equal(sourcePriority({ publication: "MM2025", file: "原始資料/怪物圖鑑2025/甲.md" }), "low");
});

test("健康度報告將已登錄外部鏡像歸入對應出版品", () => {
  const publications = [["EBER2025", { source_assets: [{ path: "原始資料/艾伯倫：奇械鍛爐" }] }]];
  assert.equal(publicationFor("原始資料/外部來源鏡像/EBER2025/chapters/02-Chapter 01.md", publications), "EBER2025");
  assert.equal(publicationFor("原始資料/外部來源鏡像/UNKNOWN2025/chapters/01.md", publications), "未登錄出版品");
});

test("健康度報告不將書籍 JSON 的同名敘述視為規則資料集", () => {
  const source = "原始資料/外部來源鏡像/PHB2014/book-phb.json";
  assert.equal(/\/datasets\/[^/]+\.json$/u.test(source), false);
  assert.equal(/\/datasets\/[^/]+\.json$/u.test("原始資料/外部來源鏡像/XGE2017/datasets/spells-xge.json"), true);
});

test("健康度報告排除待匯入出版品的 gitkeep 支架檔", () => {
  assert.equal(isSourcePlaceholder("原始資料/待匯入出版品/XGE/.gitkeep"), true);
  assert.equal(isSourcePlaceholder("原始資料/待匯入出版品/XGE/法術.md"), false);
  const report = buildHealthReport({ pages: [], publications: [], manifest: { sources: [
    { file: "原始資料/待匯入出版品/XGE/.gitkeep", absorbed_by: [], disposition: null },
    { file: "原始資料/來源/內容.md", absorbed_by: [], disposition: null },
  ] } });
  assert.equal(report.unreferenced_sources.total, 1);
});

test("單檔專長來源可要求頂層先決條件，避免將子特性誤判為專長", () => {
  const headings = collectFeatHeadings([
    "**巨人打擊 Strike of the Giants**",
    "_先決: 軍用武器熟練或巨人養子背景_",
    "**雲霧打擊 Cloud Strike。**",
    "目標受到額外傷害。",
  ], { directFeatFile: true, requirePrerequisiteHeading: true });
  assert.deepEqual(headings, [{ index: 0, chinese: "巨人打擊", english: "Strike of the Giants" }]);
});

test("lint 可在指定範圍驗證記憶體候選內容", () => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({
      files: ["wiki/索引.md"],
      overrides: new Map([["wiki/索引.md", "---\ntitle: [\n---\n# 索引\n"]]),
    });
    assert.ok(result.scopeSize > 0);
    assert.ok(result.diagnostics.some((item) => item.file === "wiki/索引.md" && item.code === "YAML_PARSE"));
  } finally {
    console.log = originalLog;
  }
});

test("5e.tools 外部鏡像可作為可定位來源，但不得冒充原始中文資料", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original.replace(
    /file: "原始資料\/[^"]+"/,
    'file: "原始資料/外部來源鏡像/FRAIF2025/chapters/02-The Dalelands.md"',
  ).replace(/locator: "[^"]+"/, 'locator: "Chapter 2: The Dalelands; p. 45"').replace('translation: "community"', 'translation: "none"');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.equal(result.diagnostics.some((item) => item.code === "SOURCE_SCOPE"), false);
    assert.equal(result.diagnostics.some((item) => item.code === "SOURCE_MISSING"), false);
  } finally {
    console.log = originalLog;
  }
});

test("2014 Legacy 角色選項必須使用統一的 2024 相容性標示", () => {
  const file = "wiki/種族/2014/半精靈.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original.replace('compatibility_2024: "compatible"', 'compatibility_2024: "未分類"');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "LEGACY_2024_COMPATIBILITY"));
  } finally {
    console.log = originalLog;
  }
});

test("2014 Legacy 玩家選項必須分開標示 AL 可用性與戰役", () => {
  const file = "wiki/種族/2014/半精靈.md";
  const original = fs.readFileSync(file, "utf8");
  const invalid = original
    .replace(/^al_availability:.*\r?\n/m, "")
    .replace(/^al_campaigns:\r?\n(?:  - .*\r?\n)*/m, "")
    .replace(/^al_note:.*\r?\n/m, "")
    .replace(/^(compatibility_2024:.*\r?\n)/m, '$1al_availability: "available"\n');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, invalid]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "AL_CAMPAIGNS_REQUIRED"));
  } finally {
    console.log = originalLog;
  }
});

test("AL 禁用或待覆核的 Legacy 條目不得保留戰役清單", () => {
  const file = "wiki/種族/2014/半獸人.md";
  const original = fs.readFileSync(file, "utf8");
  const invalid = original
    .replace(/^al_availability:.*\r?\n/m, "")
    .replace(/^al_campaigns:\r?\n(?:  - .*\r?\n)*/m, "")
    .replace(/^al_note:.*\r?\n/m, "")
    .replace(/^(compatibility_2024:.*\r?\n)/m, '$1al_availability: "review"\nal_campaigns:\n  - "FR"\nal_note: "測試"\n');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, invalid]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "AL_CAMPAIGNS_FORBIDDEN"));
  } finally {
    console.log = originalLog;
  }
});

test("附錄 A 已列的現行擴充玩家選項必須有 AL 戰役與官方來源", () => {
  const file = "wiki/專長/龍紋專長/創造龍紋.md";
  const original = fs.readFileSync(file, "utf8");
  const invalid = original.replace(/^al_campaigns:\r?\n(?:  - .*\r?\n)*/m, "");
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, invalid]]) });
    assert.ok(result.diagnostics.some((item) => item.code === "AL_CAMPAIGNS_REQUIRED"));
  } finally {
    console.log = originalLog;
  }
});

test("非組織遊戲的戰役設定必須標示連續性", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original.replace('setting_continuity: "continuous"\n', "");
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "SETTING_CONTINUITY_REQUIRED"));
  } finally {
    console.log = originalLog;
  }
});

test("setting_continuity 僅限非組織遊戲的戰役設定", () => {
  const ordinaryFile = "wiki/索引.md";
  const alFile = "wiki/冒險者聯盟/冒險調整/艾伯倫戰役調整.md";
  const ordinary = fs.readFileSync(ordinaryFile, "utf8").replace('category: "規則機制"\n', 'category: "規則機制"\nsetting_continuity: "continuous"\n');
  const al = fs.readFileSync(alFile, "utf8").replace('category: "戰役設定"\n', 'category: "戰役設定"\nsetting_continuity: "continuous"\n');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({
      files: [ordinaryFile, alFile],
      overrides: new Map([[ordinaryFile, ordinary], [alFile, al]]),
    });
    assert.ok(result.diagnostics.some((item) => item.file === ordinaryFile && item.code === "SETTING_CONTINUITY_CATEGORY"));
    assert.ok(result.diagnostics.some((item) => item.file === alFile && item.code === "SETTING_CONTINUITY_ORGANIZED_PLAY"));
  } finally {
    console.log = originalLog;
  }
});

test("故事資料頁必須標示世界、類型與穩定概念 ID", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const missing = original
    .replace('setting: "被遺忘的國度"\n', "")
    .replace('lore_type: "地理"\n', "");
  const wrongConcept = original.replace(
    "concept:setting:forgotten-realms:geography:",
    "concept:setting:eberron:geography:",
  );
  const originalLog = console.log;
  console.log = () => {};
  try {
    const missingResult = lintWiki({ files: [file], overrides: new Map([[file, missing]]) });
    assert.ok(missingResult.diagnostics.some((item) => item.file === file && item.code === "SETTING_REQUIRED"));
    assert.ok(missingResult.diagnostics.some((item) => item.file === file && item.code === "LORE_TYPE_REQUIRED"));
    const conceptResult = lintWiki({ files: [file], overrides: new Map([[file, wrongConcept]]) });
    assert.ok(conceptResult.diagnostics.some((item) => item.file === file && item.code === "LORE_CONCEPT_ID"));
  } finally {
    console.log = originalLog;
  }
});

test("世界與類型必須符合戰役設定路徑", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original
    .replace('setting: "被遺忘的國度"', 'setting: "艾伯倫"')
    .replace('lore_type: "地理"', 'lore_type: "世界觀"');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "SETTING_PATH"));
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "LORE_TYPE_PATH"));
  } finally {
    console.log = originalLog;
  }
});

test("人物怪物資料卡必須有怪物頁反向連結", () => {
  const person = "wiki/戰役設定/被遺忘的國度/人物/阿斯代倫・安庫因.md";
  const monster = "wiki/怪物/亡靈/初生吸血鬼.md";
  const original = fs.readFileSync(monster, "utf8");
  const candidate = original.replace("戰役設定/被遺忘的國度/人物/阿斯代倫・安庫因", "戰役設定/被遺忘的國度/人物/阿斯代倫・安庫因-缺失");
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [person, monster], overrides: new Map([[monster, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === person && item.code === "PERSON_STAT_BACKLINK"));
  } finally {
    console.log = originalLog;
  }
});

test("魔法物品結構檢查標示泛稱、占位觸發與重複限制", () => {
  const diagnostics = [];
  validateMagicItemStructure({
    rel: "wiki/魔法物品/奇物/測試.md",
    bodyStartLine: 20,
    data: { category: "魔法物品" },
    body: [
      "### 物品資料",
      "",
      "| 項目 | 內容 |",
      "| :--- | :--- |",
      "| 類別 (Category) | 奇物 |",
      "| 稀有度 (Rarity) | 普通 |",
      "| 同調 (Attunement) | 不需要 |",
      "| 消耗品 (Consumable) | 否 |",
      "",
      "### 物品效果",
      "",
      "- **特殊能力**：",
      "  - **啟用／觸發**：著裝期間；依效果所列時機。",
      "  - **效果**：通常以 10 或 20 枚為一組售賣。",
      "  - **限制與恢復**：通常以 10 或 20 枚為一組售賣。",
      "",
      "- **空效果**：",
      "  - **啟用／觸發**：持握期間。",
      "",
      "## 💡 實戰應用與裁量 (DM Ruling)",
    ].join("\n"),
  }, diagnostics);
  assert.deepEqual(
    new Set(diagnostics.map((item) => item.code)),
    new Set([
      "MAGIC_ITEM_EFFECT_NAME",
      "MAGIC_ITEM_TRIGGER_PLACEHOLDER",
      "MAGIC_ITEM_LIMIT_DUPLICATE",
      "MAGIC_ITEM_EFFECT_METADATA",
      "MAGIC_ITEM_EFFECT_EMPTY",
    ]),
  );
});

test("魔法物品結構檢查標示重複或拆分的效果名稱", () => {
  const diagnostics = [];
  validateMagicItemStructure({
    rel: "wiki/魔法物品/奇物/測試.md",
    bodyStartLine: 20,
    data: { category: "魔法物品" },
    body: [
      "### 物品效果",
      "",
      "- **防護靈光**：",
      "  - **效果**：提供防護。",
      "",
      "- **防護靈光持續時間**：",
      "  - **效果**：持續 10 分鐘。",
      "",
      "- **防護靈光**：",
      "  - **效果**：提供不同防護。",
    ].join("\n"),
  }, diagnostics);
  assert.deepEqual(
    diagnostics
      .filter((item) => item.code === "MAGIC_ITEM_EFFECT_NAME_DUPLICATE")
      .map((item) => item.message),
    [
      "效果名稱「防護靈光持續時間」疑似將「防護靈光」的持續、限制或恢復規則拆成另一項；應合併為同一效果。",
      "效果名稱「防護靈光」與前項「防護靈光」重複；應合併或改用具體不同的規則名稱。",
    ],
  );
});

test("魔法物品結構檢查要求主要區塊與物品資料欄位", () => {
  const diagnostics = [];
  validateMagicItemStructure({
    rel: "wiki/魔法物品/奇物/測試.md",
    bodyStartLine: 20,
    data: { category: "魔法物品" },
    body: [
      "### 物品資料",
      "",
      "| 項目 | 內容 |",
      "| :--- | :--- |",
      "| 類別 (Category) | 奇物 |",
    ].join("\n"),
  }, diagnostics);
  assert.deepEqual(
    new Set(diagnostics.map((item) => item.code)),
    new Set(["MAGIC_ITEM_TEMPLATE_FIELD", "MAGIC_ITEM_TEMPLATE_SECTION"]),
  );
});

test("費倫神祇頁的玩家手冊神系表 locator 必須指向正確列", () => {
  const names = [
    "歐呂爾", "阿祖斯", "班恩", "本莎芭", "巴爾", "裳緹亞", "希瑞克", "迪尼爾", "埃達絲", "貢德",
    "海姆", "伊爾馬特", "凱蘭沃", "洛山達", "萊拉", "黎爾拉", "勞薇塔", "獁拉", "馬斯克", "梅麗凱",
    "密里耳", "米爾寇", "密斯特拉", "歐格瑪", "薩弗拉斯", "塞倫涅", "莎爾", "西凡納斯", "淑妮", "塔洛娜",
    "塔洛斯", "坦帕斯", "托姆", "泰摩拉", "提爾", "安博裡", "渥金",
  ];
  const rawLines = fs.readFileSync("原始資料/玩家手冊2014/神系/被遺忘國度.md", "utf8").split(/\r?\n/);
  const sourceMarker = "原始資料/外部來源鏡像/PHB2014/book-phb.json";
  const sourceName = new Map([["萊拉", "蕾拉"], ["西凡納斯", "西凡那斯"]]);
  for (const name of names) {
    const page = fs.readFileSync(`wiki/戰役設定/被遺忘的國度/神祇與信仰/${name}.md`, "utf8");
    assert.match(page, new RegExp(sourceMarker));
    const match = page.match(/被遺忘國度眾神表；L(\d+)：/u);
    assert.ok(match, `${name} 缺少玩家手冊中文來源 locator`);
    assert.match(rawLines[Number(match[1]) - 1] ?? "", new RegExp(sourceName.get(name) ?? name));
  }
});

