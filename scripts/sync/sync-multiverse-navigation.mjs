import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { walk } from "../migrate/organize-multiverse.mjs";
import { syncLoreIndexes } from "../core/lore-indexes.mjs";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASE = "wiki/戰役設定/多元宇宙";
const link = p => `[[${p.rel.replace(/\.md$/, "")}|${p.data.title}]]`;
const section = (text, heading, body) => {
  const re = new RegExp(`^## ${heading}\\r?\\n[\\s\\S]*?(?=^## |$(?![\\s\\S]))`, "m");
  const replacement = `## ${heading}\n\n${body}\n\n`;
  return (re.test(text) ? text.replace(re, replacement) : `${text.trimEnd()}\n\n${replacement}`).trimEnd()+"\n";
};
export function syncNavigation({apply = false} = {}) {
  const pages = walk(path.join(ROOT, BASE)).map(file => {
    const text = fs.readFileSync(file,"utf8");
    return {file, text, rel:path.relative(ROOT,file).replaceAll("\\","/"),data:YAML.parse(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1])};
  });
  let changed = 0;
  const write = (rel, text) => {
    const file=path.join(ROOT,rel);
    if(fs.existsSync(file)&&fs.readFileSync(file,"utf8")===text)return;
    changed++;
    if(apply){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text,"utf8");}
  };
  for(const [directory, slug] of [["地理/位面","planes"],["地理/巨人飛地","giant-enclaves"],["地理/城市與聚居地/外域門鎮","gate-towns"]]){
    const members=pages.filter(p=>path.posix.dirname(p.rel)===`${BASE}/${directory}`&&p.data.lore_type!=="索引");
    if(!members.length)continue;
    const name=directory.split("/").at(-1)+"索引";
    const rel=`${BASE}/${directory}/${name}.md`;
    const existing=pages.find(p=>p.rel===rel);
    const data={...(existing?.data??members[0].data),title:name,entity_id:`entry:${members[0].data.entity_id.split(":")[1]}:setting-index:${slug}`,concept_id:`concept:setting:multiverse:index:${slug}`,lore_type:"索引"};
    const sorted=members.slice().sort((a,b)=>a.data.title.localeCompare(b.data.title,"zh-Hant"));
    const body=sorted.map(p=>`- ${link(p)}`).join("\n");
    const metadata=YAML.stringify(data,{defaultStringType:"QUOTE_DOUBLE",lineWidth:0});
    write(rel,`---\n${metadata}---\n\n# ${name}\n\n${body}\n\n## 🔗 相關連結\n\n- [[${BASE}/地理/地理索引|地理索引]]\n- [[${BASE}/多元宇宙索引|多元宇宙索引]]\n`);
    for(const p of members)write(p.rel,section(p.text,"所屬導覽",`- [[${rel.replace(/\.md$/,"")}|${name}]]`));
  }
  const main=pages.find(p=>p.rel===`${BASE}/多元宇宙索引.md`);
  const find=name=>pages.find(p=>path.basename(p.rel,".md")===name);
  const group=(title,names)=>`### ${title}\n\n`+names.map(find).filter(Boolean).map(p=>`- ${link(p)}`).join("\n");
  const themes=[group("宇宙觀與位面",["宇宙學","諸位面","物質領域","過渡位面","內層位面","外層位面"]),group("位面旅行",["位面旅行","傳送門"]),group("印記城與外域",["印記城","門鎮","印記城的生活","外域的生活"]),group("人物與派系",["痛苦女士","印記城的派系","掌權派系","次要派系"]),group("龍與巨人",["第一世界","跨越世界的迴響","巨人之榮耀","巨人族","巨人飛地","龍的組織"])].join("\n\n");
  const themeNames=new Set([...themes.matchAll(/\[\[([^|]+)\|/g)].map(m=>path.posix.basename(m[1])));
  const oldMain=main.text.replace(/^## 主題導覽\r?\n[\s\S]*?(?=^## |$(?![\s\S]))/m,"")
    .replace(/^- \[\[([^|\]]+)(?:\|[^\]]*)?\]\]\r?\n/gm,(line,target)=>themeNames.has(path.posix.basename(target))?"":line)
    .replace(/^## 快速入口\s*(?=##)/m,"");
  write(main.rel,section(oldMain,"主題導覽",`各世界專屬的宇宙觀由世界條目說明：[[wiki/戰役設定/艾伯倫/世界觀/存在位面|艾伯倫的存在位面]]。此入口用於對照世界設定與通用位面資料。\n\n${themes}`));
  const campaign="wiki/戰役設定/戰役創作/戰役設計/主題素材";
  const cp=JSON.parse(fs.readFileSync(path.join(ROOT,"reports/multiverse-migration.json"),"utf8")).filter(m=>m.to.startsWith(campaign+"/"));
  const index=`${campaign}/主題素材索引.md`;
  write(index,section(fs.readFileSync(path.join(ROOT,index),"utf8"),"多元宇宙冒險素材",cp.map(m=>`- [[${m.to.replace(/\.md$/,"")}|${path.basename(m.to,".md")}]]`).join("\n")));
  for(const m of cp)write(m.to,section(fs.readFileSync(path.join(ROOT,m.to),"utf8"),"所屬導覽",`- [[${index.replace(/\.md$/,"")}|主題素材索引]]`));
  console.log(`多元宇宙導覽${apply?"套用":"預覽"}：${changed} 頁`);
  if(apply)syncLoreIndexes({apply:true,setting:"多元宇宙"});
  return changed;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))syncNavigation({apply:process.argv.includes("--apply")});
