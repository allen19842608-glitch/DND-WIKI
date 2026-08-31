import assert from "node:assert/strict";
import test from "node:test";
import {
  NotionClient,
  assertSanitizedOutput,
  buildLocalEntries,
  buildPublicSources,
  buildSyncPlan,
  convertMarkdownFileLinks,
  convertMarkdownTables,
  convertWikiLinks,
  extractPageLocator,
  formatPublicationTitle,
  loadPublicationCatalog,
  notionProperties,
  resolveNotionLinks,
} from "../scripts/publish/notion-wiki.mjs";

test("頁碼定位只接受 p. 或 pp. 開頭的正式頁碼", () => {
  assert.equal(extractPageLocator("p. 3"), "p. 3");
  assert.equal(extractPageLocator("pp. 2–3, 6（術語翻譯依據）"), "pp. 2-3, 6");
  assert.equal(extractPageLocator("Chapter 2"), null);
  assert.equal(extractPageLocator("L1–20：規則"), null);
});

test("同一出版品的原文與翻譯資產合併成書名與頁數", () => {
  const catalog = loadPublicationCatalog();
  const sources = buildPublicSources([
    { file: "原始資料/冒險者聯盟/D&D Adventurers League Players Guide v2026.4.pdf", locator: "pp. 1-3" },
    { file: "原始資料/冒險者聯盟/DDAL_Players_Guide_v2026.4_泰坦圓桌中譯版.pdf", locator: "pp. 1-3（術語翻譯依據）" },
  ], catalog);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].display, "《冒險者聯盟玩家指南 v2026.4》");
  assert.doesNotMatch(sources[0].display, /原始資料|\.pdf/iu);
});

test("未核定中文書名時保留英文書名，不輸出 null", () => {
  assert.equal(
    formatPublicationTitle({
      id: "ALSR_2026_1",
      title_zh: null,
      title_en: "D&D Adventurers League Service Rewards",
      canonical_rules_source: "D&D Adventurers League Service Rewards v2026.1",
    }),
    "《D&D Adventurers League Service Rewards v2026.1》",
  );
});

test("頁碼只供官方正式書籍顯示；未分類安全省略", () => {
  const catalog = { assets: [
    { path: "book", publication: { id: "book", title_zh: "正式書", canonical_rules_source: "正式書 v1.0", authority: "官方", citation_kind: "book" } },
    { path: "guide", publication: { id: "guide", title_zh: "指南", canonical_rules_source: "指南 v1.0", authority: "官方", citation_kind: "guide" } },
    { path: "community", publication: { id: "community", title_zh: "社群書", canonical_rules_source: "社群書 v1.0", authority: "社群", citation_kind: "book" } },
    { path: "unknown", publication: { id: "unknown", title_zh: "待分類", canonical_rules_source: "待分類 v1.0", authority: "官方" } },
  ] };
  const display = (file) => buildPublicSources([{ file, locator: "p. 2" }], catalog)[0];
  assert.equal(display("book").display, "《正式書 v1.0》，p. 2");
  assert.equal(display("guide").display, "《指南 v1.0》");
  assert.equal(display("community").display, "《社群書 v1.0》");
  assert.match(display("unknown").warnings[0], /未設定 citation_kind/u);
});

test("Obsidian 與 Markdown 檔案連結轉為穩定同步占位符", () => {
  const page = { syncKey: "entry:test" };
  const index = new Map([["冒險者聯盟/玩家規則/角色建立", page], ["角色建立", page]]);
  const wiki = convertWikiLinks("[[角色建立|建立角色]]", index);
  assert.equal(wiki.content, "[[NOTION_SYNC:entry:test¦建立角色]]");
  const markdown = convertMarkdownFileLinks(
    "[建立角色](角色建立.md)",
    index,
    "wiki/冒險者聯盟/玩家規則/玩家規則索引.md",
  );
  assert.equal(markdown.content, "[[NOTION_SYNC:entry:test¦建立角色]]");
  assert.equal(resolveNotionLinks(markdown.content, new Map([["entry:test", { url: "https://notion.so/page" }]])), '<mention-page url="https://notion.so/page">建立角色</mention-page>');
});

test("Markdown 表格轉成 Notion table 並保留儲存格內連結", () => {
  const result = convertMarkdownTables([
    "| 名稱 | 來源 |",
    "| :--- | :--- |",
    "| [[NOTION_SYNC:entry:test¦測試]] | p. 1 |",
  ].join("\n"));
  assert.match(result, /<table fit-page-width="true" header-row="true">/u);
  assert.match(result, /<td>\[\[NOTION_SYNC:entry:test¦測試\]\]<\/td>/u);
  assert.doesNotMatch(result, /^\|/mu);
});

test("核定的 AL 32 頁可產生不含原始檔資訊的 Notion 內容", () => {
  const local = buildLocalEntries({ scope: "冒險者聯盟", exclude: ["服務獎勵/"] });
  assert.equal(local.entries.length, 32);
  assert.deepEqual(local.rejected, []);
  for (const entry of local.entries) {
    assert.doesNotThrow(() => assertSanitizedOutput(entry.canonicalContent, entry.relativePath));
    assert.match(entry.sourceDisplay, /^《/u);
    assert.doesNotMatch(entry.sourceDisplay, /原始資料|\.(?:pdf|md)\b/iu);
  }
});

test("差異計畫可區分新增、更新、不變與垃圾桶", () => {
  const base = {
    scope: "冒險者聯盟",
    partial: false,
    only: [],
    exclude: [],
    rejected: [],
    entries: [
      { syncKey: "a", title: "A", relativePath: "a.md", contentHash: "ha" },
      { syncKey: "b", title: "B", relativePath: "b.md", contentHash: "hb" },
      { syncKey: "c", title: "C", relativePath: "c.md", contentHash: "hc" },
    ],
  };
  const property = (text) => ({ rich_text: [{ plain_text: text }] });
  const title = (text) => ({ title: [{ plain_text: text }] });
  const remote = [
    { id: "pb", url: "https://notion.so/pb", properties: { "名稱": title("B"), "同步鍵": property("b"), "內容雜湊": property("old"), "受同步管理": { checkbox: true } } },
    { id: "pc", url: "https://notion.so/pc", properties: { "名稱": title("C"), "同步鍵": property("c"), "內容雜湊": property("hc"), "受同步管理": { checkbox: true } } },
    { id: "pd", url: "https://notion.so/pd", properties: { "名稱": title("D"), "同步鍵": property("d"), "內容雜湊": property("hd"), "受同步管理": { checkbox: true } } },
  ];
  const plan = buildSyncPlan(base, remote);
  assert.deepEqual(plan.create.map((item) => item.syncKey), ["a"]);
  assert.deepEqual(plan.update.map((item) => item.syncKey), ["b"]);
  assert.deepEqual(plan.unchanged.map((item) => item.syncKey), ["c"]);
  assert.deepEqual(plan.trash.map((item) => item.syncKey), ["d"]);
  assert.equal(plan.valid, true);
});

test("Notion 屬性只保存公開來源與隱藏同步資料", () => {
  const properties = notionProperties({
    title: "測試",
    division: "總覽",
    version: "AL-Organized-Play",
    applicableDocumentDisplay: "測試指南 v1.0",
    sourceDisplay: "《測試指南 v1.0》，p. 1",
    updated: "2026-08-31",
    syncKey: "entry:test",
    contentHash: "abc",
  }, "2026-08-31T00:00:00.000Z");
  const serialized = JSON.stringify(properties);
  assert.doesNotMatch(serialized, /原始資料|\.(?:pdf|md)\b/iu);
  assert.equal(properties["受同步管理"].checkbox, true);
  assert.ok(properties["適用 AL 文件"]);
  assert.ok(properties["同步版本分類"]);
  assert.equal(properties["規則版本"], undefined);
});

test("垃圾桶 API 使用 2026-03-11 的 in_trash", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ id: "page", in_trash: true }),
    };
  };
  const client = new NotionClient({ token: "secret", dataSourceId: "collection://data", fetchImpl });
  await client.trashPage("page");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers["Notion-Version"], "2026-03-11");
  assert.deepEqual(JSON.parse(calls[0].options.body), { in_trash: true });
});
