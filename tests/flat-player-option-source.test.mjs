import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { configuredFlatPlayerOptions, parseFlatPlayerOptionSource } from "../scripts/core/flat-player-option-source.mjs";
import { loadIngestProfile, planCandidateBatch, ROOT } from "../scripts/core/ingest-publication-utils.mjs";
import { mirrorEntityPage } from "../scripts/core/mirror-entity-page.mjs";
import { prepareExistingClassCitation } from "../scripts/core/class-replacement-review.mjs";

test("FTD 平鋪子職逐項取得等級與定位，龍獸夥伴數據卡不被當成子職特性", () => {
  const profile = loadIngestProfile("FTD2021");
  const entities = configuredFlatPlayerOptions({ root: ROOT, profile, category: "subclasses" });
  assert.deepEqual(entities.map((item) => item.english), ["Way of the Ascendant Dragon", "Drakewarden"]);
  assert.deepEqual(entities[0].structure.features.map((item) => item.level), [3, 3, 6, 11, 17]);
  assert.deepEqual(entities[1].structure.features.map((item) => item.level), [3, 3, 7, 11, 15]);
  assert.equal(entities[1].structure.sidecars.length, 1);
  assert.match(entities[1].structure.sidecars[0].locator, /^L74 標題：龍獸夥伴/u);
  assert.equal(entities[1].structure.features.some((item) => item.english === "Actions"), false);
});

test("FTD 龍裔來源逐項列特質，金屬龍吐息以相鄰子項辨識未加粗標題", () => {
  const profile = loadIngestProfile("FTD2021");
  const entities = configuredFlatPlayerOptions({ root: ROOT, profile, category: "species" });
  assert.deepEqual(entities.map((item) => item.structure.status), ["parsed", "parsed", "parsed"]);
  assert.deepEqual(entities.map((item) => item.structure.traits.length), [7, 8, 9]);
  assert.deepEqual(entities[2].structure.traits.filter((item) => item.marker === "plain_heading")
    .map((item) => [item.chinese, item.locator]), [["金屬龍吐息武器", "L22 標題：金屬龍吐息武器"]]);
  assert.equal(entities[2].structure.unmarked_traits, undefined);
  const unsupported = parseFlatPlayerOptionSource([
    "# 測試龍裔", "**測試龍裔 Test Dragonborn**", "**生物類型。**類人生物。",
    "**體型。**中型。", "**速度。**30 尺。", "**抗性。**抗性。",
    "特殊吐息。5級起，你獲得吐息。", "下一段沒有巢狀子項。",
  ].join("\n"), { kind: "species", chinese: "測試龍裔", sourceEnglish: "Test Dragonborn" });
  assert.equal(unsupported.status, "incomplete");
  assert.deepEqual(unsupported.unmarked_traits.map((item) => item.chinese), ["特殊吐息"]);
  assert.equal(parseFlatPlayerOptionSource("# 甲\n**乙 Other**", {
    kind: "species", chinese: "甲", sourceEnglish: "Other",
  }).reason, "flat_option_title_mismatch");
  const unsafe = { ...profile, inputs: { ...profile.inputs, flat_player_options: {
    species: [{ ...profile.inputs.flat_player_options.species[0], file: "../色彩龍裔.md" }],
  } } };
  assert.throws(() => configuredFlatPlayerOptions({ root: ROOT, profile: unsafe, category: "species" }), /路徑不安全/);
});

test("FTD 特殊結構進入共用預覽，仍維持零候選與精確來源指紋", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-ftd-flat-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const [category, expected] of [["職業", 2], ["種族", 3]]) {
    const report = path.join(directory, `${category}.json`);
    const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", category,
      "--publication", "FTD2021", "--report", path.relative(ROOT, report)], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(fs.readFileSync(report, "utf8"));
    assert.equal(plan.summary.ready, 0);
    assert.equal(plan.results.length, expected);
    for (const item of plan.results) {
      if (category === "職業") {
        assert.equal(item.status, "ambiguous");
        assert.equal(item.reason, "english_mirror_entity_page_unresolved");
      } else assert.equal(item.candidate_status, "incomplete");
      assert.ok(item.translation_source.file.startsWith("原始資料/費資本的巨龍寶庫/玩家選項/"));
      assert.match(item.translation_source.locator, /^L\d+ 標題：/u);
      assert.ok(plan.source_fingerprints[item.translation_source.file]);
    }
    assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/FTD2021/book-ftd.json"]);
  }
});

test("隔離鏡像若標示 FTD 子職自身頁碼，可形成只補來源且可重現的候選", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-ftd-subclass-positive-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const profile = loadIngestProfile("FTD2021");
  const source = "原始資料/費資本的巨龍寶庫/玩家選項/武僧-神龍宗.md";
  const target = "wiki/職業/2014/武僧/神龍宗.md";
  const manifest = "原始資料/外部來源鏡像/FTD2021/manifest.yml";
  const mirrorFile = "原始資料/外部來源鏡像/FTD2021/book-ftd.json";
  for (const file of [source, target, manifest, mirrorFile]) fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, source), path.join(root, source));
  fs.copyFileSync(path.join(ROOT, target), path.join(root, target));
  fs.writeFileSync(path.join(root, manifest), [
    "publication_id: FTD2021", "publication_title: Fizban’s Treasury of Dragons (2021)",
    "upstream_url: https://example.test/book-ftd.json", "snapshot:", `  file: ${mirrorFile}`, "",
  ].join("\n"));
  fs.writeFileSync(path.join(root, mirrorFile), JSON.stringify({ data: [{ type: "section", page: 14, entries: [
    { type: "statblock", tag: "subclass", source: "FTD", name: "Way of the Ascendant Dragon",
      className: "Monk", page: 15 },
  ] }] }));
  const configured = { ...profile, inputs: { ...profile.inputs, flat_player_options: {
    subclasses: [profile.inputs.flat_player_options.subclasses[0]],
  } } };
  const [item] = configuredFlatPlayerOptions({ root, profile: configured, category: "subclasses" });
  assert.equal(item.structure.status, "parsed");
  const mirror = mirrorEntityPage({ root, profile: configured, publicationId: "FTD2021",
    english: item.english, kind: "subclass", parentClass: item.parent_english });
  assert.equal(mirror.status, "matched");
  assert.equal(mirror.page, 15);
  const before = fs.readFileSync(path.join(root, target), "utf8");
  const prepared = prepareExistingClassCitation({ before, source: item.source, mirror,
    english: item.english, chinese: item.chinese, entryType: "子職", parentClass: item.parent_class,
    publicationId: "FTD2021", version: "2014-Legacy" });
  assert.equal(prepared.status, "ready");
  assert.equal(prepared.after.slice(prepared.after.indexOf("---", 4) + 3), before.slice(before.indexOf("---", 4) + 3));
  assert.equal(prepareExistingClassCitation({ before: prepared.after, source: item.source, mirror,
    english: item.english, chinese: item.chinese, entryType: "子職", parentClass: item.parent_class,
    publicationId: "FTD2021", version: "2014-Legacy" }).status, "unchanged");
  assert.equal(prepareExistingClassCitation({ before, source: item.source, mirror,
    english: item.english, chinese: "其他子職", entryType: "子職", parentClass: item.parent_class,
    publicationId: "FTD2021", version: "2014-Legacy" }).reason, "existing_class_identity_mismatch");
  const plan = planCandidateBatch([{ target, operation: "update", before, after: prepared.after,
    source: item.source, locator: item.structure.locator, status: "manual_review", review: ["正文須獨立覆核。"] }],
  { root, sourceFiles: [item.source, manifest, mirrorFile] });
  assert.equal(plan.summary.manual_review, 1);
  assert.ok(plan.source_fingerprints[item.source]);
  assert.ok(plan.source_fingerprints[mirrorFile]);
  assert.equal(fs.readFileSync(path.join(root, target), "utf8"), before);
});
