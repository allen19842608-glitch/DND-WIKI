import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { nonEntityReason, parseBilingualTitle } from "../scripts/ingest/ingest-lore.mjs";
import { sourceFragment } from "../scripts/migrate/restore-lore-source-text.mjs";
import {
  deriveSourceType,
  extractFrontmatter,
  lintWiki,
  parseWikiLink,
  validateMagicItemStructure,
} from "../scripts/core/wiki-lint.mjs";

test("故事匯入會以 New Item 轉檔的首個雙語題名作為實體名稱", () => {
  assert.deepEqual(
    parseBilingualTitle("# New Item\n\n**定製龍類 Customizing Dragons**\n\n內容。\n", "定製龍類"),
    { chinese: "定製龍類", english: "Customizing Dragons" },
  );
});

test("故事匯入排除章節題名、前言與泛稱人物頁", () => {
  assert.match(nonEntityReason({ chinese: "第四章：構建艾伯倫冒險", locator: "# 第四章：構建艾伯倫冒險" }), /章節題名/);
  assert.match(nonEntityReason({ chinese: "前言：通往冒險的無盡之門", locator: "# 前言：通往冒險的無盡之門" }), /前置說明/);
  assert.match(nonEntityReason({ chinese: "龍紋角色", locator: "# 龍紋角色" }), /泛稱/);
  assert.match(nonEntityReason({ chinese: "龍紋", english: "NPC", locator: "# 龍紋 NPC" }), /泛稱/);
  assert.equal(nonEntityReason({ chinese: "班恩", locator: "# 班恩 Bane" }), null);
});

test("原始正文重建可依父段落與人物定位切出單一人物資料", () => {
  const source = [
    "# 卡扎多爾·扎爾的家族",
    "",
    "卡扎多爾的子嗣 Cazador's Spawn",
    "",
    "**安特溫·都弗雷 Antwun Dufay，** 曾是人類，是卡扎多爾信任的管家。",
    "**阿斯代倫·安庫因 Astarion Ancunín，** 曾是精靈治安官。",
  ].join("\n");
  assert.deepEqual(
    sourceFragment(source, "卡扎多爾的子嗣 Cazador's Spawn：安特溫·都弗雷"),
    {
      heading: "卡扎多爾的子嗣 Cazador's Spawn",
      body: "**安特溫·都弗雷 Antwun Dufay，** 曾是人類，是卡扎多爾信任的管家。",
    },
  );
});

test("原始正文重建可依行號定位切出人物資料", () => {
  const source = [
    "# 卡扎多爾·扎爾的家族",
    "",
    "**安特溫·都弗雷 Antwun Dufay，** 曾是人類，是卡扎多爾信任的管家。",
    "**阿斯代倫·安庫因 Astarion Ancunín，** 曾是精靈治安官。",
  ].join("\n");
  assert.equal(
    sourceFragment(source, "L3：安特溫·都弗雷 Antwun Dufay").body,
    "**安特溫·都弗雷 Antwun Dufay，** 曾是人類，是卡扎多爾信任的管家。",
  );
});

test("extractFrontmatter separates YAML and body", () => {
  const result = extractFrontmatter('---\ntitle: "測試"\n---\n# 測試\n');
  assert.equal(result.yaml, 'title: "測試"');
  assert.equal(result.body, "# 測試\n");
});

test("deriveSourceType follows authority formula", () => {
  assert.equal(deriveSourceType([{ authority: "官方" }]), "official");
  assert.equal(deriveSourceType([{ authority: "官方" }, { authority: "社群" }]), "mixed");
  assert.equal(deriveSourceType([{ authority: "UA" }]), "ua");
});

test("parseWikiLink handles escaped table aliases", () => {
  assert.deepEqual(parseWikiLink("長休\\|長休 (Long Rest)"), {
    target: "長休",
    alias: "長休 (Long Rest)",
  });
});

test("parseWikiLink removes heading fragments", () => {
  assert.deepEqual(parseWikiLink("職業/奇械師/煉金師#特性|煉金師"), {
    target: "職業/奇械師/煉金師",
    alias: "煉金師",
  });
});

test("lint 可在指定範圍驗證記憶體候選內容", () => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({
      files: ["wiki/索引.md"],
      overrides: new Map([["wiki/索引.md", "---\ntitle: [\n---\n# 索引\n"]]),
    });
    assert.ok(result.scopeSize > 0);
    assert.ok(result.diagnostics.some((item) => item.file === "wiki/索引.md" && item.code === "YAML_PARSE"));
  } finally {
    console.log = originalLog;
  }
});

test("2014 Legacy 角色選項必須使用統一的 2024 相容性標示", () => {
  const file = "wiki/種族/2014/半精靈.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original.replace('compatibility_2024: "compatible"', 'compatibility_2024: "未分類"');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "LEGACY_2024_COMPATIBILITY"));
  } finally {
    console.log = originalLog;
  }
});

test("非組織遊戲的戰役設定必須標示連續性", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original.replace('setting_continuity: "continuous"\n', "");
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "SETTING_CONTINUITY_REQUIRED"));
  } finally {
    console.log = originalLog;
  }
});

test("setting_continuity 僅限非組織遊戲的戰役設定", () => {
  const ordinaryFile = "wiki/索引.md";
  const alFile = "wiki/冒險者聯盟/冒險調整/艾伯倫戰役調整.md";
  const ordinary = fs.readFileSync(ordinaryFile, "utf8").replace('category: "規則機制"\n', 'category: "規則機制"\nsetting_continuity: "continuous"\n');
  const al = fs.readFileSync(alFile, "utf8").replace('category: "戰役設定"\n', 'category: "戰役設定"\nsetting_continuity: "continuous"\n');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({
      files: [ordinaryFile, alFile],
      overrides: new Map([[ordinaryFile, ordinary], [alFile, al]]),
    });
    assert.ok(result.diagnostics.some((item) => item.file === ordinaryFile && item.code === "SETTING_CONTINUITY_CATEGORY"));
    assert.ok(result.diagnostics.some((item) => item.file === alFile && item.code === "SETTING_CONTINUITY_ORGANIZED_PLAY"));
  } finally {
    console.log = originalLog;
  }
});

test("故事資料頁必須標示世界、類型與穩定概念 ID", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const missing = original
    .replace('setting: "被遺忘的國度"\n', "")
    .replace('lore_type: "地理"\n', "");
  const wrongConcept = original.replace(
    "concept:setting:forgotten-realms:geography:",
    "concept:setting:eberron:geography:",
  );
  const originalLog = console.log;
  console.log = () => {};
  try {
    const missingResult = lintWiki({ files: [file], overrides: new Map([[file, missing]]) });
    assert.ok(missingResult.diagnostics.some((item) => item.file === file && item.code === "SETTING_REQUIRED"));
    assert.ok(missingResult.diagnostics.some((item) => item.file === file && item.code === "LORE_TYPE_REQUIRED"));
    const conceptResult = lintWiki({ files: [file], overrides: new Map([[file, wrongConcept]]) });
    assert.ok(conceptResult.diagnostics.some((item) => item.file === file && item.code === "LORE_CONCEPT_ID"));
  } finally {
    console.log = originalLog;
  }
});

test("世界與類型必須符合戰役設定路徑", () => {
  const file = "wiki/戰役設定/被遺忘的國度/地理/北地.md";
  const original = fs.readFileSync(file, "utf8");
  const candidate = original
    .replace('setting: "被遺忘的國度"', 'setting: "艾伯倫"')
    .replace('lore_type: "地理"', 'lore_type: "世界觀"');
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [file], overrides: new Map([[file, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "SETTING_PATH"));
    assert.ok(result.diagnostics.some((item) => item.file === file && item.code === "LORE_TYPE_PATH"));
  } finally {
    console.log = originalLog;
  }
});

test("人物怪物資料卡必須有怪物頁反向連結", () => {
  const person = "wiki/戰役設定/被遺忘的國度/人物/阿斯代倫・安庫因.md";
  const monster = "wiki/怪物/亡靈/初生吸血鬼.md";
  const original = fs.readFileSync(monster, "utf8");
  const candidate = original.replace("戰役設定/被遺忘的國度/人物/阿斯代倫・安庫因", "戰役設定/被遺忘的國度/人物/阿斯代倫・安庫因-缺失");
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = lintWiki({ files: [person, monster], overrides: new Map([[monster, candidate]]) });
    assert.ok(result.diagnostics.some((item) => item.file === person && item.code === "PERSON_STAT_BACKLINK"));
  } finally {
    console.log = originalLog;
  }
});

test("魔法物品結構檢查標示泛稱、占位觸發與重複限制", () => {
  const diagnostics = [];
  validateMagicItemStructure({
    rel: "wiki/魔法物品/奇物/測試.md",
    bodyStartLine: 20,
    data: { category: "魔法物品" },
    body: [
      "### 物品資料",
      "",
      "| 項目 | 內容 |",
      "| :--- | :--- |",
      "| 類別 (Category) | 奇物 |",
      "| 稀有度 (Rarity) | 普通 |",
      "| 同調 (Attunement) | 不需要 |",
      "| 消耗品 (Consumable) | 否 |",
      "",
      "### 物品效果",
      "",
      "- **特殊能力**：",
      "  - **啟用／觸發**：著裝期間；依效果所列時機。",
      "  - **效果**：通常以 10 或 20 枚為一組售賣。",
      "  - **限制與恢復**：通常以 10 或 20 枚為一組售賣。",
      "",
      "- **空效果**：",
      "  - **啟用／觸發**：持握期間。",
      "",
      "## 💡 實戰應用與裁量 (DM Ruling)",
    ].join("\n"),
  }, diagnostics);
  assert.deepEqual(
    new Set(diagnostics.map((item) => item.code)),
    new Set([
      "MAGIC_ITEM_EFFECT_NAME",
      "MAGIC_ITEM_TRIGGER_PLACEHOLDER",
      "MAGIC_ITEM_LIMIT_DUPLICATE",
      "MAGIC_ITEM_EFFECT_METADATA",
      "MAGIC_ITEM_EFFECT_EMPTY",
    ]),
  );
});

test("魔法物品結構檢查標示重複或拆分的效果名稱", () => {
  const diagnostics = [];
  validateMagicItemStructure({
    rel: "wiki/魔法物品/奇物/測試.md",
    bodyStartLine: 20,
    data: { category: "魔法物品" },
    body: [
      "### 物品效果",
      "",
      "- **防護靈光**：",
      "  - **效果**：提供防護。",
      "",
      "- **防護靈光持續時間**：",
      "  - **效果**：持續 10 分鐘。",
      "",
      "- **防護靈光**：",
      "  - **效果**：提供不同防護。",
    ].join("\n"),
  }, diagnostics);
  assert.deepEqual(
    diagnostics
      .filter((item) => item.code === "MAGIC_ITEM_EFFECT_NAME_DUPLICATE")
      .map((item) => item.message),
    [
      "效果名稱「防護靈光持續時間」疑似將「防護靈光」的持續、限制或恢復規則拆成另一項；應合併為同一效果。",
      "效果名稱「防護靈光」與前項「防護靈光」重複；應合併或改用具體不同的規則名稱。",
    ],
  );
});

test("魔法物品結構檢查要求主要區塊與物品資料欄位", () => {
  const diagnostics = [];
  validateMagicItemStructure({
    rel: "wiki/魔法物品/奇物/測試.md",
    bodyStartLine: 20,
    data: { category: "魔法物品" },
    body: [
      "### 物品資料",
      "",
      "| 項目 | 內容 |",
      "| :--- | :--- |",
      "| 類別 (Category) | 奇物 |",
    ].join("\n"),
  }, diagnostics);
  assert.deepEqual(
    new Set(diagnostics.map((item) => item.code)),
    new Set(["MAGIC_ITEM_TEMPLATE_FIELD", "MAGIC_ITEM_TEMPLATE_SECTION"]),
  );
});

