import test from "node:test";
import assert from "node:assert/strict";
import { buildMoves, rewriteLinks } from "../scripts/migrate/organize-multiverse.mjs";
import { rebuiltText } from "../scripts/ingest/rebuild-lore.mjs";

test("搬移連結涵蓋兩種完整路徑、表格別名及錨點", () => {
  const mapping = new Map([["戰役設定/舊頁", "戰役設定/新頁"]]);
  assert.equal(rewriteLinks("[[戰役設定/舊頁]] [[wiki/戰役設定/舊頁\\|別名]] [[戰役設定/舊頁#段落|段落]]", mapping),
    "[[wiki/戰役設定/新頁]] [[wiki/戰役設定/新頁\\|別名]] [[wiki/戰役設定/新頁#段落|段落]]");
  assert.equal(rewriteLinks("[[其他頁]]", mapping), "[[其他頁]]");
});
test("人物分類保留 entity_id，遷移 concept 類型且重跑不搬移", () => {
  const p = {rel:"wiki/戰役設定/多元宇宙/世界觀/痛苦女士.md",text:'entity_id: "entry:SO:x"\nconcept_id: "concept:setting:multiverse:worldview:lady"\nlore_type: "世界觀"\n正文',data:{entity_id:"entry:SO:x",concept_id:"concept:setting:multiverse:worldview:lady",lore_type:"世界觀"}};
  const layout={groups:[{names:["痛苦女士"],directory:"人物"}]};
  const moves=buildMoves([p],layout,{person:{label:"人物"}});
  assert.equal(moves[0].concept,"concept:setting:multiverse:person:lady");
  assert.match(moves[0].next,/entity_id: "entry:SO:x"/);
  assert.equal(buildMoves([{...p,rel:moves[0].target}],layout,{person:{label:"人物"}}).length,0);
});
test("拒絕越出戰役設定的目的地", () => {
  assert.throws(()=>buildMoves([{rel:"wiki/戰役設定/多元宇宙/世界觀/甲.md",data:{}}],{groups:[{names:["甲"],directory:"../../../原始資料"}]},{}),/越界/);
});
test("重建保留已整理的完整段落、表格和導覽",()=>{
  const body="# 測試\n\n## 概覽\n\n具有完整來源的設定摘要。\n\n## 歷史與現況\n\n第一段。\n\n第二段。\n\n第三段。\n\n第四段。\n\n| 選項 | 效果 |\n| --- | --- |\n| 1 | 完整效果 |\n\n## 所屬導覽\n\n[[wiki/戰役設定/多元宇宙/多元宇宙索引]]\n";
  const text="---\ntitle: \"測試\"\n---\n"+body;
  assert.equal(rebuiltText({text,body,data:{title:"測試"}}),text);
});
