import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSourceText } from "../scripts/migrate/normalize-al-citations.mjs";

test("AL 引用正規化移除指南與政策頁碼並保留多來源", () => {
  assert.equal(normalizeSourceText("玩家指南 v2026.4，p. 1").value, "《冒險者聯盟玩家指南 v2026.4》");
  assert.equal(normalizeSourceText("地下城主指南 v2026.2，p. 1；調整指南 v2026.2，p. 2").value, "《冒險者聯盟地下城主指南 v2026.2》；《冒險者聯盟調整指南 v2026.2》");
  assert.equal(normalizeSourceText("三份指南封面與 p. 2").value, "《冒險者聯盟玩家指南 v2026.4》；《冒險者聯盟地下城主指南 v2026.2》；《冒險者聯盟調整指南 v2026.2》");
  assert.equal(normalizeSourceText("Service Rewards v2026.1，pp. 7-10").value, "《冒險者聯盟服務獎勵 v2026.1》");
});
