// 只從已核對的群組正文選取變體，不以相鄰版本補寫規則。
export const RARITIES = { common: "普通", uncommon: "非普通", rare: "珍稀", "very rare": "極珍稀", legendary: "傳說", artifact: "神器" };
export function specializeVariantRules(entry, source, rules) {
  if (!entry.parentEntityId) return { rules, complete: true };
  if (!source) return { rules, complete: false, reason: "變體缺少來源正文" };
  const bonus = source.name.match(/^\+[123]/u)?.[0];
  let complete = false;
  if (["TCE2020", "FTD2021"].includes(entry.publicationId) && bonus && JSON.stringify(source.entries ?? []).includes(bonus)) {
    const details = {
      "Arcane Grimoire": `持握此書時，可將它作為法師法術的施法法器；你的法師法術攻擊檢定與法術豁免 DC 獲得 ${bonus} 加值。`,
      "All-Purpose Tool": `持握此工具時，你的奇械師法術攻擊檢定與法術豁免 DC 獲得 ${bonus} 加值。`,
      "Amulet of the Devout": `佩戴此聖徽時，你的法術攻擊檢定與法術豁免 DC 獲得 ${bonus} 加值。此加值沒有另限於牧師或聖騎士法術。`,
      "Bloodwell Vial": `穿戴或持握此瓶時，可將它作為施法法器；你的術士法術攻擊檢定與法術豁免 DC 獲得 ${bonus} 加值。攜帶此瓶並擲生命骰恢復生命值時，可恢復 5 點術法點；此能力使用後須等到下次黎明才能再使用。`,
      "Rhythm-Maker's Drum": `持握此鼓時，你的吟遊詩人法術攻擊檢定與法術豁免 DC 獲得 ${bonus} 加值。`,
      "Dragonhide Belt": `穿戴此腰帶時，你的氣特性之豁免 DC 獲得 ${bonus} 加值。`,
      "Moon Sickle": `持握此鐮刀時，使用它進行的攻擊檢定與傷害擲骰獲得 ${bonus} 加值；你的德魯伊與遊俠法術攻擊檢定及法術豁免 DC 也獲得 ${bonus} 加值。`,
    };
    const detail = details[source.name.replace(/^\+[123] /u, "")];
    if (detail) {
      rules = rules.replace("（原文沒有說是牧師/聖騎士法術限定，但我覺得是他漏了。）", "")
        .replaceAll("奧術回想", "奧術恢復").replaceAll("詩人激勵", "吟遊詩人激勵");
      rules += `\n\n### 本變體加值\n\n- ${detail}`;
      complete = true;
    }
  } else if (entry.publicationId === "DMG2024" && bonus && /### 變體/u.test(rules)) {
    const rows = rules.split("\n").filter(l=>/^\|\s*\+[123]\b/u.test(l));
    const selected = rows.filter(l=>l.startsWith(`| ${bonus} `));
    if (rows.length === 3 && selected.length === 1) {
      rules = rules.split("\n").filter(l=>!rows.includes(l)||selected.includes(l)).join("\n");
      complete = true;
    }
  } else if (entry.parentEntityId === "entry:TCE2020:magic-item:72a8550ba2") {
    const rarity = RARITIES[source.rarity];
    const rows = rules.split("\n").filter(l=>/^\s*\| (非普通|珍稀|極珍稀) \|/u.test(l));
    const selected = rows.filter(l=>l.trimStart().startsWith(`| ${rarity} |`));
    if (rows.length === 3 && selected.length === 1) {
      rules = rules.split("\n").filter(l=>!rows.includes(l)||selected.includes(l)).join("\n");
      complete = true;
    }
  } else if (entry.parentEntityId === "entry:DMG2024:entry:b9adf2f970") {
    const element = { Air: "氣", Earth: "土", Fire: "火", Water: "水" }[source.name.match(/\((\w+)\)$/u)?.[1]];
    const detail = rules.split("\n").filter(l=>/^\s+- \*\*[氣土火水]\*\*：/u.test(l));
    const rows = rules.split("\n").filter(l=>/^\| [氣土火水] \|/u.test(l));
    if (element && detail.length === 4 && rows.length === 4) {
      rules = rules.split("\n").filter(l=>(!detail.includes(l)||l.includes(`**${element}**`))&&(!rows.includes(l)||l.startsWith(`| ${element} |`))).join("\n");
      complete = true;
    }
  } else if (entry.parentEntityId === "entry:BPGG2023:magic-item:759cbc51c8") {
    const creatures = {
      "Carnelian Triceratops": ["三角龍", 6, 10, "可作為坐騎騎乘。"],
      "Jasper Tyrannosaurus Rex": ["霸王龍", 1, 14, "每次命令霸王龍形態的塑像時（包括命令其變回塑像），擲一枚 d20；結果為 1 時失去控制，它會敵視你與同伴，直到生命值降至 0 並變回塑像。"],
      "Kyanite Pteranodon": ["無齒翼龍", 8, 7, "若你的體型為中型或更小，可將它作為坐騎。"],
      "Pyrite Plesiosaurus": ["蛇頸龍", 12, 4, "可作為坐騎；騎乘期間可透過它隨意施展水下呼吸。"],
    };
    const selected = creatures[source.name.split(", ")[1]];
    if (selected) {
      const [creature, hours, days, extra] = selected;
      rules = `## 規則條文\n\n- 執行一個動作，說出命令詞並將塑像投向自身 60 呎內的地面，使它變為${creature}。若出現位置被生物或物件佔據，或空間不足，則不會變形。\n- 生物對你與同伴友好，理解你的語言並遵從口頭命令；未獲命令時只保護自己，不採取其他動作。生物數據依該物品來源指定的《Monster Manual》版本。\n- 最多維持 ${hours} 小時；時間結束或生命值降至 0 時變回塑像。你也可在觸碰它時執行動作，說出命令詞使它提前變回塑像。\n- 使用後須經過 ${days} 天才能再次使用。${extra}`;
      complete = true;
    }
  } else if (entry.parentEntityId === "entry:FRAIF2025:magic-item:mechanical-wonders") {
    const start = "## 規則條文\n\n- 啟動前為休眠物件。使用該物件專屬的手持鑰匙花 1 分鐘上弦，期間每回合都須執行操作動作。\n";
    if (source.name === "Mechanical Wonder (Gyrocopter)") {
      rules = start + "- 啟動後可作為載具使用，持續 8 小時，需要 1 名駕駛。\n- 此物件體型巨型，重 500 磅；AC 14、生命值 50、速度 5 呎、飛行速度 20 呎。最多承載 2,000 磅貨物，超重時停止運作。\n- 貨艙內有 8 條靈體繩索。乘坐者可執行操作動作，將自己繫上或解開其中一條。繫上繩索者可跳出載具滑翔，每下降 1 呎最多水平移動 5 呎。若與載具距離超過 500 呎，繩索立即消失並返回載具。";
      complete = true;
    } else if (source.name === "Mechanical Wonder (Mobility)") {
      rules = start + "- 依身體構造穿戴於背部或身側；啟動後變為個人移動裝置，持續 24 小時。\n- 運作期間將你的速度提高至 30 呎。除非你允許，其他生物不能將此裝置從你身上移除。";
      complete = true;
    } else if (source.name === "Mechanical Wonder (Domestic)") {
      rules = start + "- 啟動後使用家用型奇具資料卡；它是你與盟友的盟友，使用你的先攻並在你的回合後行動，遵從口頭命令。未獲指令時執行迴避動作並遠離危險；生命值降至 0 時被摧毀。\n- 另一名生物使用專用鑰匙上弦後，持續運作 10 天；持鑰匙的生物可用操作動作觸碰它以停用。";
      complete = true;
    } else if (source.name === "Mechanical Wonder (Flying)") {
      rules = start + "- 啟動後使用飛空型奇具資料卡；它是你與盟友的盟友，使用你的先攻並在你的回合後行動，遵從口頭命令。未獲指令時執行迴避動作並遠離危險；生命值降至 0 時被摧毀。\n- 另一名生物使用專用鑰匙上弦後，持續運作 10 天；持鑰匙的生物可用操作動作觸碰它以停用。";
      complete = true;
    } else {
      return { rules, complete: false, reason: "機巧奇具變體缺少可核對的來源正文" };
    }
  }
  if (complete) rules = rules.replace(/^(\| 稀有度[^|]*\|)[^|]*(\|)/mu, `$1 ${RARITIES[source.rarity] ?? source.rarity} $2`);
  return { rules, complete, reason: complete ? null : "變體正文待逐項整理與覆核" };
}
