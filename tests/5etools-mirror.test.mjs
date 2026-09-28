import assert from "node:assert/strict";
import test from "node:test";
import { chapterDocuments, entriesToMarkdown, isChapterSection, manifestEquivalent, mirrorPublication, normalizeDatasets } from "../scripts/ingest/mirror-5etools.mjs";
import { mirrorImages } from "../scripts/ingest/mirror-5etools-images.mjs";

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

test("獨立來源取得工具在取得資料前拒絕越界報告", async () => {
  await assert.rejects(mirrorPublication(["--publication", "EBER2025", "--report", "原始資料/blocked.json"]), /reports\//);
  await assert.rejects(mirrorImages(["--publication", "EBER2025", "--report", "原始資料/blocked.json"]), /reports\//);
  await assert.rejects(mirrorPublication(["--publication", "EBER2025", "--report"]), /必須指定值/);
  await assert.rejects(mirrorImages(["--publication", "EBER2025", "--report"]), /必須指定值/);
});

test("鏡像差異預覽忽略 manifest 的抓取時間戳", () => {
  const previous = "retrieved_at: 2026-09-04T00:00:00.000Z\nsnapshot:\n  file: book-test.json\n  sha256: abc\n";
  const current = "retrieved_at: 2026-09-05T00:00:00.000Z\nsnapshot:\n  file: book-test.json\n  sha256: abc\n";
  assert.equal(manifestEquivalent(previous, current), true);
  assert.equal(manifestEquivalent(previous, current.replace("sha256: abc", "sha256: def")), false);
});
