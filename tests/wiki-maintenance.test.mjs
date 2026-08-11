import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { extractWikiSourceFiles, splitMarkdownRow, wikiLinkTargets } from "../scripts/wiki-maintenance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Markdown 表格解析保留跳脫的 Wiki 連結管道符號", () => {
  assert.deepEqual(
    splitMarkdownRow("| [[長休\\|長休 (Long Rest)]] | 規則 |"),
    ["[[長休|長休 (Long Rest)]]", "規則"],
  );
});

test("索引連結解析保留跳脫管道符號前的目標", () => {
  assert.deepEqual(
    wikiLinkTargets("| [[警報術\\|警報術 (Alarm)]] | 防護 | R |"),
    ["警報術"],
  );
});

test("來源清單可解析含 BOM 的 Wiki Frontmatter", () => {
  const text = "\uFEFF---\nsources:\n  - file: \"原始資料/玩家手冊2024/角色職業/戰士/戰士.md\"\n---\n# 戰士";
  assert.deepEqual(extractWikiSourceFiles(text), ["原始資料/玩家手冊2024/角色職業/戰士/戰士.md"]);
});

test("規範查詢只輸出指定章節", () => {
  const result = spawnSync(process.execPath, ["scripts/wiki-maintenance.mjs", "policy", "翻譯對照規則"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /翻譯對照規則/);
  assert.doesNotMatch(result.stdout, /GitHub 版本紀錄與稽核規則/);
});

test("詞彙查詢可定位既有標準譯名", () => {
  const result = spawnSync(process.execPath, ["scripts/wiki-maintenance.mjs", "glossary", "Rage"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Rage\t狂暴/);
});
