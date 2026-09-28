import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ROOT, loadIngestProfile } from "../scripts/core/ingest-publication-utils.mjs";
import { configuredSidekickClassSources, parseSidekickClassSource } from "../scripts/core/sidekick-class-source.mjs";

test("TCE 三種協力者職業逐項盤點 20 級，保留來源表格與特性名稱衝突", () => {
  const items = configuredSidekickClassSources({ root: ROOT, profile: loadIngestProfile("TCE2020") });
  assert.deepEqual(items.map((item) => item.english_name),
    ["Expert Sidekick", "Spellcaster Sidekick", "Warrior Sidekick"]);
  assert.deepEqual(items.map((item) => item.structure.levels.length), [20, 20, 20]);
  assert.deepEqual(items.map((item) => item.structure.status), ["conflict", "parsed", "conflict"]);
  assert.ok(items[0].structure.issues.some((issue) => issue.feature === "靈巧動作" && issue.locator.startsWith("L10")));
  assert.ok(items[2].structure.issues.some((issue) => issue.code === "sidekick_unbalanced_parenthesis"
    && issue.level === 11));
});

test("協力者特殊結構缺級與缺來源明列不完整；重複或越界設定拒絕", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-sidekick-source-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const item = { file: "協力者/專家.md", chinese: "專家", english: "Expert Sidekick" };
  const profile = { source_root: "原始資料/新書", inputs: { sidekick_classes: [item] } };
  assert.equal(configuredSidekickClassSources({ root, profile })[0].structure.reason, "sidekick_source_missing");
  assert.equal(parseSidekickClassSource("# 專家\n| **1st** | +2 | 好幫手 |\n", item).status, "conflict");
  assert.throws(() => configuredSidekickClassSources({ root,
    profile: { ...profile, inputs: { sidekick_classes: [item, item] } } }), /不可重複/u);
  assert.throws(() => configuredSidekickClassSources({ root,
    profile: { ...profile, inputs: { sidekick_classes: [{ ...item, file: "協力者/../../escape.md" }] } } }), /不可越界/u);
});

test("TCE 共用職業預覽輸出三個協力者實體與來源指紋，不把章節頁碼當自身頁碼", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-tce-sidekick-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "職業",
    "--publication", "TCE2020", "--report", path.relative(ROOT, report)], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  const sidekicks = plan.results.filter((item) => item.kind === "sidekick_class");
  assert.deepEqual(sidekicks.map((item) => item.status), ["conflict", "ambiguous", "conflict"]);
  assert.ok(sidekicks.every((item) => item.wiki_status === "missing" && item.mirror_status === "ambiguous"));
  assert.ok(sidekicks.every((item) => item.mirror_page === undefined));
  assert.ok(sidekicks.every((item) => plan.source_fingerprints[item.source]));
  assert.equal(plan.changes.length, 0);
  assert.equal(plan.source_inventory.filter((item) => item.kind === "sidekick_class").length, 3);
});
