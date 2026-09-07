import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";

const WIKI = path.resolve("wiki");
const CATEGORIES = new Map([["職業", 117], ["種族", 46], ["背景", 27], ["專長", 41], ["法術", 484]]);
const AL_SOURCE = "原始資料/冒險者聯盟/D&D Adventurers League Players Guide v2026.4.pdf";

function pages(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? pages(file) : entry.name.endsWith(".md") ? [file] : [];
  });
}

function frontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const yaml = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1];
  return yaml ? YAML.parse(yaml) : null;
}

test("715 個 Legacy 玩家選項都有獨立的 AL 狀態與現行官方來源", () => {
  const rows = pages(WIKI).map((file) => ({ file, data: frontmatter(file) })).filter(({ data }) => data
    && data.ruleset === "2014"
    && data.status === "legacy"
    && CATEGORIES.has(data.category)
    && ["compatible", "conditional", "replaced", "review"].includes(data.compatibility_2024));
  assert.equal(rows.length, 715);
  for (const [category, expected] of CATEGORIES) assert.equal(rows.filter(({ data }) => data.category === category).length, expected);
  for (const { data } of rows) {
    assert.ok(["available", "conditional", "unavailable", "review"].includes(data.al_availability));
    assert.equal(data.al_note, undefined);
    assert.ok(data.sources.some((source) => source.file === AL_SOURCE && source.authority === "官方" && source.locator));
    if (["available", "conditional"].includes(data.al_availability)) assert.ok(Array.isArray(data.al_campaigns) && data.al_campaigns.length > 0);
    else assert.equal(data.al_campaigns, undefined);
  }
});

test("半獸人與定製血統維持分離的 2024／AL 判定", () => {
  const halfOrc = frontmatter(path.join(WIKI, "種族", "2014", "半獸人.md"));
  const customLineage = frontmatter(path.join(WIKI, "種族", "2014", "定製血統.md"));
  assert.equal(halfOrc.compatibility_2024, "compatible");
  assert.equal(halfOrc.al_availability, "unavailable");
  assert.equal(customLineage.compatibility_2024, "conditional");
  assert.equal(customLineage.al_availability, "conditional");
  assert.deepEqual(customLineage.al_campaigns, ["FR", "DL", "EB", "RV", "CR"]);
});

test("現行擴充玩家選項依附錄 A 的戰役欄位與註記處理", () => {
  const expected = new Map([
    ["阿斯代倫的飢渴之書2025", ["FR", "RV"]],
    ["艾伯倫奇械鍛爐2025", ["FR", "DL", "EB", "RV"]],
    ["被遺忘的國度費倫英雄2025", ["FR", "DL", "EB", "RV"]],
    ["鴉閣魔域魔障深藏2026", ["FR", "DL", "EB", "RV"]],
  ]);
  const rows = pages(WIKI).map((file) => ({ file, data: frontmatter(file) })).filter(({ data }) => data
    && data.ruleset === "2024"
    && data.content_scope === "expansion"
    && data.status === "current"
    && ["職業", "種族", "背景", "專長", "法術"].includes(data.category)
    && expected.has(data.tags?.[0])
    && !String(data.title).includes("索引")
    && !(data.tags ?? []).some((tag) => String(tag).endsWith("_索引")));
  assert.equal(rows.length, 181);
  for (const { data } of rows) {
    assert.ok(["available", "conditional"].includes(data.al_availability));
    assert.ok(data.sources.some((source) => source.file === AL_SOURCE && source.authority === "官方" && source.locator));
    assert.equal(data.al_note, undefined);
  }
  const artificer = frontmatter(path.join(WIKI, "專長", "龍紋專長", "創造龍紋.md"));
  assert.deepEqual(artificer.al_campaigns, ["EB"]);
  const changeling = frontmatter(path.join(WIKI, "種族", "幻身靈.md"));
  assert.deepEqual(changeling.al_campaigns, ["FR", "DL", "EB", "RV"]);
  const mistWanderer = frontmatter(path.join(WIKI, "背景", "迷霧漫遊者.md"));
  const spiritMedium = frontmatter(path.join(WIKI, "背景", "降靈師.md"));
  assert.equal(mistWanderer.al_availability, "available");
  assert.deepEqual(mistWanderer.al_campaigns, ["RV"]);
  assert.equal(spiritMedium.al_availability, "available");
  assert.deepEqual(spiritMedium.al_campaigns, ["RV"]);
});
