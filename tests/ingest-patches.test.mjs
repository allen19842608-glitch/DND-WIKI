import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyPreparedPatch, preparePatch } from "../scripts/ingest/ingest-patches.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-patch-"));
  fs.mkdirSync(path.join(root, "wiki", "規則"), { recursive: true });
  fs.mkdirSync(path.join(root, "原始資料"), { recursive: true });
  fs.mkdirSync(path.join(root, "附件"), { recursive: true });
  fs.writeFileSync(path.join(root, "原始資料", "基礎.md"), "基礎來源\n", "utf8");
  fs.writeFileSync(path.join(root, "原始資料", "勘誤.md"), "勘誤來源\n", "utf8");
  fs.writeFileSync(path.join(root, "附件", "翻譯詞彙表.md"), [
    "| 英文 | 本 Wiki 標準譯名 | 來源 ID | 定位 | 狀態 |",
    "| :--- | :--- | :--- | :--- | :--- |",
    "| Test Term | 測試術語 | TEST | L1 | approved |",
    "",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "wiki", "規則", "測試.md"), [
    "---",
    "title: \"測試\"",
    "entity_id: \"entry:test\"",
    "concept_id: \"concept:test\"",
    "ruleset: \"2024\"",
    "content_scope: \"core\"",
    "status: \"current\"",
    "category: \"規則機制\"",
    "version: \"2024-Core\"",
    "tags:",
    "  - \"測試\"",
    "sources:",
    "  - file: \"原始資料/基礎.md\"",
    "    locator: \"L1\"",
    "    authority: \"官方\"",
    "    translation: \"community\"",
    "source_type: \"official\"",
    "confidence: \"confirmed\"",
    "rules_sources:",
    "  - \"Test Rules\"",
    "errata: []",
    "updated: \"2026-08-20\"",
    "---",
    "",
    "# 測試",
    "",
    "## 規則",
    "",
    "- 既有規則。",
    "",
    "## 來源衝突",
    "",
    "- 無。",
    "",
    "## 🔗 相關連結",
    "",
  ].join("\n"), "utf8");
  return root;
}

function frontmatterUpdate() {
  return {
    terms: [],
    frontmatter: {
      sources: [{
        file: "原始資料/勘誤.md",
        locator: "L1",
        authority: "官方",
        translation: "community",
      }],
      rules_sources: ["Test Errata"],
      errata: ["已套用測試勘誤"],
      confidence: "confirmed",
      updated: "2026-08-22",
    },
  };
}

function lintSuccess() {
  return { errors: 0, warnings: 0, information: 0 };
}

test("Patch 可在指定章節追加規則、合併 Frontmatter，並保持冪等", (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const operations = [
    {
      patch_id: "append-test-rule",
      action: "append_rule",
      target_file: "wiki/規則/測試.md",
      anchor_heading: "規則",
      payload: {
        terms: [{ english: "Test Term", chinese: "測試術語" }],
        rule_content: "- 測試術語適用於此規則。[L1]",
        source_anchor: "[L1]",
      },
    },
    {
      patch_id: "update-test-metadata",
      action: "update_frontmatter",
      target_file: "wiki/規則/測試.md",
      anchor_heading: "規則",
      payload: frontmatterUpdate(),
    },
  ];
  const prepared = preparePatch(operations, { root, lint: lintSuccess });
  const candidate = prepared.candidates.get("wiki/規則/測試.md");
  assert.match(candidate, /dnd-wiki-patch:append-test-rule/);
  assert.match(candidate, /原始資料\/勘誤\.md/);
  assert.match(candidate, /rules_sources:\n  - "Test Rules"\n  - "Test Errata"/);
  assert.ok(candidate.indexOf("測試術語適用") < candidate.indexOf("## 來源衝突"));

  assert.equal(applyPreparedPatch(prepared).errors, 0);
  const repeated = preparePatch(operations, { root, lint: lintSuccess });
  assert.equal(repeated.candidates.size, 0);
  assert.deepEqual(repeated.status.map((item) => item.status), ["skipped", "skipped"]);
});

test("Patch 可在既有衝突章節加入具來源定位的紀錄", (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const prepared = preparePatch([
    {
      patch_id: "mark-test-conflict",
      action: "mark_contradiction",
      target_file: "wiki/規則/測試.md",
      anchor_heading: "來源衝突",
      payload: {
        terms: [],
        rule_content: "- 勘誤優先於基礎來源。[勘誤 L1]",
        source_anchor: "[勘誤 L1]",
      },
    },
    {
      patch_id: "update-test-conflict-metadata",
      action: "update_frontmatter",
      target_file: "wiki/規則/測試.md",
      anchor_heading: "來源衝突",
      payload: frontmatterUpdate(),
    },
  ], { root, lint: lintSuccess });
  const candidate = prepared.candidates.get("wiki/規則/測試.md");
  assert.match(candidate, /勘誤優先於基礎來源。\[勘誤 L1\]/);
  assert.ok(candidate.indexOf("勘誤優先") < candidate.indexOf("## 🔗 相關連結"));
});

test("Patch 驗證失敗時不會產生候選寫入", (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const original = fs.readFileSync(path.join(root, "wiki", "規則", "測試.md"), "utf8");
  const operations = [
    {
      patch_id: "bad-link",
      action: "append_rule",
      target_file: "wiki/規則/測試.md",
      anchor_heading: "規則",
      payload: { terms: [], rule_content: "- 壞連結 [[不存在]]。[L1]", source_anchor: "[L1]" },
    },
    {
      patch_id: "bad-link-update",
      action: "update_frontmatter",
      target_file: "wiki/規則/測試.md",
      anchor_heading: "規則",
      payload: frontmatterUpdate(),
    },
  ];
  assert.throws(() => preparePatch(operations, { root, lint: () => ({ errors: 1 }) }), /虛擬 lint 失敗/);
  assert.equal(fs.readFileSync(path.join(root, "wiki", "規則", "測試.md"), "utf8"), original);
});

test("Patch 拒絕不存在來源、越權欄位與未核定譯名", (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const update = frontmatterUpdate();
  update.frontmatter.sources[0].file = "原始資料/不存在.md";
  assert.throws(() => preparePatch([
    { patch_id: "bad-source", action: "update_frontmatter", target_file: "wiki/規則/測試.md", anchor_heading: "規則", payload: update },
  ], { root, lint: lintSuccess }), /來源檔不存在/);

  const community = frontmatterUpdate();
  community.frontmatter.sources[0].authority = "社群";
  assert.throws(() => preparePatch([
    { patch_id: "community-source", action: "update_frontmatter", target_file: "wiki/規則/測試.md", anchor_heading: "規則", payload: community },
  ], { root, lint: lintSuccess }), /Patch 來源必須是官方資料/);

  assert.throws(() => preparePatch([
    {
      patch_id: "unknown-term",
      action: "update_frontmatter",
      target_file: "wiki/規則/測試.md",
      anchor_heading: "規則",
      payload: { ...frontmatterUpdate(), terms: [{ english: "Unknown", chinese: "未知" }] },
    },
  ], { root, lint: lintSuccess }), /未獲詞彙表核定/);

  assert.throws(() => preparePatch([
    {
      patch_id: "extra-frontmatter",
      action: "update_frontmatter",
      target_file: "wiki/規則/測試.md",
      anchor_heading: "規則",
      payload: { ...frontmatterUpdate(), frontmatter: { ...frontmatterUpdate().frontmatter, title: "不允許" } },
    },
  ], { root, lint: lintSuccess }), /不允許欄位 title/);
});
