import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
if (apply) {
  process.stderr.write("舊圖片嵌入入口已退役，不再直接寫入 Wiki；請先用 wiki:preview 產生可審閱候選。\n");
  process.exit(1);
}
const ROOT = process.cwd();
const IMAGE_ROOT = "原始資料/外部來源鏡像/EBER2025/images/book/EFA";
const MIRROR = "原始資料/外部來源鏡像/EBER2025/book-efa.json";

// Only entries manually classified as direct candidates. Chapter-level candidates remain excluded.
const placement = {
  "wiki/職業/奇械師.md": ["001-01-001.artificer-working-on-an-unfinished-warforged.webp", "007-02-001.artificer-and-creation-first-meeting.webp", "072-09-001.creating-a-warforged.webp", "073-09-002.forging.webp"],
  "wiki/專長/龍紋專長/龍紋專長索引.md": ["008-02-005.dragonmarks.webp", "009-02-006.greater-dragonmarks.webp", "010-02-007.siberys-dragonmarks.webp"],
  "wiki/職業/奇械師/戰地匠師.md": ["038-04-001.battle-smith-inquisitive-on-the-hunt.webp", "079-09-008.battle-smith.webp"],
  "wiki/戰役設定/艾伯倫/地理/城市與聚居地/薩恩/薩恩探事員索引.md": ["039-04-002.inquisitives-in-sharn-keeping-watch.webp"],
  "wiki/戰役設定/艾伯倫/地理/城市與聚居地/薩恩/薩恩索引.md": ["040-04-003.criminals-of-sharn.webp", "041-04-004.city-of-towers.webp", "076-09-005.city-of-towers.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/龍紋家族索引.md": ["042-05-001.members-of-dragonmarked-houses.webp", "043-05-002.members-of-dragonmarked-houses-in-conflict.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/塔卡南家族.md": ["044-05-003.tarkanan-marauder-and-ruffian.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/坎尼斯家族.md": ["046-05-006.house-cannith.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/鄧內斯家族.md": ["047-05-013.house-deneith.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/伽蘭達家族.md": ["048-05-007.house-ghallanda.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/喬拉斯科家族.md": ["049-05-008.house-jorasco.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/昆達拉克家族.md": ["050-05-009.house-kundarak.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/黎蘭達家族.md": ["051-05-010.house-lyrandar.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/梅丹尼家族.md": ["053-05-011.house-medani.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/歐瑞恩家族.md": ["054-05-012.house-orien.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/費亞蘭家族.md": ["055-05-014.house-phiarlan.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/西維斯家族.md": ["056-05-016.house-sivis.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/撒剌釋克家族.md": ["057-05-017.house-tharashk.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/瓦達利斯家族.md": ["059-05-018.house-vadalis.webp"],
  "wiki/職業/奇械師/裝甲師.md": ["060-06-001.an-armorer-explorer-exploring-ancient-ruins.webp", "087-09-016.armorer.webp"],
  "wiki/戰役設定/艾伯倫/組織與派系/翡翠利爪教團.md": ["061-06-002.emerald-claw-knights.webp"],
  "wiki/戰役設定/艾伯倫/事件/冒險框架/莫格雷夫遠征索引.md": ["062-06-003.morgrave-university.webp", "063-06-004.faces-of-morgrave.webp"],
  "wiki/戰役設定/艾伯倫/文化與族群/交通與生活/元素飛艇索引.md": ["064-06-005.elemental-airships.webp", "066-07-001.airship-battle.webp", "067-07-002.airship-getaway.webp", "085-09-015.airship.webp"],
  "wiki/職業/奇械師/煉金師.md": ["083-09-012.alchemist.webp"],
  "wiki/職業/奇械師/魔炮師.md": ["089-09-018.artillerist.webp"],
};

function imageMarkdown(page, file) {
  const image = path.join(ROOT, IMAGE_ROOT, file);
  if (!fs.existsSync(image)) throw new Error(`缺少鏡像圖片：${image}`);
  const relative = path.relative(path.dirname(path.join(ROOT, page)), image).replaceAll("\\", "/");
  return `![](${relative})`;
}

let changedPages = 0;
let insertedImages = 0;
for (const [page, images] of Object.entries(placement)) {
  const fullPath = path.join(ROOT, page);
  let text = fs.readFileSync(fullPath, "utf8");
  const needed = images.filter((file) => !text.includes(`/${file})`));
  if (!needed.length) continue;
  const h1 = text.match(/^# .+$/m);
  if (!h1) throw new Error(`找不到 H1：${page}`);
  const markdown = needed.map((file) => imageMarkdown(page, file)).join("\n\n");
  text = `${text.slice(0, h1.index + h1[0].length)}\n\n${markdown}${text.slice(h1.index + h1[0].length)}`;
  const locator = `圖片：${needed.map((file) => `book/EFA/${file}`).join("；")}`;
  const mirrorSource = new RegExp(`(  - file: "${MIRROR.replaceAll("/", "\\/")}"\\n    locator: ")([^"]*)(")`);
  if (mirrorSource.test(text)) {
    const existingLocator = text.match(mirrorSource)[2];
    const missingLocator = needed.filter((file) => !existingLocator.includes(file));
    if (missingLocator.length) {
      text = text.replace(mirrorSource, `$1${existingLocator}；圖片：${missingLocator.map((file) => `book/EFA/${file}`).join("；")}$3`);
    }
  } else {
    const source = `  - file: "${MIRROR}"\n    locator: "${locator}"\n    authority: "官方"\n    translation: "none"\n`;
    text = text.replace("source_type:", `${source}source_type:`);
  }
  text = text.replace(/^updated: ".*"$/m, 'updated: "2026-08-31"');
  changedPages += 1;
  insertedImages += needed.length;
  if (apply) fs.writeFileSync(fullPath, text, "utf8");
  console.log(`${apply ? "套用" : "預覽"}：${page}（${needed.length} 張）`);
}
console.log(`${apply ? "已套用" : "預覽"}：${changedPages} 頁／${insertedImages} 張圖片`);
