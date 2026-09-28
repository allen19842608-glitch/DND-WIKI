import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { analyzeClassReplacement, prepareExistingClassCitation } from "../scripts/core/class-replacement-review.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("職業整頁候選明列會遺失的 AL 欄位、識別碼及人工章節", () => {
  const before = `---
title: "製圖師 (Cartographer)"
entity_id: "entry:EBER2025:subclass:old"
concept_id: "concept:subclass:cartographer"
version: "2024-Core"
al_availability: "conditional"
al_campaigns:
  - "EB"
---

# 製圖師 (Cartographer)

## ⚙️ 規則條文 (Rule Text)

### 製圖師法術 (Cartographer Spells)

人工核對的法術表。

## 冒險者聯盟適用範圍

人工核對的 AL 條件。
`;
  const after = `---
title: "製圖師 (Cartographer)"
entity_id: "entry:EBER2025:subclass:new"
concept_id: "concept:subclass:cartographer"
version: "2024-Core"
---

# 製圖師 (Cartographer)

## ⚙️ 規則條文 (Rule Text)

### 子職特性表

解析器輸出的摘要。
`;
  const risk = analyzeClassReplacement(before, after);
  assert.deepEqual(risk.removed_fields, ["al_availability", "al_campaigns"]);
  assert.deepEqual(risk.changed_protected_fields, ["entity_id"]);
  assert.deepEqual(risk.removed_headings, ["製圖師法術 (Cartographer Spells)", "冒險者聯盟適用範圍"]);
  assert.match(risk.review.join("\n"), /整頁重建草稿僅供內容比對/);
  assert.match(risk.review.join("\n"), /al_campaigns/);
});

test("既有子職只補鏡像來源，完整保留正文、識別碼、日期與 AL，重跑無差異", () => {
  const before = `---
title: "製圖師 (Cartographer)"
entity_id: "entry:EBER2025:entry:old"
concept_id: "concept:entry:cartographer"
category: "職業"
entry_type: "子職"
parent_class: "奇械師"
version: "2024-Core"
al_availability: "conditional"
al_campaigns:
  - "EB"
sources:
  - file: "原始資料/艾伯倫：奇械鍛爐/第一章/製圖師.md"
    locator: "#製圖師"
    authority: "官方"
    translation: "community"
source_type: "official"
updated: "2026-09-07"
---

# 製圖師 (Cartographer)

## 冒險者聯盟適用範圍

人工確認的 AL 判定與法術正文。
`;
  const options = { source: "原始資料/艾伯倫：奇械鍛爐/第一章/製圖師.md",
    mirror: { file: "原始資料/英文鏡像/book-efa.json", locator: "Eberron, p. 20：Cartographer；5e.tools 鏡像快照",
      url: "https://example.invalid/book" }, english: "Cartographer", entryType: "子職", parentClass: "奇械師",
    publicationId: "EBER2025" };
  const prepared = prepareExistingClassCitation({ before, ...options });
  assert.equal(prepared.status, "ready");
  assert.equal(prepared.after.replace(/  - file: "原始資料\/英文鏡像\/book-efa.json"\n    locator: [^\n]+\n    url: [^\n]+\n    authority: "官方"\n    translation: "none"\n/u, ""), before);
  assert.match(prepared.after, /al_availability: "conditional"/);
  assert.match(prepared.after, /人工確認的 AL 判定與法術正文/);
  assert.equal(prepareExistingClassCitation({ before: prepared.after, ...options }).status, "unchanged");
  assert.equal(prepareExistingClassCitation({ before, ...options, english: "Other" }).reason, "existing_class_identity_mismatch");
  assert.equal(prepareExistingClassCitation({ before: prepared.after, ...options,
    mirror: { ...options.mirror, url: "https://example.invalid/other" } }).reason, "english_mirror_entity_citation_differs");
  const withImageCitation = before.replace("sources:\n", `sources:\n  - file: "原始資料/英文鏡像/book-efa.json"\n    locator: "圖片：book/EFA/cartographer.webp"\n    authority: "官方"\n    translation: "none"\n`);
  const imagePrepared = prepareExistingClassCitation({ before: withImageCitation, ...options });
  assert.equal(imagePrepared.status, "ready");
  assert.match(imagePrepared.after, /圖片：book\/EFA\/cartographer.webp/);
  assert.equal(prepareExistingClassCitation({ before: imagePrepared.after, ...options }).status, "unchanged");
});

test("無法解析既有 Frontmatter 時不宣稱已安全保留", () => {
  assert.throws(() => analyzeClassReplacement("# 舊頁\n", "---\ntitle: \"新頁\"\n---\n"), /缺少可解析/);
  assert.throws(() => analyzeClassReplacement("---\ntitle: [bad\n---\n", "---\ntitle: \"新頁\"\n---\n"));
});

test("2014 既有子職只補自身鏡像引註，保留人工正文、版本與 AL", () => {
  for (const [parent, chinese, english, page] of [
    ["武僧", "神龍宗", "Way of the Ascendant Dragon", 15],
    ["遊俠", "龍獸守衛", "Drakewarden", 15],
  ]) {
    const before = fs.readFileSync(path.join(ROOT, "wiki", "職業", "2014", parent, `${chinese}.md`), "utf8");
    const options = { source: `原始資料/費資本的巨龍寶庫/玩家選項/${parent}-${chinese}.md`,
      mirror: { file: "原始資料/外部來源鏡像/FTD2021/book-ftd.json",
        locator: `Fizban's Treasury of Dragons, p. ${page}：${english}；5e.tools 鏡像快照`,
        url: "https://example.invalid/book-ftd" }, english, entryType: "子職", parentClass: parent,
      publicationId: "FTD2021", version: "2014-Legacy" };
    const prepared = prepareExistingClassCitation({ before, ...options });
    assert.equal(prepared.status, "ready", `${chinese}: ${prepared.reason}`);
    assert.equal(prepared.after.slice(prepared.after.indexOf("---", 4) + 3), before.slice(before.indexOf("---", 4) + 3));
    for (const key of ["entity_id", "concept_id", "version", "al_availability", "updated"]) {
      assert.equal(before.match(new RegExp(`^${key}:.+$`, "m"))?.[0],
        prepared.after.match(new RegExp(`^${key}:.+$`, "m"))?.[0]);
    }
    assert.equal(prepareExistingClassCitation({ before: prepared.after, ...options }).status, "unchanged");
    assert.equal(prepareExistingClassCitation({ before, ...options, version: "2024-Core" }).status, "conflict");
  }
});

test("EBER2025 六個職業／子職的實際預覽只補各自鏡像頁碼，不重建正文", (context) => {
  const directory = fs.mkdtempSync(path.join(ROOT, "reports", "test-class-preserve-"));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const report = path.join(directory, "plan.json");
  const result = spawnSync(process.execPath, ["scripts/core/wiki-tools.mjs", "preview", "--category", "職業",
    "--publication", "EBER2025", "--replace", "--report", path.relative(ROOT, report)],
  { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(plan.summary.ready, 0);
  assert.equal(plan.summary.manual_review, 6);
  assert.deepEqual(plan.changes.map((item) => item.after.match(/p\. (\d+)：/u)?.[1]), ["7", "12", "14", "16", "18", "20"]);
  for (const change of plan.changes) {
    assert.equal(change.status, "manual_review");
    assert.equal(change.before.slice(change.before.indexOf("---", 4) + 3),
      change.after.slice(change.after.indexOf("---", 4) + 3));
    for (const key of ["entity_id", "concept_id", "version", "al_availability", "updated"]) {
      assert.equal(change.before.match(new RegExp(`^${key}:.+$`, "m"))?.[0],
        change.after.match(new RegExp(`^${key}:.+$`, "m"))?.[0]);
    }
  }
  assert.ok(plan.source_fingerprints["原始資料/外部來源鏡像/EBER2025/book-efa.json"]);
});
