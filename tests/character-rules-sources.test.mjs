import test from "node:test";
import assert from "node:assert/strict";
import { parseBookPages, resolveRuleCitation, findSourceEntity } from "../scripts/publish/character-rules-sources.mjs";

const catalog = {
  publications: [{ id: "PHB2024", title_zh: "玩家手冊", year: 2024, authority: "官方" }],
  sourceCodeByPublication: new Map([["PHB2024", "XPHB"]]),
  datasets: { backgrounds: [{ name: "Acolyte", source: "XPHB", page: 178, evidence: { sha256: "test" } }, { name: "Acolyte", source: "PHB", page: 127 }] },
};
test("頁碼解析涵蓋既有書名與章節格式，不接受行號冒充頁碼", () => {
  assert.equal(parseBookPages("Player’s Handbook (2024), p. 178：Acolyte"), "178");
  assert.equal(parseBookPages("pp. 8–9、11（註腳）"), "8-9,11");
  assert.equal(parseBookPages("L178：Acolyte"), null);
  assert.equal(parseBookPages("全文"), null);
});
test("以原出版品及資料集自身頁碼驗證，不混用同名舊版", () => {
  const citation = resolveRuleCitation({ englishName: "Acolyte", publicationId: "PHB2024", category: "背景" }, catalog);
  assert.equal(citation.page, 178);
  assert.equal(citation.display, "《玩家手冊 2024》，p. 178：Acolyte");
});
test("未分類正式書籍仍要求頁碼；缺頁碼不標為可發布", () => {
  const missing = { ...catalog, datasets: { backgrounds: [{ name: "Acolyte", source: "XPHB" }] } };
  assert.equal(resolveRuleCitation({ englishName: "Acolyte", publicationId: "PHB2024", category: "背景" }, missing).status, "pending");
});
test("來源歧義不擅自採用第一筆", () => {
  const duplicated = { ...catalog, datasets: { backgrounds: [catalog.datasets.backgrounds[0], catalog.datasets.backgrounds[0]] } };
  assert.equal(findSourceEntity({ englishName: "Acolyte", publicationId: "PHB2024", category: "背景" }, duplicated).status, "ambiguous");
});
test("種族子類以種族加變體名稱配對正式頁碼", () => {
  const subraceCatalog = {
    publications: [{ id: "MPMM2022", title_zh: "魔鄧肯鉅獻：多元宇宙的怪物", year: 2022, authority: "官方" }],
    sourceCodeByPublication: new Map([["MPMM2022", "MPMM"]]),
    datasets: { species: [{ name: "Earth", raceName: "Genasi", source: "MPMM", page: 17, evidence: { sha256: "test" } }] },
  };
  const citation = resolveRuleCitation({ englishName: "Earth Genasi", publicationId: "MPMM2022", category: "種族" }, subraceCatalog);
  assert.equal(citation.status, "verified");
  assert.equal(citation.page, 17);
});
