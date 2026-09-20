import test from "node:test";
import assert from "node:assert/strict";
import { matchRemote, normalizeIdentifier, readDiscoveryRows } from "../scripts/publish/character-rules-inventory.mjs";

test("舊識別碼的 Markdown 跳脫不造成重複候選", () => {
  assert.equal(normalizeIdentifier("entry:PHB2024\\:feat\\:alert"), "entry:PHB2024:feat:alert");
  const result = matchRemote([{ url: "page", "Entity ID": "entry:PHB2024\\:feat\\:alert" }], [{ entityId: "entry:PHB2024:feat:alert", englishName: "Alert" }]);
  assert.match(result[0].disposition, /^識別碼相符/u);
});
test("同名不同版本保留全部候選，不自動合併", () => {
  const result = matchRemote([{ url: "page", "英文名稱": "Alert" }], [
    { entityId: "old", englishName: "Alert", version: "2014-Legacy" },
    { entityId: "new", englishName: "Alert", version: "2024-Core" },
  ]);
  assert.equal(result[0].candidates.length, 2);
  assert.equal(result[0].disposition, "待出版品與版本核對");
});
test("未完成分頁與錯誤結果不可視為完整盤點", () => {
  for (const result of [{ isError: true }, { content: [{ type: "text", text: JSON.stringify({ results: [], has_more: true }) }] }]) {
    assert.throws(() => readDiscoveryRows({ data: { rows: result } }, "rows"));
  }
  assert.deepEqual(readDiscoveryRows({ data: { rows: { content: [{ type: "text", text: '{"results":[],"has_more":false}' }] } } }, "rows"), []);
});
