import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI = path.join(ROOT, "wiki", "戰役設定", "戰役創作");
const DESIGN = path.join(WIKI, "戰役設計");
const CORE = path.join(DESIGN, "核心流程");
const TOPIC = path.join(DESIGN, "主題素材");
const TODAY = "2026-08-31";
const apply = process.argv.includes("--apply");
const INDEX_IDS = {
  "戰役創作索引 (Campaign Creation Index)": "campaign-creation",
  "戰役設計索引": "campaign-design",
  "核心流程索引": "campaign-core-workflow",
  "主題素材索引": "campaign-theme-tools",
};
const q = (value) => String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
const cite = (book, page) => `（來源：《${book}》，p. ${page}）`;
const mirror = {
  DMG2024: ["地下城主指南", "Dungeon Master's Guide (2024)", "book-xdmg.json", "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-xdmg.json", "地下城主指南2024", "2024", "core", "current", "2024-Core"],
  FTD2021: ["費資本的巨龍寶庫", "Fizban’s Treasury of Dragons (2021)", "book-ftd.json", "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-ftd.json", "費資本的巨龍寶庫2021", "2014", "expansion", "legacy", "2014-Legacy"],
  BPGG2023: ["畢格比鉅獻：巨人之榮耀", "Bigby Presents: Glory of the Giants (2023)", "book-bgg.json", "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-bgg.json", "畢格比鉅獻巨人之榮耀2023", "2014", "expansion", "legacy", "2014-Legacy"],
  SO2023: ["印記城與外域", "Sigil and the Outlands (2023)", "book-sato.json", "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-sato.json", "印記城與外域2023", "2014", "expansion", "legacy", "2014-Legacy"],
  FRAIF2025: ["被遺忘的國度：費倫冒險", "Forgotten Realms: Adventures in Faerûn (2025)", "book-fraif.json", "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-fraif.json", "被遺忘的國度費倫冒險2025", "2024", "expansion", "current", "2024-Core"],
};

function sourceBlock(id, page, heading, raw) {
  const [zh, en, snapshot, url] = mirror[id];
  return `  - file: "原始資料/外部來源鏡像/${id}/${snapshot}"\n    locator: "${q(`${en}, p. ${page}：${heading}；5e.tools 鏡像快照`)}"\n    url: "${url}"\n    authority: "官方"\n    translation: "none"\n  - file: "${q(raw)}"\n    locator: "L1 標題：${q(path.basename(raw, ".md"))}；全文"\n    authority: "官方"\n    translation: "community"`;
}
function oldMeta(file, fallback) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (!text) {
    try { text = execFileSync("git", ["show", `HEAD:${path.relative(ROOT, file).split(path.sep).join("/")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return fallback; }
  }
  const field = (name) => text.match(new RegExp(`^${name}:\\s*"([^"]+)"`, "m"))?.[1];
  return { entity: field("entity_id") ?? fallback.entity, concept: field("concept_id") ?? fallback.concept };
}
function render(entry) {
  const [zh, en, , , tag, ruleset, scope, status, version] = mirror[entry.book];
  const fallbackSlug = `${entry.heading}-${entry.page}`.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
  const meta = oldMeta(path.join(WIKI, entry.old), { entity: `entry:${entry.book}:campaign:${fallbackSlug}`, concept: `concept:campaign:${fallbackSlug}` });
  return `---\ntitle: "${q(entry.title)}"\nentity_id: "${q(meta.entity)}"\nconcept_id: "${q(meta.concept)}"\nruleset: "${ruleset}"\ncontent_scope: "${scope}"\nstatus: "${status}"\ncategory: "戰役設定"\nsetting_continuity: "continuous"\nversion: "${version}"\ntags:\n  - "${tag}"\n  - "戰役設定_戰役創作"\nsources:\n${sourceBlock(entry.book, entry.page, entry.heading, entry.raw)}\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "${en}"\nerrata: []\nupdated: "${TODAY}"\n---\n\n# ${entry.title}\n\n${entry.body.trim()}\n\n## 🔗 相關連結\n\n- [[戰役設定/戰役創作/戰役設計/戰役設計索引|戰役設計索引]]\n- [[${entry.index}|${entry.indexName}]]\n`;
}
const dmg = "原始資料/地下城主指南2024/第五章_創作戰役";
const ftd = "原始資料/費資本的巨龍寶庫/遊戲中龍";
const bgg = "原始資料/畢格比鉅獻：巨人之榮耀/遊戲中的巨人";
const so = "原始資料/印記城與外域/第二章";
const fraif = "原始資料/被遺忘的國度：費倫冒險/第一章";
const core = (old, title, page, heading, raw, body) => ({ old, title, page, heading, raw, body, book: "DMG2024", slug: title.replaceAll(/[^\p{L}\p{N}]+/gu, "-"), index: "戰役設定/戰役創作/戰役設計/核心流程/核心流程索引", indexName: "核心流程索引" });
const topic = (old, title, book, page, heading, raw, body) => ({ old, title, book, page, heading, raw, body, slug: title.replaceAll(/[^\p{L}\p{N}]+/gu, "-"), index: "戰役設定/戰役創作/戰役設計/主題素材/主題素材索引", indexName: "主題素材索引" });
const pages = [
  core("戰役背景.md", "戰役背景 (Campaign Premise)", 129, "Campaign Premise", `${dmg}/戰役背景/戰役背景.md`, `## 目的\n\n戰役背景是把多次冒險串成長篇故事的起點；它提出能持續引發行動的情境、問題或目標，但不預先決定角色會如何回應。${cite("地下城主指南", 129)}\n\n## 設計步驟\n\n1. 先寫下戰役正在面對的核心問題。\n2. 為每次冒險保留可獨立完成的目標，再讓結果回流至更大的問題。\n3. 依角色的實際行動調整下一步，而非把背景當成固定劇本。\n\n## 檢查清單\n\n- 玩家能說出目前值得介入的問題。\n- 每個近期冒險都能留下新的後果、人物或線索。`),
  core("戰役設計/戰役背景/奇幻風格.md", "奇幻風格 (Flavors of Fantasy)", 131, "Flavors of Fantasy", `${dmg}/戰役背景/奇幻風格.md`, `## 目的\n\n先選定戰役的奇幻風格，讓衝突、場景、敵人與角色期待指向相同的遊戲體驗。D&D 的預設基調是英雄奇幻，但也可採用劍與巫術、史詩、神話、恐怖、陰謀、懸疑、歷險或戰爭風格。${cite("地下城主指南", 131)}\n\n## 設計步驟\n\n1. 選一項主風格，說明英雄、危險與成功各是什麼模樣。\n2. 以兩三個反覆出現的衝突、地點與視覺意象落實風格。\n3. 若混用風格，先告知玩家哪一種感受優先，避免恐怖與輕快歷險彼此抵銷。\n\n## 檢查清單\n\n- 冒險鉤子和反派都符合設定基調。\n- 玩家在第零回已知道故事的危險尺度與題材界線。`),
  core("戰役設定.md", "戰役設定 (Campaign Setting)", 136, "Campaign Setting", `${dmg}/戰役背景/戰役設定.md`, `## 目的\n\n戰役設定提供衝突、角色發展與冒險發生的世界。可以使用出版設定、調整既有設定，或從角色會接觸到的起始地點逐步創作。${cite("地下城主指南", 136)}\n\n## 設計步驟\n\n1. 決定採用既有世界或自創世界。\n2. 先回答角色當下會碰到的地點、勢力、危險、歷史與魔法等問題。\n3. 對遙遠地區保留空白，等玩家行動需要時再擴充。\n\n## 檢查清單\n\n- 起始地點已有可互動的人物、資源與麻煩。\n- 已說明哪些出版設定內容會被採用或調整。`),
  core("戰役衝突.md", "戰役衝突 (Campaign Conflicts)", 131, "Campaign Conflicts", `${dmg}/戰役背景/戰役衝突.md`, `## 目的\n\n以數條規模不同的衝突推動戰役，讓角色能先處理眼前問題，再逐步碰見更大的威脅。${cite("地下城主指南", 131)}\n\n## 設計步驟\n\n1. 同時準備約三個衝突，至少一個能在較短期內解決。\n2. 為每一項寫下首次遭遇、升高局勢與可能高潮。\n3. 在角色到達 5、11、17 級等節點，結束、替換或擴大衝突。\n\n## 檢查清單\n\n- 每個衝突都有敵對力量或可選擇結盟的勢力。\n- 不投入或不再有趣的衝突可被替換。`),
  core("戰役中的角色.md", "戰役中的角色 (Campaign Characters)", 129, "Campaign Characters", `${dmg}/戰役背景/戰役中的角色.md`, `## 目的\n\n讓玩家的偏好、角色目標與行動持續產生可用的冒險素材，而不是把角色背景只當成開場介紹。${cite("地下城主指南", 129)}\n\n## 設計步驟\n\n1. 在第零回詢問玩家想探索的角色目標與題材。\n2. 將角色背景中的人物、承諾與未解問題轉成選擇，而非強迫任務。\n3. 每次冒險後記錄角色造成的改變，作為下一個鉤子的來源。\n\n## 檢查清單\n\n- 每位角色都有至少一條能自行選擇是否追查的線索。\n- 戰役焦點會隨玩家投入而調整。`),
  core("戰役設計/一步步建立戰役.md", "一步步建立戰役 (Step-by-Step Campaigns)", 127, "Step-by-Step Campaigns", `${dmg}/一步步建立戰役.md`, `## 目的\n\n把戰役視為由多次冒險構成的大型冒險，依固定順序先建立方向，再逐步補足內容。${cite("地下城主指南", 127)}\n\n## 設計步驟\n\n1. [[戰役設定/戰役創作/戰役設計/核心流程/戰役背景|佈置背景]]：決定核心衝突、設定與風格。\n2. [[戰役設定/戰役創作/戰役設計/核心流程/開始戰役|導入玩家]]：安排有力開端，連結角色目標。\n3. [[戰役設定/戰役創作/戰役設計/核心流程/規劃冒險|規劃冒險]]：以小衝突、反派、地點與重複元素揭露大局。\n4. [[戰役設定/戰役創作/戰役設計/核心流程/結束戰役|步入終局]]：決定故事何時自然收束。\n\n## 檢查清單\n\n- 只詳細準備下一個玩家確實會接觸的內容。\n- 每次冒險結束後重新檢視四個步驟。`),
  core("戰役設計/開始戰役.md", "開始戰役 (Campaign Start)", 137, "Campaign Start", `${dmg}/開始戰役.md`, `## 目的\n\n以第零回、明確的起始地點與短小的第一次冒險，讓玩家建立共同期待與小隊關係。${cite("地下城主指南", 137)}\n\n## 設計步驟\n\n1. 在第零回確認安全、期待、房規與角色可選範圍。\n2. 協助玩家選定小隊如何相識：共同事件、共同熟人、共同過去、任務相遇或酒館相會。\n3. 介紹起始地點、關鍵事件與角色本應知道的世界資訊。\n4. 讓第一次冒險足夠短，優先讓小隊合作並熟悉能力。\n\n## 檢查清單\n\n- 每位玩家知道本戰役的基調與限制。\n- 起始地點有一兩個可立即探索的特色地點。`),
  core("戰役設計/規劃冒險/規劃冒險.md", "規劃冒險 (Plan Adventures)", 139, "Plan Adventures", `${dmg}/規劃冒險/規劃冒險.md`, `## 目的\n\n以一連串可獨立完成的冒險逐步揭露戰役衝突，並在玩家選擇後調整下一步。${cite("地下城主指南", 139)}\n\n## 設計步驟\n\n1. 為下一次冒險設定一個明確目標與後果。\n2. 將它連到至少一條既有衝突、地點或人物。\n3. 選擇採單元劇、連續劇或兩者交替的節奏。\n4. 用角色偏好與重複元素保持玩家投入。\n\n## 檢查清單\n\n- 下一個冒險能獨立帶來滿足感。\n- 它同時能改變或揭露更大的戰役問題。`),
  core("戰役設計/規劃冒險/單元劇和連續劇.md", "單元劇和連續劇 (Episodes and Serials)", 139, "Plan Adventures", `${dmg}/規劃冒險/單元劇和連續劇.md`, `## 目的\n\n在可隨時告一段落的單元劇與持續推進主線的連續劇之間取得節奏平衡。${cite("地下城主指南", 139)}\n\n## 設計步驟\n\n- **單元劇**：本次冒險有明確開端與結局，適合探索角色、地點或旁支問題。\n- **連續劇**：每次冒險結尾留下尚未完成的局勢，適合逐步揭露反派與長期衝突。\n- 交替使用兩者：連續劇推進主線，單元劇提供喘息、回收伏筆或嘗試新題材。\n\n## 檢查清單\n\n- 每回團結束時，玩家知道已完成什麼與接下來能選什麼。\n- 主線延宕時仍有值得投入的支線。`),
  core("戰役設計/規劃冒險/讓玩家投入.md", "讓玩家投入 (Keeping Players Engaged)", 140, "Engaging Players", `${dmg}/規劃冒險/讓玩家投入.md`, `## 目的\n\n透過玩家偏好、可辨識的重複元素與節奏變化，讓戰役在長期遊玩中仍能保持投入感。${cite("地下城主指南", 140)}\n\n## 設計步驟\n\n1. 記錄玩家喜歡的角色扮演、探索、戰鬥與題材。\n2. 重複使用能建立歸屬感的人物、地點、對手與資源。\n3. 讓角色的非凡行動留下可見影響。\n4. 在高張力主線之間安排休息回或較獨立的冒險。\n\n## 檢查清單\n\n- 每位玩家近期都曾獲得能影響故事的選擇。\n- 重複元素帶來熟悉感，不阻止新內容加入。`),
  core("戰役中的時間.md", "戰役中的時間 (Time in the Campaign)", 142, "Time in the Campaign", `${dmg}/規劃冒險/戰役中的時間.md`, `## 目的\n\n讓世界時間隨冒險前進，並以定時事件使角色的選擇具有代價與時機。${cite("地下城主指南", 142)}\n\n## 設計步驟\n\n1. 記錄旅行、休整、季節與重要期限。\n2. 為會自行發展的威脅設定下一個可見節點。\n3. 當角色改變計畫時，更新事件而非暫停世界。\n\n## 檢查清單\n\n- 玩家知道哪些事情具有時間壓力。\n- 定時事件會製造選擇，而不是懲罰未讀心的玩家。`),
  core("戰役設計/你的戰役日誌.md", "你的戰役日誌 (Your Campaign Journal)", 127, "Your Campaign Journal", `${dmg}/你的戰役日誌.md`, `## 目的\n\n以可持續更新的日誌保存團務、未解衝突、即興人物與線索，讓長期戰役保持連貫。${cite("地下城主指南", 127)}\n\n## 設計步驟\n\n1. 依日期或團次記錄事件、角色決定、人物、地點與未解問題。\n2. 下一次準備前先翻閱日誌，回收被遺忘的線索。\n3. 另設「冒險儲備」清單，收納暫時用不到的點子。\n\n## 檢查清單\n\n- 每回團後都有短記錄。\n- 日誌至少列出一個可在未來回收的伏筆或後果。`),
  core("結束戰役.md", "結束戰役 (Ending a Campaign)", 142, "Ending a Campaign", `${dmg}/結束戰役.md`, `## 目的\n\n在主要衝突與角色目標得到適當收束時結束戰役；滿意的結局不需要等到 20 級。${cite("地下城主指南", 142)}\n\n## 設計步驟\n\n1. 收束主要衝突並回應早期埋下的重要線索。\n2. 留時間讓角色完成個人目標，或保留可供下一戰役探索的開放結局。\n3. 若需提早結束，和玩家討論並選擇徵求點子、換 DM、帶角色轉換設定，或安排盛大終局。\n\n## 檢查清單\n\n- 每位角色都有告別或延續目標的機會。\n- 新戰役會讓新主角保有舞台，而非被舊角色取代。`),
  topic("創作奇幻史詩.md", "創作奇幻史詩 (Creating Epic Fantasy)", "FRAIF2025", 7, "Creating Epic Fantasy", `${fraif}/創作奇幻史詩.md`, `## 適用情境\n\n用於從低等級便讓角色、目標與威脅具有超越凡俗的重量；史詩感來自角色的選擇與世界後果，不只來自高等級數值。${cite("被遺忘的國度：費倫冒險", 7)}\n\n## 設計要點\n\n- 讓角色身分、理想或與神器、神祇、古老勢力的關係影響故事。\n- 以地方冒險開場，再逐步揭示更廣泛的利害關係。\n\n## 可用素材\n\n- 失落繼承權、危險遺產、神祇使命或足以改變地區命運的抉擇。\n\n## 搭配資源\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/史詩天命|史詩天命]]。`),
  topic("史詩天命.md", "史詩天命 (Epic Destinies)", "FRAIF2025", 9, "Epic Destinies", `${fraif}/史詩天命.md`, `## 適用情境\n\n將角色專屬的人生旅程設計成與等級成長同步展開的長期故事線。${cite("被遺忘的國度：費倫冒險", 9)}\n\n## 設計要點\n\n- 與玩家共同決定角色想追求、逃避或證明的事。\n- 將重大揭露與里程碑放在合適等級，而非預先規定結局。\n\n## 可用素材\n\n- 王位繼承、神器使命、靈能實驗的後果或神祇選民的責任。\n\n## 搭配資源\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/創作奇幻史詩|創作奇幻史詩]]。`),
  topic("將城市作為戰役舞台.md", "將城市作為戰役舞台", "DMG2024", 149, "Free City of Greyhawk", `${dmg}/灰鷹/自由城市灰鷹/如何使用這座城市.md`, `## 適用情境\n\n將一座城市當成長期大本營與冒險舞台，而非只用作購買裝備的中繼站。${cite("地下城主指南", 149)}\n\n## 設計要點\n\n- 用角色背景將小隊連到城市人物、地點與團體。\n- 在休整、社交、補給與城內冒險之間建立往返。\n\n## 可用素材\n\n- 選一個分區作為活動焦點，再以對手、朋友、傳聞與危險擴展。\n\n## 搭配資源\n\n- [[戰役設定/灰鷹/地理/城市與聚居地/自由城市灰鷹/自由城市灰鷹索引|自由城市灰鷹索引]]。`),
  topic("戰役設計/如何為你的龍命名.md", "如何為你的龍命名 (How to Name Your Dragon)", "FTD2021", 33, "How to Name Your Dragon", `${ftd}/如何為你的龍命名.md`, `## 適用情境\n\n為龍類 NPC 建立可反映年齡、血統、名聲與自我認同的名字。${cite("費資本的巨龍寶庫", 33)}\n\n## 設計要點\n\n- 分開考慮真名、常用名、外號與凡人對牠的稱呼。\n- 讓名字暗示其巢穴、戰績、性格或與其他生物的關係。\n\n## 可用素材\n\n- 一個只在親族間使用的真名，以及被敵人或崇拜者流傳的稱號。\n\n## 搭配資源\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/扮演龍類|扮演龍類]]。`),
  topic("戰役設計/扮演龍類.md", "扮演龍類 (Roleplaying Dragons)", "FTD2021", 31, "Roleplaying Dragons", `${ftd}/扮演龍類.md`, `## 適用情境\n\n將龍類呈現為有長遠視野、強烈慾望與自身影響力的角色，而不只是一次戰鬥遭遇。${cite("費資本的巨龍寶庫", 31)}\n\n## 設計要點\n\n- 先決定牠最在意的寶藏、領地、知識或關係。\n- 讓年齡、巢穴、僕從與變形能力改變牠接觸世界的方法。\n\n## 可用素材\n\n- 偽裝成人形的顧問、收集情報的旅人，或以代理人擴張影響的領主。\n\n## 搭配資源\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/定製龍類|定製龍類]]。`),
  topic("戰役設計/定製龍類.md", "定製龍類 (Customizing Dragons)", "FTD2021", 34, "Customizing Dragons", `${ftd}/定製龍類.md`, `## 適用情境\n\n在沿用既有資料卡的前提下，讓重要龍類在故事與戰術上更有個性。${cite("費資本的巨龍寶庫", 34)}\n\n## 設計要點\n\n- 先改變敘事層面的聲音、外觀、習性、目標或僕從。\n- 需要改資料卡時，使用能表現巢穴、年齡與故事定位的特性，不把任意加強當成難度設計。\n\n## 可用素材\n\n- 獨特吐息效果、變形身分、巢穴環境或與寶藏相連的能力。\n\n## 搭配資源\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/龍之冒險|龍之冒險]]。`),
  topic("戰役設計/龍之冒險.md", "龍之冒險 (Dragon Adventures)", "FTD2021", 55, "Dragon Adventures", `${ftd}/龍之冒險.md`, `## 適用情境\n\n讓龍類成為整場冒險的焦點，而不只是終點房間裡的怪物。${cite("費資本的巨龍寶庫", 55)}\n\n## 設計要點\n\n- 先選擇龍的敘事角色：怪物、策劃者或強權。\n- 讓牠的巢穴、僕從、情報網與目標在抵達正面衝突前就影響局勢。\n\n## 可用素材\n\n- 失控的掠食者、操弄勢力的智者，或令整片地區必須回應的統治者。\n\n## 搭配資源\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/扮演龍類|扮演龍類]]。`),
  topic("戰役設計/扮演巨人.md", "扮演巨人 (Roleplaying Giants)", "BPGG2023", 21, "Roleplaying Giants", `${bgg}/扮演巨人.md`, `## 適用情境\n\n把巨人塑造成個性鮮明的 NPC，並以其龐大尺度帶出不同於類人生物的互動。${cite("畢格比鉅獻：巨人之榮耀", 21)}\n\n## 設計要點\n\n- 以體型、年齡、聲量與自尊作為扮演支點。\n- 先給巨人一個明確習慣、才能或執著，再決定其與序位、家族或地區的關係。\n\n## 可用素材\n\n- 把人類看作幼兒、寵物、害蟲或玩具兵的視角差異。\n\n## 搭配資源\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/神祇與冒險|神祇與冒險]]。`),
  topic("戰役設計/神祇與冒險.md", "神祇與冒險 (Gods and Adventures)", "BPGG2023", 33, "Gods and Adventures", `${bgg}/神祇與冒險.md`, `## 適用情境\n\n以巨人敬拜的神祇、外來神與邪教，設計牽涉家族、信仰與社群壓力的冒險。${cite("畢格比鉅獻：巨人之榮耀", 33)}\n\n## 設計要點\n\n- 把宗教衝突寫成對巨人家族與傳統的背離或守護，而不只是一場信仰辯論。\n- 決定邪教的腐化如何改變個別巨人與整個社群。\n\n## 可用素材\n\n- 對安南子嗣的忠誠、外來神的誘惑，或元素邪惡勢力的滲透。\n\n## 搭配資源\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/扮演巨人|扮演巨人]]。`),
  topic("戰役設計/印記城中的冒險.md", "印記城中的冒險 (Adventures in Sigil)", "SO2023", 58, "Adventures in Sigil", `${so}/印記城中的冒險.md`, `## 適用情境\n\n利用印記城位於外域中心、通往多個位面的特性，讓任何世界的威脅都能成為城市冒險。${cite("印記城與外域", 58)}\n\n## 設計要點\n\n- 從城市特有地點、居民或派系任務選一個起點。\n- 讓位面規模的陰謀先以街區、傳送門或人際關係的形式顯現。\n\n## 可用素材\n\n- 派系任務、城市災害、跨位面訪客，或因傳送門引發的地方危機。\n\n## 搭配資源\n\n- [[戰役設定/多元宇宙/地理/城市與聚居地/印記城/印記城索引|印記城索引]]。`),
];

function index(title, source, body) {
  return `---\ntitle: "${title}"\nentity_id: "entry:DMG2024:campaign-index:${INDEX_IDS[title]}"\nconcept_id: "concept:campaign-index:${INDEX_IDS[title]}"\nruleset: "2024"\ncontent_scope: "core"\nstatus: "current"\ncategory: "戰役設定"\nsetting_continuity: "continuous"\nversion: "2024-Core"\ntags:\n  - "地下城主指南2024"\n  - "戰役設定_戰役創作"\nsources:\n${sourceBlock("DMG2024", 127, "Chapter 5: Creating Campaigns", source)}\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Dungeon Master's Guide (2024)"\nerrata: []\nupdated: "${TODAY}"\n---\n\n# ${title}\n\n${body}\n`;
}
const sourceIndex = `${dmg}/創作戰役.md`;
const designIndex = index("戰役設計索引", sourceIndex, `本索引將戰役設計分為先建立共同骨架的核心流程，以及可依戰役題材選用的主題素材。\n\n## 設計入口\n\n- [[戰役設定/戰役創作/戰役設計/核心流程/核心流程索引|核心流程索引]]：從背景、開場、冒險節奏到結局的建置順序。\n- [[戰役設定/戰役創作/戰役設計/主題素材/主題素材索引|主題素材索引]]：史詩、城市、巨龍、巨人與印記城的專題工具。\n\n## 🔗 相關連結\n\n- [[戰役設定/戰役創作/戰役創作索引|戰役創作索引]]`);
const coreIndex = index("核心流程索引", sourceIndex, `依下列順序建立戰役；每次冒險結束後，都可以回到前面步驟修正方向。\n\n1. [[戰役設定/戰役創作/戰役設計/核心流程/一步步建立戰役|一步步建立戰役]]\n2. [[戰役設定/戰役創作/戰役設計/核心流程/戰役背景|戰役背景]]、[[戰役設定/戰役創作/戰役設計/核心流程/奇幻風格|奇幻風格]]、[[戰役設定/戰役創作/戰役設計/核心流程/戰役設定|戰役設定]]、[[戰役設定/戰役創作/戰役設計/核心流程/戰役衝突|戰役衝突]]與[[戰役設定/戰役創作/戰役設計/核心流程/戰役中的角色|戰役中的角色]]\n3. [[戰役設定/戰役創作/戰役設計/核心流程/開始戰役|開始戰役]]\n4. [[戰役設定/戰役創作/戰役設計/核心流程/規劃冒險|規劃冒險]]、[[戰役設定/戰役創作/戰役設計/核心流程/單元劇和連續劇|單元劇和連續劇]]與[[戰役設定/戰役創作/戰役設計/核心流程/讓玩家投入|讓玩家投入]]\n5. [[戰役設定/戰役創作/戰役設計/核心流程/戰役中的時間|戰役中的時間]]與[[戰役設定/戰役創作/戰役設計/核心流程/你的戰役日誌|你的戰役日誌]]\n6. [[戰役設定/戰役創作/戰役設計/核心流程/結束戰役|結束戰役]]\n\n## 🔗 相關連結\n\n- [[戰役設定/戰役創作/戰役設計/戰役設計索引|戰役設計索引]]`);
const topicIndex = index("主題素材索引", sourceIndex, `依所需題材選用；這些是 DM 的設計工具，不是世界觀實體頁。\n\n## 史詩\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/創作奇幻史詩|創作奇幻史詩]]\n- [[戰役設定/戰役創作/戰役設計/主題素材/史詩天命|史詩天命]]\n\n## 城市與位面\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/將城市作為戰役舞台|將城市作為戰役舞台]]\n- [[戰役設定/戰役創作/戰役設計/主題素材/印記城中的冒險|印記城中的冒險]]\n\n## 巨龍\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/如何為你的龍命名|如何為你的龍命名]]\n- [[戰役設定/戰役創作/戰役設計/主題素材/扮演龍類|扮演龍類]]\n- [[戰役設定/戰役創作/戰役設計/主題素材/定製龍類|定製龍類]]\n- [[戰役設定/戰役創作/戰役設計/主題素材/龍之冒險|龍之冒險]]\n\n## 巨人\n\n- [[戰役設定/戰役創作/戰役設計/主題素材/扮演巨人|扮演巨人]]\n- [[戰役設定/戰役創作/戰役設計/主題素材/神祇與冒險|神祇與冒險]]\n\n## 🔗 相關連結\n\n- [[戰役設定/戰役創作/戰役設計/戰役設計索引|戰役設計索引]]`);
const rootIndex = index("戰役創作索引 (Campaign Creation Index)", sourceIndex, `本索引收錄 DM 用於建立與維持戰役的創作工具；它們不是玩家角色能力或世界設定的固定事實。\n\n## 戰役設計\n\n- [[戰役設定/戰役創作/戰役設計/戰役設計索引|戰役設計索引]]：核心流程與主題素材的總入口。\n- [[戰役設定/戰役創作/戰役設計/核心流程/核心流程索引|核心流程索引]]：從背景、開場到終局的建置順序。\n- [[戰役設定/戰役創作/戰役設計/主題素材/主題素材索引|主題素材索引]]：史詩、城市、巨龍、巨人與印記城工具。\n\n## 冒險創作\n\n- [[戰役設定/戰役創作/冒險創作索引|冒險創作索引]]：單次冒險的設計入口。\n- [[戰役設定/戰役創作/冒險創建/創建冒險|創建冒險]]：第四章的既有冒險設計資料。\n\n## 參考資料\n\n- [[戰役設定/戰役創作/設定彙編|設定彙編]]。\n\n<!-- AUTO-INDEX:START -->\n## 自動維護條目\n\n<!-- AUTO-INDEX:END -->`);

const syncedRootIndex = rootIndex.replace(/<!-- AUTO-INDEX:START -->[\s\S]*?<!-- AUTO-INDEX:END -->/, `<!-- AUTO-INDEX:START -->
## 自動維護條目

- [[冒險節奏與緊張感|冒險節奏與緊張感 (Encounter Pace and Tension)]]
- [[導入玩家|導入玩家 (Draw In the Players)]]
- [[結束冒險|結束冒險 (Bring It to an End)]]
- [[規劃遭遇|規劃遭遇 (Plan Encounters)]]
<!-- AUTO-INDEX:END -->`);
const outputs = [
  ...pages.map((entry) => [path.join(entry.indexName === "核心流程索引" ? CORE : TOPIC, `${entry.title.replace(/ \(.+$/, "")}.md`), render(entry), path.join(WIKI, entry.old)]),
  [path.join(DESIGN, "戰役設計索引.md"), designIndex],
  [path.join(CORE, "核心流程索引.md"), coreIndex],
  [path.join(TOPIC, "主題素材索引.md"), topicIndex],
  [path.join(WIKI, "戰役創作索引.md"), syncedRootIndex],
];
for (const [file] of outputs) console.log(`${apply ? "重建" : "預覽"}：${path.relative(ROOT, file)}`);
if (!apply) process.exit(0);
for (const [file, content] of outputs) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, "utf8"); }
for (const [, , old] of outputs) if (old && fs.existsSync(old) && path.resolve(old) !== path.resolve(outputs.find(([file]) => file)?.[0])) fs.unlinkSync(old);
for (const dir of [path.join(DESIGN, "戰役背景"), path.join(DESIGN, "規劃冒險")]) if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
console.log(`完成：${pages.length} 篇重建頁與 4 個索引。`);
