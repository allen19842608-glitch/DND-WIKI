import assert from "node:assert/strict";
import test from "node:test";
import { prepareFeatPageSource } from "../scripts/core/feat-page-candidates.mjs";

const bookFile = "原始資料/外部來源鏡像/TEST/book.json";
const datasetFile = "原始資料/外部來源鏡像/TEST/feats.json";
const params = { english: "Sample Feat", page: 43, bookFile, datasetFile,
  datasetUrl: "https://example.test/feats.json", publicationTitle: "Test Book (2026)" };
const original = `---\ntitle: "樣本專長 (Sample Feat)"\nentity_id: "entry:TEST:feat:sample-feat"\nsources:\n  - file: "${bookFile}"\n    locator: "Test Book (2026), p. 39：Feats > Sample Feat；5e.tools 鏡像快照"\n    authority: "官方"\n---\n# 樣本專長\n\n## 人工段落\n維持原文與 AL 狀態。\n`;

test("專長頁碼候選移除父章節假頁碼，加入實體資料集頁碼並保留正文", () => {
  const result = prepareFeatPageSource({ ...params, text: original });
  assert.equal(result.status, "ready");
  assert.match(result.after, /book\.json"\n    locator: "Test Book \(2026\)：Feats/);
  assert.match(result.after, /feats\.json"\n    locator: "Test Book \(2026\), p\. 43：Sample Feat/);
  assert.equal(result.after.split("---\n").at(-1), original.split("---\n").at(-1));
  assert.equal(prepareFeatPageSource({ ...params, text: result.after }).status, "unchanged");
});

test("既有資料集頁碼若與來源不符則拒絕候選", () => {
  const incorrect = original.replace("sources:\n", `sources:\n  - file: "${datasetFile}"\n    locator: "Test Book (2026), p. 99：Sample Feat；5e.tools 鏡像資料集"\n`);
  assert.deepEqual(prepareFeatPageSource({ ...params, text: incorrect }), {
    status: "conflict", reason: "dataset_source_locator_mismatch",
  });
});
