import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../core/ingest-publication-utils.mjs";

const DATASET = "原始資料/外部來源鏡像/FRAIF2025/datasets/items-fraif.json";
const TARGETS = new Map([
  ["Calimemnon Crystal", "wiki/魔法物品/奇物/卡林曼農水晶.md"],
  ["Crown of Horns", "wiki/魔法物品/奇物/角之王冠.md"],
  ["Harper Pin", "wiki/魔法物品/奇物/豎琴手胸針.md"],
  ["Mechanical Wonder (Domestic)", "wiki/魔法物品/奇物/家用型奇具.md"],
  ["Mechanical Wonder (Flying)", "wiki/魔法物品/奇物/機巧奇具.md"],
  ["Mechanical Wonder (Gyrocopter)", "wiki/魔法物品/奇物/機巧奇具.md"],
  ["Mechanical Wonder (Mobility)", "wiki/魔法物品/奇物/機巧奇具.md"],
  ["Orb of Damara", "wiki/魔法物品/奇物/達瑪剌寶珠.md"],
  ["Tome of the Dragon", "wiki/魔法物品/奇物/龍之卷冊.md"],
  ["Windskiff", "wiki/魔法物品/奇物/乘風板.md"],
]);

export function linkFraifMirrorItems({ apply = false } = {}) {
  const known = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, DATASET), "utf8")).item.map((item) => item.name));
  const changes = [];
  for (const [english, rel] of TARGETS) {
    if (!known.has(english)) throw new Error(`鏡像缺少預期物品：${english}`);
    const file = path.join(ROOT, ...rel.split("/"));
    let text = fs.readFileSync(file, "utf8");
    if (text.includes(`locator: "item: ${english}"`)) continue;
    text = text.replace(/^source_type:/m, `  - file: "${DATASET}"\n    locator: "item: ${english}"\n    authority: "官方"\n    translation: "none"\nsource_type:`);
    if (apply) fs.writeFileSync(file, text, "utf8");
    changes.push({ page: rel, english });
  }
  const pending = [...known].filter((name) => !TARGETS.has(name));
  return { changes, pending };
}
