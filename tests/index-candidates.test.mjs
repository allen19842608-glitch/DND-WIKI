import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { partitionTargetConflicts, withIndexEffects } from "../scripts/core/index-candidates.mjs";
import { applyCandidateBatch, planCandidateBatch } from "../scripts/core/ingest-publication-utils.mjs";
import { syncGenericIndexes } from "../scripts/core/generic-indexes.mjs";

test("候選索引效果只處理本批變更所屬目錄，不順手改寫無關索引", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-index-candidates-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const directory of ["A", "B"]) {
    const folder = path.join(root, "wiki", directory);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, `${directory}索引.md`), `---\ntitle: "${directory}索引"\n---\n# ${directory}索引\n`);
  }
  fs.writeFileSync(path.join(root, "wiki", "B", "舊頁.md"), "---\ntitle: \"舊頁\"\n---\n# 舊頁\n");
  const changes = withIndexEffects([{
    target: "wiki/A/新頁.md", before: null, after: "---\ntitle: \"新頁\"\n---\n# 新頁\n",
    operation: "create", status: "ready",
  }], { root });
  assert.ok(changes.some((change) => change.target === "wiki/A/A索引.md"));
  assert.ok(!changes.some((change) => change.target.startsWith("wiki/B/")));
});

test("索引效果不得先吞掉同目標的衝突來源", () => {
  assert.throws(() => withIndexEffects([
    { target: "wiki/怪物/眼魔.md", before: null, after: "A", operation: "create", status: "manual_review", source: "原始資料/眼魔介紹.md" },
    { target: "wiki/怪物/眼魔.md", before: null, after: "B", operation: "create", status: "manual_review", source: "原始資料/眼魔.md" },
  ], { root: "." }), /互相衝突/);
});

test("同目標的兩個來源保留為衝突清單，不擇一產生候選", () => {
  const first = { target: "wiki/怪物/眼魔.md", source: "原始資料/眼魔.md", locator: "L1" };
  const second = { target: first.target, source: "原始資料/眼魔介紹.md", locator: "L21" };
  const other = { target: "wiki/怪物/觀察者眼魔.md", source: "原始資料/觀察者眼魔.md", locator: "L1" };
  const partition = partitionTargetConflicts([first, second, other], [
    { target: first.target, status: "manual_review", source: first.source },
    { target: second.target, status: "manual_review", source: second.source },
    { target: other.target, status: "manual_review", source: other.source },
  ]);
  assert.deepEqual(partition.changes, [other]);
  assert.deepEqual(partition.conflicts.get(first.target), [
    { source: first.source, locator: first.locator },
    { source: second.source, locator: second.locator },
  ]);
  assert.deepEqual(partition.results.map((result) => result.status), ["conflict", "conflict", "manual_review"]);
});

test("索引設定在預覽後變更時，已儲存計畫不能套用", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-index-stale-config-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "config"));
  fs.mkdirSync(path.join(root, "wiki"));
  fs.writeFileSync(path.join(root, "config", "lore.yml"), "worlds: {}\n");
  const plan = planCandidateBatch([{ target: "wiki/索引.md", operation: "create", before: null, after: "index\n" }], {
    root, dependencyFiles: ["config/lore.yml"],
  });
  fs.writeFileSync(path.join(root, "config", "lore.yml"), "worlds: { changed: true }\n");
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }), /設定依賴已過期/);
  assert.equal(fs.existsSync(path.join(root, "wiki", "索引.md")), false);
});

test("舊索引直寫入口拒絕套用，隔離目錄仍可唯讀產生候選", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-index-preview-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const folder = path.join(root, "wiki", "範例");
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "範例索引.md"), '---\ntitle: "範例索引"\n---\n# 範例索引\n');
  fs.writeFileSync(path.join(folder, "條目.md"), '---\ntitle: "條目"\n---\n# 條目\n');
  const planned = syncGenericIndexes({ root, apply: false });
  assert.ok(planned.changes.some((change) => change.file === "wiki/範例/範例索引.md"));
  assert.doesNotMatch(fs.readFileSync(path.join(folder, "範例索引.md"), "utf8"), /AUTO-INDEX/);
  const command = spawnSync(process.execPath, ["scripts/core/wiki-maintenance.mjs", "indexes", "--apply"], {
    cwd: path.resolve("."), encoding: "utf8",
  });
  assert.equal(command.status, 1);
  assert.match(command.stderr, /索引不再直接寫入 Wiki/);
  const irrelevant = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "索引", "--publication", "DMG2024"], {
    cwd: path.resolve("."), encoding: "utf8",
  });
  assert.equal(irrelevant.status, 1);
  assert.match(irrelevant.stderr, /索引預覽 不支援這些選項：--publication/);
});
