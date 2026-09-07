import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const publicationId = "FTD2021";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root, profile.inputs.player_options);
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\AppData\\Local\\Temp\\dnd-wiki-xge-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const opencc = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
const sourceOf = (file) => path.relative(ROOT, file).split(path.sep).join("/");
const safe = (value) => value.replace(/[\\/:*?\"<>|]/g, "-").trim();
function tr(text) {
  if (!fs.existsSync(openccRoot)) throw new Error(`找不到 OpenCC：${openccRoot}`);
  return execFileSync(python, ["-c", opencc, openccRoot], { input: text, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    .replace(/(\d+)\s*尺/g, "$1 呎").replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replace(/(\d+)\s*gp\b/gi, "$1 GP").replaceAll("聖武士", "聖騎士").replaceAll("魔契師", "契術師").replaceAll("邪術師", "契術師");
}
function raw(file) { return tr(fs.readFileSync(file, "utf8")); }
function candidate({ file, kind, concept, title, category, tag, locator, body }) {
  const sourcePath = path.join(sourceRoot, file);
  return {
    destination: body.destination,
    content: `${frontmatter({ publicationId, publication, kind, concept, title, category, tag, source: sourceOf(sourcePath), locator })}\n\n${body.content}`,
  };
}
function legacyWarning(current) { return `> [!WARNING]\n> 本條目為 2014 舊版規則；2024 新版請參閱 ${current}。\n`; }
function spellLink(name, english) { return `[[法術/2014/${name}|${name.split("/").at(-1)} (${english}，2014 Legacy)]]`; }

const ancestry = {
  "色彩龍裔": { english: "Chromatic Dragonborn", file: "色彩龍裔.md", shape: "30 呎長、5 呎寬直線", table: "| 血脈 | 傷害類型 |\n| :--- | :--- |\n| 黑 | 強酸 |\n| 藍 | 閃電 |\n| 綠 | 毒素 |\n| 紅 | 火焰 |\n| 白 | 寒冷 |", extra: "#### 繁彩防護 (Chromatic Warding)\n\n- **取得／觸發**：5 級起，以一個動作啟用。\n- **效果**：1 分鐘內免疫所選血脈的傷害類型。\n- **限制**：每次長休後可再使用。" },
  "金屬龍裔": { english: "Metallic Dragonborn", file: "金屬龍裔.md", shape: "15 呎錐狀", table: "| 血脈 | 傷害類型 |\n| :--- | :--- |\n| 黃銅 | 火焰 |\n| 青銅 | 閃電 |\n| 赤銅 | 強酸 |\n| 金 | 火焰 |\n| 銀 | 寒冷 |", extra: "#### 金屬吐息武器 (Metallic Breath Weapon)\n\n- **取得／觸發**：5 級起；以攻擊動作中的一次攻擊替換。\n- **效果**：在 15 呎錐狀範圍選擇衰弱吐息（體質豁免失敗則失能至你的下回合開始）或排斥吐息（力量豁免失敗則推離 20 呎並伏地）。\n- **限制**：使用後完成一次長休才能再次使用。" },
  "寶石龍裔": { english: "Gem Dragonborn", file: "寶石龍裔.md", shape: "15 呎錐狀", table: "| 血脈 | 傷害類型 |\n| :--- | :--- |\n| 紫晶 | 力場 |\n| 水晶 | 光耀 |\n| 翡翠 | 心靈 |\n| 藍寶石 | 雷鳴 |\n| 黃玉 | 暗蝕 |", extra: "#### 靈能心智 (Psionic Mind)\n\n- **效果**：可與 30 呎內可見、至少會一種語言的生物心靈感應交流。\n\n#### 寶石之翼 (Gem Flight)\n\n- **取得／觸發**：5 級起，以附贈動作啟用。\n- **效果**：顯現幽光翅膀 1 分鐘，獲得等同步行速度的飛行速度且可懸浮。\n- **限制**：每次長休後可再使用。" },
};
for (const [name, item] of Object.entries(ancestry)) {
  const content = `# ${name} (${item.english}，2014 Legacy)\n\n${legacyWarning("[[種族/龍裔|龍裔 (Dragonborn)]]")}\n## ⚙️ 規則條文 (Rule Text)\n\n> [!IMPORTANT]\n> **種族摘要**：具有特定龍族血脈的龍裔變體；建立角色時依《費資本的巨龍寶庫》採用自訂起源的屬性值提升與語言規則。\n\n### 基本資料\n\n| 生物類型 | 體型 | 速度 | 其他速度 |\n| :--- | :--- | :--- | :--- |\n| 類人 | 中型 | 30 呎 | 無 |\n\n### 種族特質 (Species Traits)\n\n#### 龍族起源 (Draconic Ancestry)\n\n- **效果**：從下表選擇血脈；它決定吐息武器與龍族抗性的傷害類型。\n\n${item.table}\n\n#### 吐息武器 (Breath Weapon)\n\n- **取得／觸發**：執行攻擊動作時，可用一次攻擊替換。\n- **效果**：在 ${item.shape} 呼出魔法能量；範圍內生物進行 DC 8 + 體質調整值 + 熟練加值的敏捷豁免，失敗受血脈傷害、成功半傷。傷害為 1d10，於角色 5、11、17 級分別增為 2d10、3d10、4d10。\n- **限制**：使用次數等同熟練加值，完成長休恢復。\n\n#### 龍族抗性 (Draconic Resistance)\n\n- **效果**：對所選血脈的傷害類型具有抗性。\n\n${item.extra}\n\n## 🔗 相關連結\n\n- [[種族/2014/種族索引|2014 種族索引 (2014 Species Index)]]\n- [[種族/2014/龍裔|龍裔 (Dragonborn，2014 Legacy)]]\n`;
  const page = candidate({ file: item.file, kind: "species", concept: item.english, title: `${name} (${item.english}，2014 Legacy)`, category: "種族", tag: `種族_${name}`, locator: `# ${name} ${item.english}`, body: { destination: path.join(ROOT, "wiki", "種族", "2014", `${name}.md`), content } });
  writableCandidate({ ...page, options });
}

const feats = [
  ["色彩龍賦禮", "Gift of the Chromatic Dragon", "無", ["**繁彩注魔 (Chromatic Infusion)**：以附贈動作為一把簡易或軍用武器注入強酸、寒冷、火焰、閃電或毒素；1 分鐘內命中額外造成 1d4 選定傷害。每次長休後可再使用。", "**反應抗性 (Reactive Resistance)**：受到五種指定傷害之一時以反應取得該次傷害的抗性；使用次數等同熟練加值，長休恢復。"]],
  ["寶石龍賦禮", "Gift of the Gem Dragon", "無", ["**屬性值提升 (Ability Score Increase)**：智力、感知或魅力增加 1，上限 20。", "**念力報復 (Telekinetic Reprisal)**：受到 10 呎內生物傷害時以反應迫使其進行力量豁免；失敗受 2d8 力場傷害並被推離至多 10 呎。使用次數等同熟練加值，長休恢復。"]],
  ["金屬龍賦禮", "Gift of the Metallic Dragon", "無", ["**龍類治療 (Draconic Healing)**：習得療傷術；每次長休可無須法術位施展一次，亦可用既有法術位施展，施法屬性選擇智力、感知或魅力。", "**庇護之翼 (Protective Wings)**：你或 5 呎內可見生物被命中時，以反應使其 AC 對該次攻擊增加熟練加值。使用次數等同熟練加值，長休恢復。"]],
];
for (const [name, english, prerequisite, effects] of feats) {
  const content = `# ${name} (${english}，2014 Legacy)\n\n- **前置條件 (Prerequisite)**：${prerequisite}\n\n## 🌟 專長效果描述\n\n${effects.map((effect) => `- ${effect}`).join("\n\n")}\n\n## 🔗 相關連結\n\n- [[專長/2014/專長索引|專長索引 (2014 Legacy)]]\n`;
  const page = candidate({ file: "龍類專長.md", kind: "feat", concept: english, title: `${name} (${english}，2014 Legacy)`, category: "專長", tag: "專長_通用", locator: `**${name} ${english}**`, body: { destination: path.join(ROOT, "wiki", "專長", "2014", "通用專長", `${name}.md`), content } });
  writableCandidate({ ...page, options });
}

const spells = [
  ["阿莎德隆奔行", "Ashardalon's Stride", 3, "變化", "附贈動作", "自身", "V、S", "專注，至多 1 分鐘", "你移動時不引發藉機攻擊；移動速度增加 20 呎，且首次於一回合內經過生物 5 呎內時可使其受 1d6 火焰傷害。", "每高於 3 環一環，速度再增 5 呎且傷害增 1d6。", "奇械師、遊俠、術士、法師"],
  ["龍類變形", "Draconic Transformation", 7, "變化", "附贈動作", "自身", "V、S、M（一個龍形小雕像，價值至少 500 GP）", "專注，至多 1 分鐘", "獲得 30 呎盲視、60 呎飛行速度與 60 呎錐狀、6d8 力場傷害的吐息武器。", null, "德魯伊、術士、法師"],
  ["費資本鉑金盾", "Fizban's Platinum Shield", 6, "防護", "附贈動作", "60 呎", "V、S、M（一枚鍍上鉑金的龍鱗，價值至少 500 GP）", "專注，至多 1 分鐘", "以鉑金龍盾保護可見生物，提供半身掩護，並對強酸、寒冷、火焰、閃電與毒素傷害具有抗性；後續回合可用附贈動作移動盾牌。", null, "術士、法師"],
  ["納撒爾惡作劇", "Nathair's Mischief", 2, "幻術", "動作", "60 呎", "S、M（一塊麵包皮，來自一個蘋果派）", "專注，至多 1 分鐘", "在可見點創造 20 呎立方的妖精與龍類魔法區域；每回合擲骰決定魅惑、目盲、失能移動或困難地形效應。", null, "吟遊詩人、術士、法師"],
  ["勞洛希姆心靈長槍", "Raulothim's Psychic Lance", 4, "惑控", "動作", "120 呎", "V", "立即", "目標進行智力豁免；失敗受 7d6 心靈傷害並失能至你的下回合開始，成功半傷。", "每高於 4 環一環，傷害增加 1d6。", "吟遊詩人、術士、契術師、法師"],
  ["霧凇霜縛", "Rime's Binding Ice", 2, "塑能", "動作", "自身（30 呎錐狀）", "S、M（一瓶冰雪融化而成的水）", "立即", "錐狀內生物進行體質豁免；失敗受 3d8 寒冷傷害且速度降為 0，成功半傷。", "每高於 2 環一環，傷害增加 1d8。", "術士、法師"],
  ["龍類靈魄召喚術", "Summon Draconic Spirit", 5, "咒法", "動作", "60 呎", "V、S、M（一件帶有巨龍圖案的物品，價值至少 500 GP）", "專注，至多 1 小時", "召喚一個依所選龍類家族具不同抗性與吐息的龍類靈魄。", "以 6 環或更高法術位施展時，靈魄數據採用相應環階。", "德魯伊、術士、法師"],
];
const numeral = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
for (const [name, english, ring, school, time, range, components, duration, effect, higher, classes] of spells) {
  const ringName = `${numeral[ring]}環`; const material = components.includes("M（") ? `- **材料成本與消耗**：${components.match(/M（(.+)）/)?.[1]}；未標示成本／不消耗\n` : "";
  const componentMarker = components.replace(/([,、]\s*)?M（[^）]+）/u, "M").replace(/,\s*/gu, "、");
  const content = `# ${name} (${english}，2014 Legacy)\n\n- **環階**：${ringName}\n- **學派**：${school}\n- **施法時間 (Casting Time)**：${time}\n- **施法距離 (Range)**：${range}\n- **法術成分 (Components)**：${componentMarker}\n${material}- **持續時間 (Duration)**：${duration}\n- **專注 (Concentration)**：${duration.startsWith("專注") ? "是" : "否"}\n- **儀式 (Ritual)**：否\n- **施法職業**：${classes}\n\n## 🔮 法術效果描述\n\n- **效果**：${effect}（來源：《費資本的巨龍寶庫》，玩家選項／巨龍法術詳述，#### ${name}｜${english}）\n${higher ? `- **升環施法 (At Higher Levels)**：${higher}\n` : ""}\n## 🔗 相關連結\n\n- [[法術/2014/${ring}環/${ringName}法術索引|${ringName}法術索引 (2014 Legacy)]]\n${duration.startsWith("專注") ? "- [[專注|專注 (Concentration)]]\n" : ""}`;
  const page = candidate({ file: "巨龍法術詳述.md", kind: "spell", concept: english, title: `${name} (${english}，2014 Legacy)`, category: "法術", tag: `法術_${ringName}`, locator: `#### ${name}｜${english}`, body: { destination: path.join(ROOT, "wiki", "法術", "2014", `${ring}環`, `${name}.md`), content } });
  writableCandidate({ ...page, options });
}

const subclasses = [
  ["武僧", "Monk", "神龍宗", "Way of the Ascendant Dragon", "武僧-神龍宗.md", [[3, "龍之徒", "Draconic Disciple", "獲得龍之威儀（失敗的魅力威嚇或遊說可用反應重擲）、龍之打擊（徒手打擊可改為五種龍類傷害）與龍之言語。"], [3, "龍之息", "Breath of the Dragon", "攻擊動作中的一次攻擊可替換為 20 呎錐狀或 30 呎直線的吐息；傷害為兩個武藝骰，11 級為三個；使用次數等同熟練加值，長休恢復，也可花費 2 點氣使用。"], [6, "龍翼翱翔", "Wings Unfurled", "使用飛簷走壁時短暫展翼，至回合結束前獲得步行速度的飛行速度；使用次數等同熟練加值，長休恢復。"], [11, "古龍姿", "Aspect of the Wyrm", "以附贈動作產生 10 呎、持續 1 分鐘的靈光，選擇駭人威儀或抗性；每次長休後可再用，或花費 3 點氣重用。"], [17, "神龍身", "Ascendant Aspect", "獲得強化吐息、10 呎盲視與使用古龍姿時的怒氣爆發。"]]],
  ["遊俠", "Ranger", "龍獸守衛", "Drakewarden", "遊俠-龍獸守衛.md", [[3, "龍族贈禮", "Draconic Gift", "習得奇術（對你是遊俠法術）並學會龍語或另一種語言。"], [3, "龍獸夥伴", "Drake Companion", "以動作在 30 呎內召喚龍獸；其與你共用先攻並在你回合後行動。長休後可重新召喚，或消耗 1 環以上法術位。"], [7, "牙鱗之聯", "Bond of Fang and Scale", "龍獸長出翅膀；你可騎乘中型龍獸、其啃咬有額外傷害且你獲得同類型抗性。"], [11, "龍獸吐息", "Drake's Breath", "以動作由你或龍獸吐出 30 呎錐狀，造成 8d6 傷害（15 級 10d6）；長休後可重用，或消耗 3 環以上法術位。"], [15, "完美聯結", "Perfected Bond", "龍獸啃咬額外傷害達 2d6、體型增大且可飛行載你；你或龍獸受傷時可用反應提供抗性，次數等同熟練加值、長休恢復。"]]],
];
for (const [parent, parentEnglish, name, english, file, features] of subclasses) {
  const grouped = [...new Map(features.map(([level]) => [level, features.filter(([other]) => other === level)])).entries()];
  const table = grouped.map(([level, values]) => `| ${level} | ${values.map(([, chinese]) => chinese).join("、")} |`).join("\n");
  const detail = features.map(([level, chinese, en, effect]) => `#### ${level} 級：${chinese} (${en})\n\n- **效果**：${effect}`).join("\n\n");
  const content = `# ${name} (${english}，2014 Legacy)\n\n> [!WARNING]\n> 本條目為 2014 舊版子職；採用 2024 [[職業/${parent}|${parent} (${parentEnglish})]] 時，依該職業 3 級選擇子職。\n\n**子職定位**：以龍類力量強化武僧的氣，或讓遊俠與成長的龍獸精魄結伴。\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 子職特性表\n\n| 職業等級 | 子職特性 |\n| :--: | :--- |\n${table}\n\n### 子職特性詳解\n\n${detail}\n\n## 🔗 相關連結\n\n- [[職業/${parent}|${parent} (${parentEnglish})]]\n- [[職業/2014/${parent}/${parent}子職索引|${parent}子職索引 (2014 Legacy)]]\n`;
  const page = candidate({ file, kind: "subclass", concept: english, title: `${name} (${english}，2014 Legacy)`, category: "職業", tag: `子職_${parent}`, locator: `**${name} ${english}**`, body: { destination: path.join(ROOT, "wiki", "職業", "2014", parent, `${name}.md`), content } });
  page.content = page.content.replace(/\n---\n\n#/, `\nentry_type: "子職"\nparent_class: "${parent}"\n---\n\n#`);
  writableCandidate({ ...page, options });
}

console.log("FTD 2021 玩家選項與新增法術已完成預覽或套用。");
