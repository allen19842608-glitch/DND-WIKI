import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ROOT, loadIngestProfile } from "../scripts/core/ingest-publication-utils.mjs";
import { configuredFlatMagicItems, parseFlatMagicItemSource } from "../scripts/core/flat-magic-item-source.mjs";

test("EBER 單檔附錄逐件保留雙語名稱、類型、稀有度與來源行號", () => {
  const inventory = configuredFlatMagicItems({ root: ROOT, profile: loadIngestProfile("EBER2025") });
  assert.equal(inventory.entities.length, 9);
  assert.ok(inventory.entities.every((item) => item.status === "parsed" && item.locator && item.rarity));
  assert.deepEqual(inventory.entities.slice(0, 2).map((item) => [item.english_name, item.locator]), [
    ["Manifold Tool", "L3 標題：百變工具"],
    ["Boots of the Winding Path", "L8 標題：折返之靴"],
  ]);
});

test("單檔附錄的缺資料、重複英文實體與越界來源不會誤判為完整", (context) => {
  const duplicate = parseFlatMagicItemSource([
    "# 魔法物品", "## 甲 Same Item", "_奇物，普通_", "## 乙 Same Item", "_奇物，普通_",
  ].join("\n"));
  assert.deepEqual(duplicate.map((item) => item.status), ["conflict", "conflict"]);
  assert.equal(parseFlatMagicItemSource("## 甲 Item\n沒有物品資料")[0].reason,
    "flat_magic_item_metadata_unparsed");
  assert.equal(parseFlatMagicItemSource("# 無實體")[0].reason, "flat_magic_item_entities_missing");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-flat-magic-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const profile = { source_root: "原始資料/新書", inputs: { magic_items_file: "附錄.md" } };
  assert.equal(configuredFlatMagicItems({ root, profile }).entities[0].reason,
    "flat_magic_item_source_missing");
  assert.throws(() => configuredFlatMagicItems({ root, profile: { ...profile,
    inputs: { magic_items_file: "../escape.md" } } }), /不可越界/u);
});

test("共用預覽明列 EBER 九件物品與來源指紋，缺自身頁碼時零候選", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-eber-flat-magic-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "魔法物品",
    "--publication", "EBER2025", "--report", path.relative(ROOT, report)], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.changes.length, 0);
  assert.equal(plan.source_inventory.length, 9);
  assert.deepEqual(plan.item_types, ["奇物", "戒指", "武器", "護甲"]);
  assert.equal(plan.results.length, 9);
  assert.ok(plan.results.every((item) => item.status === "ambiguous"
    && item.reason === "english_mirror_entity_page_unresolved"));
  assert.ok(plan.results.every((item) => item.wiki_status === "matched" && item.wiki_target));
  assert.equal(new Set(plan.results.map((item) => item.wiki_target)).size, 9);
  assert.equal(plan.results.find((item) => item.english_name === "Repulsion Shield").wiki_target,
    "wiki/魔法物品/護甲/斥力之盾.md");
  for (const source of ["原始資料/艾伯倫：奇械鍛爐/附錄A：魔法物品.md",
    "原始資料/外部來源鏡像/EBER2025/book-efa.json"]) {
    assert.ok(plan.source_fingerprints[source], source);
  }
  assert.ok(plan.dependency_fingerprints["config/ingest-profiles/EBER2025.yml"]);
  const filteredReport = path.join(directory, "weapons.json");
  const filtered = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "魔法物品",
    "--publication", "EBER2025", "--type", "武器", "--report", path.relative(ROOT, filteredReport)],
  { cwd: ROOT, encoding: "utf8" });
  assert.equal(filtered.status, 0, filtered.stderr);
  const weapons = JSON.parse(fs.readFileSync(filteredReport, "utf8"));
  assert.equal(weapons.results.filter((item) => item.status === "ambiguous").length, 3);
  assert.equal(weapons.results.filter((item) => item.status === "out_of_scope").length, 6);
  assert.equal(weapons.source_inventory.length, 9);
  const missingReport = path.join(directory, "missing.json");
  const missing = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "魔法物品",
    "--publication", "EBER2025", "--only", "不存在的物品", "--report", path.relative(ROOT, missingReport)],
  { cwd: ROOT, encoding: "utf8" });
  assert.equal(missing.status, 0, missing.stderr);
  const missingPlan = JSON.parse(fs.readFileSync(missingReport, "utf8"));
  assert.ok(missingPlan.results.some((item) => item.status === "missing"
    && item.reason === "requested_magic_item_not_found_in_flat_source"));
});
