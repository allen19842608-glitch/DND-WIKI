import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("種族解析器拒絕以舊 --apply 入口直接寫入 Wiki", () => {
  const result = spawnSync(process.execPath, ["scripts/ingest/ingest-species.mjs", "--apply", "--report", "reports/species-direct-apply-rejected.json"], {
    cwd: process.cwd(), encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /不直接寫入 Wiki/);
});
