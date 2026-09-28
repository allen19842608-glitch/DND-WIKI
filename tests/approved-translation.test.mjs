import assert from "node:assert/strict";
import test from "node:test";
import { approvedTranslationMap, assessApprovedTranslation } from "../scripts/core/approved-translation.mjs";

test("未核定專名或與核定譯名不符時不會變成可套用候選", () => {
  const terms = approvedTranslationMap("| Shifter | 化獸者 | EFA | 標題 | approved |\n| Khoravar | 科拉瓦 | EFA | 標題 | pending |");
  assert.deepEqual(assessApprovedTranslation(terms, "Shifter", "化獸者"), { status: "matched" });
  assert.deepEqual(assessApprovedTranslation(terms, "Khoravar", "科拉瓦"), { status: "ambiguous", reason: "translation_unapproved" });
  assert.deepEqual(assessApprovedTranslation(terms, "Shifter", "變形者"), {
    status: "conflict", reason: "translation_differs_from_glossary", approved: "化獸者",
  });
});

test("同一英文實體的多個核定中文名會阻擋自動選用", () => {
  const terms = approvedTranslationMap("| Example | 甲 | EFA | A | approved |\n| Example | 乙 | EFA | B | approved |");
  assert.deepEqual(assessApprovedTranslation(terms, "Example", "甲"), { status: "conflict", reason: "translation_approved_names_conflict" });
});
