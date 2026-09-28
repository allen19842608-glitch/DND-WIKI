import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { configuredSiblingClassSources } from "../scripts/core/sibling-class-source.mjs";
import { loadIngestProfile, ROOT } from "../scripts/core/ingest-publication-utils.mjs";

test("TCE 相鄰職業來源逐檔辨識完整職業、子職、補充與身分歧異", () => {
  const profile = loadIngestProfile("TCE2020");
  const inventory = configuredSiblingClassSources({ root: ROOT, profile });
  assert.equal(inventory.length, 49);
  assert.equal(inventory.filter((item) => item.kind === "class" && item.structure.status === "parsed").length, 1);
  assert.equal(inventory.filter((item) => item.kind === "class_context").length, 12);
  assert.equal(inventory.filter((item) => item.kind === "subclass").length, 30);
  assert.equal(inventory.filter((item) => item.kind === "supplement" && item.structure.status === "out_of_scope").length, 6);
  assert.deepEqual(inventory.filter((item) => item.structure.status === "incomplete").map((item) => item.source), [
    "原始資料/塔莎的萬事坩堝/玩家選項/職業/邪術師（TCE）.md",
    "原始資料/塔莎的萬事坩堝/玩家選項/職業/邪術師（TCE）/巨靈宗主.md",
  ]);
  assert.ok(inventory.every((item) => fs.existsSync(path.join(ROOT, item.source))));
  assert.match(inventory.find((item) => item.source.endsWith("野獸道途.md")).structure.locator, /^L1 標題：野獸道途/u);
  assert.equal(inventory.find((item) => item.source.endsWith("聖武士（TCE）.md")).structure.english_heading, "Paladin");
  assert.equal(inventory.find((item) => item.source.endsWith("野蠻人（TCE）.md")).structure.english_heading, "Barbarian");
});

test("相鄰來源解析器以設定接入新書，拒絕越界及不存在的分類檔", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-sibling-classes-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, "原始資料", "新書", "職業");
  fs.mkdirSync(path.join(directory, "戰士"), { recursive: true });
  fs.writeFileSync(path.join(directory, "戰士.md"), "# 戰士（新書）\n戰士 Fighter\n");
  fs.writeFileSync(path.join(directory, "戰士", "勇士.md"), "# 勇士（新書）\n## 勇士 Champion\n");
  fs.writeFileSync(path.join(directory, "孤立.md"), "# 孤立\n");
  const profile = { source_root: "原始資料/新書", inputs: { classes: "職業", class_sources: {
    layout: "sibling", heading_suffixes: ["（新書）"], full_classes: [], non_subclasses: [],
  } } };
  const inventory = configuredSiblingClassSources({ root, profile });
  assert.deepEqual(inventory.map((item) => [item.kind, item.structure.status]),
    [["class_context", "parsed"], ["subclass", "parsed"], ["unpaired_class", "incomplete"]]);
  assert.equal(inventory[1].structure.english_heading, "Champion");
  assert.equal(inventory[2].structure.reason, "sibling_class_parent_unpaired");
  assert.throws(() => configuredSiblingClassSources({ root, profile: { ...profile,
    inputs: { ...profile.inputs, class_sources: { ...profile.inputs.class_sources, non_subclasses: ["../AGENTS.md"] } } } }),
  /安全 Markdown/);
  assert.throws(() => configuredSiblingClassSources({ root, profile: { ...profile,
    inputs: { ...profile.inputs, class_sources: { ...profile.inputs.class_sources, non_subclasses: ["戰士/不存在.md"] } } } }),
  /不存在於相鄰結構/);
});

test("TCE 共用預覽保留 49 份逐檔來源結構與指紋，不產生未核定正文", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-tce-sibling-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "職業",
    "--publication", "TCE2020", "--report", path.relative(ROOT, report)], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.plan_type, "ingest-candidates");
  assert.equal(plan.changes.length, 0);
  assert.equal(plan.results.filter((item) => item.kind === "subclass").length, 30);
  assert.equal(plan.results.filter((item) => item.english_name?.endsWith("Sidekick") && item.status === "missing").length, 3);
  assert.equal(plan.source_inventory.length, 49);
  assert.ok(plan.source_inventory.every((item) => plan.source_fingerprints[item.source]));
  assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/TCE2020/book-tce.json"]);
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/TCE2020.yml"]);
});
