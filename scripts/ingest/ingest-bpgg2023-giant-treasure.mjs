import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = "BPGG2023"; const publication = loadPublication(publicationId); const profile = loadIngestProfile(publicationId);
const root = path.join(ROOT, profile.source_root); const output = path.join(ROOT, "wiki", "規則", "2014", "地下城主工具箱", "畢格比鉅獻巨人之榮耀");
const map = new Map(Object.entries({ "这":"這","个":"個","为":"為","与":"與","后":"後","会":"會","时":"時","伤":"傷","击":"擊","获":"獲","级":"級","种":"種","选择":"選擇","状态":"狀態","发":"發","长":"長","间":"間","变":"變","当":"當","从":"從","将":"將","对":"對","该":"該","体":"體","处":"處","动":"動","开":"開","门":"門","风":"風","灵":"靈","护":"護","觉":"覺","剑":"劍","铠":"鎧","锤":"錘","环":"環","龙":"龍","还":"還","无":"無","两":"兩","数":"數","并":"並","点":"點","钟":"鐘","复":"復","视":"視","听":"聽","读":"讀","写":"寫","语":"語","阶":"階","异":"異","铜":"銅","银":"銀","红":"紅","绿":"綠","黄":"黃","铂":"鉑","雾":"霧","战":"戰","术":"術","装":"裝","备":"備","属":"屬" }));
function tr(text) { let v = text; for (const [a,b] of map) v=v.split(a).join(b); return v.replace(/(\d+)\s*尺/g,"$1 呎").replace(/(\d+)\s*(分鐘|小時|輪|磅)/g,"$1 $2").replace(/(\d+)\s*gp\b/gi,"$1 GP"); }
function sourceOf(file) { return path.relative(ROOT,file).split(path.sep).join("/"); }
function create(relative, title, intro) {
 const source = path.join(root, relative); const raw = tr(fs.readFileSync(source,"utf8")).replace(/^#\s+.+\r?\n/,"").replace(/^#\s+/gm,"### ");
 const meta = frontmatter({publicationId,publication,kind:"rule",concept:title,title:`${title} (BPGG 2014 Legacy)`,category:"規則機制",tag:"規則_地下城主工具箱",source:sourceOf(source),locator:`# ${title}`});
 const content = `${meta}\n\n# ${title} (BPGG 2014 Legacy)\n\n> [!WARNING]\n> 本頁是《畢格比鉅獻：巨人之榮耀》的 2014 Legacy 地下城主寶藏工具；不取代《地下城主指南 2024》的通用寶藏規則。\n\n${intro}\n\n## ⚙️ 規則條文 (Rule Text)\n\n${raw}\n\n## 🔗 相關連結\n\n- [[規則/2014/地下城主工具箱/畢格比鉅獻巨人之榮耀/巨人寶藏索引|巨人寶藏索引 (BPGG 2014 Legacy)]]\n`;
 writableCandidate({destination:path.join(output,`${title}.md`),content,options});
}
create("巨人寶藏.md","巨人寶藏索引","本索引收錄巨人的行囊、巨人國度之遺與本書魔法物品三類地下城主寶藏工具。");
create("巨人寶藏/巨人的行囊.md","巨人的行囊","依巨人類型建立行囊物品表；各巨人類型另有獨立行囊頁面。");
create("巨人寶藏/巨人國度之遺.md","巨人國度之遺","以巨人文明的遺物、錢幣、寶石與藝術品協助建立古代巨人遺址的寶藏。 ");
create("巨人寶藏/巨人遺物/寶藏種類.md","巨人寶藏種類","巨人遺址寶藏的錢幣、寶石與藝術品價值調整及隨機表。");
for (const title of ["山丘巨人行囊","火巨人行囊","石巨人行囊","霜巨人行囊","雲巨人行囊","風暴巨人行囊"]) create(`巨人寶藏/巨人的行囊/${title}.md`,title,`本頁提供 ${title} 的行囊內容與隨機物品表。`);
console.log("BPGG 巨人寶藏工具已完成預覽或套用。");
