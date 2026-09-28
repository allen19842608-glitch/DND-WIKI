import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { matchExistingMagicItem } from "../scripts/core/magic-item-identity.mjs";
import { readWikiPages } from "../scripts/core/wiki-records.mjs";
import { ROOT, resolveRawInputPath } from "../scripts/core/ingest-publication-utils.mjs";

const target = "wiki/魔法物品/戒指/新書防護戒指.md";
const options = { english: "Ring of Protection", target, publicationId: "NEW2026",
  sourceRoot: "原始資料/新書", mirrorRoot: "原始資料/外部來源鏡像/NEW2026", ruleset: "2024" };
const page = (file, source, extra = {}) => ({ file, data: { category: "魔法物品", title: "防護戒指 (Ring of Protection)",
  ruleset: "2024", sources: [{ file: source }], ...extra } });

test("魔法物品同名跨出版品不當作已收錄；目標被占用則列衝突", () => {
  const older = page("wiki/魔法物品/戒指/防護戒指.md", "原始資料/地下城主指南2024/戒指.md",
    { entity_id: "entry:DMG2024:entry:ring", ruleset: "2014" });
  assert.deepEqual(matchExistingMagicItem([older], options), { status: "missing", matches: [older.file] });
  const occupied = { ...older, file: target };
  const result = matchExistingMagicItem([occupied], options);
  assert.equal(result.status, "conflict");
  assert.equal(result.reason, "target_occupied_by_other_entity");
});

test("同出版品既有頁以來源或識別碼辨識，重複與版本衝突不擇一", () => {
  const existing = page("wiki/魔法物品/戒指/核定名稱.md", "原始資料/新書/戒指.md");
  const matched = matchExistingMagicItem([existing], options);
  assert.equal(matched.status, "matched");
  assert.equal(matched.target, existing.file);
  assert.equal(matched.same_target, false);
  const duplicate = page(target, "原始資料/新書/其他.md");
  assert.equal(matchExistingMagicItem([existing, duplicate], options).reason, "same_publication_identity_multiple");
  assert.equal(matchExistingMagicItem([{ ...existing, data: { ...existing.data, ruleset: "2014" } }], options).reason,
    "same_publication_ruleset_conflict");
  const byId = page(target, "原始資料/其他/戒指.md", { entity_id: "entry:NEW2026:magic-item:ring" });
  assert.equal(matchExistingMagicItem([byId], options).status, "matched");
});

test("無出版品證據的同名頁維持歧義，不以標題推定身分", () => {
  const unknown = page("wiki/魔法物品/戒指/舊頁.md", "未知來源/戒指.md", { entity_id: null });
  const result = matchExistingMagicItem([unknown], options);
  assert.equal(result.status, "ambiguous");
  assert.equal(result.reason, "existing_same_name_publication_unknown");
});

test("魔法物品盤點只讀取 Wiki 子目錄，拒絕越界掃描", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-magic-identity-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "wiki", "魔法物品"), { recursive: true });
  fs.mkdirSync(path.join(root, "wiki", "法術"), { recursive: true });
  for (const [folder, name] of [["魔法物品", "戒指"], ["法術", "法術"]]) {
    fs.writeFileSync(path.join(root, "wiki", folder, `${name}.md`), `---\ntitle: "${name}"\n---\n`);
  }
  assert.deepEqual(readWikiPages(root, { directory: "wiki/魔法物品" }).map((item) => item.file), ["wiki/魔法物品/戒指.md"]);
  assert.throws(() => readWikiPages(root, { directory: "原始資料" }), /越出 wiki/);
});

test("出版品設定來源不得以相對或絕對路徑越出原始資料", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-magic-source-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "原始資料", "新書"), { recursive: true });
  assert.equal(resolveRawInputPath({ root, sourceRoot: "原始資料/新書", input: "魔法物品" }),
    path.join(root, "原始資料", "新書", "魔法物品"));
  assert.throws(() => resolveRawInputPath({ root, sourceRoot: "原始資料/新書", input: "../../AGENTS.md" }), /不可越界/);
  assert.throws(() => resolveRawInputPath({ root, sourceRoot: "原始資料/新書", input: path.resolve(root, "AGENTS.md") }), /相對路徑/);
});

test("魔法物品解析器在讀取來源前拒絕未知旗標與多重類型", () => {
  for (const [args, expected] of [[['--unknown'], /不支援的選項/], [["戒指", "法杖"], /最多只能指定一種/]]) {
    const result = spawnSync(process.execPath, ["scripts/ingest/ingest-magic-items.mjs", ...args], { cwd: ROOT, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
  }
});
