import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { prepareErrata, prepareErrataBatch } from "../scripts/core/errata.mjs";
import { ROOT, applyCandidateBatch, planCandidateBatch } from "../scripts/core/ingest-publication-utils.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-errata-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "wiki", "規則"), { recursive: true });
  fs.mkdirSync(path.join(root, "原始資料"), { recursive: true });
  fs.mkdirSync(path.join(root, "附件"), { recursive: true });
  fs.writeFileSync(path.join(root, "原始資料", "errata.txt"), "official", "utf8");
  fs.writeFileSync(path.join(root, "附件", "翻譯詞彙表.md"), [
    "| 英文 | 本 Wiki 標準譯名 | 來源 ID | 定位 | 狀態 |",
    "| :--- | :--- | :--- | :--- | :--- |",
    "| Magic Term | 核定術語 | TEST | L1 | approved |",
    "",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "wiki", "規則", "測試.md"), [
    "---",
    'title: "測試"',
    'entity_id: "entry:test"',
    'concept_id: "concept:test"',
    'ruleset: "2024"',
    'content_scope: "core"',
    'status: "current"',
    'category: "規則機制"',
    'version: "2024-Core"',
    "tags:",
    '  - "測試"',
    "sources:",
    '  - file: "原始資料/base.txt"',
    '    locator: "L1"',
    '    authority: "官方"',
    '    translation: "community"',
    'source_type: "official"',
    'confidence: "confirmed"',
    "rules_sources:",
    '  - "Test Rules"',
    "errata: []",
    'updated: "2026-08-20"',
    'al_availability: "review"',
    "---",
    "",
    "## 規則",
    "人工段落。指定舊文。",
    "",
    "## 其他",
    "指定舊文。",
    "",
  ].join("\n"), "utf8");
  return root;
}

function input() {
  return { id: "errata-test", target: "wiki/規則/測試.md", heading: "規則",
    old_text: "指定舊文", new_text: "核定術語指定新文",
    source_file: "原始資料/errata.txt", source_locator: "p. 1",
    source_authority: "官方", source_translation: "none",
    terms: [{ english: "Magic Term", chinese: "核定術語" }] };
}

function metadata(text) {
  return YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
}

function linkedPage(root, { directory = "規則", name = "另一頁", backlink = false, section = true } = {}) {
  const original = fs.readFileSync(path.join(root, "wiki", "規則", "測試.md"), "utf8");
  const content = original.replace('title: "測試"', `title: "${name}"`)
    .replace('entity_id: "entry:test"', `entity_id: "entry:${directory}:${name}"`)
    .replace('concept_id: "concept:test"', `concept_id: "concept:${directory}:${name}"`)
    .replace(/## 規則[\s\S]*$/, section ? `## 🔗 相關連結\n${backlink ? "- [[wiki/規則/測試|測試]]\n" : ""}\n` : "## 規則\n其他內容。\n");
  const folder = path.join(root, "wiki", directory);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, `${name}.md`), content, "utf8");
  return `wiki/${directory}/${name}.md`;
}

test("勘誤同一候選更新指定正文、來源與紀錄，保留人工、識別碼、版本與 AL", (t) => {
  const root = fixture(t);
  const result = prepareErrata(input(), { root });
  const data = metadata(result.after);
  assert.equal(result.status, "ready");
  assert.match(result.after, /人工段落。核定術語指定新文。/);
  assert.match(result.after, /## 其他\n指定舊文。/);
  assert.match(result.after, /ERRATA:errata-test/);
  assert.deepEqual(data.sources[0], { file: "原始資料/errata.txt", locator: "p. 1", authority: "官方", translation: "none" });
  assert.equal(data.errata.length, 1);
  assert.match(data.errata[0], /原始資料\/errata.txt（p. 1）/);
  assert.equal(data.entity_id, "entry:test");
  assert.equal(data.concept_id, "concept:test");
  assert.equal(data.version, "2024-Core");
  assert.equal(data.al_availability, "review");
  assert.equal(data.confidence, "confirmed");
  assert.equal(data.source_type, "official");
  assert.match(data.updated, /^\d{4}-\d\d-\d\d$/);
  assert.deepEqual(result.review, ["2014／2024 替代關係與 AL 適用性須另行覆核"]);
  const plan = planCandidateBatch([result], { root, dependencyFiles: ["附件/翻譯詞彙表.md"] });
  assert.ok(plan.source_fingerprints["原始資料/errata.txt"]);
  assert.ok(plan.dependency_fingerprints["附件/翻譯詞彙表.md"]);
  applyCandidateBatch(plan, { root, authorization: "wiki:apply" });
  const again = prepareErrata(input(), { root });
  assert.equal(again.operation, "unchanged");
  assert.equal(again.after, result.after);
});

test("勘誤拒絕舊文不存在、多次出現及章節不唯一", (t) => {
  const root = fixture(t);
  assert.throws(() => prepareErrata({ ...input(), old_text: "不存在" }, { root }), /恰好出現一次/);
  const target = path.join(root, "wiki", "規則", "測試.md");
  fs.writeFileSync(target, fs.readFileSync(target, "utf8").replace("人工段落。指定舊文。", "指定舊文。指定舊文。"), "utf8");
  assert.throws(() => prepareErrata(input(), { root }), /恰好出現一次/);
  fs.appendFileSync(target, "\n## 規則\n另一段。\n", "utf8");
  assert.throws(() => prepareErrata(input(), { root }), /必須唯一/);
});

test("勘誤拒絕未核定譯名、非官方來源與越界來源", (t) => {
  const root = fixture(t);
  assert.throws(() => prepareErrata({ ...input(), terms: [{ english: "Unknown Term", chinese: "自造譯名" }] }, { root }), /譯名未核定/);
  assert.throws(() => prepareErrata({ ...input(), source_authority: "社群" }, { root }), /source_authority/);
  assert.throws(() => prepareErrata({ ...input(), source_translation: "official" }, { root }), /source_translation/);
  assert.throws(() => prepareErrata({ ...input(), source_file: "原始資料/../AGENTS.md" }, { root }), /勘誤來源必須是原始資料/);
  assert.throws(() => prepareErrata({ ...input(), target: "AGENTS.md" }, { root }), /Wiki 候選目標/);
});

test("既有勘誤標記若與正文或來源不一致，不能誤判為已處理", (t) => {
  const root = fixture(t);
  const result = prepareErrata(input(), { root });
  const target = path.join(root, "wiki", "規則", "測試.md");
  fs.writeFileSync(target, result.after.replace("核定術語指定新文", "已被人工改動"), "utf8");
  assert.throws(() => prepareErrata(input(), { root }), /不一致/);
});

test("勘誤改變 Wiki 連結時暫停自動套用，等待相依頁同批候選", (t) => {
  const root = fixture(t);
  const changed = prepareErrata({ ...input(), new_text: "[[另一頁|核定術語]]指定新文" }, { root });
  assert.equal(changed.status, "manual_review");
  assert.ok(changed.review.some((reason) => reason.includes("必要反向連結與索引")));
  const plan = planCandidateBatch([changed], { root });
  assert.equal(plan.summary.ready, 0);
});

test("明列且唯一的反向連結與主頁同批候選，套用後重跑無差異", (t) => {
  const root = fixture(t);
  const target = linkedPage(root);
  const errata = { ...input(), new_text: "[[另一頁|核定術語]]指定新文", backlinks: [{ target, action: "add" }] };
  const changes = prepareErrataBatch(errata, { root });
  assert.equal(changes.length, 2);
  assert.ok(changes.every((change) => change.status === "ready"));
  assert.match(changes[1].after, /- \[\[wiki\/規則\/測試\|測試\]\]/);
  const plan = planCandidateBatch(changes, { root, dependencyFiles: ["附件/翻譯詞彙表.md"] });
  assert.equal(plan.summary.ready, 2);
  applyCandidateBatch(plan, { root, authorization: "wiki:apply" });
  assert.equal(prepareErrataBatch(errata, { root })[0].status, "unchanged");
  assert.equal(fs.readFileSync(path.join(root, target), "utf8").match(/\[\[wiki\/規則\/測試\|測試\]\]/g).length, 1);
});

test("缺少反向連結決定、同名連結與缺少相關連結章節均待人工覆核", (t) => {
  const root = fixture(t);
  const target = linkedPage(root);
  const errata = { ...input(), new_text: "[[另一頁|核定術語]]指定新文" };
  assert.equal(prepareErrataBatch(errata, { root })[0].status, "manual_review");
  linkedPage(root, { directory: "魔法物品" });
  assert.match(prepareErrataBatch(errata, { root })[0].review.join(" "), /多個同名頁/);
  fs.rmSync(path.join(root, "wiki", "魔法物品", "另一頁.md"));
  linkedPage(root, { section: false });
  const blocked = prepareErrataBatch({ ...errata, backlinks: [{ target, action: "add" }] }, { root });
  assert.equal(blocked[0].status, "manual_review");
  assert.match(blocked[0].review.join(" "), /反向連結無法安全產生/);
});

test("移除正文連結只移除唯一對應反向連結，保留無關連結", (t) => {
  const root = fixture(t);
  const target = linkedPage(root, { backlink: true });
  const linked = path.join(root, "wiki", "規則", "測試.md");
  fs.writeFileSync(linked, fs.readFileSync(linked, "utf8").replace("人工段落。指定舊文。", "人工段落。[[另一頁|指定舊文]]。"), "utf8");
  const other = path.join(root, target);
  fs.writeFileSync(other, fs.readFileSync(other, "utf8").replace("- [[wiki/規則/測試|測試]]", "- [[wiki/規則/測試|測試]]\n- [[wiki/規則/另一頁|自身備註]]"), "utf8");
  const changes = prepareErrataBatch({ ...input(), old_text: "[[另一頁|指定舊文]]", new_text: "核定術語指定新文",
    backlinks: [{ target, action: "remove" }] }, { root });
  assert.equal(changes.length, 2);
  assert.ok(changes.every((change) => change.status === "ready"));
  assert.doesNotMatch(changes[1].after, /\[\[wiki\/規則\/測試\|測試\]\]/);
  assert.match(changes[1].after, /\[\[wiki\/規則\/另一頁\|自身備註\]\]/);
});

test("勘誤與 Patch 模式拒絕不相關的預覽旗標", () => {
  for (const [mode, extra] of [["--errata", "--publication"], ["--patch", "--type"]]) {
    const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", mode, "reports/nonexistent.json",
      extra, "EBER2025"], { encoding: "utf8", cwd: ROOT });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /不支援這些選項/);
  }
});
