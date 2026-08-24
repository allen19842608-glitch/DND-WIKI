import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions();
const publicationId = "BPGG2023";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root, profile.inputs.character_options);
const sourceOf = (file) => path.relative(ROOT, file).split(path.sep).join("/");
function page({ sourceFile, kind, concept, title, category, tag, locator, destination, content, extra = "" }) {
  const source = sourceOf(path.join(sourceRoot, sourceFile));
  const meta = frontmatter({ publicationId, publication, kind, concept, title, category, tag, source, locator });
  return { destination, content: `${meta.replace(/\n---$/, `${extra}\n---`)}\n\n${content}` };
}

const backgrounds = [
  ["巨人養子", "Giant Foundling", "背景_巨人養子.md", "威嚇、生存", "巨人語與另一項自選語言", "背包、旅行服裝、家鄉紀念物，以及 10 GP", "巨人打擊", "依巨人養子起源選擇一種巨人打擊專長的增益；角色可在滿足軍用武器熟練先決條件時改以一般方式選擇該專長。"],
  ["符文雕刻者", "Rune Carver", "背景_符文雕刻者.md", "歷史、察覺", "巨人語", "一套自選工匠工具、小刀、打磨石、普通服裝，以及 10 GP", "符文塑形者", "獲得符文塑形者專長；如不採用專長規則，改以其來源特性提供的符文魔法處理。"],
];
for (const [name, english, sourceFile, skills, languages, equipment, feat, effect] of backgrounds) {
  const content = `# ${name} (${english}，2014 Legacy)\n\n> [!WARNING]\n> 本條目為 2014 時期背景；使用 2024 角色建立規則時，背景的屬性值提升、起源專長與裝備替換依《玩家手冊 2024》的舊版背景併用規則處理。\n\n## ⚙️ 規則條文 (Rule Text)\n\n- **技能熟練**：${skills}\n- **語言**：${languages}\n- **裝備**：${equipment}\n\n### 背景特性：${feat}\n\n- **效果**：${effect}\n\n## 🔗 相關連結\n\n- [[背景/背景索引|背景索引 (Background Index)]]\n- [[專長/2014/通用專長/${feat}|${feat} (${feat === "巨人打擊" ? "Strike of the Giants" : "Rune Shaper"}，2014 Legacy)]]\n`;
  const candidate = page({ sourceFile, kind: "background", concept: english, title: `${name} (${english}，2014 Legacy)`, category: "背景", tag: `背景_${name}`, locator: `# ${name}`, destination: path.join(ROOT, "wiki", "背景", "2014", `${name}.md`), content });
  writableCandidate({ ...candidate, options });
}

const feats = [
  ["符文塑形者", "Rune Shaper", "施法特性或符文雕刻者背景", ["**通曉語言 (Comprehend Languages)**：習得通曉語言；每次長休可無須法術位施展一次，且可用既有法術位施展。", "**符文魔法 (Rune Magic)**：知曉數量等同熟練加值一半（向下取整）的符文。每次長休可將已知符文刻在非魔法物件上；它使你暫時習得對應的一環法術，並可每次長休以無須法術位、無須材料成分方式施展其中一次。施法屬性選擇智力、感知或魅力。"]],
  ["巨人打擊", "Strike of the Giants", "軍用武器熟練或巨人養子背景", ["**巨人打擊 (Giant Strike)**：每回合一次，近戰武器攻擊或投擲武器遠程攻擊命中時，從雲霧、火焰、寒霜、山丘、岩石、風暴六種打擊擇一，附加傷害與相應豁免／控制效果。DC 為 8 + 熟練加值 + 力量或體質調整值；使用次數等同熟練加值，長休恢復。"]],
  ["火巨人之餘燼", "Ember of the Fire Giant", "4 級以上，巨人打擊（火焰打擊）", ["**屬性值提升 (Ability Score Increase)**：力量、體質或感知增加 1，上限 20。", "**生於烈焰 (Born of Flame)**：獲得火焰傷害抗性。", "**熾熱灼燒 (Searing Ignition)**：攻擊動作中的一次攻擊可替換為 15 呎半徑火焰爆發；敏捷豁免失敗受 1d8 + 熟練加值火焰傷害且目盲至你的下回合開始，成功半傷。使用次數等同熟練加值，長休恢復。"]],
  ["霜巨人之狂怒", "Fury of the Frost Giant", "4 級以上，巨人打擊（寒霜打擊）", ["**屬性值提升 (Ability Score Increase)**：力量、體質或感知增加 1，上限 20。", "**生於冰霜 (Born of Ice)**：獲得寒冷傷害抗性。", "**霜寒回擊 (Frigid Retaliation)**：30 呎內可見生物以攻擊命中並傷害你後，以反應使其體質豁免；失敗受 1d8 + 熟練加值寒冷傷害且速度降為 0 至其回合結束。使用次數等同熟練加值，長休恢復。"]],
  ["雲巨人之詭詐", "Guile of the Cloud Giant", "4 級以上，巨人打擊（雲霧打擊）", ["**屬性值提升 (Ability Score Increase)**：力量、體質或魅力增加 1，上限 20。", "**迷雲逃逸 (Cloudy Escape)**：被可見生物的攻擊命中時，以反應獲得該次傷害抗性，然後傳送至 30 呎內可見且未佔據空間。使用次數等同熟練加值，長休恢復。"]],
  ["石巨人之敏銳", "Keenness of the Stone Giant", "4 級以上，巨人打擊（岩石打擊）", ["**屬性值提升 (Ability Score Increase)**：力量、體質或感知增加 1，上限 20。", "**洞穴視覺 (Cavernous Sight)**：獲得 60 呎黑暗視覺；已有黑暗視覺則距離增加 60 呎。", "**投擲石塊 (Stone Throw)**：以附贈動作觸碰石頭並作 60 呎遠程法術攻擊；命中造成 1d10 力場傷害，目標力量豁免失敗則伏地。使用次數等同熟練加值，長休恢復。"]],
  ["風暴巨人之靈魂", "Soul of the Storm Giant", "4 級以上，巨人打擊（風暴打擊）", ["**屬性值提升 (Ability Score Increase)**：力量、感知或魅力增加 1，上限 20。", "**旋渦靈光 (Maelstrom Aura)**：以附贈動作產生 10 呎靈光至下回合開始；你對閃電與雷鳴傷害具抗性、針對你的攻擊具劣勢，靈光內生物開始回合時可被迫作力量豁免。使用次數等同熟練加值，長休恢復。"]],
  ["山丘巨人之健強", "Vigor of the Hill Giant", "4 級以上，巨人打擊（山丘打擊）", ["**屬性值提升 (Ability Score Increase)**：力量、體質或感知增加 1，上限 20。", "**不動如山 (Bulwark)**：受到會使你移動至少 5 呎或伏地的效應時，可以反應避免該移動與伏地。", "**鋼鐵腸胃 (Iron Stomach)**：短休時進食且消耗生命骰治療後，額外恢復體質調整值 + 熟練加值生命值。"]],
];
for (const [name, english, prerequisite, effects] of feats) {
  const content = `# ${name} (${english}，2014 Legacy)\n\n- **前置條件 (Prerequisite)**：${prerequisite}\n\n## 🌟 專長效果描述\n\n${effects.map((effect) => `- ${effect}`).join("\n\n")}\n\n## 🔗 相關連結\n\n- [[專長/2014/專長索引|專長索引 (2014 Legacy)]]\n`;
  const candidate = page({ sourceFile: "專長.md", kind: "feat", concept: english, title: `${name} (${english}，2014 Legacy)`, category: "專長", tag: "專長_通用", locator: `**${name} ${english}**`, destination: path.join(ROOT, "wiki", "專長", "2014", "通用專長", `${name}.md`), content });
  writableCandidate({ ...candidate, options });
}

const featureRows = [
  [3, "巨人之力", "Giant's Power", "習得巨人語或另一種語言，並獲得巨人打擊專長；若已有巨人打擊，改選其一種打擊選項。"],
  [3, "巨人之災", "Giant's Havoc", "狂暴時，你擲骰決定或選擇一種巨人災變；獲得粉碎投擲或巨人體型等強化。"],
  [6, "元素戰刃", "Elemental Cleaver", "將武器灌注為元素武器，使其可投擲、返回，並造成額外元素傷害。"],
  [10, "偉力推動", "Mighty Impel", "以附贈動作移動自己或生物／物件；依體型與力量限制判定距離。"],
  [14, "創世巨像", "Demiurgic Colossus", "狂暴時體型與觸及進一步提升，元素戰刃與巨人之災獲得強化。"],
];
const table = [...new Map(featureRows.map(([level]) => [level, featureRows.filter(([other]) => other === level)])).entries()].map(([level, rows]) => `| ${level} | ${rows.map(([, name]) => name).join("、")} |`).join("\n");
const detail = featureRows.map(([level, name, english, effect]) => `#### ${level} 級：${name} (${english})\n\n- **效果**：${effect}`).join("\n\n");
const subclassContent = `# 巨人道途 (Path of the Giant，2014 Legacy)\n\n> [!WARNING]\n> 本條目為 2014 舊版子職；採用 2024 [[職業/野蠻人|野蠻人 (Barbarian)]] 時，依該職業 3 級選擇子職。\n\n**子職定位**：以巨人的體格、投擲與元素力量擴張狂暴的野蠻人。\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 子職特性表\n\n| 職業等級 | 子職特性 |\n| :--: | :--- |\n${table}\n\n### 子職特性詳解\n\n${detail}\n\n## 🔗 相關連結\n\n- [[職業/野蠻人|野蠻人 (Barbarian)]]\n- [[職業/2014/野蠻人/野蠻人子職索引|野蠻人子職索引 (2014 Legacy)]]\n`;
const subclass = page({ sourceFile: "子職業選項_野蠻人_巨人道途.md", kind: "subclass", concept: "Path of the Giant", title: "巨人道途 (Path of the Giant，2014 Legacy)", category: "職業", tag: "子職_野蠻人", locator: "**巨人道途 Barbarian: Path of the Giant**", destination: path.join(ROOT, "wiki", "職業", "2014", "野蠻人", "巨人道途.md"), content: subclassContent, extra: "\nentry_type: \"子職\"\nparent_class: \"野蠻人\"" });
writableCandidate({ ...subclass, options });

console.log("BPGG 2023 玩家選項已完成預覽或套用。");
