import test from "node:test";
import assert from "node:assert/strict";
import YAML from "yaml";
import { extractSpellRules } from "../scripts/core/spell-content.mjs";
import { assessSpell, SPELL_DATASET } from "../scripts/audit/audit-spell-completeness.mjs";
import { assessLorePage } from "../scripts/audit/audit-lore-quality.mjs";
import { healthReportPaths, buildHealthReport } from "../scripts/audit/audit-wiki-health.mjs";
import { planGenericIndexes } from "../scripts/core/generic-indexes.mjs";
import { planSearchMetadata, approvedTerms } from "../scripts/sync/sync-search-metadata.mjs";
import { englishTitle } from "../scripts/core/wiki-records.mjs";
import { option } from "../scripts/core/ingest-publication-utils.mjs";

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
  const result = buildHealthReport({ pages, manifest: { sources: [] }, publications: [["PHB2024", {}]], publicationId: "PHB2024" });
  assert.equal(result.scope.type, "publication");
  assert.equal(result.pages.total, 1);
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
