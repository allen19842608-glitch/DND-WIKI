import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { extractSpellRules } from "../scripts/core/spell-content.mjs";
import { assessSpell, SPELL_DATASET } from "../scripts/audit/audit-spell-completeness.mjs";
import { assessLorePage } from "../scripts/audit/audit-lore-quality.mjs";
import { healthReportPaths, buildHealthReport } from "../scripts/audit/audit-wiki-health.mjs";
import { planGenericIndexes } from "../scripts/core/generic-indexes.mjs";
import { planSearchMetadata, approvedTerms } from "../scripts/sync/sync-search-metadata.mjs";
import { englishTitle } from "../scripts/core/wiki-records.mjs";
import { applyCandidateBatch, assertWikiTarget, normalizeCandidatePlanResults, option, parseOptions, planCandidateBatch, reportTargetPath, validateCliOptions, writableCandidate, writeCandidatePlan, writeCandidateReview, writeIngestReport } from "../scripts/core/ingest-publication-utils.mjs";
import { lintWiki } from "../scripts/core/wiki-lint.mjs";
import { inspectSourceUpdates, recordObservedSources, recordProcessedSources, recordProcessedCandidateSources } from "../scripts/core/source-update-state.mjs";
import { maintenanceNavigationCandidates, navigationCandidates } from "../scripts/core/navigation-candidates.mjs";
import { magicItemRarityInventory, searchNavigationCandidates } from "../scripts/core/search-navigation-candidates.mjs";
import { runLoreIngest } from "../scripts/ingest/ingest-lore.mjs";

function page(file, data = {}, body = "") {
  const metadata = { title: "範例 (Example)", category: "法術", ruleset: "2024", entity_id: "stable-id", sources: [], ...data };
  return { file, data: metadata, body, text: `---\n${YAML.stringify(metadata)}---\n${body}` };
}
function applyPlan(pages, plan) {
  return pages.map(p => {
    const change = plan.changes.find(c => c.file === p.file);
    if (!change) return p;
    const match = change.text.match(/^---\n([\s\S]*?)\n---\n/);
    return { ...p, text: change.text, data: YAML.parse(match[1]), body: change.text.slice(match[0].length) };
  });
}
const spell = { name: "Fireball", page: 274, entries: ["Each creature makes a save.", "The fire ignites objects."], entriesHigherLevel: [{ name: "Using a Higher-Level Spell Slot", entries: ["The damage increases by 1d6."] }] };
const spellPage = body => page("wiki/法術/3環/火球術.md", { sources: [{ file: SPELL_DATASET, locator: "p. 274", translation: "none" }] }, body);

test("法術完整性：缺升環會列出，來源無升環不誤報", () => {
  assert.ok(assessSpell(spell, spellPage("## 法術效果\n火焰傷害。\n")).findings.some(f => f.code === "SCALING_REVIEW"));
  assert.ok(!assessSpell({ ...spell, entriesHigherLevel: undefined }, spellPage("## 法術效果\n傷害。\n")).findings.some(f => f.code === "SCALING_REVIEW"));
});
test("升環已補、仍保留額外效果人工覆核，不自動核定", () => {
  const result = assessSpell(spell, spellPage("## 法術效果\n升環施法：增加傷害。\n"));
  assert.equal(result.status, "manual_review");
  assert.ok(result.findings.some(f => f.code === "ADDITIONAL_EFFECTS_MANUAL_REVIEW"));
});
test("舊版或來源段落的升環文字不能代替本版效果", () => {
  assert.ok(assessSpell(spell, spellPage("## 法術效果\n火焰。\n## 2014 版本\n升環施法增加傷害。\n")).findings.some(f => f.code === "SCALING_REVIEW"));
});
test("法術來源頁碼與書本指標不足可辨識", () => {
  const target = spellPage("## 法術效果\n升環效果。\n");
  target.data.sources[0] = { file: "原始資料/外部來源鏡像/PHB2024/book-xphb.json", translation: "none", locator: "p. 235" };
  const codes = assessSpell(spell, target).findings.map(f => f.code);
  assert.ok(codes.includes("PAGE_LOCATOR_REVIEW"));
  assert.ok(codes.includes("DATASET_CITATION_REVIEW"));
});
test("匯入完整保留多行效果與升環", () => {
  const result = extractSpellRules(["_三環 塑能_", "**施法時間：** 動作", "第一效果。", "第二效果。", "**升環施法。** 每環加 1d6。", "持續另一效果。"]);
  assert.equal(result.effect, "第一效果。\n第二效果。");
  assert.equal(result.higher, "每環加 1d6。\n持續另一效果。");
});
test("健康報告分流，範圍含引用該出版品的其他實體且去重", () => {
  assert.notEqual(healthReportPaths("/tmp", null).json, healthReportPaths("/tmp", "PHB2024").json);
  assert.throws(() => healthReportPaths("/tmp", "../../bad"));
  const pages = [page("wiki/a.md", { sources: [{ file: "原始資料/外部來源鏡像/PHB2024/datasets/a.json" }] })];
  pages[0].publication = "OTHER";
  const result = buildHealthReport({ pages, manifest: { sources: [] }, publications: [["PHB2024", {}]], publicationId: "PHB2024", sourceUpdates: { pending: [{ file: "原始資料/外部來源鏡像/PHB2024/datasets/a.json", todo: "review_required" }, { file: "原始資料/外部來源鏡像/PHB2024/datasets/b.json", todo: "none" }] } });
  assert.equal(result.scope.type, "publication");
  assert.equal(result.pages.total, 1);
  assert.deepEqual(result.maintenance_updates, { new_or_ongoing: 1, resolved: 1 });
  const asset = buildHealthReport({ pages: [], manifest: { sources: [] }, publications: [["PHB2024", { source_assets: [{ path: "原始資料/玩家手冊2024" }] }]], publicationId: "PHB2024", sourceUpdates: { pending: [{ file: "原始資料/玩家手冊2024/規則.md", todo: "review_required" }] } });
  assert.equal(asset.maintenance_updates.new_or_ongoing, 1);
});
test("健康報告分開列本次新增、持續、已解決及消失但未驗證的待辦", () => {
  const source = "原始資料/外部來源鏡像/PHB2024/datasets/a.json";
  const other = "原始資料/外部來源鏡像/PHB2024/datasets/b.json";
  const make = (pending, previousReport = null, sources = [source, other]) => buildHealthReport({
    pages: [], manifest: { sources: sources.map((file) => ({ file, status: "unchanged", absorbed_by: [] })) },
    publications: [["PHB2024", {}]], publicationId: "PHB2024", sourceUpdates: { pending }, previousReport,
    generatedAt: "2026-09-26T00:00:00.000Z",
  });
  const first = make([{ file: source, sha256: "a".repeat(64), todo: "review_required" }]);
  assert.deepEqual([first.maintenance_delta.new, first.maintenance_delta.ongoing, first.maintenance_delta.resolved], [0, 1, 0]);
  assert.equal(first.maintenance_delta.baseline_available, false);
  const second = make([{ file: source, sha256: "b".repeat(64), todo: "review_required" }, { file: other, sha256: "c".repeat(64), todo: "review_required" }], first);
  assert.deepEqual([second.maintenance_delta.new, second.maintenance_delta.ongoing, second.maintenance_delta.resolved], [1, 1, 0]);
  const third = make([{ file: source, sha256: "b".repeat(64), todo: "none" }, { file: other, sha256: "c".repeat(64), todo: "review_required" }], second);
  assert.deepEqual([third.maintenance_delta.new, third.maintenance_delta.ongoing, third.maintenance_delta.resolved], [0, 1, 1]);
  const missing = make([], first, []);
  assert.equal(missing.maintenance_delta.resolved, 0);
  assert.equal(missing.maintenance_delta.unverified, 1);
  assert.equal(missing.maintenance_delta.items[0].state, "unverified");
  const differentScope = buildHealthReport({ pages: [], manifest: { sources: [] }, publications: [["PHB2024", {}]], previousReport: first });
  assert.equal(differentScope.maintenance_delta.baseline_available, false);
});
test("健康報告只在既有 Wiki 頁確實離開核定佇列時標已解決", () => {
  const file = "wiki/法術/範例.md";
  const source = { file: "原始資料/外部來源鏡像/PHB2024/datasets/spells.json", locator: "spell: Example", authority: "官方", translation: "none" };
  const candidate = page(file, { version: "2024-Core", confidence: "interpreted", sources: [source] });
  candidate.mirrorRuleText = false;
  const args = { manifest: { sources: [] }, publications: [["PHB2024", {}]], publicationId: "PHB2024", sourceUpdates: { pending: [] } };
  const first = buildHealthReport({ ...args, pages: [candidate] });
  assert.equal(first.maintenance_delta.ongoing, 1);
  const confirmed = page(file, { version: "2024-Core", confidence: "confirmed", sources: [source] });
  const second = buildHealthReport({ ...args, pages: [confirmed], previousReport: first });
  assert.equal(second.maintenance_delta.resolved, 1);
  const missing = buildHealthReport({ ...args, pages: [], previousReport: first });
  assert.equal(missing.maintenance_delta.resolved, 0);
  assert.equal(missing.maintenance_delta.unverified, 1);
});
test("類型模板的入門段落受到辨識；短文只是提示", () => {
  for (const [type, heading] of [["世界觀", "世界概貌"], ["人物", "身分"], ["地理", "所屬區域與地點性質"], ["組織與派系", "宗旨與活動範圍"]]) {
    const result = assessLorePage(page("wiki/戰役設定/範例.md", { category: "戰役設定", lore_type: type }, `## ${heading}\n有來源的精簡摘要。\n`));
    assert.deepEqual(result.issues, []);
    assert.equal(result.hints.length, 1);
  }
  assert.equal(assessLorePage(page("wiki/戰役設定/範例索引.md", { category: "戰役設定" }, "")), null);
});
test("索引預覽涵蓋新增、刪除、改名與反向連結，人工介紹保留且重跑穩定", () => {
  const index = page("wiki/法術/測試索引.md", { title: "測試索引" }, "# 測試索引\n\n人工精選說明\n\n<!-- AUTO-INDEX:START -->\n- [[舊頁|舊頁]]\n<!-- AUTO-INDEX:END -->\n");
  const pages = [index, page("wiki/法術/新頁.md")];
  const first = planGenericIndexes(pages);
  assert.equal(first.missing, 1);
  assert.equal(first.changes.length, 2);
  const applied = applyPlan(pages, first);
  assert.ok(applied[0].text.includes("人工精選說明"));
  assert.ok(!applied[0].text.includes("舊頁"));
  assert.ok(applied[1].text.includes("法術/測試索引"));
  assert.equal(planGenericIndexes(applied).changes.length, 0);
  const moved = [applied[0], { ...applied[1], file: "wiki/其他/新頁.md" }];
  assert.ok(!planGenericIndexes(moved).changes[0].text.includes("[[新頁"));
});
test("手動精選不與自動清單重複，過時區塊仍可被檢查", () => {
  const pages = [page("wiki/法術/測試索引.md", { title: "測試索引" }, "## 精選\n- [[新頁|精選名称]]\n\n<!-- AUTO-INDEX:START -->\n- [[新頁|舊名稱]]\n<!-- AUTO-INDEX:END -->\n"), page("wiki/法術/新頁.md", {}, "## 🔗 相關連結\n- [[測試索引]]\n")];
  const plan = planGenericIndexes(pages);
  assert.equal(plan.missing, 0);
  assert.equal(plan.changes.length, 1);
  assert.equal((plan.changes[0].text.match(/\[\[新頁/g) ?? []).length, 1);
});
test("搜尋保留 aliases 與 ID，提供版本別名及明確連結，重跑無差異", () => {
  const pages = [page("wiki/法術/火球術.md", { title: "火球術 (Fireball)", aliases: ["既有別名"] }, "## 效果\n火焰。\n"), page("wiki/法術/2014/火球術.md", { title: "火球術 (Fireball)", ruleset: "2014" }, "## 🔗 相關連結\n- [[火球術#效果|火球術（2024）]]\n")];
  const plan = planSearchMetadata(pages, []);
  const applied = applyPlan(pages, plan);
  assert.ok(applied[0].data.aliases.includes("既有別名"));
  assert.ok(applied[0].data.aliases.includes("Fireball（2024）"));
  assert.equal(applied[0].data.entity_id, "stable-id");
  assert.ok(applied[1].body.includes("[[法術/火球術#效果|火球術（2024）]]"));
  assert.equal(planSearchMetadata(applied, []).changes.length, 0);
});
test("舊版手動索引按明示版本連到舊版；保留表格管線跳脫", () => {
  const pages = [page("wiki/法術/火球術.md"), page("wiki/法術/2014/火球術.md", { ruleset: "2014" }), page("wiki/法術/2014/法術索引.md", { ruleset: "2014" }, "| [[火球術\\|Fireball，2014 Legacy]] |\n")];
  assert.ok(planSearchMetadata(pages, []).changes.at(-1).text.includes("[[法術/2014/火球術\\|Fireball，2014 Legacy]]"));
});
test("只採核定詞彙，未核定專名不新增中文别名", () => {
  const terms = approvedTerms("| Fireball | 火球術 | PHB | p. 274 | approved |\n| Guess | 猜測 | none | none | pending |");
  assert.equal(terms.length, 1);
  const plan = planSearchMetadata([page("wiki/法術/未知.md", { title: "譯名待確認 (Unknown)" })], terms);
  assert.equal(plan.changes.length, 0);
});
test("英文標題保留名稱內逗號及巢狀括號", () => {
  assert.equal(englishTitle("動作 (Actions, Bonus Actions, and Reactions)"), "Actions, Bonus Actions, and Reactions");
  assert.equal(englishTitle("旗將 (Purple Dragon Knight (Banneret)，2014 Legacy)"), "Purple Dragon Knight (Banneret)");
});
test("報告參數不能誤用下一個旗標作為檔名", () => {
  assert.throws(() => option(["--report", "--apply"], "--report"));
  assert.equal(option(["--report", "reports/example.json"], "--report"), "reports/example.json");
});

test("報告目標不得越出 reports/ 或經連結指向受保護內容", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-report-scope-"));
  const reports = path.join(root, "reports");
  const raw = path.join(root, "原始資料");
  fs.mkdirSync(reports);
  fs.mkdirSync(raw);
  const protectedFile = path.join(raw, "protected.md");
  fs.writeFileSync(protectedFile, "protected\n");
  assert.equal(reportTargetPath("reports/safe.json", { root }), path.join(reports, "safe.json"));
  assert.throws(() => reportTargetPath("原始資料/protected.md", { root }), /reports\//);
  assert.throws(() => reportTargetPath("reports/../原始資料/protected.md", { root }), /reports\//);
  try {
    fs.symlinkSync(raw, path.join(reports, "linked"), "junction");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) return context.skip(`此環境無法建立測試用連結：${error.code}`);
    throw error;
  }
  assert.throws(() => reportTargetPath("reports/linked/protected.md", { root }), /符號連結/);
  assert.equal(fs.readFileSync(protectedFile, "utf8"), "protected\n");
});

test("保留匯入器不得直接寫入 Wiki", () => {
  assert.throws(() => writableCandidate({ destination: path.join(process.cwd(), "wiki", "test.md"), content: "x", options: { apply: true, report: "reports/example.json", only: null, replace: true, results: [] } }), /不直接寫入/);
});

test("戰役設定解析器拒絕直寫，須經候選計畫套用", () => {
  assert.throws(() => runLoreIngest(["--apply"]), /只支援預覽/);
});

test("戰役設定預覽以英文鏡像實體頁碼決定是否可套用", () => {
  const report = runLoreIngest(["--publication", "SCAG2015", "--only", "=The Dirge of Delzoun"]);
  assert.equal(report.schema_version, 2);
  assert.equal(report.category, "戰役設定");
  assert.equal(report.outcome_summary.ambiguous, 1);
  assert.equal(report.summary.ready, 0);
});

test("Wiki 候選範圍拒絕原始資料與治理檔案", () => {
  assert.throws(() => assertWikiTarget("原始資料/example.md"), /wiki\//);
  assert.throws(() => assertWikiTarget("AGENTS.md"), /wiki\//);
  for (const target of ["wiki/./page.md", "wiki//page.md", "wiki/section/../page.md",
    "wiki\\page.md", "wiki/page.md:stream.md", "wiki/page. /entry.md", "wiki/CON.md"]) {
    assert.throws(() => assertWikiTarget(target), /wiki\//, target);
  }
});

test("真實虛擬文件集合會納入新頁與移除頁", () => {
  const invalid = lintWiki({ files: ["wiki/虛擬驗證新頁.md"], overrides: new Map([["wiki/虛擬驗證新頁.md", "---\ntitle: [\n---\n"]]) });
  assert.ok(invalid.errors > 0, "新頁的錯誤 YAML 必須被解析器檢出");
  const deleted = lintWiki({ files: ["wiki/索引.md"], overrides: new Map([["wiki/不存在的虛擬頁.md", null], ["wiki/索引.md", "[[不存在的虛擬頁]]\n"]]) });
  assert.ok(deleted.diagnostics.some((item) => item.code === "LINK_DEAD"), "刪除目標造成的斷鏈必須被檢出");
});

test("純刪除候選會以真實 lint 檢出既有頁面的斷鏈", () => {
  const target = "wiki/索引.md";
  const before = fs.readFileSync(target, "utf8");
  assert.throws(() => planCandidateBatch([
    { target, operation: "delete", before, after: null, status: "ready" },
  ], { lint: lintWiki }), /候選變更虛擬 lint 失敗/);
  assert.equal(fs.readFileSync(target, "utf8"), before);
});

test("真實虛擬文件集合檢查新舊交互連結與穩定識別碼碰撞", () => {
  const existingTarget = "wiki/法術/2環/人工生命僕從.md";
  const existing = fs.readFileSync(existingTarget, "utf8");
  const virtualTarget = "wiki/法術/2環/虛擬人工生命僕從.md";
  const virtual = existing
    .replace('title: "人工生命僕從 (Homunculus Servant)"', 'title: "虛擬人工生命僕從 (Virtual Homunculus Servant)"')
    .replace('entity_id: "entry:EBER2025:spell:homunculus-servant"', 'entity_id: "entry:EBER2025:spell:virtual-homunculus-servant"')
    .replace('concept_id: "concept:spell:homunculus-servant"', 'concept_id: "concept:spell:virtual-homunculus-servant"');
  const linkedExisting = `${existing}\n[[法術/2環/虛擬人工生命僕從]]\n`;
  const linked = lintWiki({
    files: [existingTarget, virtualTarget],
    overrides: new Map([[existingTarget, linkedExisting], [virtualTarget, virtual]]),
  });
  assert.equal(linked.diagnostics.some((item) => item.code === "LINK_DEAD" && item.file === existingTarget), false, "既有頁必須能解析連向虛擬新頁的連結");

  const duplicate = lintWiki({
    files: [virtualTarget],
    overrides: new Map([[virtualTarget, existing]]),
  });
  assert.ok(duplicate.diagnostics.some((item) => item.code === "IDENTIFIER_DUPLICATE" && item.file === virtualTarget), "虛擬新頁的重複穩定識別碼必須被檢出");
});

test("共用 CLI 解析器拒絕未知旗標與互斥套用模式", () => {
  assert.throws(() => validateCliOptions(["--unknown"]), /不支援的選項/);
  assert.throws(() => parseOptions(["--apply", "--dry-run"]), /不可同時使用/);
  assert.throws(() => parseOptions(["--report", "--apply"]), /必須指定值/);
});

test("候選變更批次先虛擬 lint，錯誤時不寫入", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  const changes = [{ target: "wiki/test.md", operation: "create", before: null, after: "---\ntitle: Test\n---\n" }];
  assert.throws(() => planCandidateBatch(changes, { root, lint: () => ({ errors: 1, warnings: 0, information: 0 }) }), /虛擬 lint 失敗/);
  assert.equal(fs.existsSync(path.join(root, "wiki", "test.md")), false);
});

test("候選變更批次可套用並在重跑時保持穩定", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  const changes = [{ target: "wiki/test.md", operation: "create", before: null, after: "content\n", status: "ready" }];
  const lint = () => ({ errors: 0, warnings: 0, information: 0 });
  const plan = planCandidateBatch(changes, { root, lint });
  const result = applyCandidateBatch(plan, { root, lint, authorization: "wiki:apply" });
  assert.deepEqual(result.applied, ["wiki/test.md"]);
  assert.equal(fs.readFileSync(path.join(root, "wiki", "test.md"), "utf8"), "content\n");
  assert.equal(planCandidateBatch([{ ...changes[0], before: "content\n", operation: "unchanged" }], { root, lint }).changes[0].operation, "unchanged");
});

test("套用器僅寫入 ready 項目", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-ready-only-"));
  const lint = () => ({ errors: 0, warnings: 0, information: 0 });
  const plan = planCandidateBatch([
    { target: "wiki/ready.md", operation: "create", before: null, after: "ready\n", status: "ready" },
    { target: "wiki/review.md", operation: "create", before: null, after: "review\n", status: "manual_review" },
    { target: "wiki/skipped.md", operation: "create", before: null, after: "skipped\n", status: "skipped" },
  ], { root, lint });
  const result = applyCandidateBatch(plan, { root, lint, authorization: "wiki:apply" });
  assert.deepEqual(result.applied, ["wiki/ready.md"]);
  assert.equal(fs.readFileSync(path.join(root, "wiki", "ready.md"), "utf8"), "ready\n");
  assert.equal(fs.existsSync(path.join(root, "wiki", "review.md")), false);
  assert.equal(fs.existsSync(path.join(root, "wiki", "skipped.md")), false);
  assert.equal(plan.summary.ready, 1);
});

test("同目標候選即使正文相同，來源或審閱狀態不同也會拒絕", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidate-conflict-"));
  const candidate = { target: "wiki/page.md", operation: "create", before: null, after: "same\n", source: "source-a", status: "ready" };
  assert.throws(() => planCandidateBatch([candidate, { ...candidate, source: "source-b" }], { root }), /互相衝突/);
  assert.throws(() => planCandidateBatch([candidate, { ...candidate, status: "manual_review" }], { root }), /互相衝突/);
  assert.throws(() => planCandidateBatch([candidate, { ...candidate, target: "wiki/Page.md" }], { root }), /互相衝突/);
  const accent = { ...candidate, target: "wiki/café.md" };
  assert.throws(() => planCandidateBatch([accent, { ...accent, target: "wiki/cafe\u0301.md" }], { root }), /互相衝突/);
  const plan = planCandidateBatch([candidate], { root });
  plan.changes.push({ ...candidate, target: "wiki/Page.md" });
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }), /重複候選/);
  assert.equal(fs.existsSync(path.join(root, "wiki", "page.md")), false);
});

test("預覽與套用都拒絕操作標籤和建立、更新、刪除內容不一致", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-operation-shape-"));
  const target = "wiki/page.md";
  for (const change of [
    { target, operation: "create", before: "old\n", after: "new\n" },
    { target, operation: "update", before: null, after: "new\n" },
    { target, operation: "link", before: null, after: "new\n" },
    { target, operation: "delete", before: "old\n", after: "new\n" },
  ]) {
    assert.throws(() => planCandidateBatch([change], { root }), /候選操作與變更內容不一致/);
  }
  assert.throws(() => planCandidateBatch([{ target, operation: "erase", before: "old\n", after: null }], { root }), /不支援的候選操作/);
  const valid = planCandidateBatch([{ target, operation: "create", before: null, after: "new\n" }], { root });
  for (const malformed of [
    { operation: "create", before: "old\n", after: "new\n" },
    { operation: "update", before: null, after: "new\n" },
    { operation: "delete", before: null, after: "new\n" },
  ]) {
    const edited = { ...valid, changes: [{ ...valid.changes[0], ...malformed }] };
    assert.throws(() => applyCandidateBatch(edited, { root, authorization: "wiki:apply" }), /候選操作與變更內容不一致/);
    assert.equal(fs.existsSync(path.join(root, "wiki", "page.md")), false);
  }
});

test("共用套用器拒絕解析器直接寫入", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  const plan = planCandidateBatch([{ target: "wiki/test.md", operation: "create", before: null, after: "content\\n" }], { root });
  assert.throws(() => applyCandidateBatch(plan, { root }), /解析器不得直接套用/);
  assert.equal(fs.existsSync(path.join(root, "wiki", "test.md")), false);
});

test("套用後 lint 失敗會回復整批檔案", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  const existing = path.join(root, "wiki", "existing.md");
  fs.mkdirSync(path.dirname(existing), { recursive: true });
  fs.writeFileSync(existing, "before\n", "utf8");
  const plan = planCandidateBatch([
    { target: "wiki/existing.md", operation: "update", before: "before\n", after: "after\n" },
    { target: "wiki/new.md", operation: "create", before: null, after: "new\n" },
  ], { root, lint: () => ({ errors: 0, warnings: 0, information: 0 }) });
  assert.throws(() => applyCandidateBatch(plan, {
    root,
    authorization: "wiki:apply",
    lint: ({ overrides }) => overrides ? { errors: 0, warnings: 0, information: 0 } : { errors: 1, warnings: 0, information: 0 },
  }), /套用後 lint 失敗/);
  assert.equal(fs.readFileSync(existing, "utf8"), "before\n");
  assert.equal(fs.existsSync(path.join(root, "wiki", "new.md")), false);
});

test("混合建立、更新與刪除批次遇實際寫入失敗會回復內容及存在狀態", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-midwrite-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const wiki = path.join(root, "wiki");
  fs.mkdirSync(wiki);
  fs.writeFileSync(path.join(wiki, "existing.md"), "before\n");
  fs.writeFileSync(path.join(wiki, "removed.md"), "keep\n");
  fs.writeFileSync(path.join(wiki, "blocked.md"), "not a directory\n");
  const plan = planCandidateBatch([
    { target: "wiki/existing.md", operation: "update", before: "before\n", after: "after\n" },
    { target: "wiki/new-folder/created.md", operation: "create", before: null, after: "new\n" },
    { target: "wiki/blocked.md/cannot-write.md", operation: "create", before: null, after: "never\n" },
    { target: "wiki/removed.md", operation: "delete", before: "keep\n", after: null },
  ], { root });
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }));
  assert.equal(fs.readFileSync(path.join(wiki, "existing.md"), "utf8"), "before\n");
  assert.equal(fs.existsSync(path.join(wiki, "new-folder", "created.md")), false);
  assert.equal(fs.existsSync(path.join(wiki, "new-folder")), false);
  assert.equal(fs.readFileSync(path.join(wiki, "removed.md"), "utf8"), "keep\n");
  assert.equal(fs.readFileSync(path.join(wiki, "blocked.md"), "utf8"), "not a directory\n");
});

test("混合建立、更新與刪除批次後置驗證失敗會完整回復", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-postcheck-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const wiki = path.join(root, "wiki");
  fs.mkdirSync(wiki);
  fs.writeFileSync(path.join(wiki, "existing.md"), "before\n");
  fs.writeFileSync(path.join(wiki, "removed.md"), "keep\n");
  const plan = planCandidateBatch([
    { target: "wiki/existing.md", operation: "update", before: "before\n", after: "after\n" },
    { target: "wiki/new-folder/created.md", operation: "create", before: null, after: "new\n" },
    { target: "wiki/removed.md", operation: "delete", before: "keep\n", after: null },
  ], { root });
  assert.throws(() => applyCandidateBatch(plan, {
    root, authorization: "wiki:apply", postApply: () => { throw new Error("後置驗證失敗"); },
  }), /後置驗證失敗/);
  assert.equal(fs.readFileSync(path.join(wiki, "existing.md"), "utf8"), "before\n");
  assert.equal(fs.existsSync(path.join(wiki, "new-folder", "created.md")), false);
  assert.equal(fs.existsSync(path.join(wiki, "new-folder")), false);
  assert.equal(fs.readFileSync(path.join(wiki, "removed.md"), "utf8"), "keep\n");
});

test("Wiki 候選目標不能經符號連結寫入原始資料", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-linked-target-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const raw = path.join(root, "原始資料");
  const wiki = path.join(root, "wiki");
  fs.mkdirSync(raw);
  fs.mkdirSync(wiki);
  const source = path.join(raw, "protected.md");
  fs.writeFileSync(source, "protected\n");
  let target = "wiki/linked.md";
  try {
    fs.symlinkSync(source, path.join(wiki, "linked.md"), "file");
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) throw error;
    try {
      fs.symlinkSync(raw, path.join(wiki, "linked-folder"), "junction");
      target = "wiki/linked-folder/protected.md";
    } catch (junctionError) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(junctionError.code)) return context.skip(`此環境無法建立測試用連結：${junctionError.code}`);
      throw junctionError;
    }
  }
  const plan = planCandidateBatch([
    { target, operation: "update", before: "protected\n", after: "unsafe\n" },
  ], { root });
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }), /目標路徑包含符號連結/);
  assert.equal(fs.readFileSync(source, "utf8"), "protected\n");
});

test("套用後索引驗證失敗會回復整批檔案", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  const target = path.join(root, "wiki", "index-dependent.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "before\n", "utf8");
  const plan = planCandidateBatch([{ target: "wiki/index-dependent.md", operation: "update", before: "before\n", after: "after\n" }], { root });
  assert.throws(() => applyCandidateBatch(plan, {
    root,
    authorization: "wiki:apply",
    postApply: () => { throw new Error("索引驗證失敗"); },
  }), /索引驗證失敗/);
  assert.equal(fs.readFileSync(target, "utf8"), "before\n");
});

test("候選批次的刪除可交易式套用並在失敗時回復", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  const target = path.join(root, "wiki", "moved.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "before\n", "utf8");
  const plan = planCandidateBatch([{ target: "wiki/moved.md", operation: "delete", before: "before\n", after: null }], { root });
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply", postApply: () => { throw new Error("驗證失敗"); } }), /驗證失敗/);
  assert.equal(fs.readFileSync(target, "utf8"), "before\n");
  applyCandidateBatch(plan, { root, authorization: "wiki:apply" });
  assert.equal(fs.existsSync(target), false);
});

test("套用會拒絕預覽後已變更的舊計畫", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  const target = path.join(root, "wiki", "stale.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "before\n", "utf8");
  const plan = planCandidateBatch([{ target: "wiki/stale.md", operation: "update", before: "before\n", after: "after\n" }], { root });
  fs.writeFileSync(target, "changed-after-preview\n", "utf8");
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }), /計畫已過期/);
  assert.equal(fs.readFileSync(target, "utf8"), "changed-after-preview\n");
});

test("套用會拒絕預覽後已變更的來源", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  const source = path.join(root, "原始資料", "source.txt");
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.writeFileSync(source, "before", "utf8");
  const plan = planCandidateBatch([{ target: "wiki/page.md", operation: "create", before: null, after: "page\n", source: "原始資料/source.txt" }], { root });
  fs.writeFileSync(source, "after", "utf8");
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }), /候選來源已過期/);
  assert.equal(fs.existsSync(path.join(root, "wiki", "page.md")), false);
});

test("來源目錄的檔案變動會使候選過期，缺檔不可建立計畫", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-source-directory-"));
  const directory = path.join(root, "原始資料", "book", "chapter");
  fs.mkdirSync(directory, { recursive: true });
  const source = path.join(directory, "entry.md");
  fs.writeFileSync(source, "before\n", "utf8");
  const change = { target: "wiki/page.md", operation: "create", before: null, after: "page\n", source: "原始資料/book/chapter" };
  const plan = planCandidateBatch([change], { root });
  assert.ok(plan.source_fingerprints[change.source]);
  fs.writeFileSync(source, "after\n", "utf8");
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }), /候選來源已過期/);
  assert.equal(fs.existsSync(path.join(root, "wiki", "page.md")), false);
  assert.throws(() => planCandidateBatch([{ ...change, source: "原始資料/book/missing" }], { root }), /候選來源不存在/);
});

test("明列掃描來源不可默默忽略原始資料範圍外的檔案", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-source-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => planCandidateBatch([], { root, sourceFiles: ["config/publications.yml"] }), /候選來源必須位於原始資料/);
  assert.throws(() => planCandidateBatch([], { root, sourceFiles: ["../outside.md"] }), /候選來源必須位於原始資料/);
});

test("候選來源不可透過連結讀取原始資料範圍外的檔案", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-source-link-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const raw = path.join(root, "原始資料");
  const book = path.join(raw, "book");
  fs.mkdirSync(book, { recursive: true });
  const outside = path.join(root, "outside");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "secret.md"), "outside\n", "utf8");
  try { fs.symlinkSync(outside, path.join(book, "linked"), "junction"); }
  catch (error) { if (["EPERM", "EACCES"].includes(error.code)) return t.skip("此環境不可建立符號連結"); throw error; }
  assert.throws(() => planCandidateBatch([], { root, sourceFiles: ["原始資料/book/linked/secret.md"] }), /經連結越出/);
  assert.throws(() => planCandidateBatch([], { root, sourceFiles: ["原始資料/book"] }), /無法安全追蹤的連結/);
});

test("核定詞彙表是唯讀依賴，變更後會阻擋舊候選", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-glossary-dependency-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const glossary = path.join(root, "附件", "翻譯詞彙表.md");
  fs.mkdirSync(path.dirname(glossary), { recursive: true });
  fs.writeFileSync(glossary, "核定詞一\n", "utf8");
  const target = path.join(root, "wiki", "page.md");
  const plan = planCandidateBatch([{ target: "wiki/page.md", operation: "create", before: null, after: "page\n" }], {
    root, dependencyFiles: ["附件/翻譯詞彙表.md"],
  });
  assert.ok(plan.dependency_fingerprints["附件/翻譯詞彙表.md"]);
  fs.writeFileSync(glossary, "核定詞二\n", "utf8");
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }), /候選唯讀依賴已過期/);
  assert.equal(fs.existsSync(target), false);
  assert.throws(() => planCandidateBatch([], { root, dependencyFiles: ["附件/其他.md"] }), /候選唯讀依賴僅允許/);
});

test("Wiki 導覽的唯讀資料夾依賴在來源頁變動後阻擋舊計畫", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-navigation-dependency-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "wiki", "魔法物品", "戒指", "範例.md");
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.writeFileSync(source, "| 稀有度 (Rarity) | 普通 |\n", "utf8");
  const plan = planCandidateBatch([{ target: "wiki/魔法物品/稀有度索引.md", operation: "create", before: null, after: "index\n" }], {
    root, dependencyFiles: ["wiki/魔法物品"],
  });
  assert.ok(plan.dependency_fingerprints["wiki/魔法物品"]);
  fs.writeFileSync(source, "| 稀有度 (Rarity) | 珍稀 |\n", "utf8");
  assert.throws(() => applyCandidateBatch(plan, { root, authorization: "wiki:apply" }), /候選唯讀依賴已過期/);
  assert.equal(fs.existsSync(path.join(root, "wiki", "魔法物品", "稀有度索引.md")), false);
  assert.throws(() => planCandidateBatch([], { root, dependencyFiles: ["wiki/../原始資料"] }), /候選唯讀依賴僅允許/);
});

test("成功套用的來源處理狀態獨立於觀察快照", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-source-state-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = "原始資料/test.json";
  const sha256 = "a".repeat(64);
  assert.deepEqual(recordProcessedSources({ [source]: sha256 }, { root }), [source]);
  const state = JSON.parse(fs.readFileSync(path.join(root, ".wiki-cache", "source-update-state.json"), "utf8"));
  assert.equal(state.schema_version, 2);
  assert.equal(state.processed[source].sha256, sha256);
  assert.equal(state.observed[source], undefined);
  assert.deepEqual(recordProcessedSources({ [source]: sha256 }, { root }), []);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, ".wiki-cache", "source-update-state.json"), "utf8")).processed[source], state.processed[source]);
  assert.deepEqual(recordProcessedSources({ "wiki/not-a-source.md": sha256 }, { root }), []);
});

test("部分頁面套用不得把整份來源更新標為已處理", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-partial-source-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = "原始資料/外部來源鏡像/TEST/datasets/spells-test.json";
  const sha256 = "b".repeat(64);
  const update = { file: source, sha256, observed_at: "2026-09-28T00:00:00.000Z", todo: "review_required", impact: "direct_pages",
    affected_pages: ["wiki/法術/甲.md", "wiki/法術/乙.md"], unresolved_entities: [] };
  const updates = { pending: [update] };
  const partial = recordProcessedCandidateSources({ [source]: sha256 }, {
    root, appliedChanges: [{ target: "wiki/法術/甲.md", source }], updates,
  });
  assert.deepEqual(partial.recorded, []);
  assert.equal(partial.withheld[0].reason, "affected_pages_not_all_applied");
  assert.equal(fs.existsSync(path.join(root, ".wiki-cache", "source-update-state.json")), false);
  for (const [entry, reason] of [
    [{ ...update, impact: "entity_review", unresolved_entities: [{ name: "乙" }] }, "source_scope_not_precise"],
    [{ ...update, impact: "publication_review", affected_pages: [] }, "source_scope_not_precise"],
    [{ ...update, sha256: "c".repeat(64) }, "source_update_not_observed"],
    [{ ...update, observed_at: null }, "source_update_not_observed"],
  ]) {
    const result = recordProcessedCandidateSources({ [source]: sha256 }, {
      root, appliedChanges: update.affected_pages.map((target) => ({ target, source })), updates: { pending: [entry] },
    });
    assert.deepEqual(result.recorded, []);
    assert.equal(result.withheld[0].reason, reason);
  }
  const mixed = recordProcessedCandidateSources({ [source]: sha256 }, {
    root, appliedChanges: [{ target: "wiki/法術/甲.md", source }, { target: "wiki/法術/乙.md", source: "另一來源" }], updates,
  });
  assert.equal(mixed.withheld[0].reason, "affected_pages_not_all_applied");
  const full = recordProcessedCandidateSources({ [source]: sha256 }, {
    root, appliedChanges: update.affected_pages.map((target) => ({ target, source })), updates,
  });
  assert.deepEqual(full.recorded, [source]);
  assert.deepEqual(full.withheld, []);
  const state = JSON.parse(fs.readFileSync(path.join(root, ".wiki-cache", "source-update-state.json"), "utf8"));
  assert.equal(state.processed[source].sha256, sha256);
});

test("來源更新依出版品登錄的資產根目錄篩選，不靠 ID 字串猜測", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-source-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".wiki-cache"), { recursive: true });
  fs.writeFileSync(path.join(root, ".wiki-cache", "source-manifest.json"), JSON.stringify({ sources: [
    { file: "原始資料/外部來源鏡像/EBER2025/datasets/spells.json", sha256: "a".repeat(64), status: "changed", absorbed_by: [] },
    { file: "原始資料/玩家手冊2024/規則.md", sha256: "b".repeat(64), status: "changed", absorbed_by: [] },
  ] }), "utf8");
  assert.equal(inspectSourceUpdates({ root, publicationId: "EBER2025" }).pending.length, 1);
  assert.equal(inspectSourceUpdates({ root, publicationId: "PHB2024" }).pending.length, 1);
});

test("重建來源快取不會抹除未處理更新，重跑亦不重製待辦", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-observed-update-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const cache = path.join(root, ".wiki-cache");
  fs.mkdirSync(cache, { recursive: true });
  const source = { file: "原始資料/外部來源鏡像/EBER2025/datasets/spells.json", sha256: "b".repeat(64), status: "changed", absorbed_by: ["wiki/法術/甲.md", "wiki/法術/乙.md"] };
  assert.deepEqual(recordObservedSources([source], { root }), [source.file]);
  const observed = JSON.parse(fs.readFileSync(path.join(cache, "source-update-state.json"), "utf8")).observed[source.file];
  assert.deepEqual(recordObservedSources([source], { root }), []);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(cache, "source-update-state.json"), "utf8")).observed[source.file], observed);
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [{ ...source, status: "unchanged" }] }));
  const pending = inspectSourceUpdates({ root, publicationId: "EBER2025" });
  assert.equal(pending.summary.pending, 1);
  assert.equal(pending.pending[0].impact, "publication_review");
  assert.deepEqual(pending.pending[0].affected_pages, []);
  assert.deepEqual(pending.pending[0].referencing_pages, source.absorbed_by);
  assert.equal(pending.pending[0].observed_at, observed.observed_at);
  assert.deepEqual(inspectSourceUpdates({ root, publicationId: "EBER2025" }).pending, pending.pending);
  recordProcessedSources({ [source.file]: source.sha256 }, { root });
  const processed = inspectSourceUpdates({ root, publicationId: "EBER2025" });
  assert.equal(processed.summary.pending, 0);
  assert.equal(processed.summary.already_processed, 1);
});

test("單一文字條目來源可列直接頁面，PDF 與書籍不冒充精確定位", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-source-impact-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const cache = path.join(root, ".wiki-cache");
  fs.mkdirSync(cache, { recursive: true });
  const sources = [
    { file: "原始資料/外部來源鏡像/EBER2025/spell.md", absorbed_by: ["wiki/法術/甲.md"] },
    { file: "原始資料/外部來源鏡像/EBER2025/book-efa.json", absorbed_by: ["wiki/法術/甲.md"] },
    { file: "原始資料/外部來源鏡像/EBER2025/book.pdf", absorbed_by: ["wiki/法術/甲.md"] },
  ].map((entry) => ({ ...entry, sha256: "c".repeat(64), status: "changed" }));
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources }));
  const byFile = Object.fromEntries(inspectSourceUpdates({ root, publicationId: "EBER2025" }).pending.map((entry) => [entry.file, entry]));
  assert.equal(byFile[sources[0].file].impact, "direct_pages");
  assert.deepEqual(byFile[sources[0].file].affected_pages, ["wiki/法術/甲.md"]);
  assert.equal(byFile[sources[1].file].impact, "publication_review");
  assert.equal(byFile[sources[2].file].impact, "publication_review");
});

test("英文資料集只將變動實體唯一引用的 Wiki 頁列為直接影響", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-entity-impact-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = "原始資料/外部來源鏡像/TEST/datasets/spells.json";
  const absolute = path.join(root, file);
  const cache = path.join(root, ".wiki-cache");
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.mkdirSync(path.join(root, "wiki"), { recursive: true });
  fs.mkdirSync(cache, { recursive: true });
  const writeDataset = (alpha) => fs.writeFileSync(absolute, JSON.stringify({ spell: [
    { name: "Alpha", source: "TEST", page: 11, entries: [alpha] },
    { name: "Beta", source: "TEST", page: 12, entries: ["unchanged"] },
  ] }));
  const writePage = (name) => fs.writeFileSync(path.join(root, "wiki", `${name}.md`), `---\n${YAML.stringify({ entity_id: `entry:TEST:spell:${name.toLowerCase()}`, sources: [{ file, locator: `spell:${name}；p. ${name === "Alpha" ? 11 : 12}` }] })}---\n`);
  writeDataset("old");
  writePage("Alpha");
  writePage("Beta");
  recordObservedSources([{ file, sha256: "a".repeat(64), status: "unchanged" }], { root });
  writeDataset("new");
  const source = { file, sha256: "b".repeat(64), status: "changed", absorbed_by: ["wiki/Alpha.md", "wiki/Beta.md"] };
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [source] }));
  const beforeRefresh = inspectSourceUpdates({ root }).pending[0];
  assert.equal(beforeRefresh.impact, "direct_pages");
  assert.deepEqual(beforeRefresh.affected_pages, ["wiki/Alpha.md"]);
  assert.deepEqual(beforeRefresh.changed_entities.map(({ name, change, page }) => [name, change, page]), [["Alpha", "modified", 11]]);
  recordObservedSources([source], { root });
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [{ ...source, status: "unchanged" }] }));
  const afterRefresh = inspectSourceUpdates({ root }).pending[0];
  assert.equal(afterRefresh.impact, "direct_pages");
  assert.deepEqual(afterRefresh.affected_pages, ["wiki/Alpha.md"]);
  assert.deepEqual(recordObservedSources([source], { root }), []);
  writeDataset("old");
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [{ ...source, sha256: "a".repeat(64), status: "changed" }] }));
  assert.equal(inspectSourceUpdates({ root }).pending[0].todo, "none");
  writeDataset("new");
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [{ ...source, status: "unchanged" }] }));
  fs.writeFileSync(path.join(root, "wiki", "Alpha.md"), `---\n${YAML.stringify({ entity_id: "entry:OTHER:spell:alpha", sources: [{ file, locator: "spell:Alpha；p. 11" }] })}---\n`);
  const wrongIdentity = inspectSourceUpdates({ root }).pending[0];
  assert.equal(wrongIdentity.impact, "entity_review");
  assert.deepEqual(wrongIdentity.affected_pages, []);
  assert.equal(wrongIdentity.unresolved_entities[0].reason, "wiki_page_missing");
  writePage("Alpha");
  fs.writeFileSync(absolute, JSON.stringify({ spell: [
    { name: "Alpha", source: "TEST", page: 11, entries: ["new"] },
    { name: "Beta", source: "TEST", page: 12, entries: ["also changed"] },
  ] }));
  const next = { ...source, sha256: "c".repeat(64), status: "changed" };
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [next] }));
  const cumulative = inspectSourceUpdates({ root }).pending[0];
  assert.deepEqual(cumulative.changed_entities.map((item) => item.name), ["Alpha", "Beta"]);
  assert.deepEqual(cumulative.affected_pages, ["wiki/Alpha.md", "wiki/Beta.md"]);
  recordObservedSources([next], { root });
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [{ ...next, status: "unchanged" }] }));
  assert.deepEqual(inspectSourceUpdates({ root }).pending[0].affected_pages, cumulative.affected_pages);
  const processedSha = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
  recordProcessedSources({ [file]: processedSha }, { root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(cache, "source-update-state.json"), "utf8")).dataset_snapshots[file].sha256, processedSha);
  fs.writeFileSync(absolute, JSON.stringify({ spell: [
    { name: "Alpha", source: "TEST", page: 11, entries: ["new"] },
    { name: "Beta", source: "TEST", page: 12, entries: ["changed again"] },
  ] }));
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [{ ...next, sha256: "d".repeat(64), status: "changed" }] }));
  assert.deepEqual(inspectSourceUpdates({ root }).pending[0].changed_entities.map((item) => item.name), ["Beta"]);
});

test("資料集同名跨來源時不從名稱推測直接影響頁", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-entity-ambiguous-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = "原始資料/外部來源鏡像/TEST/datasets/feats.json";
  const absolute = path.join(root, file);
  const cache = path.join(root, ".wiki-cache");
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.mkdirSync(path.join(root, "wiki"), { recursive: true });
  fs.mkdirSync(cache, { recursive: true });
  const data = (text) => ({ feat: [
    { name: "Alert", source: "TEST", page: 11, entries: [text] },
    { name: "Alert", source: "OTHER", page: 20, entries: ["unchanged"] },
  ] });
  fs.writeFileSync(absolute, JSON.stringify(data("old")));
  fs.writeFileSync(path.join(root, "wiki", "Alert.md"), `---\n${YAML.stringify({ entity_id: "entry:TEST:feat:alert", sources: [{ file, locator: "feat: Alert；p. 11" }] })}---\n`);
  recordObservedSources([{ file, sha256: "a".repeat(64), status: "unchanged" }], { root });
  fs.writeFileSync(absolute, JSON.stringify(data("new")));
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [{ file, sha256: "b".repeat(64), status: "changed", absorbed_by: ["wiki/Alert.md"] }] }));
  const result = inspectSourceUpdates({ root }).pending[0];
  assert.equal(result.impact, "entity_review");
  assert.deepEqual(result.affected_pages, []);
  assert.equal(result.unresolved_entities[0].reason, "dataset_name_ambiguous");
  recordObservedSources([{ file, sha256: "b".repeat(64), status: "changed" }], { root });
  const crossSource = data("new");
  crossSource.feat[1].entries = ["changed elsewhere"];
  fs.writeFileSync(absolute, JSON.stringify(crossSource));
  fs.writeFileSync(path.join(cache, "source-manifest.json"), JSON.stringify({ sources: [{ file, sha256: "c".repeat(64), status: "changed", absorbed_by: ["wiki/Alert.md"] }] }));
  const outOfScope = inspectSourceUpdates({ root }).pending[0];
  assert.equal(outOfScope.impact, "entity_review");
  assert.ok(outOfScope.unresolved_entities.some((item) => item.reason === "dataset_source_out_of_scope"));
});

test("缺少來源指紋的舊候選計畫不得直接套用", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-candidates-"));
  assert.throws(() => applyCandidateBatch({ schema_version: 2, root, changes: [] }, { root, authorization: "wiki:apply" }), /缺少來源指紋/);
});

test("匯入報告只能寫入 reports", () => {
  const options = { apply: false, replace: false, only: null, report: "reports/test-ingest-report.json", results: [] };
  writeIngestReport({ options, publicationId: "PHB2024", category: "法術" });
  assert.ok(fs.existsSync(path.join(process.cwd(), "reports", "test-ingest-report.json")));
  fs.rmSync(path.join(process.cwd(), "reports", "test-ingest-report.json"));
  assert.throws(() => writeIngestReport({ options: { ...options, report: "tmp/report.json" }, publicationId: "PHB2024", category: "法術" }), /只能寫入 reports/);
  assert.throws(() => parseOptions(["--report", "tmp/report.json"]), /只能寫入 reports/);
});

test("儲存候選計畫會同時產生摘要與逐檔差異", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-review-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const plan = planCandidateBatch([{ target: "wiki/test.md", operation: "create", before: null, after: "new\\n" }], { root });
  writeCandidatePlan(plan, "reports/test-plan.json", { root });
  const review = writeCandidateReview(plan, "reports/test-plan.json", { root });
  assert.match(fs.readFileSync(review.summary, "utf8"), /可套用/);
  assert.match(fs.readFileSync(review.diff, "utf8"), /\+new/);
  const applied = { ...plan, mode: "apply", applied: ["wiki/test.md"], summary: { ...plan.summary, ready: 0, written: 1 } };
  writeCandidateReview(applied, "reports/test-plan.json", { root });
  const appliedSummary = fs.readFileSync(review.summary, "utf8");
  assert.match(appliedSummary, /計畫狀態：已套用/);
  assert.match(appliedSummary, /已套用：1/);
  assert.match(appliedSummary, /可套用：0/);
});

test("零檔案差異仍在摘要顯示來源待覆核數", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-source-review-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const plan = normalizeCandidatePlanResults({ summary: { ready: 0, manual_review: 0 }, changes: [],
    results: [{ status: "manual_review", reason: "英文實體自身頁碼未標示" }] });
  const review = writeCandidateReview(plan, "reports/source-review.json", { root });
  const summary = fs.readFileSync(review.summary, "utf8");
  assert.match(summary, /需人工覆核：0/);
  assert.match(summary, /來源待覆核：1/);
  assert.match(summary, /英文實體自身頁碼未標示/);
});

test("快速查找導覽以同一候選同時更新首頁與建立導覽頁，重跑穩定", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-navigation-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const index = path.join(root, "wiki", "索引.md");
  const rulesIndex = path.join(root, "wiki", "規則", "規則索引.md");
  fs.mkdirSync(path.dirname(index), { recursive: true });
  fs.mkdirSync(path.dirname(rulesIndex), { recursive: true });
  fs.writeFileSync(index, "---\ntitle: 索引\n---\n# 索引\n\n## 世界與戰役\n", "utf8");
  fs.writeFileSync(rulesIndex, "---\ntitle: 規則索引\n---\n# 規則索引\n\n## 使用原則\n", "utf8");
  const candidates = navigationCandidates({ root });
  assert.deepEqual(candidates.map((candidate) => candidate.target), ["wiki/索引.md", "wiki/規則/規則索引.md", "wiki/規則/快速查找.md"]);
  assert.match(candidates[0].after, /快速查找/);
  fs.mkdirSync(path.join(root, "wiki", "規則"), { recursive: true });
  fs.writeFileSync(index, candidates[0].after, "utf8");
  fs.writeFileSync(rulesIndex, candidates[1].after, "utf8");
  fs.writeFileSync(path.join(root, "wiki", "規則", "快速查找.md"), candidates[2].after, "utf8");
  assert.deepEqual(navigationCandidates({ root }), []);
});

test("近期更新導覽只採用已套用且非純日期的實質更新", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-updates-"));
  fs.mkdirSync(path.join(root, "wiki", "規則"), { recursive: true });
  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(path.join(root, "wiki", "規則", "規則索引.md"), "---\ntitle: 規則索引\n---\n# 規則索引\n", "utf8");
  fs.writeFileSync(path.join(root, "wiki", "規則", "快速查找.md"), "---\ntitle: 快速查找\n---\n# 快速查找\n\n## 🔗 相關連結\n\n- [[規則/規則索引|規則索引]]\n", "utf8");
  fs.writeFileSync(path.join(root, "reports", "meaningful-plan.json"), JSON.stringify({ mode: "apply", applied: ["wiki/法術/甲.md"], source_fingerprints: { "原始資料/x.json": "hash" }, changes: [{ target: "wiki/法術/甲.md", before: "---\nupdated: 2026-01-01\n---\n舊", after: "---\nupdated: 2026-09-22\n---\n新", source: "JSON Patch" }] }), "utf8");
  fs.writeFileSync(path.join(root, "reports", "format-only-plan.json"), JSON.stringify({ mode: "apply", applied: ["wiki/法術/乙.md"], source_fingerprints: {}, changes: [{ target: "wiki/法術/乙.md", before: "---\nupdated: 2026-01-01\n---\n相同", after: "---\nupdated: 2026-09-22\n---\n相同", source: "JSON Patch" }] }), "utf8");
  fs.writeFileSync(path.join(root, "reports", "date-with-source-plan.json"), JSON.stringify({ mode: "apply", applied: ["wiki/法術/丙.md"], source_fingerprints: { "原始資料/x.json": "hash" }, changes: [{ target: "wiki/法術/丙.md", before: "---\nupdated: 2026-01-01\n---\n**相同**", after: "---\nupdated: 2026-09-22\n---\n相同\n", source: "JSON Patch" }] }), "utf8");
  fs.writeFileSync(path.join(root, "reports", "crlf-date-plan.json"), JSON.stringify({ mode: "apply", applied: ["wiki/法術/戊.md"], source_fingerprints: { "原始資料/x.json": "hash" }, changes: [{ target: "wiki/法術/戊.md", before: "---\r\nupdated: 2026-01-01\r\n---\r\n相同\r\n", after: "---\r\nupdated: 2026-09-22\r\n---\r\n相同\r\n", source: "JSON Patch" }] }), "utf8");
  fs.writeFileSync(path.join(root, "reports", "source-only-plan.json"), JSON.stringify({ mode: "apply", applied: ["wiki/法術/丁.md"], source_fingerprints: { "原始資料/x.json": "hash" }, changes: [{ target: "wiki/法術/丁.md", before: "---\nsources:\n  - file: 原始資料/x.json\n    locator: p. 1\nupdated: 2026-01-01\n---\n相同", after: "---\nsources:\n  - file: 原始資料/x.json\n    locator: p. 2\nupdated: 2026-09-22\n---\n相同", source: "JSON Patch" }] }), "utf8");
  fs.writeFileSync(path.join(root, "reports", "navigation-plan.json"), JSON.stringify({ mode: "apply", applied: ["wiki/魔法物品/稀有度索引.md", "wiki/規則/快速查找.md", "wiki/魔法物品/魔法物品索引.md"], changes: [
    { target: "wiki/魔法物品/稀有度索引.md", before: null, after: "---\nupdated: 2026-09-22\n---\n稀有度導覽", source: "rarity-navigation" },
    { target: "wiki/規則/快速查找.md", before: "舊導覽", after: "新導覽", source: "search-navigation" },
    { target: "wiki/魔法物品/魔法物品索引.md", before: "舊索引", after: "新索引", source: "search-navigation:index" },
  ] }), "utf8");
  const changes = maintenanceNavigationCandidates({ root });
  assert.equal(changes.length, 3);
  assert.match(changes[0].after, /甲/);
  assert.match(changes[0].after, /丁/);
  assert.doesNotMatch(changes[0].after, /乙/);
  assert.doesNotMatch(changes[0].after, /丙/);
  assert.doesNotMatch(changes[0].after, /戊/);
  assert.doesNotMatch(changes[0].after, /\*\*\d{4}-\d{2}-\d{2}\*\*：\[\[(?:魔法物品\/稀有度索引|規則\/快速查找|魔法物品\/魔法物品索引)\]\]/);
  assert.match(changes[1].after, /近期更新/);
  assert.equal(changes[2].target, "wiki/規則/規則索引.md");
  assert.match(changes[2].after, /近期更新/);
});

test("稀有度導覽只使用物品明列欄位，跨版本分組且未知變體不猜測", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-wiki-rarity-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, value) => {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, value, "utf8");
  };
  const item = (version, rarity) => `---\ntitle: "甲"\ncategory: "魔法物品"\nversion: "${version}"\n---\n\n### 物品資料\n\n| 類別 (Category) | 戒指 |\n${rarity === null ? "" : `| 稀有度 (Rarity) | ${rarity} |\n`}`;
  write("wiki/魔法物品/戒指/甲.md", item("2024-Core", "珍稀"));
  write("wiki/魔法物品/2014/戒指/甲.md", item("2014-Legacy", "普通"));
  write("wiki/魔法物品/戒指/乙.md", item("2024-Core", "多種稀有度"));
  write("wiki/魔法物品/戒指/丙.md", item("2024-Core", null));
  write("wiki/魔法物品/魔法物品索引.md", "---\ntitle: \"魔法物品索引\"\ncategory: \"魔法物品\"\n---\n# 索引\n\n## 取得與主持\n");
  write("wiki/規則/快速查找.md", "# 快速查找\n\n- **魔法物品類型／稀有度**：舊說明\n- **怪物 CR／環境**：舊說明\n");
  write("wiki/怪物/棲息地分組.md", "# 棲息地\n");
  const inventory = magicItemRarityInventory({ root });
  assert.deepEqual(inventory.counts, { total: 4, single: 2, unresolved: 2 });
  const changes = searchNavigationCandidates({ root });
  assert.deepEqual(changes.map((change) => change.target), ["wiki/魔法物品/稀有度索引.md", "wiki/魔法物品/魔法物品索引.md", "wiki/規則/快速查找.md"]);
  assert.match(changes[0].after, /## 2024-Core（3）/);
  assert.match(changes[0].after, /## 2014-Legacy（1）/);
  assert.match(changes[0].after, /\[\[wiki\/魔法物品\/2014\/戒指\/甲\\\|甲\]\]/);
  assert.match(changes[0].after, /待整理（2）/);
  assert.match(changes[2].after, /棲息地分組/);
  for (const change of changes) write(change.target, change.after);
  assert.deepEqual(searchNavigationCandidates({ root }), []);
});

test("出版品預覽將舊解析器結果正規化為固定覆蓋狀態", () => {
  const plan = normalizeCandidatePlanResults({ results: [
    { target: "a", status: "preview" }, { target: "b", status: "filtered" }, { target: "c", status: "blocked" }, { target: "d", status: "manual_review" },
  ] });
  assert.equal(plan.outcome_summary.matched, 1);
  assert.equal(plan.outcome_summary.out_of_scope, 1);
  assert.equal(plan.outcome_summary.incomplete, 1);
  assert.equal(plan.outcome_summary.ambiguous, 1);
  assert.equal(plan.outcome_summary.missing, 0);
  assert.equal(plan.results[0].original_status, "preview");
});
