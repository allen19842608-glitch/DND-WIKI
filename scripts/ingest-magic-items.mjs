import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const itemType = process.argv.slice(2).find((value) => !value.startsWith("--")) ?? "戒指";
const force = process.argv.includes("--force");
const apply = process.argv.includes("--apply");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : undefined;
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const sourceDir = path.join(root, "原始資料", "城主指南2024", "第七章_寶藏", "魔法物品詳述", itemType);
const outputDir = path.join(root, "wiki", "魔法物品", itemType);
if (apply) fs.mkdirSync(outputDir, { recursive: true });

function effectName(text) {
  const boldName = text.match(/^(?:\*\s+)?\*\*([^*]+?)\*\*[。.]?/);
  if (boldName) return boldName[1].replace(/\s+[A-Za-z].*$/, "").trim();
  if (/固定在原處/.test(text)) return "固定權杖";
  if (/從氣元素位面召喚/.test(text)) return "召喚氣巨靈";
  if (/被召喚期間.*態度友好/.test(text)) return "氣巨靈命令";
  if (/氣巨靈消失後/.test(text)) return "召喚限制";
  if (/X 射線視覺/.test(text)) return "X 射線視覺";
  if (/閱讀你的思想/.test(text)) return "心靈防護";
  if (/無法被察覺/.test(text)) return "隱匿戒指";
  if (/靈魂將進入戒指/.test(text)) return "靈魂寄宿";
  if (/施展\*水上行走/.test(text)) return "施展水上行走";
  if (/舞光術.*光亮術/.test(text)) return "施展光照法術";
  if (/球體都出現.*維持專注/.test(text)) return "球狀閃電持續時間";
  if (/困難地形.*麻痺.*束縛/.test(text)) return "自由行動";
  if (/墜落時每輪/.test(text)) return "羽落";
  if (/施展\*跳躍術/.test(text)) return "施展跳躍術";
  if (/寒冷傷害.*減少/.test(text)) return "寒冷傷害減免";
  if (/0 華氏度/.test(text)) return "低溫防護";
  if (/替代該目標成為此次攻擊的目標/.test(text)) return "吸矢";
  if (/感知距你最近.*類型相同的龍類/.test(text)) return "感知龍類";
  if (/使其活化/.test(text) && /盾牌/.test(text)) return "活化";
  if (/敏捷（隱匿）檢定具有劣勢.*力量屬性具有要求/.test(text)) return "秘銀輕量化";
  if (/魔法硬頭鎚/.test(text)) return "魔法硬頭鎚";
  if (/魔契師法術.*加值/.test(text)) return "魔契法術加值";
  if (/恢復一個法術位/.test(text)) return "恢復法術位";
  if (/吸收.*法術/.test(text)) return "吸收法術";
  if (/知曉.*吸收.*能量/.test(text)) return "儲存能量";
  if (/轉化為法術位/.test(text)) return "轉化法術能量";
  if (/激活.*半位面/.test(text)) return "庇護半位面";
  if (/生命骰/.test(text)) return "半位面休養";
  if (/停留時間耗盡/.test(text)) return "返回原處";
  if (/停止發光.*結束這個效應/.test(text)) return "防護靈光持續時間";
  if (/重擊.*普通命中/.test(text)) return "重擊防護";
  if (/魔法.*動作.*脫下.*護甲/.test(text)) return "快速脫甲";
  if (/\bAC\b.*加值|護甲等級.*加值/.test(text)) return "護甲等級加值";
  if (/游泳速度/.test(text)) return "游泳速度";
  if (/恢復.*生命值|生命值.*恢復/.test(text)) return "生命恢復";
  if (/施展.*祈願術/.test(text)) return "祈願術";
  if (/施展.*心靈遙控/.test(text)) return "心靈遙控";
  if (/施展.*法術/.test(text)) return "施展法術";
  if (/隱形/.test(text)) return "隱形";
  if (/抗性/.test(text)) return "傷害抗性";
  if (/充能/.test(text)) return "充能效果";
  if (/豁免/.test(text)) return "豁免防護";
  if (/護甲等級/.test(text)) return "護甲防護";
  if (/先攻.*優勢|察覺.*優勢/.test(text)) return "警戒優勢";
  return "特殊能力";
}

function normalizeText(text) {
  return text
    .replace(/(\d)(?:尺)/g, "$1 呎")
    .replace(/(\d)(?:磅)/g, "$1 磅")
    .replace(/\bDC(\d+)/g, "DC $1")
    .replace(/(\d)(?:充能)/g, "$1 充能");
}

function limitRecovery(text) {
  const sentences = normalizeText(text).match(/[^。]*。/g) ?? [];
  const limits = sentences.filter((sentence) => /直至|每日黎明|每天|長休|短休|充能耗盡|無法再次使用|最多\s*\d|持續\s*\d|死亡|消失/.test(sentence));
  return limits.length ? `\n  - **限制與恢復**：${limits.join("")}` : "";
}

function isDescription(text) {
  if (/可以使用以下額外詞條/.test(text)) return true;
  if (/具有以下詞條/.test(text)) return true;
  if (/正面呈現出一張臉.*改變.*表情/.test(text)) return true;
  if (/通常由.*象徵贈予/.test(text)) return true;
  if (/連接著四個元素位面之一/.test(text)) return true;
  if (/具有以下兩種詞條/.test(text)) return true;
  return /(?:是以.*製成|飾有.*紋樣|外表|傳說.*製作|由.*強化|無害無味.*煙霧|無害.*煙霧|永遠不會髒|正面呈現出一張臉.*改變.*表情)/.test(text)
    && !/(?:獲得|可以|能夠|具有|當你|受到|執行|消耗|恢復)/.test(text);
}

for (const file of fs.readdirSync(sourceDir).filter((name) => name.endsWith(".md"))) {
  const lines = fs.readFileSync(path.join(sourceDir, file), "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^#{2,3}\s+(.+?)\s+([A-Za-z].*)$/);
    if (!match) continue;
    const [, chinese, english] = match;
    const filename = chinese.replace(/[\\/:*?"<>|\[\]()]/g, "");
    const destination = path.join(outputDir, `${filename}.md`);
    if (only && !filename.includes(only) && !english.toLowerCase().includes(only.toLowerCase())) continue;
    if (fs.existsSync(destination) && !force) continue;
    const meta = lines.slice(i + 1, i + 4).map((line) => line.trim()).find((line) => /^\*[^*]+\*$/.test(line)) ?? "";
    const itemCategory = meta.match(/^\*(.+?)(?:，)?(?:普通|非普通|珍稀|極珍稀|傳說|神器|多種稀有度)(?:（[^）]+）)?\*$/)?.[1] ?? itemType;
    const rarity = meta.match(/[），]，(普通|非普通|珍稀|極珍稀|傳說|神器)/)?.[1] ?? path.basename(file, ".md");
    const attunement = meta.includes("需同調") ? "需要" : "不需要";
    const paragraphs = [];
    const tables = [];
    let table = [];
    for (let j = i + 1; j < lines.length && !/^#{2,3}\s+/.test(lines[j]); j += 1) {
      const text = lines[j].trim();
      if (text.startsWith("|")) { table.push(text); continue; }
      if (table.length) { tables.push(table.join("\n")); table = []; }
      if (text && !/^\*[^*]+\*$/.test(text)) {
        if (/^\*\s+/.test(text) && paragraphs.length) paragraphs[paragraphs.length - 1] += `\n${text}`;
        else paragraphs.push(text);
      }
    }
    if (table.length) tables.push(table.join("\n"));
    const descriptions = paragraphs.filter(isDescription);
    const effectParagraphs = paragraphs.filter((text) => !isDescription(text));
    const possession = itemType === "權杖" ? "持握" : "著裝";
    const effects = effectParagraphs.map((text) => `- **${effectName(text)}**：\n  - **啟用／觸發**：${possession}${attunement === "需要" ? "並同調" : ""}期間；依效果所列時機。\n  - **效果與數值**：${normalizeText(text).replace(/\n/g, "\n    ")}${limitRecovery(text)}`).join("\n\n");
    const source = `原始資料/城主指南2024/第七章_寶藏/魔法物品詳述/${itemType}/${file}`;
    const randomTables = tables.length ? `\n### 隨機表\n\n${tables.join("\n\n")}\n` : "";
    const descriptionSection = descriptions.length ? `\n## 物品描述\n\n${descriptions.join("\n\n")}\n` : "";
    const effectsSection = effects ? `\n### 物品效果\n\n${effects}` : "";
    const dmSection = effects ? `\n## 💡 實戰應用與裁量 (DM Ruling)\n\n- **常見誤區**：啟用、充能與限制均依各效果的來源描述。\n` : "";
    const page = `---\ntitle: "${chinese} (${english})"\ncategory: "魔法物品"\nversion: "2024-Core"\ntags:\n  - "城主指南2024"\n  - "魔法物品_${itemType}"\nsources:\n  - file: "${source}"\n    locator: "L${i + 1} 標題：${chinese}"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Dungeon Master's Guide (2024)"\nerrata: []\nupdated: "${updated}"\n---\n\n# ${chinese} (${english})${descriptionSection}\n## ⚙️ 規則條文 (Rule Text)\n\n### 物品資料\n\n| 項目 | 內容 |\n| :--- | :--- |\n| 類別 (Category) | ${itemCategory} |\n| 稀有度 (Rarity) | ${rarity} |\n| 同調 (Attunement) | ${attunement} |\n| 消耗品 (Consumable) | 否 |\n| 充能 (Charges) | 依效果說明 |\n${effectsSection}${randomTables}${dmSection}\n## 🔗 相關連結\n\n- 無。\n`;
    if (apply) fs.writeFileSync(destination, page, "utf8");
    console.log(`${apply ? "匯入" : "預覽"}：${path.relative(root, destination)}`);
  }
}
