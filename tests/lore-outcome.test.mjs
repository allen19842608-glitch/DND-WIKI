import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { loreCandidateOutcome, loreStatLinks, prepareExistingLoreCitation } from "../scripts/ingest/ingest-lore.mjs";
import { ROOT, loadIngestProfile, loadPublication, planCandidateBatch } from "../scripts/core/ingest-publication-utils.mjs";
import { mirrorEntityPage } from "../scripts/core/mirror-entity-page.mjs";
import { lintWiki } from "../scripts/core/wiki-lint.mjs";

const candidate = (status, reason = "") => ({
  source: "原始資料/新書/世界.md", destinationRel: "wiki/戰役設定/多元宇宙/世界觀/世界.md",
  status, reason,
});

test("戰役設定已引用來源只代表定位相符，不宣稱正文已核實", () => {
  const outcome = loreCandidateOutcome(candidate("合併", "既有頁已引用相同來源定位。"), false);
  assert.equal(outcome.status, "matched");
  assert.match(outcome.reason, /正文尚未逐項核實/u);
  assert.equal(loreCandidateOutcome(candidate("合併", "同一世界已有同名實體頁。"), false).status, "incomplete");
  assert.equal(loreCandidateOutcome(candidate("合併", "同一世界已有同名實體頁。"), true).status, "preview");
});

test("同英文名但中文名歧異需覆核，不歸入已匹配或可套用候選", () => {
  const outcome = loreCandidateOutcome(candidate("別名", "英文實體名稱相同，但中文名稱不同。"), false);
  assert.equal(outcome.status, "ambiguous");
  assert.match(outcome.reason, /中文名稱不同/u);
  assert.equal(loreCandidateOutcome(candidate("來源衝突", "不同分類。"), false).status, "conflict");
  assert.equal(loreCandidateOutcome(candidate("排除", "非設定條目。"), false).status, "out_of_scope");
});

test("既有戰役設定只補精確來源，不改人工正文、識別碼、版本、AL 或日期", () => {
  const before = fs.readFileSync(path.join(ROOT, "wiki/戰役設定/多元宇宙/世界觀/第一世界.md"), "utf8");
  const parse = (text) => YAML.parse(text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)[1]);
  const existing = { text: before, data: parse(before) };
  const item = { ...candidate("合併"), setting: "多元宇宙", source: "原始資料/新書/第一世界.md",
    locator: "# 第一世界" };
  const publication = { authority: "官方", source_assets: [{ path: "原始資料/新書", translation: "community" }] };
  const mirror = { ok: true, file: "原始資料/外部來源鏡像/NEW2026/book-new.json",
    locator: "New Book (2026), p. 42：The First World；5e.tools 鏡像快照", url: "https://example.test/book-new.json" };
  const prepared = prepareExistingLoreCitation({ existing, candidate: item, publication, mirror });
  assert.equal(prepared.status, "ready");
  const after = parse(prepared.after);
  for (const key of ["entity_id", "concept_id", "ruleset", "content_scope", "status", "version",
    "al_availability", "al_campaigns", "al_notes", "updated", "rules_sources", "errata"]) {
    assert.deepEqual(after[key], existing.data[key], key);
  }
  assert.equal(prepared.after.slice(prepared.after.indexOf("---", 4) + 3), before.slice(before.indexOf("---", 4) + 3));
  assert.equal(after.sources.length, existing.data.sources.length + 2);
  assert.equal(prepareExistingLoreCitation({ existing: { text: prepared.after, data: after }, candidate: item,
    publication, mirror }).status, "unchanged");
  assert.equal(prepareExistingLoreCitation({ existing, candidate: { ...item, setting: "艾伯倫" },
    publication, mirror }).reason, "existing_lore_identity_mismatch");
});

test("英文明列自身頁碼的既有設定來源增量可通過真實虛擬 lint，預覽不寫頁面", () => {
  const target = "wiki/戰役設定/多元宇宙/世界觀/第一世界.md";
  const before = fs.readFileSync(path.join(ROOT, target), "utf8");
  const data = YAML.parse(before.match(/^---\r?\n([\s\S]*?)\r?\n---/u)[1]);
  const source = "原始資料/費資本的巨龍寶庫/第一世界.md";
  const locator = "**諸界諸龍 Dragons of Many Worlds**";
  const mirror = mirrorEntityPage({ root: ROOT, profile: loadIngestProfile("FTD2021"),
    publicationId: "FTD2021", english: "The First World", kind: "lore" });
  assert.equal(mirror.page, 6);
  const prepared = prepareExistingLoreCitation({ existing: { text: before, data },
    candidate: { source, locator, setting: "多元宇宙" }, publication: loadPublication("FTD2021"),
    mirror: { ...mirror, ok: true } });
  assert.equal(prepared.status, "ready");
  const plan = planCandidateBatch([{ target, operation: "update", before, after: prepared.after, source, locator,
    status: "ready" }], { root: ROOT, lint: lintWiki,
    sourceFiles: [source, mirror.file, mirror.manifest_file],
    dependencyFiles: ["config/ingest-profiles/FTD2021.yml"] });
  assert.equal(plan.summary.ready, 1);
  assert.equal(plan.lint.errors, 0);
  assert.ok(plan.source_fingerprints[mirror.file]);
  assert.equal(fs.readFileSync(path.join(ROOT, target), "utf8"), before);
});

test("戰役人物同名跨版本怪物資料卡不擇一連結", () => {
  const candidate = { type: "人物", body: "**Beholder** 使用資料卡。" };
  const monsters = new Map([["beholder", new Map([
    ["wiki/怪物/2014/眼魔.md", { rel: "wiki/怪物/2014/眼魔.md" }],
    ["wiki/怪物/2024/眼魔.md", { rel: "wiki/怪物/2024/眼魔.md" }],
  ])]]);
  const [ambiguous] = loreStatLinks(candidate, monsters);
  assert.equal(ambiguous.status, "ambiguous-stat-link");
  assert.deepEqual(ambiguous.candidates, ["wiki/怪物/2014/眼魔.md", "wiki/怪物/2024/眼魔.md"]);
  assert.equal(ambiguous.target, undefined);
  monsters.get("beholder").delete("wiki/怪物/2014/眼魔.md");
  assert.equal(loreStatLinks(candidate, monsters)[0].target, "怪物/2024/眼魔");
  assert.equal(loreStatLinks(candidate, new Map())[0].status, "missing-stat-link");
});
