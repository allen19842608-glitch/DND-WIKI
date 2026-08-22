import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const magicItemRoot = path.join(root, "wiki", "魔法物品");
const apply = process.argv.includes("--apply");
const genericName = "特殊能力";

function walkMarkdown(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkMarkdown(target));
    else if (entry.isFile() && entry.name.endsWith(".md")) result.push(target);
  }
  return result;
}

function stripMarkdown(value) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function effectNameFromText(text, title) {
  const effectContent = text.match(/(?:^|\n)\s*-\s*\*\*效果\*\*：(.*)/s)?.[1] ?? text;
  const plain = stripMarkdown(effectContent).replace(/^(?:-\s*)+/, "");
  const sourceHeading = plain.match(/^([^。；：:]{1,40}?)\s+[A-Za-z][A-Za-z '\-]+(?:[。:：]|\s|（)/);
  if (sourceHeading) return { name: sourceHeading[1].trim(), confidence: "source-heading" };

  const rules = [
    [/次要增益詞條/, "次要增益詞條"],
    [/主要增益詞條/, "主要增益詞條"],
    [/次要減益詞條/, "次要減益詞條"],
    [/主要減益詞條/, "主要減益詞條"],
    [/隨機詞條/, "隨機詞條"],
    [/施展.{0,30}(?:法術|術)/, "可施展法術"],
    [/(?:取代|替代).{0,20}(?:肢體|身體部位)/, "肢體替代"],
    [/(?:裝好|安裝|植入|卸除|移除).{0,30}(?:肢體|義眼|假肢)/, "安裝與移除"],
    [/裝好或者卸除|非自願.*移除/, "安裝與移除"],
    [/不能成為預言法術的目標|魔法傳感器察覺/, "反偵測"],
    [/確認地磁北方|地磁北方/, "辨識北方"],
    [/水下.{0,40}(?:呼吸|空氣泡)/, "水下呼吸"],
    [/火巨靈.*出現|釋放.*火巨靈/, "釋放火巨靈"],
    [/第一次被打開.*表格|表格.*決定會發生/, "隨機結果"],
    [/珠子.{0,40}火球術.*傷害/, "強化火球"],
    [/命令語.*(?:淡水|鹹水)|(?:淡水|鹹水).*命令語/, "出水命令"],
    [/開關這個瓶子|開關此瓶/, "開關煙壺"],
    [/光環區域.*擴大|最大達到120/, "煙雲擴散"],
    [/煙霧|煙雲/, "煙雲效果"],
    [/湮滅法球|黑色球體.*空洞/, "湮滅效應"],
    [/雕像.{0,40}(?:持續時間|變回)/, "雕像持續時間"],
    [/獲得(?:以下|下列|下述|三項|額外).{0,20}增益|提供(?:以下|下列|下述|三項).{0,20}增益/, "持用增益"],
    [/放棄擲骰.*取10/, "固定攻擊骰值"],
    [/鬍鬚/, "矮人鬍鬚"],
    [/投射.*幻影|看起來像是站在/, "移位幻影"],
    [/巧手.*加值/, "巧手加值"],
    [/輕度遮蔽.*躲藏|執行躲藏動作/, "自然匿蹤"],
    [/短語.*條件|教會它說/, "預設短語"],
    [/跳躍.{0,30}(?:30|呎)|消耗10 呎移動力/, "強化跳躍"],
    [/互擊腳後跟|移動速度將加倍/, "加速步伐"],
    [/魔法效應將不再對你生效/, "加速限制"],
    [/作為施法法器|代替材料/, "施法法器"],
    [/類人生物的屍體.*復活|死者復活/, "復活儀式"],
    [/囚禁生物|囚禁了一名/, "囚禁生物"],
    [/船形態|划艇與龍骨船/, "船隻形態"],
    [/努力行善|善舉|慷慨/, "善行限制"],
    [/(?:只能|無法|不可).{0,60}再次使用|(?:使用後|一經使用).{0,60}(?:再次使用|無法)/, "使用限制"],
    [/每盎司.*膠|黏在一起|凝固/, "黏著效果"],
    [/活化掃帚|掃帚.*變形/, "活化掃帚"],
    [/精神性.*指揮|指揮它/, "掃帚指揮"],
    [/馬蹄鐵.*懸浮|無視困難地形/, "懸浮坐騎"],
    [/操控.*骰出|操控.*點數/, "操控骰值"],
    [/用作載具|氣密和水密|艙內的空氣/, "載具艙室"],
    [/推拉.*拉桿|拉桿的功能/, "拉桿操作"],
    [/鏡子.*被囚禁生物|牢房的編號/, "囚犯通訊"],
    [/背包.*被摧毀|背包.*破裂/, "背包損毀"],
    [/袋子.*空氣|呼吸10/, "袋內空氣"],
    [/移除卷冊封面的舌頭|法術將被永久抹除/, "移除封印"],
    [/維克那.*密文/, "維克那密文"],
    [/魅力（欺瞞和遊說）|香水.*持續1小時/, "社交魅惑"],
    [/製造一個魔像|魔像.*工作/, "製作魔像"],
    [/魔像.*活化|服從你的控制/, "魔像活化"],
    [/豆子.*種入|種下的區域.*效應/, "種植效果"],
    [/三件毛絨物件|直至下個黎明才可再次使用/, "使用限制"],
    [/攻擊檢定並擲出20.*構裝生物|構裝生物.*被摧毀/, "構裝毀壞"],
    [/傳遞自己的情緒|夢境或幻象.*交流/, "武器溝通"],
    [/妖精.*非書面交流/, "妖精交流"],
    [/白羽山.*地下城|藏在白羽山|失落在白羽山/, "背景故事"],
    [/魔法武器具有以下(?:額外|附加)詞條|武器具有以下附加詞條/, "附加詞條"],
    [/拋到空中|武器將懸浮/, "舞空攻擊"],
    [/懸浮期間.*飛行|浮空狀態下攻擊/, "舞空操控"],
    [/飛回並試圖回到你的手中|停止懸浮/, "舞空結束"],
    [/仇敵還活著.*劣勢/, "仇敵限制"],
    [/相應形態.*額外詞條/, "形態詞條"],
    [/非魔法火焰熄滅/, "熄滅火焰"],
    [/吞食靈魂|負能量的虛無|虛無主義/, "武器意志"],
    [/三天或更長時間沒吞吃靈魂|反噬其持用者/, "靈魂飢渴"],
    [/鋼鐵頭盔.*眼睛亮起|臉部.*陰影/, "恐怖外觀"],
    [/通用語字母表|心型的木製占卜板/, "通靈板構造"],
    [/鑄鐵側邊.*英雄群像/, "物品外觀"],
    [/幻術.*偽裝的毒藥|鑑定術.*揭露其本質/, "偽裝毒藥"],
    [/黃黑相間.*漩渦/, "物品外觀"],
    [/透明的凝膠狀油膏|銀色碎片/, "物品外觀"],
    [/像菠菜的濃稠綠色流體/, "物品外觀"],
    [/(?:獲得|受到).{0,20}法術.{0,20}(?:效應|效果)/, "法術效果"],
    [/(?:傳說|很久以前|現存世|製作並使用|歷史|設定中)/, "背景故事"],
    [/(?:外觀|看上去|液體|藥液|容器|雕刻|飾有|製成|散發|一縷|顏色|形狀)/, "物品外觀"],
    [/力量.{0,20}(?:變為|提升)/, "力量設定"],
    [/體質.{0,20}(?:變為|提升)/, "體質設定"],
    [/敏捷.{0,20}(?:變為|提升)/, "敏捷設定"],
    [/智力.{0,20}(?:變為|提升)/, "智力設定"],
    [/感知.{0,20}(?:變為|提升)/, "感知設定"],
    [/魅力.{0,20}(?:變為|提升)/, "魅力設定"],
    [/黑暗視覺/, "黑暗視覺"],
    [/速度.{0,20}(?:增加|提升|減少)/, "速度調整"],
    [/飛行速度|在空中飛行|飛往/, "飛行"],
    [/攀爬速度/, "攀爬速度"],
    [/臨時生命值/, "臨時生命值"],
    [/生命值.{0,20}(?:恢復|減少|上限)/, "生命值效果"],
    [/(?:目盲|耳聾|麻痺|中毒|力竭).{0,30}(?:結束|免疫|移除)/, "狀態防護"],
    [/法術攻擊檢定.{0,30}(?:加值|掩護)/, "法術攻擊加值"],
    [/攻擊檢定和傷害擲骰.{0,30}加值/, "攻擊與傷害加值"],
    [/攻擊檢定.{0,30}加值/, "攻擊檢定加值"],
    [/重擊|d20中(?:骰出|投出)20/, "重擊效果"],
    [/徒手打擊/, "徒手打擊效果"],
    [/命令.{0,30}(?:生物|元素|蛇|鳥|巨人|盟友)/, "命令生物"],
    [/對你.{0,20}態度|態度.{0,20}(?:友好|冷漠|敵對)/, "生物態度"],
    [/異次元(?:空間|牢房|生物)/, "異次元空間"],
    [/解除|釋放|逃脫/, "解除與釋放"],
    [/轉變|變成|變為|恢復成/, "變形"],
    [/漂浮/, "漂浮"],
    [/光照|發光|微光/, "光照"],
    [/卡牌|抽牌/, "卡牌效果"],
    [/重量/, "重量與載重"],
    [/飛行速度|在空中飛行|飛往/, "飛行"],
    [/額外造成.*傷害|造成.*傷害/, "額外傷害"],
    [/抗性|免疫/, "傷害防護"],
    [/護甲等級|\bAC\b/, "護甲等級加值"],
    [/隱形/, "隱形效果"],
    [/傳送|位面/, "位面移動"],
    [/召喚/, "召喚生物"],
    [/充能/, "充能使用"],
    [/豁免/, "豁免效果"],
    [/命中/, "命中效果"],
  ];
  const match = rules.find(([pattern]) => pattern.test(plain));
  if (match) return { name: match[1], confidence: "rule" };
  return { name: `${title}規則`, confidence: "needs-review" };
}

function uniqueName(name, used) {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const suffixes = ["補充", "細節", "附註"];
  for (const suffix of suffixes) {
    const candidate = `${name}（${suffix}）`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  let index = 2;
  while (used.has(`${name}（補充 ${index}）`)) index += 1;
  const candidate = `${name}（補充 ${index}）`;
  used.add(candidate);
  return candidate;
}

const plan = [];
for (const file of walkMarkdown(magicItemRoot)) {
  const original = fs.readFileSync(file, "utf8");
  if (!/^category: "魔法物品"$/m.test(original)) continue;
  const title = original.match(/^title: "(.+?) \(/m)?.[1] ?? path.basename(file, ".md");
  const lines = original.split(/\r?\n/);
  const used = new Set();
  for (const line of lines) {
    const match = line.match(/^- \*\*(.+?)\*\*：\s*$/);
    if (match && match[1] !== genericName) used.add(match[1]);
  }
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== `- **${genericName}**：`) continue;
    let end = index + 1;
    while (end < lines.length && !/^- \*\*/.test(lines[end]) && !/^##/.test(lines[end])) end += 1;
    const result = effectNameFromText(lines.slice(index + 1, end).join("\n"), title);
    plan.push({
      file: path.relative(root, file).split(path.sep).join("/"),
      line: index + 1,
      title,
      name: uniqueName(result.name, used),
      confidence: result.confidence,
      original: lines.slice(index + 1, end).join(" ").trim().slice(0, 160),
    });
  }
}

const counts = Object.groupBy(plan, ({ confidence }) => confidence);
console.log(JSON.stringify({
  total: plan.length,
  counts: Object.fromEntries(Object.entries(counts).map(([key, entries]) => [key, entries.length])),
  needsReview: counts["needs-review"] ?? [],
}, null, 2));

if (!apply) process.exit(0);
const unresolved = plan.filter(({ confidence }) => confidence === "needs-review");
const selected = plan.filter(({ confidence }) => confidence !== "needs-review");
if (selected.length > 0) {
  const grouped = Map.groupBy(selected, ({ file }) => file);
  for (const [file, changes] of grouped) {
    let content = fs.readFileSync(path.join(root, file), "utf8");
    for (const change of changes) {
      const target = "- **特殊能力**：";
      const replacement = `- **${change.name}**：`;
      const offset = content.indexOf(target);
      if (offset < 0) throw new Error(`${file}:${change.line} 找不到預期效果名稱。`);
      content = `${content.slice(0, offset)}${replacement}${content.slice(offset + target.length)}`;
    }
    fs.writeFileSync(path.join(root, file), content, "utf8");
  }
}
console.error(`已替換 ${selected.length} 項；保留 ${unresolved.length} 項待逐批確認。`);
