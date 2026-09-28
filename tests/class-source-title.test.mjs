import assert from "node:assert/strict";
import test from "node:test";
import { resolveClassSourceTitle } from "../scripts/core/class-source-title.mjs";

test("中文單語職業標題只用相同來源身分或核定譯名對照", () => {
  assert.deepEqual(resolveClassSourceTitle(["# 野蠻人"], { approvedEnglish: ["Barbarian"] }), {
    chinese: "野蠻人", english: "Barbarian",
  });
  assert.deepEqual(resolveClassSourceTitle(["# 魔契師"], { existingEnglish: "Warlock" }), {
    chinese: "魔契師", english: "Warlock",
  });
});

test("未核定、歧義或既有身分衝突的中文標題不得猜測", () => {
  assert.throws(() => resolveClassSourceTitle(["# 新子職"]), /無法以既有來源引用或核定詞彙/);
  assert.throws(() => resolveClassSourceTitle(["# 同名"], { approvedEnglish: ["A", "B"] }), /多個英文實體/);
  assert.throws(() => resolveClassSourceTitle(["# 野蠻人"], { approvedEnglish: ["Barbarian"], existingEnglish: "Bard" }), /英文實體衝突/);
  assert.throws(() => resolveClassSourceTitle(["# 同名"], { approvedEnglish: ["A", "B"], existingEnglish: "C" }), /英文實體衝突/);
});
