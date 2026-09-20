import test from "node:test";
import assert from "node:assert/strict";
import { extractRules, stableHash, resolveLinks, basicAL, reconcileALWithRules, pageMapFromDiscovery, itemProperties, publishReadiness, executionDisposition } from "../scripts/publish/character-rules.mjs";

test("背景描述內的能力與裝備完整保留，但設定段落不發布", () => {
  const result = extractRules('# 背景\n## 背景描述\n你曾住在寺院。\n\n- **裝備 A**：長袍、8 GP\n- **裝備 B**：50 GP\n## 規則條文\n### 選擇\n選擇一項。\n## 相關連結\n- [[背景索引]]', "背景");
  assert.match(result, /裝備 A.*長袍/u); assert.match(result, /裝備 B.*50 GP/u);
  assert.doesNotMatch(result, /你曾住|背景索引/u);
});
test("移除設定及工程區塊不會連帶刪除下個規則章節", () => {
  const result = extractRules('## 種族介紹\n設定\n### 歷史\n歷史\n## 規則條文\n速度 30 呎\n### 來源衝突與適用範圍\n一般套話\n### 使用限制\n長休恢復\n## 物品描述\n外觀', "種族");
  assert.match(result, /速度 30 呎/u); assert.match(result, /長休恢復/u);
  assert.doesNotMatch(result, /設定|歷史|一般套話|外觀/u);
});
test("種族的通用世界觀段落不會進入角色規則卡", () => {
  const result = extractRules("## 種族特質\n\n### 諸國度的精靈 (Elves of Many Realms)\n\n這是設定敘述。\n\n### 黑暗視覺\n\n- 規則效果。", "種族");
  assert.equal(result.includes("設定敘述"), false);
  assert.equal(result.includes("規則效果"), true);
});
test("callout 內的 AL 前提不能被格式清理丟失", () => {
  const result = extractRules('> [!INFO] AL\n> 僅 2024 精靈符合此前提。\n\n## 規則條文\n效果', "專長");
  assert.match(result, /僅 2024 精靈符合此前提/u); assert.doesNotMatch(result, /\[!INFO\]/u);
});
test("詞彙表維護註記不進入 Notion 規則正文", () => {
  const result = extractRules('《附件/翻譯詞彙表.md》採用既定譯名。\n\n## 規則條文\n黑暗視覺 60 呎。', "種族");
  assert.match(result, /黑暗視覺/u); assert.doesNotMatch(result, /翻譯詞彙表\.md/u);
});
test("未配對與歧義連結保留明確待處理資料，不產生同步占位符", () => {
  const entries = [{ entityId: "old", relativePath: "wiki/2014/警覺.md" }, { entityId: "new", relativePath: "wiki/2024/警覺.md" }];
  const result = resolveLinks("[[警覺|警覺]]、[[2024/警覺|新版警覺]]", entries, new Map([["new", "https://example.com/new"]]));
  assert.equal(result.unresolved.length, 1); assert.match(result.content, /https:\/\/example.com\/new/u);
});
test("雜湊不受物件欄位排序影響；AL 條件與格式變更會改變雜湊", () => {
  assert.equal(stableHash({ a: 1, b: 2 }), stableHash({ b: 2, a: 1 }));
  assert.notEqual(stableHash({ format: 1, al: "可用" }), stableHash({ format: 1, al: "條件式可用" }));
});
test("未知 AL 與同調不能以空白預設為已確認", () => {
  assert.equal(basicAL({}).status, "待覆核");
  assert.equal(itemProperties("")["同調需求"], "待確認");
  assert.equal(itemProperties("| 同調 (Attunement) | 不需要 |\n")["同調需求"], "不需要");
});
test("正文已明示 AL 禁用時，不採用過時的可用欄位", () => {
  const result = reconcileALWithRules({ status: "可用", campaigns: ["FR"], note: "" }, "AL 禁用半獸人，故此專長在 AL 中不可選。");
  assert.equal(result.status, "不可用"); assert.deepEqual(result.campaigns, []);
});
test("已套用頁面映射覆蓋初始盤點，第二次預覽不再提出新增", () => {
  const snapshot = { data: { "species-rows": { isError: false, content: [{ type: "text", text: '{"results":[],"has_more":false}' }] }, "background-rows": { isError: false, content: [{ type: "text", text: '{"results":[],"has_more":false}' }] }, "feats-rows": { isError: false, content: [{ type: "text", text: '{"results":[],"has_more":false}' }] }, "magic-rows": { isError: false, content: [{ type: "text", text: '{"results":[],"has_more":false}' }] } } };
  const result = pageMapFromDiscovery(snapshot, new Map([["entry:PHB2024:feat:alert", "https://app.notion.com/p/example"]]));
  assert.equal(result.get("entry:PHB2024:feat:alert"), "https://app.notion.com/p/example");
});
test("舊分類資料庫的初始盤點不建立角色規則庫映射", () => {
  const snapshot = { data: { "species-rows": { isError: false, content: [{ type: "text", text: '{"results":[{"Entity ID":"entry:PHB2024\\\\:species\\\\:elf","url":"https://app.notion.com/p/legacy"}],"has_more":false}' }] } } };
  const result = pageMapFromDiscovery(snapshot, new Map());
  assert.equal(result.has("entry:PHB2024:species:elf"), false);
});
test("僅具完整證據的 2024 玩家選項進入可選檢視", () => {
  const ready = publishReadiness({ entry: { entityId: "entry:PHB2024:feat:alert", category: "專長" }, citation: { status: "verified" }, rules: "進行先攻檢定時，將熟練加值加入結果，且可以和自願盟友交換先攻。", al: { status: "可用" }, unresolvedLinks: [], sanitized: true });
  assert.equal(ready.ready, true);
  const magic = publishReadiness({ entry: { entityId: "entry:DMG2024:magicitem:wand", category: "魔法物品" }, citation: { status: "verified" }, rules: "此物品的啟動、限制、持續時間與恢復方式都已完整列明。", al: { status: "待覆核" }, unresolvedLinks: [], sanitized: true });
  assert.equal(magic.ready, false); assert.match(magic.pending.join("\n"), /AL/u);
  assert.equal(magic.publishable, true);
  const unresolvedText = publishReadiness({ entry: { entityId: "entry:PHB2024:background:soldier", category: "背景" }, citation: { status: "verified" }, rules: "起源專長：兇蠻打手（條目待建立或待確認）。", al: { status: "可用" }, unresolvedLinks: [], sanitized: true });
  assert.equal(unresolvedText.ready, false); assert.match(unresolvedText.pending.join("\n"), /未完成/u);
  const externalSpellLink = publishReadiness({ entry: { entityId: "entry:PHB2024:species:elf", category: "種族" }, citation: { status: "verified" }, rules: "黑暗視覺與血脈法術的等級、使用次數及恢復方式均已列明。", al: { status: "可用" }, unresolvedLinks: [{ target: "法術/黑暗術" }], sanitized: true });
  assert.equal(externalSpellLink.ready, true);
  const vettedLegacy = publishReadiness({ entry: { entityId: "entry:XGE2017:feat:squat-nimbleness", category: "專長", alAvailability: "available" }, citation: { status: "verified" }, rules: "符合先決條件時，你的速度增加並獲得相應效果。", al: { status: "可用" }, unresolvedLinks: [], sanitized: true });
  assert.equal(vettedLegacy.ready, true);
});
test("已回讀且來源未變的頁面在第二次預覽標為已有且不變", () => {
  const entry = { entityId: "entry:DMG2024:entry:18c9551af2", sourceHash: "source-a", disposition: "待解決" };
  const pageUrl = "https://app.notion.com/p/abc";
  const ledger = new Map([[entry.entityId, { sourceHash: "source-a", pageUrl, remoteVerified: true }]]);
  assert.equal(executionDisposition({ entry, pageUrl, ledger }), "已有且不變");
  assert.equal(executionDisposition({ entry: { ...entry, sourceHash: "source-b" }, pageUrl, ledger }), "待回讀或更新");
  assert.equal(executionDisposition({ entry, pageUrl: null, ledger }), "待新增或待配對");
});
