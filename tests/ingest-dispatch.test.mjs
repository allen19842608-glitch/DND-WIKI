import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ROOT, configuredIngestAdapters, loadIngestProfile, loadPublication, resolveIngestDefinition } from "../scripts/core/ingest-publication-utils.mjs";
import { characterCreationTableCandidates } from "../scripts/core/character-creation-tables.mjs";
import { createAuditReport } from "../scripts/core/character-options-lib.mjs";

test("隔離新出版品只靠設定接入共用類別並明列特殊結構", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-new-publication-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "config", "ingest-profiles"), { recursive: true });
  fs.writeFileSync(path.join(root, "config", "publications.yml"), 'publications:\n  NEW2026:\n    wiki:\n      tag: "新書2026"\n    canonical_rules_source: "New Book (2026)"\n');
  fs.writeFileSync(path.join(root, "config", "ingest-profiles", "NEW2026.yml"), `publication_id: "NEW2026"\nsource_root: "原始資料/新書"\noutputs:\n  spells: "wiki/法術"\n  settings: "wiki/戰役設定/新世界"\ninputs:\n  spells: "法術"\n  lore:\n    include: ["世界觀"]\nparsers:\n  戰役設定:\n    parser: "scripts/ingest/custom-lore.mjs"\n    argument_profile: "lore"\n  怪物:\n    candidate_ready: false\n    incomplete_reason: "特殊怪物資料結構尚無候選解析器"\n`);
  assert.equal(loadPublication("NEW2026", { root }).wiki.tag, "新書2026");
  const profile = loadIngestProfile("NEW2026", { root });
  const dispatch = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "ingest-dispatch.json"), "utf8"));
  dispatch.candidate_parsers = ["scripts/ingest/custom-lore.mjs"];
  assert.equal(resolveIngestDefinition({ category: "法術", profile, dispatch }).parser, "scripts/ingest/ingest-spells.mjs");
  assert.equal(resolveIngestDefinition({ category: "戰役設定", profile, dispatch }).parser, "scripts/ingest/custom-lore.mjs");
  const adapters = configuredIngestAdapters({ profile, dispatch });
  assert.deepEqual(adapters.map((item) => [item.category, item.adapter_status]), [
    ["法術", "ready_for_preview"], ["怪物", "incomplete"], ["戰役設定", "ready_for_preview"],
  ]);
  assert.ok(adapters.every((item) => item.entity_inventory === "not_run"));
  assert.match(resolveIngestDefinition({ category: "戰役設定", profile: { ...profile, outputs: { spells: "wiki/法術" } }, dispatch }).incomplete_reason, /outputs\.settings/);
  assert.match(resolveIngestDefinition({ category: "戰役設定", profile: { ...profile, inputs: { spells: "法術" } }, dispatch }).incomplete_reason, /inputs\.lore/);
  assert.match(resolveIngestDefinition({ category: "怪物", profile, dispatch }).incomplete_reason, /特殊怪物資料結構/);
  assert.match(resolveIngestDefinition({ category: "專長", profile, dispatch }).incomplete_reason, /outputs\.feats/);
  const rulesOnly = { ...profile, outputs: { ...profile.outputs, rules: "wiki/規則" } };
  assert.match(resolveIngestDefinition({ category: "角色建立與成長", profile: rulesOnly, dispatch }).incomplete_reason,
    /inputs\.character_creation/);
  const withInput = { ...rulesOnly, inputs: { ...profile.inputs, character_creation: "角色" } };
  assert.match(resolveIngestDefinition({ category: "角色建立與成長", profile: withInput, dispatch }).incomplete_reason,
    /inputs\.character_creation_tables/);
  assert.throws(() => resolveIngestDefinition({ category: "不存在", profile, dispatch }), /不支援/);
  const unsafe = { ...profile, parsers: { 戰役設定: { parser: "scripts/ingest/ingest-eberron-rftlw-ch2.mjs", argument_profile: "lore" } } };
  assert.throws(() => resolveIngestDefinition({ category: "戰役設定", profile: unsafe, dispatch }), /未登錄為候選解析器/);
});

test("出版品檢視區分已接入的單檔魔法物品與未完成的怪物結構", () => {
  const dispatch = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "ingest-dispatch.json"), "utf8"));
  const profile = loadIngestProfile("EBER2025");
  const adapters = configuredIngestAdapters({ profile, dispatch });
  const magicItems = adapters.find((item) => item.category === "魔法物品");
  assert.equal(magicItems.adapter_status, "ready_for_preview");
  assert.match(magicItems.reason, /單檔附錄逐件盤點/);
  assert.equal(magicItems.entity_inventory, "not_run");
  assert.equal(adapters.find((item) => item.category === "職業").entity_inventory, "character_options_audit");
  assert.equal(adapters.find((item) => item.category === "怪物").entity_inventory, "dependencies_audit_only");
  assert.ok(adapters.some((item) => item.category === "戰役設定" && item.adapter_status === "ready_for_preview"));
  const dmg = configuredIngestAdapters({ profile: loadIngestProfile("DMG2024"), dispatch });
  assert.ok(dmg.some((item) => item.category === "魔法物品"));
  assert.ok(dmg.some((item) => item.category === "戰役設定" && item.adapter_status === "ready_for_preview"));
  assert.ok(!dmg.some((item) => item.category === "角色建立與成長"), "DMG 的規則輸出目錄不可誤認為角色建立來源");
});

test("TCE 角色選項逐類別盤點；相鄰職業僅接來源候選而定製血統仍未支援", () => {
  const profile = loadIngestProfile("TCE2020");
  assert.deepEqual(profile.character_options, ["classes", "subclasses", "species", "feats", "spells"]);
  const audit = createAuditReport({ publicationId: "TCE2020", publication: loadPublication("TCE2020"), profile });
  assert.ok(audit.entities.some((item) => item.category === "species" && item.status === "incomplete"));
  assert.ok(audit.entities.some((item) => item.category === "classes" && item.english_name === "Expert Sidekick" && item.status === "missing"));
  assert.ok(audit.entities.some((item) => item.category === "subclasses" && item.status === "stale"));
  assert.ok(audit.entities.some((item) => item.category === "feats" && item.status === "stale"));
  assert.ok(audit.entities.some((item) => item.category === "spells" && item.status === "matched"));
  const dispatch = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "ingest-dispatch.json"), "utf8"));
  const adapters = configuredIngestAdapters({ profile, dispatch });
  assert.equal(adapters.find((item) => item.category === "職業").adapter_status, "ready_for_preview");
  assert.match(adapters.find((item) => item.category === "職業").reason, /僅為具精確英文鏡像實體頁碼的既有頁/);
  assert.match(adapters.find((item) => item.category === "種族").reason, /定製血統/);
  assert.ok(adapters.some((item) => item.category === "法術" && item.adapter_status === "ready_for_preview"));
  assert.ok(adapters.some((item) => item.category === "專長" && item.adapter_status === "ready_for_preview"));
});

test("FTD 平鋪子職進入共用候選器，龍裔特殊結構仍明列待處理", () => {
  const dispatch = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "ingest-dispatch.json"), "utf8"));
  const profile = loadIngestProfile("FTD2021");
  assert.deepEqual(profile.character_options, ["subclasses", "species", "feats", "spells"]);
  const adapters = configuredIngestAdapters({ profile, dispatch });
  const subclasses = adapters.find((item) => item.category === "職業");
  const species = adapters.find((item) => item.category === "種族");
  assert.equal(subclasses.adapter_status, "ready_for_preview");
  assert.equal(subclasses.parser, "scripts/ingest/ingest-classes.mjs");
  assert.equal(species.adapter_status, "incomplete");
  assert.match(species.reason, /三份龍裔變體/);
  const lore = adapters.find((item) => item.category === "戰役設定");
  assert.equal(lore.adapter_status, "ready_for_preview");
  assert.equal(lore.parser, "scripts/ingest/ingest-lore.mjs");
});

test("FTD 多元宇宙來源由設定式共用預覽盤點，已引用來源不重製候選", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-ftd-lore-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "戰役設定",
    "--publication", "FTD2021", "--report", path.relative(ROOT, report)], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.changes.length, 0);
  assert.ok(plan.results.some((item) => item.status === "matched" && item.target === "wiki/戰役設定/多元宇宙/世界觀/第一世界.md"));
  assert.ok(plan.results.some((item) => item.status === "out_of_scope"));
  assert.ok(plan.results.every((item) => ["matched", "out_of_scope"].includes(item.status)));
  assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫/第一世界.md"]);
  assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫/遊戲中龍/龍之冒險.md"]);
  assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/FTD2021/book-ftd.json"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/FTD2021.yml"]);
  assert.ok(plan.dependency_fingerprints["config/lore.yml"]);
});

test("FTD 平鋪子職由共用預覽逐實體盤點；無自身英文頁碼不能產生候選", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-ftd-flat-subclasses-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "職業",
    "--publication", "FTD2021", "--replace", "--report", path.relative(ROOT, report)],
  { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.deepEqual(plan.results.map((item) => [item.english_name, item.status, item.reason]), [
    ["Way of the Ascendant Dragon", "ambiguous", "english_mirror_entity_page_unresolved"],
    ["Drakewarden", "ambiguous", "english_mirror_entity_page_unresolved"],
  ]);
  assert.equal(plan.changes.length, 0);
  assert.ok(plan.results.every((item) => item.source_structure.status === "parsed"));
  assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/FTD2021/book-ftd.json"]);
  assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫/玩家選項"]);
});

test("職業限定查詢不存在時明列 missing，不把全數 filtered 當作完整收錄", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-ftd-class-only-missing-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const [query, expectedStatus] of [["__no_such_subclass__", "missing"], ["Drakewarden", "ambiguous"]]) {
    const report = path.join(directory, `${query}.json`);
    const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "職業",
      "--publication", "FTD2021", "--only", query, "--report", path.relative(ROOT, report)],
    { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(fs.readFileSync(report, "utf8"));
    assert.equal(plan.changes.length, 0);
    assert.ok(plan.results.some((item) => item.status === expectedStatus));
    assert.equal(plan.results.some((item) => item.status === "missing"), expectedStatus === "missing");
    assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫/玩家選項/武僧-神龍宗.md"]);
    assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫/玩家選項/遊俠-龍獸守衛.md"]);
    assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/FTD2021/book-ftd.json"]);
  }
});

test("未支援的 FTD 龍裔結構仍保存逐實體盤點、來源指紋與摘要", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-ftd-species-unsupported-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "種族", "--publication", "FTD2021",
    "--report", path.relative(ROOT, report)], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.deepEqual(plan.results.map((item) => item.english_name), [
    "Dragonborn (Chromatic)", "Dragonborn (Gem)", "Dragonborn (Metallic)",
  ]);
  assert.ok(plan.results.every((item) => item.candidate_status === "incomplete" && item.status === "out_of_scope"));
  assert.equal(plan.summary.ready, 0);
  assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫"]);
  assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/FTD2021/book-ftd.json"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/FTD2021.yml"]);
  assert.ok(fs.existsSync(path.join(directory, "plan.summary.md")));
  assert.ok(fs.existsSync(path.join(directory, "plan.diff")));
  const apply = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "apply", "--plan", path.relative(ROOT, report)], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.equal(apply.status, 1);
  assert.match(apply.stderr, /沒有可套用的 Wiki 變更/);
});

test("未支援類別拒絕不會生效的來源或覆寫旗標", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-unsupported-flags-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const extra of [["--source", "原始資料/費資本的巨龍寶庫/玩家選項"], ["--replace"]]) {
    const report = path.join(directory, `${extra[0].slice(2)}.json`);
    const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "種族", "--publication", "FTD2021",
      ...extra, "--report", path.relative(ROOT, report)], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /不能使用無效選項/);
    assert.equal(fs.existsSync(report), false);
  }
});

test("TCE 檢視逐類別列出角色選項與候選範圍，不把特殊結構冒稱完整收錄", () => {
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "inspect", "--publication", "TCE2020", "--changes"], {
    encoding: "utf8", cwd: ROOT,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"publication_id": "TCE2020"/);
  assert.match(result.stdout, /"category": "species"/);
  assert.match(result.stdout, /"english_name": "Expert Sidekick"/);
  assert.match(result.stdout, /相鄰來源僅為具精確英文鏡像實體頁碼的既有頁產生來源引註候選/);
  assert.match(result.stdout, /"category": "法術"/);
  assert.match(result.stdout, /"adapter_status": "ready_for_preview"/);
});

test("簡體來源的轉換工具不可用時明列未完成且保留來源指紋", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-feat-converter-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "專長", "--publication", "BPGG2023",
    "--only", "__no_such_feat__", "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT, env: { ...process.env, DND_WIKI_OPENCC_PATH: path.join(directory, "missing-opencc") },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 項來源未完成/);
  assert.match(result.stdout, /translation_converter_unavailable/);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.summary.ready, 0);
  assert.ok(plan.results.some((item) => item.status === "incomplete" && item.reason === "translation_converter_unavailable"));
  assert.ok(Object.keys(plan.source_fingerprints).some((source) => source.includes("畢格比鉅獻") && source.endsWith("專長.md")));
});

test("單一繁體專長檔可由設定略過簡轉繁，並保留逐實體盤點", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-tce-feat-language-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "專長", "--publication", "TCE2020",
    "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT, env: { ...process.env, DND_WIKI_OPENCC_PATH: path.join(directory, "missing-opencc") },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /實體結果：/);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.ok(plan.results.some((item) => item.english_name === "Artificer Initiate"));
  assert.ok(plan.results.some((item) => item.english_name === "Telepathic"));
  assert.ok(plan.results.every((item) => item.reason !== "translation_converter_unavailable"));
  assert.ok(plan.source_fingerprints["原始資料/塔莎的萬事坩堝/玩家選項/專長.md"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/TCE2020.yml"]);
});

test("FTD 龍類專長只盤點三個實體，分類標題不成為候選", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-ftd-feat-configured-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "專長", "--publication", "FTD2021",
    "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT, env: { ...process.env, DND_WIKI_OPENCC_PATH: path.join(directory, "missing-opencc") },
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.deepEqual(plan.results.map((item) => item.english_name), [
    "Gift of the Chromatic Dragon", "Gift of the Gem Dragon", "Gift of the Metallic Dragon",
  ]);
  assert.ok(plan.results.every((item) => item.status === "ambiguous" && item.reason === "english_mirror_entity_page_unresolved"));
  assert.equal(plan.summary.ready, 0);
  assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫/玩家選項/龍類專長.md"]);
});

test("法術轉換工具不可用時逐檔列明未完成而非中斷預覽", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-spell-converter-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "法術", "--publication", "FTD2021",
    "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT, env: { ...process.env, DND_WIKI_OPENCC_PATH: path.join(directory, "missing-opencc") },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /Traceback|PermissionError/);
  assert.match(result.stdout, /實體結果：incomplete \d+/);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  const sources = Object.keys(plan.source_fingerprints).filter((file) => file.includes("費資本的巨龍寶庫/巨龍魔法/法術.md"));
  const incomplete = plan.results.filter((item) => item.reason === "translation_converter_unavailable");
  assert.ok(sources.length > 0);
  assert.equal(incomplete.length, sources.length);
  assert.ok(incomplete.every((item) => item.status === "incomplete"));
  assert.equal(plan.changes.length, 0);
});

test("設定為繁體的 TCE 法術檔組可在無轉換工具時盤點實體", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-tce-spell-language-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "法術", "--publication", "TCE2020",
    "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT, env: { ...process.env, DND_WIKI_OPENCC_PATH: path.join(directory, "missing-opencc") },
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.ok(plan.results.some((item) => item.english_name === "Booming Blade"));
  assert.ok(plan.results.every((item) => item.reason !== "translation_converter_unavailable"));
  assert.ok(plan.source_fingerprints["原始資料/塔莎的萬事坩堝/法術/法術詳述/戲法.md"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/TCE2020.yml"]);
});

test("怪物來源轉換失敗仍保存未完成計畫與全部已掃描來源指紋", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-monster-converter-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/ingest/ingest-monsters.mjs", "--publication", "BPGG2023",
    "--source", "原始資料/畢格比鉅獻：巨人之榮耀/圖鑑", "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT, env: { ...process.env, DND_WIKI_OPENCC_PATH: path.join(directory, "missing-opencc") },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /translation_converter_unavailable/);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.changes.length, 0);
  assert.equal(plan.results[0].status, "incomplete");
  assert.equal(plan.results[0].reason, "translation_converter_unavailable");
  assert.ok(plan.source_fingerprints["原始資料/畢格比鉅獻：巨人之榮耀/圖鑑"]);
  assert.ok(Object.keys(plan.source_fingerprints).some((source) => source.endsWith(".md")));
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/BPGG2023.yml"]);
});

test("設定式 FTD 怪物預覽保留來源與英文鏡像指紋，缺精確頁碼不放行", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-ftd-monster-evidence-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "怪物",
    "--publication", "FTD2021", "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT, env: { ...process.env, DND_WIKI_OPENCC_PATH: path.join(directory, "missing-opencc") },
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.ok(plan.results.some((item) => item.outcome === "ambiguous" && /缺少此實體的精確頁碼/.test(item.reason)));
  assert.equal(plan.summary.ready, 0);
  assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫/怪物圖鑑"]);
  assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/FTD2021/manifest.yml"]);
  assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/FTD2021/chapters/07-Bestiary.md"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/FTD2021.yml"]);
  assert.ok(fs.existsSync(path.join(directory, "plan.summary.md")));
  assert.ok(fs.existsSync(path.join(directory, "plan.diff")));
});

test("怪物限定條目不存在時保留來源盤點並明列 missing", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-monster-only-missing-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "怪物",
    "--publication", "FTD2021", "--only", "__no_such_monster__", "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT, env: { ...process.env, DND_WIKI_OPENCC_PATH: path.join(directory, "missing-opencc") },
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.results[0].outcome, "missing");
  assert.equal(plan.results[0].reason, "requested_monster_not_found_in_source");
  assert.equal(plan.results[0].requested_entity, "__no_such_monster__");
  assert.ok(plan.results[0].source_entity_count > 0);
  assert.ok(plan.source_fingerprints["原始資料/費資本的巨龍寶庫/怪物圖鑑"]);
  assert.equal(plan.changes.length, 0);
  assert.ok(fs.existsSync(path.join(directory, "plan.summary.md")));
  assert.ok(fs.existsSync(path.join(directory, "plan.diff")));
});

test("未設定的新書類別輸出具體 incomplete，不借用其他書的預設來源", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-unsupported-category-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "怪物", "--publication", "EBER2025", "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT,
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.plan_type, "incomplete-candidate-adapter");
  assert.equal(plan.changes.length, 0);
  assert.equal(plan.results[0].status, "incomplete");
  assert.match(plan.results[0].reason, /outputs\.monsters/);
  assert.ok(plan.source_fingerprints["原始資料/艾伯倫：奇械鍛爐"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/EBER2025.yml"]);
  assert.ok(fs.existsSync(path.join(directory, "plan.summary.md")));
  assert.ok(fs.existsSync(path.join(directory, "plan.diff")));
});

test("共用入口拒絕類別無效選項，不產生誤導性候選報告", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-irrelevant-ingest-option-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const extra of [["--type", "戒指"], ["--output", "wiki/法術"], ["--setting", "艾伯倫"]]) {
    const report = path.join(directory, `${extra[0].slice(2)}.json`);
    const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "法術", "--publication", "EBER2025", ...extra, "--report", path.relative(ROOT, report)], {
      encoding: "utf8", cwd: ROOT,
    });
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /不支援這些選項/);
    assert.equal(fs.existsSync(report), false);
  }
});

test("日常預覽與套用入口拒絕無意義或互斥選項", () => {
  const preview = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "導覽", "--publication", "EBER2025"], {
    encoding: "utf8", cwd: ROOT,
  });
  assert.equal(preview.status, 1);
  assert.match(preview.stderr, /導覽預覽\s+不支援這些選項/);
  const apply = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "apply", "--plan", "reports/a.json", "--report", "reports/b.json"], {
    encoding: "utf8", cwd: ROOT,
  });
  assert.equal(apply.status, 1);
  assert.match(apply.stderr, /不能同時指定/);
});

test("魔法物品未指定類型時盤點全部九種類型，缺實體頁碼不產生可套用候選", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-magic-items-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "魔法物品", "--publication", "DMG2024", "--report", path.relative(ROOT, report)], {
    encoding: "utf8", cwd: ROOT,
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.item_types.length, 9);
  assert.ok(plan.item_types.includes("戒指"));
  assert.ok(plan.item_types.includes("奇物"));
  assert.equal(plan.summary.ready, 0);
  assert.equal(plan.changes.length, 0);
  assert.ok(plan.results.some((entry) => entry.item_type === "戒指" && entry.status === "ambiguous" && entry.reason === "english_mirror_entity_page_unresolved"));
  assert.ok(plan.results.some((entry) => entry.status === "incomplete" && entry.reason === "english_mirror_entity_missing"));
  assert.ok(plan.results.some((entry) => entry.status === "out_of_scope" && entry.reason === "non_magic_item_heading"));
  assert.ok(Object.keys(plan.source_fingerprints).some((source) => source.endsWith("DMG2024/book-xdmg.json")));
  const scopedReport = path.join(directory, "rings.json");
  const scoped = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "魔法物品", "--publication", "DMG2024", "--type", "戒指", "--report", path.relative(ROOT, scopedReport)], {
    encoding: "utf8", cwd: ROOT,
  });
  assert.equal(scoped.status, 0, scoped.stderr);
  const rings = JSON.parse(fs.readFileSync(scopedReport, "utf8"));
  assert.deepEqual(rings.item_types, ["戒指"]);
  assert.ok(rings.results.every((entry) => entry.item_type === "戒指"));
});

test("背景零候選仍記錄已掃描來源、英文鏡像及設定指紋", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-background-fingerprints-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "背景", "--publication", "EBER2025",
    "--report", path.relative(ROOT, report)], { encoding: "utf8", cwd: ROOT });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.summary.ready, 0);
  assert.ok(plan.results.some((item) => item.reason === "english_mirror_entity_page_unresolved"));
  assert.ok(Object.keys(plan.source_fingerprints).some((source) => source.endsWith("/manifest.yml")));
  assert.ok(Object.keys(plan.source_fingerprints).some((source) => source.endsWith("/book-efa.json")));
  assert.ok(Object.keys(plan.source_fingerprints).some((source) => source.includes("第二章/背景/")));
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/EBER2025.yml"]);
});

test("職業與種族零候選仍保留來源目錄、英文快照和設定指紋", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-character-source-evidence-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const [category, publicationId, sourcePart] of [
    ["職業", "PHB2024", "角色職業"],
    ["種族", "EBER2025", "第二章"],
  ]) {
    const report = path.join(directory, `${publicationId}-${category}.json`);
    const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", category, "--publication", publicationId,
      "--only", "__no_such_entity__", "--report", path.relative(ROOT, report)], { encoding: "utf8", cwd: ROOT });
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(fs.readFileSync(report, "utf8"));
    assert.equal(plan.summary.ready, 0);
    assert.ok(Object.keys(plan.source_fingerprints).some((source) => source.includes(sourcePart)));
    assert.ok(Object.keys(plan.source_fingerprints).some((source) => source.endsWith("/manifest.yml")));
    assert.ok(Object.keys(plan.source_fingerprints).some((source) => /\/book-[^/]+\.json$/.test(source)));
    assert.ok(plan.dependency_fingerprints[`config/ingest-profiles/${publicationId}.yml`]);
    assert.ok(plan.dependency_fingerprints["附件/翻譯詞彙表.md"]);
  }
});

test("角色建立表格只產生共用候選報告，舊直接套用入口拒絕寫入", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-character-creation-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/ingest.mjs", "--category", "角色建立與成長", "--publication", "PHB2024",
    "--only", "__no_such_page__", "--report", path.relative(ROOT, report)], { encoding: "utf8", cwd: ROOT });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.summary.ready, 0);
  assert.ok(plan.source_fingerprints["原始資料/玩家手冊2024/創建角色"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/PHB2024.yml"]);
  assert.ok(fs.existsSync(path.join(directory, "plan.summary.md")));
  assert.ok(fs.existsSync(path.join(directory, "plan.diff")));
  const direct = spawnSync(process.execPath, ["scripts/ingest/append-character-creation-tables.mjs", "--apply"], { encoding: "utf8", cwd: ROOT });
  assert.notEqual(direct.status, 0);
  assert.match(direct.stderr, /不直接寫入 Wiki/);
});

test("新出版品角色建立表格只需設定來源與頁面對應；缺檔列明 incomplete", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-character-tables-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "config", "ingest-profiles"), { recursive: true });
  fs.mkdirSync(path.join(root, "原始資料", "新書", "角色"), { recursive: true });
  fs.mkdirSync(path.join(root, "wiki", "規則"), { recursive: true });
  fs.writeFileSync(path.join(root, "config", "ingest-profiles", "NEW2026.yml"), `publication_id: "NEW2026"\nsource_root: "原始資料/新書"\noutputs:\n  rules: "wiki/規則"\ninputs:\n  character_creation: "角色"\n  character_creation_tables:\n    "建立.md": ["規則表.md"]\n    "缺表.md": ["不存在.md"]\n`);
  fs.writeFileSync(path.join(root, "原始資料", "新書", "角色", "規則表.md"), "**角色表**\n| 項目 | 內容 |\n| :--- | :--- |\n| 一 | 二 |\n");
  for (const name of ["建立.md", "缺表.md"]) fs.writeFileSync(path.join(root, "wiki", "規則", name), `---\ntitle: "${name}"\n---\n\n## 🔗 相關連結\n`);
  const profile = loadIngestProfile("NEW2026", { root });
  const dispatch = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "ingest-dispatch.json"), "utf8"));
  assert.equal(resolveIngestDefinition({ category: "角色建立與成長", profile, dispatch }).parser,
    "scripts/ingest/append-character-creation-tables.mjs");
  const plan = characterCreationTableCandidates({ root, profile });
  assert.equal(plan.summary.ready, 0);
  assert.equal(plan.summary.manual_review, 1);
  assert.equal(plan.changes[0].status, "manual_review");
  assert.match(plan.changes[0].after, /### 角色表\n\n\| 項目 \| 內容 \|/);
  assert.ok(plan.source_fingerprints["原始資料/新書/角色"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/NEW2026.yml"]);
  assert.ok(plan.results.some((item) => item.target === "wiki/規則/缺表.md" && item.status === "incomplete" && item.reason === "source_file_missing"));
  assert.throws(() => characterCreationTableCandidates({ root, profile: { ...profile,
    inputs: { ...profile.inputs, character_creation_tables: { "../AGENTS.md": ["規則表.md"] } } } }), /表格目標/);
});
