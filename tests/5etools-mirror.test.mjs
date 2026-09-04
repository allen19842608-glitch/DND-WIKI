import assert from "node:assert/strict";
import test from "node:test";
import { chapterDocuments, entriesToMarkdown, isChapterSection, normalizeDatasets } from "../scripts/ingest/mirror-5etools.mjs";

test("5e.tools 章節鏡像保留原始標題與內容結構", () => {
  const book = { data: [{ name: "The Dalelands", entries: ["原文段落", { name: "History", entries: ["事件"] }] }] };
  const [chapter] = chapterDocuments(book, [{ number: 2, title: "The Dalelands", page: 45 }]);
  assert.equal(chapter.found, true);
  assert.match(chapter.markdown, /# The Dalelands/);
  assert.match(chapter.markdown, /## History/);
  assert.match(entriesToMarkdown(["text"]), /text/);
});

test("Credits 是出版資訊，不得推斷為書籍章節", () => {
  const entries = [
    { type: "section", name: "Chapter 1: Test" },
    { type: "section", name: "Credits" },
  ];
  assert.deepEqual(
    entries.filter(isChapterSection).map((entry) => entry.name),
    ["Chapter 1: Test"],
  );
});

test("資料集鏡像要求可追溯 URL 與原始資料內輸出路徑", () => {
  assert.deepEqual(normalizeDatasets([{ file: "原始資料/外部來源鏡像/PHB2024/datasets/feats.json", url: "https://example.test/feats.json" }]), [{ file: "原始資料/外部來源鏡像/PHB2024/datasets/feats.json", url: "https://example.test/feats.json" }]);
  assert.throws(() => normalizeDatasets([{ file: "wiki/feats.json", url: "https://example.test/feats.json" }]), /路徑不合法/);
  assert.throws(() => normalizeDatasets([{}]), /包含 file/);
});
