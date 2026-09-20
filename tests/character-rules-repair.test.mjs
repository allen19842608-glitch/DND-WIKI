import test from "node:test";
import assert from "node:assert/strict";
import { SOURCE_IDENTITIES, SOURCE_GROUPS, expandSourceGroup, effectiveVariant, findSourceEntity, resolveRuleCitation } from "../scripts/publish/character-rules-sources.mjs";
import { publishReadiness } from "../scripts/publish/character-rules.mjs";
import { specializeVariantRules } from "../scripts/publish/character-rules-variants.mjs";

function catalog(publicationId, kind, records, variants = []) {
  return { publications: [{id:publicationId,title_zh:"測試來源",year:2024}], sourceCodeByPublication:new Map([[publicationId,"TEST"]]), datasets:{[kind]:records,variants} };
}
test("七個身分對照限定出版品，中文標題不影響配對",()=>{
  for(const [entityId,name] of Object.entries(SOURCE_IDENTITIES).slice(0,7)) {
    const publicationId=entityId.split(":")[1];const category=entityId.includes(":species:")?"種族":"背景";
    const c=catalog(publicationId,category==="種族"?"species":"backgrounds",[{name,source:"TEST",page:27}]);
    assert.equal(resolveRuleCitation({entityId,publicationId,category,englishName:""},c).status,"verified");
    assert.notEqual(findSourceEntity({entityId,publicationId:"OTHER",category,englishName:""},c).status,"matched");
  }
});
test("變體自身欄位優先，缺少頁碼才繼承，衝突與缺頁碼仍阻擋",()=>{
  const identity={publicationId:"P",category:"魔法物品",englishName:"Blade"};
  const raw={name:"Blade",page:12,inherits:{source:"TEST",page:10,rarity:"rare",reqAttune:true,entries:["effect"]}};
  const c=catalog("P","items",[],[raw]);
  assert.equal(resolveRuleCitation(identity,c).page,12);
  assert.equal(effectiveVariant(raw).rarity,"rare");
  assert.equal(effectiveVariant(raw).reqAttune,true);
  delete raw.page; assert.equal(resolveRuleCitation(identity,c).page,10);
  delete raw.inherits.page; assert.equal(resolveRuleCitation(identity,c).status,"pending");
  raw.page=12;raw.source="TEST";raw.inherits.source="OTHER";
  assert.match(resolveRuleCitation(identity,c).reason,/衝突/u);
});
test("一般項目與變體同名時不擅自選第一筆，跨書不誤配",()=>{
  const i={publicationId:"P",category:"魔法物品",englishName:"Blade"};
  const c=catalog("P","items",[{name:"Blade",source:"OTHER",page:1}], [{name:"Blade",inherits:{source:"TEST",page:8}}]);
  assert.equal(resolveRuleCitation(i,c).page,8);
  c.datasets.items.push({name:"Blade",source:"TEST",page:8});
  assert.equal(findSourceEntity(i,c).status,"ambiguous");
});
test("群組子卡識別碼穩定且不使用陣列順序，全部群組名稱唯一",()=>{
  for(const [entityId,names] of Object.entries(SOURCE_GROUPS)) {
    const entry={entityId,publicationId:entityId.split(":")[1]};
    const first=expandSourceGroup(entry);assert.equal(new Set(first.map(x=>x.entityId)).size,names.length);
    assert.deepEqual(first,expandSourceGroup(entry));assert.ok(first.every(x=>x.parentEntityId===entityId));
    assert.equal(new Set(names).size,names.length);
  }
});
test("背景正文修復只解除正文阻擋，不會解除 AL 覆核",()=>{
  const base={entry:{entityId:"entry:FRHOF2025:background:test",category:"背景"},citation:{status:"verified"},al:{status:"待覆核"},unresolvedLinks:[],sanitized:true};
  const before=publishReadiness({...base,rules:"背景具備完整規則與起源專長，但條目待建立或待確認。"});
  const after=publishReadiness({...base,rules:"背景具備完整規則與起源專長，技能熟練與工具選擇均依來源。"});
  assert.equal(before.publishable,false);assert.equal(after.ready,false);
  assert.ok(after.pending.every(x=>x.includes("AL")));
});
test("加值子卡只保留自己的表格列並保留共通限制，缺列不宣稱完整",()=>{
  const entry={parentEntityId:"entry:DMG2024:entry:f0972d58cc",publicationId:"DMG2024"};
  const rules="### 變體\n| 變體 | 加值 |\n| --- | --- |\n| +1 武器 | +1 |\n| +2 武器 | +2 |\n| +3 武器 | +3 |\n### 效果\n使用此武器進行攻擊時生效。";
  const r=specializeVariantRules(entry,{name:"+2 Weapon",rarity:"rare"},rules);
  assert.equal(r.complete,true);assert.ok(r.rules.includes("+2 武器"));assert.ok(!r.rules.includes("+1 武器"));assert.ok(!r.rules.includes("+3 武器"));assert.ok(r.rules.includes("使用此武器"));
  assert.equal(specializeVariantRules(entry,{name:"+2 Weapon"},rules.replace("| +2 武器 | +2 |","")).complete,false);
});
test("屏障刺青各稀有度不混用 AC，其他群組保持待覆核",()=>{
  const entry={parentEntityId:"entry:TCE2020:magic-item:72a8550ba2",publicationId:"TCE2020"};
  const rules="    | 非普通 | 12 + 敏捷調整值 |\n    | 珍稀 | 15 + 敏捷調整值（最多 +2） |\n    | 極珍稀 | 18 |\n同調結束時針頭重新出現。";
  const r=specializeVariantRules(entry,{name:"Barrier Tattoo (Medium)",rarity:"rare"},rules);
  assert.equal(r.complete,true);assert.ok(!r.rules.includes("12 +"));assert.ok(!r.rules.includes("| 18 |"));assert.ok(r.rules.includes("最多 +2"));
  assert.equal(specializeVariantRules({...entry,parentEntityId:"unknown"},{name:"Other"},rules).complete,false);
});
test("加值來源補文保留職業限制，機巧奇具以可定位資料卡補全",()=>{
  const e={parentEntityId:"entry:TCE2020:magic-item:f6a0317b28",publicationId:"TCE2020"};
  const r=specializeVariantRules(e,{name:"+3 Arcane Grimoire",entries:["+3 bonus"],rarity:"very rare"},"可作法術書，奧術回想多恢復一環。");
  assert.equal(r.complete,true);assert.ok(r.rules.includes("法師法術"));assert.ok(r.rules.includes("+3"));assert.ok(r.rules.includes("奧術恢復"));
  const flying=specializeVariantRules({parentEntityId:"entry:FRAIF2025:magic-item:mechanical-wonders"},{name:"Mechanical Wonder (Flying)"},"群組正文");
  assert.equal(flying.complete,true);assert.match(flying.rules,/飛空型奇具/u);
});
test("史前塑像按變體保留持續、恢復與失控限制",()=>{
  const r=specializeVariantRules({parentEntityId:"entry:BPGG2023:magic-item:759cbc51c8"},{name:"Prehistoric Figurine of Wondrous Power, Jasper Tyrannosaurus Rex"},"群組正文");
  assert.equal(r.complete,true);assert.ok(r.rules.includes("1 小時"));assert.ok(r.rules.includes("14 天"));assert.ok(r.rules.includes("d20"));assert.ok(!r.rules.includes("三角龍"));
});
