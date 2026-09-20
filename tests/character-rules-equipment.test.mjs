import test from "node:test";
import assert from "node:assert/strict";
import { compileEquipmentCandidates } from "../scripts/publish/character-rules-equipment.mjs";

test("PHB2024 武器與護甲表拆成 51 張可獨立引用的裝備卡", () => {
  const plan = compileEquipmentCandidates();
  assert.equal(plan.entries.length, 51);
  const dagger = plan.entries.find(entry => entry.entityId === "entry:PHB2024:equipment:dagger");
  const plate = plan.entries.find(entry => entry.entityId === "entry:PHB2024:equipment:plate-armor");
  assert.equal(dagger.properties["價格"], "2 GP");
  assert.match(dagger.content, /武器精通.*迅擊/u);
  assert.equal(plate.properties["重量"], "65磅");
  assert.match(plate.content, /力量需求.*力量15/u);
  assert.ok(plan.entries.every(entry => entry.properties["AL 可用性"] === "可用" && entry.properties["收錄狀態"] === "可選"));
});
