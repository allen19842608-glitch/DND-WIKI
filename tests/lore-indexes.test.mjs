import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { linkTargetsOutsideAuto, renderFeaturedSections, renderGlobalNavigation, renderTopicEntries, renderTopicNavigation, syncLoreIndexes, topicIndexConceptId } from "../scripts/core/lore-indexes.mjs";
import { materializeLoreIndexEffects } from "../scripts/ingest/ingest-lore.mjs";

const config = YAML.parse(`
worlds:
  fr: { label: "FR", root: "wiki/戰役設定/FR", index: "wiki/戰役設定/FR/FR索引.md" }
  dl: { label: "DL", root: "wiki/戰役設定/DL", index: "wiki/戰役設定/DL/DL索引.md" }
  shared: { label: "共用", root: "wiki/戰役設定/共用", index: "wiki/戰役設定/共用/共用索引.md" }
lore_types:
  worldview: { label: "世界觀", directory: "世界觀" }
  history: { label: "歷史", directory: "歷史" }
navigation:
  al_primary_worlds: ["fr", "dl"]
  shared_worlds: ["shared"]
  topic_order: ["worldview", "history"]
  shared_links:
    - label: "戰役創作"
      target: "戰役設定/戰役創作/戰役創作索引"
  featured_sections:
    fr:
      - label: "費倫"
        target: "戰役設定/FR/世界觀/被遺忘的國度"
      - label: "Spelljammer"
        target: "戰役設定/共用/世界觀/世界觀索引"
`);

const pages = [
  { rel: "wiki/戰役設定/FR/世界觀/手選.md", data: { title: "手選", lore_type: "世界觀" } },
  { rel: "wiki/戰役設定/FR/世界觀/其他.md", data: { title: "其他", lore_type: "世界觀" } },
];

test("手動精選不會消失，其他有效條目仍由自動區塊收錄", () => {
  const manual = linkTargetsOutsideAuto("- [[戰役設定/FR/世界觀/手選|手選]]\n<!-- AUTO-LORE-INDEX:START -->\n舊內容\n<!-- AUTO-LORE-INDEX:END -->");
  const output = renderTopicEntries(pages, manual);
  assert.doesNotMatch(output, /手選/);
  assert.match(output, /其他/);
});

test("通用索引器舊自動區塊不會被誤當成手動精選", () => {
  const manual = linkTargetsOutsideAuto("<!-- AUTO-INDEX:START -->\n- [[戰役設定/FR/世界觀/其他|其他]]\n<!-- AUTO-INDEX:END -->");
  assert.equal(manual.size, 0);
});

test("主題計數以內容頁為準，空主題不產生斷鏈", () => {
  const output = renderTopicNavigation(config, config.worlds.fr, pages);
  assert.match(output, /世界觀]]（2）/);
  assert.match(output, /歷史（待補）/);
  assert.doesNotMatch(output, /歷史索引/);
});

test("全域入口固定 AL 四類順序，沒有內容的世界顯示待補", () => {
  const byWorld = new Map([["FR", pages], ["DL", []], ["共用", pages.slice(0, 1)]]);
  const output = renderGlobalNavigation(config, byWorld);
  assert.ok(output.indexOf("FR") < output.indexOf("DL"));
  assert.match(output, /DL（待補）/);
  assert.match(output, /共用與其他參考/);
  assert.match(output, /戰役創作/);
});

test("主題索引識別碼包含設定檔的主題鍵", () => {
  assert.equal(topicIndexConceptId("dragonlance", "worldview"), "concept:setting:dragonlance:index:worldview");
  assert.equal(topicIndexConceptId("dragonlance", "faith"), "concept:setting:dragonlance:index:faith");
});

test("分區入口由設定檔產生，即使與主題入口同目標仍保留分區標籤", () => {
  const output = renderFeaturedSections(config, "fr", new Set(["戰役設定/FR/世界觀/世界觀索引"]));
  assert.match(output, /費倫/);
  assert.match(output, /Spelljammer/);
  assert.match(output, /分區入口/);
});

test("局部同步仍更新總首頁，且重跑不產生額外差異", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lore-indexes-"));
  const write = (relative, content) => {
    const file = path.join(root, ...relative.split("/"));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
  };
  const index = (title, setting) => `---\ntitle: "${title}"\nentity_id: "entry:HOME:setting:index"\nruleset: "2024"\ncontent_scope: "core"\nstatus: "current"\ncategory: "戰役設定"\nsetting: "${setting}"\nlore_type: "索引"\nsetting_continuity: "continuous"\nversion: "2024-Core"\ntags:\n  - "首頁來源"\n  - "戰役設定_${setting}"\nsources:\n  - file: "原始資料/home.md"\n    locator: "p. 1"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Home Source"\nerrata: []\nupdated: "2026-09-08"\n---\n\n# ${title}\n`;
  const entry = (title, setting) => `---\ntitle: "${title}"\nentity_id: "entry:CHILD:setting:entry"\nruleset: "2014"\ncontent_scope: "expansion"\nstatus: "legacy"\ncategory: "戰役設定"\nsetting: "${setting}"\nlore_type: "世界觀"\nsetting_continuity: "continuous"\nversion: "2014-Legacy"\ntags:\n  - "子頁來源"\nsources:\n  - file: "原始資料/child.md"\n    locator: "p. 2"\n    authority: "官方"\n    translation: "none"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Child Source"\nerrata: []\nupdated: "2026-09-08"\n---\n\n# ${title}\n\n## 🔗 相關連結\n`;

  try {
    write("config/lore.yml", `
worlds:
  dragonlance: { label: "龍槍", root: "wiki/戰役設定/龍槍", index: "wiki/戰役設定/龍槍/龍槍索引.md" }
  eberron: { label: "艾伯倫", root: "wiki/戰役設定/艾伯倫", index: "wiki/戰役設定/艾伯倫/艾伯倫索引.md" }
lore_types:
  worldview: { label: "世界觀", directory: "世界觀" }
navigation:
  al_primary_worlds: ["dragonlance", "eberron"]
  shared_worlds: []
  topic_order: ["worldview"]
`);
    write("wiki/戰役設定/戰役設定索引.md", "# 戰役設定索引\n");
    write("wiki/戰役設定/龍槍/龍槍索引.md", `${index("龍槍索引", "龍槍")}\n## 人工導覽\n\n- [[戰役設定/龍槍/世界觀/世界觀索引|世界觀]]（99）\n`);
    write("wiki/戰役設定/艾伯倫/艾伯倫索引.md", index("艾伯倫索引", "艾伯倫"));
    write("wiki/戰役設定/龍槍/世界觀/龍槍概覽.md", entry("龍槍概覽", "龍槍"));
    write("wiki/戰役設定/艾伯倫/世界觀/艾伯倫概覽.md", entry("艾伯倫概覽", "艾伯倫"));

    const candidateTarget = "wiki/戰役設定/龍槍/世界觀/候選概覽.md";
    const virtual = materializeLoreIndexEffects(new Map([[candidateTarget, {
      before: null, after: entry("候選概覽", "龍槍"), source: "原始資料/candidate.md", locator: "p. 3", status: "ready", review: [],
    }]]), { root, setting: "龍槍" });
    assert.ok(virtual.has(candidateTarget));
    assert.ok(virtual.has("wiki/戰役設定/龍槍/世界觀/世界觀索引.md"));
    assert.ok(virtual.has("wiki/戰役設定/戰役設定索引.md"));
    assert.match(virtual.get(candidateTarget).after, /世界觀索引/);

    const preview = syncLoreIndexes({ root, apply: false, setting: "龍槍" });
    assert.ok(preview.candidate_changes.some((change) => change.file === "wiki/戰役設定/龍槍/世界觀/世界觀索引.md" && change.before === null && change.after.includes("龍槍概覽")));
    assert.equal(fs.existsSync(path.join(root, "wiki", "戰役設定", "龍槍", "世界觀", "世界觀索引.md")), false);
    const scoped = syncLoreIndexes({ root, apply: false, changedFiles: new Set(["wiki/戰役設定/龍槍/世界觀/龍槍概覽.md"]) });
    assert.deepEqual(scoped.checked_worlds, ["dragonlance"]);
    assert.equal(scoped.checked_global, true);
    assert.ok(scoped.changes.some((file) => file.includes("龍槍")));
    assert.ok(scoped.changes.includes("wiki/戰役設定/戰役設定索引.md"));
    assert.ok(!scoped.changes.some((file) => file.includes("艾伯倫")));
    const unrelated = syncLoreIndexes({ root, apply: false, changedFiles: new Set(["wiki/法術/測試.md"]) });
    assert.deepEqual(unrelated.checked_worlds, []);
    assert.equal(unrelated.checked_global, false);
    assert.deepEqual(unrelated.changes, []);
    const globalOnly = syncLoreIndexes({ root, apply: false, changedFiles: new Set(["wiki/戰役設定/戰役設定索引.md"]) });
    assert.deepEqual(globalOnly.checked_worlds, []);
    assert.equal(globalOnly.checked_global, true);
    assert.deepEqual(globalOnly.changes, ["wiki/戰役設定/戰役設定索引.md"]);
    const unknownWorld = syncLoreIndexes({ root, apply: false, changedFiles: new Set(["wiki/戰役設定/新世界/概覽.md"]) });
    assert.deepEqual(unknownWorld.checked_worlds, ["dragonlance", "eberron"]);
    const configChange = syncLoreIndexes({ root, apply: false, changedFiles: new Set(["config/lore.yml"]) });
    assert.deepEqual(configChange.checked_worlds, ["dragonlance", "eberron"]);
    assert.ok(configChange.changes.some((file) => file.includes("艾伯倫")));
    const first = syncLoreIndexes({ root, apply: true, setting: "龍槍" });
    assert.ok(first.changes.includes("wiki/戰役設定/戰役設定索引.md"));
    assert.ok(first.changes.includes("wiki/戰役設定/龍槍/世界觀/世界觀索引.md"));
    const global = fs.readFileSync(path.join(root, "wiki", "戰役設定", "戰役設定索引.md"), "utf8");
    assert.match(global, /龍槍\]\]（1）/);
    assert.match(global, /艾伯倫\]\]（1）/);
    const home = fs.readFileSync(path.join(root, "wiki", "戰役設定", "龍槍", "龍槍索引.md"), "utf8");
    assert.match(home, /世界觀\]\]（1）/);
    assert.equal((home.match(/世界觀\]\]（1）/g) ?? []).length, 1);
    const topic = fs.readFileSync(path.join(root, "wiki", "戰役設定", "龍槍", "世界觀", "世界觀索引.md"), "utf8");
    assert.match(topic, /ruleset: "2024"/);
    assert.match(topic, /- "首頁來源"/);
    assert.match(topic, /file: "原始資料\/home.md"/);
    assert.doesNotMatch(topic, /子頁來源|原始資料\/child.md/);
    assert.deepEqual(syncLoreIndexes({ root, apply: true, setting: "龍槍" }).changes, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
