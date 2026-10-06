import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inventory } from "../scripts/core/tool-lifecycle.mjs";

test("日常入口的直接匯入會揭露對歷史工具的執行依賴", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-tool-lifecycle-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const directory of ["config", "scripts/core", "scripts/audit"]) fs.mkdirSync(path.join(root, directory), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { "wiki:inspect": "node scripts/core/wiki-tools.mjs" } }));
  fs.writeFileSync(path.join(root, "config", "tool-lifecycle.json"), JSON.stringify({
    classes: { daily_core: { replacement: "wiki:inspect", verification: "test" }, historical: { replacement: "wiki:preview", verification: "test" } },
    rules: [{ prefix: "scripts/core/", class: "daily_core" }, { prefix: "scripts/audit/", class: "historical" }],
    details: { "scripts/audit/old.mjs": { purpose: "特定舊稽核", writes: "只讀", replacement: "wiki:inspect", verification: "舊稽核測試" } },
  }));
  fs.writeFileSync(path.join(root, "scripts/core/wiki-tools.mjs"), 'import "../audit/old.mjs";\n');
  fs.writeFileSync(path.join(root, "scripts/audit/old.mjs"), "export const old = true;\n");
  const report = inventory({ root });
  assert.deepEqual(report.active_historical_dependencies, [
    { caller: "scripts/core/wiki-tools.mjs", dependency: "scripts/audit/old.mjs" },
  ]);
  assert.deepEqual(report.tools.find((tool) => tool.script === "scripts/audit/old.mjs").called_by_scripts, ["scripts/core/wiki-tools.mjs"]);
  assert.deepEqual(report.generic_details, ["scripts/core/wiki-tools.mjs"]);
  assert.deepEqual(
    (({ purpose, writes, replacement, verification, detail_status }) => ({ purpose, writes, replacement, verification, detail_status }))(report.tools.find((tool) => tool.script === "scripts/audit/old.mjs")),
    { purpose: "特定舊稽核", writes: "只讀", replacement: "wiki:inspect", verification: "舊稽核測試", detail_status: "specific_recorded" },
  );
});

test("目前四個日常入口不再依賴歷史工具", () => {
  const report = inventory();
  assert.equal(report.unclassified.length, 0);
  assert.deepEqual(report.invalid_details, []);
  assert.deepEqual(report.generic_details, []);
  assert.deepEqual(report.active_historical_dependencies, []);
  assert.deepEqual(report.tools.filter((tool) => tool.detail_status !== "specific_recorded"), []);
  assert.equal(report.tools.find((tool) => tool.script === "scripts/migrate/restore-lore-source-text.mjs").detail_status, "specific_recorded");
  assert.ok(report.tools.find((tool) => tool.script === "scripts/core/wiki-tools.mjs")
    .depends_on_scripts.includes("scripts/core/character-options-lib.mjs"));
  const retiredMaintenance = report.tools.find((tool) => tool.script === "scripts/maintenance/fill-summon-spirit-cards.mjs");
  assert.equal(retiredMaintenance.classification, "historical");
  assert.equal(retiredMaintenance.detail_status, "specific_recorded");
  assert.ok(retiredMaintenance.write_footprint.includes("wiki_possible"));
});

test("生命週期明細拒絕不存在的工具與缺少的欄位", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-tool-details-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts", "core"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: {} }));
  fs.writeFileSync(path.join(root, "scripts", "core", "sample.mjs"), "export const sample = true;\n");
  fs.writeFileSync(path.join(root, "config", "tool-lifecycle.json"), JSON.stringify({
    rules: [{ prefix: "scripts/core/", class: "daily_core" }],
    details: {
      "scripts/core/sample.mjs": { purpose: "樣本", writes: "無", replacement: "保留", verification: "" },
      "scripts/core/missing.mjs": { purpose: "不存在", writes: "無", replacement: "保留", verification: "測試" },
    },
  }));
  assert.deepEqual(inventory({ root }).invalid_details, [
    { script: "scripts/core/sample.mjs", reason: "missing_verification" },
    { script: "scripts/core/missing.mjs", reason: "unknown_script" },
  ]);
});

test("歷史直寫程式的舊執行入口會在寫入前退役", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const cases = [
    ["scripts/ingest/ingest-dmg-general.mjs", ["--apply"]],
    ["scripts/ingest/ingest-dmg-general.mjs", ["--normalize-headings"]],
    ["scripts/ingest/ingest-eberron-rftlw-ch2.mjs", []],
    ["scripts/ingest/insert-eber-direct-candidate-images.mjs", ["--apply"]],
    ["scripts/ingest/ingest-tce-dm-tools.mjs", ["--apply"]],
    ["scripts/ingest/rebuild-lore.mjs", ["--apply"]],
    ["scripts/ingest/ingest-bpgg2023-monsters.mjs", ["--apply"]],
    ["scripts/ingest/ingest-monster-appendices.mjs", ["--apply"]],
    ["scripts/ingest/ingest-eberron-magic-items.mjs", ["--apply"]],
    ["scripts/ingest/ingest-eberron-character-options.mjs", ["--apply"]],
    ["scripts/ingest/ingest-eberron-rftlw-ch3.mjs", ["--apply"]],
    ["scripts/ingest/ingest-eberron-welcome.mjs", ["--apply"]],
    ["scripts/ingest/ingest-eberron-rftlw-ch4.mjs", ["--apply"]],
    ["scripts/ingest/ingest-legacy-backgrounds.mjs", ["--apply"]],
    ["scripts/ingest/ingest-xge-character-options.mjs", ["--apply"]],
    ["scripts/ingest/ingest-tce-subclasses.mjs", ["--apply"]],
    ["scripts/ingest/ingest-xge-racial-feats.mjs", ["--apply"]],
    ["scripts/ingest/ingest-xge-common-magic-items.mjs", ["--apply"]],
    ["scripts/ingest/ingest-xge-character-rules.mjs", ["--apply"]],
    ["scripts/ingest/ingest-xge-spells.mjs", ["--apply"]],
    ["scripts/ingest/ingest-xge-reference-sections.mjs", ["--apply"]],
    ["scripts/migrate/reclassify-lore.mjs", ["--apply"]],
    ["scripts/maintenance/fill-summon-spirit-cards.mjs", []],
  ];
  for (const [script, args] of cases) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 1, `${script} ${args.join(" ")} 必須拒絕舊寫入`);
    assert.match(result.stderr, /退役|不再直接/, `${script} 必須說明退役原因`);
    assert.match(result.stderr, /wiki:preview/, `${script} 必須提示候選入口`);
  }
});
