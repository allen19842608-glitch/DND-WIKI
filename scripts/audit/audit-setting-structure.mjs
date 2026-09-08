import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import YAML from "yaml";
import { walk } from "../migrate/organize-multiverse.mjs";
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
export function auditStructure({apply=false}={}){
  const migrationFile=path.join(ROOT,"reports/multiverse-migration.json");
  const migration=fs.existsSync(migrationFile)?JSON.parse(fs.readFileSync(migrationFile,"utf8")):[];
  const moved=new Map(migration.map(m=>[m.to,m]));
  // 後續整理可能再次搬移已記錄的頁面。以 entity_id 回溯初始位置，
  // 使稽核確認內容仍在，而非把安全的二次歸位誤報為遺失。
  const originalByEntity=new Map(migration.map(m=>[m.entity_id,m.from]));
  const baseline=execFileSync("git",["-c","core.quotepath=false","ls-tree","-r","--name-only","HEAD","--","wiki/戰役設定/多元宇宙"],{cwd:ROOT,encoding:"utf8"}).trim().split("\n");
  const rows=walk(path.join(ROOT,"wiki/戰役設定")).map(file=>{
    const text=fs.readFileSync(file,"utf8"),data=YAML.parse(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
    const rel=path.relative(ROOT,file).replaceAll("\\","/");
    const issues=[];
    const sources=(data.sources??[]).map(s=>({...s,exists:fs.existsSync(path.join(ROOT,s.file))}));
    if(sources.some(s=>!s.exists))issues.push("來源檔缺漏");
    if(/待確認|頁碼待定位/.test(text))issues.push("既有待確認標示");
    if(/…|\.\.\./.test(text))issues.push("省略符號待核對：不直接判定為缺文");
    const overview=text.match(/## (?:概覽|適用情境)\r?\n([\s\S]*?)(?=\r?\n## )/)?.[1]?.trim()??"";
    if(overview&&overview.replace(/（來源：[\s\S]*?）/g,"").trim().length<60)issues.push("短概覽待覆核：不直接判定為缺文");
    if(["秘閣","龍巫教"].includes(path.basename(rel,".md"))&&data.setting==="多元宇宙")issues.push("需與世界專屬同名頁比較來源後合併");
    return {page:rel,original_page:moved.get(rel)?.from??originalByEntity.get(data.entity_id)??rel,entity_id:data.entity_id,concept_id:data.concept_id,setting:data.setting??"戰役創作／全庫導覽",lore_type:data.lore_type??"DM工具／全庫導覽",disposition:moved.get(rel)?.merged?"已合併同一實體":moved.has(rel)?"已歸位":originalByEntity.has(data.entity_id)?"已二次歸位":data.setting==="多元宇宙"?"保留現行分類":"後續世界批次",reason:moved.get(rel)?.reason??"依既有世界與類型保存；內容完整度另列覆核",sources,issues};
  });
  const counts={};for(const r of rows)counts[r.setting]=(counts[r.setting]??0)+1;
  const original=baseline.map(p=>rows.find(r=>r.original_page===p)).filter(Boolean);
  const report={summary:{pages:rows.length,by_setting:counts,original_multiverse_pages:baseline.length,classified_original_pages:original.length,moved:migration.length,missing_original_pages:baseline.filter(p=>!rows.some(r=>r.original_page===p))},errors:rows.filter(r=>r.sources.some(s=>!s.exists)),review:rows.filter(r=>r.issues.length),pages:rows,external_reference_candidates:[{url:"https://www.dndbeyond.com/posts/1576-what-to-know-before-you-visit-sigil-the-city-at",use:"印記城旅行限制交叉核對；正文已採本地正式出版品鏡像"},{url:"https://www.dndbeyond.com/posts/279-welcome-to-eberron-an-introduction-to-a-realm-of",use:"艾伯倫專屬宇宙觀的後續官方資料入口"}]};
  if(apply){
    fs.writeFileSync(path.join(ROOT,"reports/setting-structure-current.json"),JSON.stringify(report,null,2)+"\n");
    const md="# 戰役設定結構盤點\n\n"+`共 ${rows.length} 頁；原多元宇宙 ${baseline.length} 頁，已分類 ${original.length} 頁，搬移 ${migration.length} 頁。\n\n`+"## 世界分布\n\n"+Object.entries(counts).map(([k,v])=>`- ${k}：${v}`).join("\n")+"\n\n## 內容覆核候選\n\n以下是自動檢查候選，不代表已證實缺文；分類完成不等於逐句來源核定。\n\n"+report.review.map(r=>`- ${r.page}：${r.issues.join("；")}`).join("\n")+"\n\n## 後續世界順序\n\n被遺忘的國度 → 艾伯倫 → 灰鷹 → 鴉閣魔域；新版來源優先，舊版補充未被取代的設定。怪物數據卡另列最低優先級。\n";
    fs.writeFileSync(path.join(ROOT,"reports/setting-structure-current.md"),md);
  }
  console.log(JSON.stringify(report.summary));return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))auditStructure({apply:process.argv.includes("--apply")});
