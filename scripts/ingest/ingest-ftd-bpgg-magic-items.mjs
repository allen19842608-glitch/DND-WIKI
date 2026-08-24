import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const replacements = new Map(Object.entries({ "这": "這", "个": "個", "为": "為", "与": "與", "后": "後", "会": "會", "时": "時", "伤": "傷", "击": "擊", "获": "獲", "级": "級", "种": "種", "选择": "選擇", "状态": "狀態", "发": "發", "长": "長", "间": "間", "变": "變", "当": "當", "从": "從", "将": "將", "对": "對", "该": "該", "体": "體", "处": "處", "动": "動", "开": "開", "门": "門", "风": "風", "灵": "靈", "护": "護", "觉": "覺", "击": "擊", "剑": "劍", "铠": "鎧", "锤": "錘", "环": "環", "龙": "龍", "咒": "咒", "还": "還", "无": "無", "两": "兩", "数": "數", "并": "並", "只": "只", "于": "於", "点": "點", "钟": "鐘", "复": "復", "觉": "覺", "铸": "鑄", "铜": "銅", "闪": "閃", "电": "電", "声": "聲", "视": "視", "听": "聽", "读": "讀", "写": "寫", "语": "語", "阶": "階", "异": "異", "尽": "盡", "尽": "盡", "领": "領", "钩": "鉤", "盘": "盤", "巨": "巨", "蓝": "藍", "黄": "黃", "铂": "鉑", "银": "銀", "红": "紅", "绿": "綠", "终": "終", "锁": "鎖", "骑": "騎", "乌": "烏", "径": "徑", "雾": "霧", "碎": "碎", "骑": "騎", "战": "戰", "术": "術", "装": "裝", "备": "備", "属": "屬", "显": "顯", "击": "擊", "锥": "錐", "矿": "礦", "圣": "聖", "术": "術" }));
function traditional(text) {
  let result = text;
  for (const [from, to] of replacements) result = result.split(from).join(to);
  return result.replace(/(\d+)\s*尺/g, "$1 呎").replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2").replace(/(\d+)\s*gp\b/gi, "$1 GP").replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師");
}
const safe = (text) => text.replace(/[\\/:*?\"<>|]/g, "-").trim();
const sourceOf = (file) => path.relative(ROOT, file).split(path.sep).join("/");
function sourceBlock(file, title, allTitles) {
  const lines = traditional(fs.readFileSync(file, "utf8")).split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes(`**${title} `) || line.includes(`**${title}**`));
  if (start < 0) throw new Error(`找不到物品標題：${title}；${file}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (allTitles.some((other) => other !== title && (lines[index].includes(`**${other} `) || lines[index].includes(`**${other}**`)))) { end = index; break; }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}
function effectMarkup(block) {
  const lines = block.split(/\r?\n/).filter((line) => line.trim());
  const out = [];
  let label = "特殊能力";
  let content = [];
  const flush = () => {
    const text = content.map((line) => line.replace(/^[-*]\s+/, "").trim()).filter(Boolean).join(" ");
    if (text) out.push(`- **${label}**：${text}`);
    content = [];
  };
  for (const line of lines) {
    if (/^_[^_]+_$/.test(line.trim())) continue;
    const heading = line.match(/^\*\*([^*]+?)\*\*\s*(.*)$/);
    if (heading) {
      flush();
      label = heading[1].replace(/[。.]$/, "").trim();
      if (heading[2].trim()) content.push(heading[2]);
    } else content.push(line);
  }
  flush();
  return out.join("\n") || "- **規則效果**：來源未提供可編譯正文。";
}
function emit(book, item) {
  const publication = loadPublication(book.id);
  const sourcePath = path.join(ROOT, book.root, item.file);
  const itemsInFile = book.items.filter((other) => other.file === item.file).map((other) => other.name);
  const block = sourceBlock(sourcePath, item.name, itemsInFile);
  const title = `${item.name} (${item.english}，2014 Legacy)`;
  const body = `# ${title}\n\n> [!WARNING]\n> 本條目為 2014 Legacy 魔法物品；不取代同名的 2024 條目。\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 物品資料\n\n| 項目 | 內容 |\n| :--- | :--- |\n| 類別 (Category) | ${item.category} |\n| 稀有度 (Rarity) | ${item.rarity} |\n| 同調 (Attunement) | ${item.attunement ?? "依來源條文"} |\n| 消耗品 (Consumable) | ${item.consumable ?? "否"} |\n\n### 物品效果\n\n${effectMarkup(block)}\n\n## 🔗 相關連結\n\n- [[魔法物品/2014/2014魔法物品索引|2014 魔法物品索引 (2014 Legacy)]]\n`;
  const meta = frontmatter({ publicationId: book.id, publication, kind: "magic-item", concept: item.english, title, category: "魔法物品", tag: `魔法物品_${item.category}`, source: sourceOf(sourcePath), locator: `**${item.name} ${item.english}**` });
  const destination = path.join(ROOT, "wiki", "魔法物品", "2014", item.category, `${safe(item.name)}.md`);
  writableCandidate({ destination, content: `${meta}\n\n${body}`, options });
}

const ftd = {
  id: "FTD2021", root: "原始資料/費資本的巨龍寶庫", items: [
    ["鉑金圍巾", "Platinum Scarf", "奇物", "珍稀", "需要"], ["提亞馬特鏈枷", "Flail of Tiamat", "武器", "神器", "需要"], ["紫晶磁石", "Amethyst Lodestone", "奇物", "極珍稀", "需要"], ["水晶刀鋒", "Crystal Blade", "武器", "珍稀", "需要"], ["龍皮腰帶", "Dragonhide Belt", "奇物", "多種稀有度", "需要；武僧"], ["龍槍", "Dragonlance", "武器", "傳說", "需要"], ["龍翼弓", "Dragon Wing Bow", "武器", "珍稀", "需要"], ["異能塑像：金絲雀", "Figurine of Wondrous Power: Gold Canary", "奇物", "傳說", "不需要"], ["龍威藥水", "Potion of Dragon's Majesty", "藥水", "傳說", "不需要", "是"], ["魔網紅寶石", "Ruby Weave Gem", "奇物", "傳說", "需要；施法者"], ["藍寶石圓盾", "Sapphire Buckler", "護甲", "極珍稀", "需要"], ["黃玉殲滅者", "Topaz Annihilator", "武器", "傳說", "需要"], ["翡翠鋼筆", "Emerald Pen", "奇物", "非普通", "不需要"],
    ["龍怒武器", "Dragon's Wrath Weapon", "武器", "多種稀有度", "需要", "否", "巨龍魔法/寶庫物品.md"], ["龍觸法器", "Dragon-Touched Focus", "奇物", "多種稀有度", "需要；施法者", "否", "巨龍魔法/寶庫物品.md"], ["龍器", "Dragon Vessel", "奇物", "多種稀有度", "需要", "否", "巨龍魔法/寶庫物品.md"], ["覆鱗飾物", "Scaled Ornament", "奇物", "多種稀有度", "需要", "否", "巨龍魔法/寶庫物品.md"],
  ].map(([name, english, category, rarity, attunement, consumable, file]) => ({ name, english, category, rarity, attunement, consumable, file: file ?? "巨龍魔法/魔法物品.md" })),
};
const bpgg = {
  id: "BPGG2023", root: "原始資料/畢格比鉅獻：巨人之榮耀", items: [
    ["史前異能塑像", "Prehistoric Figurines of Wondrous Power", "奇物", "多種稀有度", "不需要", "巨人寶藏/魔法物品/多種稀有度.md"],
    ["降怒王冠", "Crown of the Wrath Bringer", "奇物", "珍稀"], ["掘地之爪", "Delver's Claws", "奇物", "珍稀"], ["熒光符文顏料", "Glowrune Pigment", "奇物", "珍稀"], ["焚焰之笞", "Lash of Immolation", "武器", "珍稀"], ["勇氣戰爭號角", "War Horn of Valor", "奇物", "珍稀"], ["旅人之靴", "Wayfarer's Boots", "奇物", "珍稀"], ["西風護甲", "Zephyr Armor", "護甲", "珍稀"],
    ["安防護甲", "Armor of Safeguarding", "護甲", "極珍稀"], ["祭血之刃", "Bloodshed Blade", "武器", "極珍稀"], ["耀閃滅擊銃", "Lucent Destroyer", "武器", "極珍稀"], ["朔風披風", "Mistral Mantle", "奇物", "極珍稀"], ["雨雲寶冠", "Nimbus Coronet", "奇物", "極珍稀"], ["和睦戒指", "Ring of Amity", "戒指", "極珍稀"], ["聖所護符", "Sanctum Amulet", "奇物", "極珍稀"], ["根深蒂固法杖", "Staff of the Rooted Hills", "法杖", "極珍稀"], ["雷音銃", "Thunderbuss", "武器", "極珍稀"], ["滅龍拳", "Wyrmreaver Gauntlets", "奇物", "極珍稀"],
    ["金穗琴", "Harp of Gilded Plenty", "奇物", "傳說"], ["愈爐長弓", "Longbow of the Healing Hearth", "武器", "傳說"], ["司寇雷烏斯的寶珠", "Orb of Skoraeus", "奇物", "傳說"], ["掠魂尖嘯", "Reaper's Scream", "武器", "傳說"], ["熾焰無畏者之盾", "Shield of the Blazing Dreadnought", "護甲", "傳說"], ["碎巖胸甲", "Stonebreaker's Breastplate", "護甲", "傳說"],
    ["安南之錛", "Adze of Annam", "武器", "神器"], ["畢格比裨益臂鐲", "Bigby's Beneficent Bracelet", "奇物", "神器"], ["完美潛能頭盔", "Helm of Perfect Potential", "奇物", "神器"],
  ].map(([name, english, category, rarity, attunement = "需要", file = ""]) => ({ name, english, category, rarity, attunement, file: file || `巨人寶藏/魔法物品/${rarity}.md` })),
};
for (const book of [ftd, bpgg]) for (const item of book.items) emit(book, item);
for (const category of ["奇物", "武器", "護甲", "法杖", "戒指", "藥水"]) {
  const entries = [ftd, bpgg].flatMap((book) => book.items.filter((item) => item.category === category).map((item) => ({ ...item, book })));
  const publication = loadPublication("FTD2021");
  const meta = frontmatter({ publicationId: "FTD2021", publication, kind: "magic-item-index", concept: `2014 ${category} magic items`, title: `${category}清單 (FTD／BPGG 2014 Legacy)`, category: "魔法物品", tag: "魔法物品_索引", source: "原始資料/費資本的巨龍寶庫/巨龍魔法/魔法物品.md", locator: "# 魔法物品" });
  const content = `${meta}\n\n# ${category}清單 (FTD／BPGG 2014 Legacy)\n\n本清單僅收錄《費資本的巨龍寶庫》與《畢格比鉅獻：巨人之榮耀》的 2014 Legacy 條目。\n\n${entries.map((item) => `- [[魔法物品/2014/${category}/${safe(item.name)}|${item.name} (${item.english}，2014 Legacy)]]`).join("\n")}\n\n## 🔗 相關連結\n\n- [[魔法物品/2014/2014魔法物品索引|2014 魔法物品索引 (2014 Legacy)]]\n`;
  writableCandidate({ destination: path.join(ROOT, "wiki", "魔法物品", "2014", category, `${category}清單.md`), content, options });
}
console.log("FTD 與 BPGG 魔法物品已完成預覽或套用。");
