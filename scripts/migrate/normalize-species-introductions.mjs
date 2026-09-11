import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../core/ingest-publication-utils.mjs";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const TODAY = "2026-09-10";
const only = [...args].find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const SPECIES_ROOT = path.join(ROOT, "wiki", "種族");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

function readTitle(text) {
  return text.match(/^title: "(.+)"$/m)?.[1] ?? path.basename(text, ".md");
}

function isSpeciesPage(file, text) {
  return /^category: "種族"$/m.test(text)
    && !/索引|選項總覽|艾伯倫種族選項/.test(path.basename(file, ".md"));
}

function sectionRange(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return null;
  const end = text.indexOf("\n## ", start + heading.length);
  return { start, end: end < 0 ? text.length : end };
}

function removeImportantSummary(text) {
  const rules = sectionRange(text, "## ⚙️ 規則條文 (Rule Text)")
    ?? sectionRange(text, "## ⚙️ 規則條文");
  if (!rules) return text;
  const before = text.slice(0, rules.start);
  let body = text.slice(rules.start, rules.end);
  const after = text.slice(rules.end);
  body = body.replace(/\r?\n> \[!IMPORTANT\]\r?\n(?:>[^\r\n]*(?:\r?\n|$))+/g, "\n");
  return `${before}${body}${after}`;
}

function normalizeRuleHeading(text) {
  return text.replace(/^## ⚙️ 規則條文$/m, "## ⚙️ 規則條文 (Rule Text)");
}

function normalizeLegacyNotice(text) {
  return text.replace(
    /> \[!IMPORTANT\](\r?\n> 本條目出自《魔鄧肯鉅獻：多元宇宙的怪物》的 2014 Legacy 種族選項。採用 2024 角色建立規則時，屬性值提升改由背景提供。)/g,
    "> [!WARNING]$1",
  );
}

function addBasicDataHeading(text) {
  const rules = sectionRange(text, "## ⚙️ 規則條文 (Rule Text)");
  if (!rules) return text;
  const before = text.slice(0, rules.start);
  let body = text.slice(rules.start, rules.end);
  const after = text.slice(rules.end);
  if (/^### 基本資料$/m.test(body)) return text;
  const table = body.search(/^\|\s*生物類型\s*\|/m);
  if (table < 0) return text;
  body = `${body.slice(0, table)}### 基本資料\n\n${body.slice(table)}`;
  return `${before}${body}${after}`;
}

function addIntroduction(text, introduction) {
  if (/^## 種族介紹$/m.test(text)) return text;
  const title = text.match(/^# .+$/m);
  const rules = text.indexOf("## ⚙️ 規則條文 (Rule Text)");
  if (!title || rules < 0) return text;
  const titleEnd = title.index + title[0].length;
  // Version and translation callouts already positioned before rule text stay ahead of the introduction.
  const prefix = text.slice(titleEnd, rules);
  const suffix = text.slice(rules);
  return `${text.slice(0, titleEnd)}${prefix.trimEnd()}\n\n## 種族介紹\n\n${introduction.trim()}\n\n${suffix}`;
}

function refreshUpdatedDate(text) {
  return text.replace(/^updated: "\d{4}-\d{2}-\d{2}"$/m, `updated: "${TODAY}"`);
}

// Each entry is a source-grounded, original-language summary.  Do not replace this
// table with automatic source-prefix extraction: that would turn a source snippet
// into a fake introduction and loses paragraph boundaries.
const INTRODUCTIONS = new Map([
  ["人類 (Human)", `人類分布於多元宇宙各處，數量、文化與信仰都極為多樣。他們往往想在有限壽命中盡可能成就更多，因此雄心與足智多謀在許多世界同時受到讚賞與敬畏。\n\n學者對人類的早期起源仍有爭論；一種說法認為，最早聚居地位於印記城，通用語也由此而來。無論傳說是否正確，人類已把這座「門之城」的世界性帶往各個世界。`],
  ["阿斯莫 (Aasimar)", `阿斯莫的靈魂帶著上層位面的天界火花，卻仍保有凡人的生命。他們可能是天使血嗣，也可能因承接天界力量而能引來光明、治癒或天怒。\n\n阿斯莫能出生於各種凡命族群，外貌大致承襲父母，卻常有金屬光澤的雀斑、發亮的雙眼、光環或不尋常膚色；隨著天界本質顯露，這些特徵會更醒目，壽命可達約 160 歲。`],
  ["龍裔 (Dragonborn)", `龍裔的祖先由金屬龍與色彩龍的龍蛋孵化。部分傳說將其誕生歸於巴哈姆特或提亞馬特的祝福，另一些則認為巨龍自行創造了他們；無論起源如何，龍裔早已在物質位面建立社群並繁衍。\n\n他們如同雙足行走、沒有翅膀的巨龍，明亮的眼、骨角與鱗色等特徵都會顯示其龍類祖先。`],
  ["矮人 (Dwarf)", `矮人傳說由鍛造之神自大地喚醒；莫拉丁、李奧克斯等不同世界的神名，都指向這位創造者。這份起源使他們與石材、金屬和地下生活相連，也賦予堅韌與約 350 年的壽命。\n\n他們最早在山崖與地底開鑿城市和要塞，關於對抗巨人與幽暗地域怪物的傳說塑造了共同記憶。許多矮人文化以歌謠保存以弱勝強的事蹟；丘陵與山地氏族則是部分世界的歷史社群名稱。`],
  ["精靈 (Elf)", `原初精靈由科瑞隆創造，曾能隨意變形；因部分精靈與羅絲反叛而失去這項能力。大多數精靈後來與羅絲決裂並獲得寬恕，卻未取回原有形態。\n\n精靈曾退居妖精荒野，之後因好奇探索其他位面。他們尖耳、少有體毛，壽命可達約 750 年，並以出神冥想代替睡眠。長期居於特定環境會使其承受不同魔力，形成卓爾、高等精靈與木精靈等血脈。`],
  ["歌利亞 (Goliath)", `歌利亞高大而帶有巨人遠祖的血脈，每人都承接元祖巨人的恩賜；這些祝福能顯為各種超自然能力，也能使他們暫時接近祖先的高度。\n\n外觀常令人聯想到所承繼的巨人血系。脫離巨人內戰陰影的歌利亞在多元宇宙中發展自己的道路，並思考如何超越祖先留下的成就。`],
  ["提夫林 (Tiefling)", `提夫林可能出生於下層位面，或承繼來自魔鬼、惡魔及其他邪魔的祖先血緣。邪魔遺贈會帶來力量和外觀特徵，卻不決定任何人的道德取向。\n\n深淵、幽冥與煉獄遺贈各自呼應不同下層位面，也可能呈現犄角、皮毛、長牙、尾巴、特殊眼色或氣味等身體特徵。每位提夫林可自行決定如何理解、接納或拒絕這份傳承。`],
  ["獸人 (Orc)", `獸人的傳說把誕生連到獨眼神格烏什。祂的恩賜使其子民能穿行平原、洞窟與海洋，並面對其中的危險；即使改信其他神祇，許多獸人仍將堅韌、決心與黑暗視覺視為古老傳承。\n\n獸人通常高大結實，有灰色皮膚、略尖的小耳與突出的下犬齒。有些人受祖先旅程與苦難的故事鼓舞，另一些人則選擇離開舊故事，開創自己的道路。`],
  ["化獸者 (Shifter)", `化獸者是承繼全部或部分獸化詛咒者的後裔。他們保有類人生物身分，卻能暫時加強野獸特徵；這種短暫轉化被稱為「化獸」。\n\n其體型大致近於人類而較靈活，常有大眼、尖耳、犬齒與遍布身體的毛髮。即使顯現最強烈的獸性，仍可辨識其類人生物輪廓。`],
  ["幻身靈 (Changeling)", `幻身靈能以超自然力量隨意改變外貌，因而容易穿梭各種社會；對部分人而言，每張面孔都是靈魂的一面。其最初起源被追溯至妖精荒野，該位面的奇異影響至今仍伴隨這個族群。\n\n真實形貌通常黯淡而不易辨認，許多人如同換衣般變換外表，也會為不同身分建立經歷、信念與人脈。人格面具能為談判、調查或戰鬥而設計，甚至可由多人共享並在家族中傳承。`],
  ["科拉瓦 (Khoravar)", `人類與精靈的後裔在科瓦雷形成獨特社群與傳統；黎蘭達與梅丹尼家族的崛起進一步鞏固了共同認同。「科拉瓦」意為「科瓦雷的子嗣」，也表達許多人不願以「半精靈」自稱的選擇。\n\n不少科拉瓦相信自己能成為文化與族群之間的橋樑，因此投身外交、調停、翻譯或藝術；也有人追尋與妖精荒野的遙遠關係。`],
  ["離夢人 (Kalashtar)", `離夢人由人類與夢境位面的反叛精魂「夢靈」結合而成。他們外貌近似人類，通常勻稱而略瘦；專注或情緒強烈時，雙眼會發光。\n\n離夢人不能直接與夢靈交談，但可從本能、靈感與睡夢中獲得片段記憶。這種聯繫賦予心靈力量，也帶來面對靈能傷害的防護。`],
  ["戰俑 (Warforged)", `戰俑在終末戰爭中被打造為戰爭兵器，技術突破使木材與金屬構成的造物成為能感受疼痛與情感的智慧生命。\n\n他們的根鬚狀肌索浸潤鍊金液體，纏繞鋼鐵、烏木或岩石骨架；裝甲板既是外殼也支撐關節。許多戰俑透過改造面孔、四肢與裝甲培養個性，並尋求奇械師協助實現這種自我表達。`],
  ["侏儒 (Gnome)", `侏儒是由發明、幻影與地下生命之神創造的魔法族裔。先民因住在森林與地道、又善於隱藏而少與外人相見；他們以機敏、陷阱與迷宮般的隧道保護社群。\n\n傳說中，加爾・閃金、貝爾凡・野遊者與巴瑞瓦・影斗篷等神祇會偽裝拜訪並傳授魔法，最終形成森林與岩石兩種血脈。侏儒身材嬌小、有大眼與尖耳，壽命約 425 年，並偏愛有遮蔽感的居所與帽子。`],
  ["半身人 (Halfling)", `半身人受生命、家園與壁爐諸神的寵愛，家庭與社群是其生活核心；然而不少人也因勇敢與好奇踏上旅途，探索更大的世界並結識新朋友。\n\n「半身人好運」常被視為危急時的無形庇護，許多人把天賦歸於悠妲拉、布蘭多布李斯或楚瑪琳等仁慈神祇，並享有約 150 年壽命。社群差異很大：強心／敦實半身人多定居地下，輕足／高挑半身人則常遷徙並與較高大的族群共居。`],
  ["人狼裔 (Lupin)", `人狼裔多源於遭遇狼人事件；獸化詛咒沒有完全扎根，使他們停留在類人與狼之間的混種形態。他們不能在狼形與類人形之間切換，卻承受野獸般的力量、本能與嚎叫。`],
  ["半血裔 (Dhampir)", `半血裔是仍活著、卻帶有類吸血鬼力量與可怕飢渴的人。他們大多渴望鮮血，也可能以夢境、生氣或其他重要事物為養分；每人都要在克制與屈從掠食衝動之間作出選擇。\n\n他們可能是吸血鬼後代、遭咬傷後部分轉化的人，也可能因危險交易或死靈魔法而誕生。`],
  ["巫咒之子 (Hexblood)", `巫咒之子是被詭異能量或神秘巫術灌注妖精魔法的個體。許多人因與強大鬼婆交易而轉化，其他奇異力量也可能造成同樣結果；其妖精力量常顯為預知與魅惑魔法。`],
  ["復生者 (Reborn)", `復生者已經死亡卻莫名仍存活；致命傷疤、死灰血肉與無血血管，可能成為其死而復返的痕跡。\n\n有些是魔法或科學的奇蹟，由不同生命縫合而成，或讓神秘心智寄宿於人造軀殼。無論起源，他們都面對新的生命，並尋找自身的經歷與答案。`],
  ["人類 (Human，2014 Legacy)", `人類在各個世界中建立極為多樣的社會與文化；相較於壽命更長的族群，他們常以短暫人生中的雄心、創造力與適應力留下影響。人類外貌、信仰與人生道路同樣沒有單一標準。`],
  ["半身人 (Halfling，2014 Legacy)", `多數半身人珍視平靜家園、溫暖爐火、美食與親友；也有人乘篷車或篷船旅行，即使漂泊仍把這些事物視為家。\n\n他們身材小巧而務實，樂於與人合作，也會為家園、朋友或好奇心踏上冒險。輕足與敦實半身人反映不同生活型態與社群傳統。`],
  ["半精靈 (Half-Elf，2014 Legacy)", `半精靈同時承繼人類與精靈的血緣，往往在兩種文化交會之處尋找自己的位置。他們兼具人類的適應性與精靈的感官、壽命與妖精血統，個人的成長環境比血統更能界定其身分。`],
  ["半獸人 (Half-Orc，2014 Legacy)", `半獸人承繼人類與獸人血緣，外貌與人生經驗各不相同。他們可能面對他人的先入觀，也可能在多種社群之間建立歸屬；堅韌、直率與求生意志是許多故事反覆描寫的特質。`],
  ["侏儒 (Gnome，2014 Legacy)", `侏儒以旺盛好奇心投入發明、研究、創造與玩樂。其小巧身形、大眼與鮮明表情，配合長達數世紀的壽命，使他們總擔心沒有足夠時間完成想做的事。\n\n他們的地洞明亮而巧妙隱蔽；森林侏儒重視隱居與幻術，岩石侏儒則以工藝、修補與發明聞名。`],
  ["矮人 (Dwarf，2014 Legacy)", `矮人以古老氏族、山地家園與精湛工藝聞名。他們身材壯實、壽命悠長，重視傳統、榮譽與對親友的忠誠；家族史、技藝與古老仇怨常由一代傳至下一代。\n\n丘陵與山地矮人是主要社群傳統，分別反映其生活環境與武備、工藝取向。`],
  ["精靈 (Elf，2014 Legacy)", `精靈以優雅、敏銳感官與漫長壽命聞名。他們以藝術、自然、歷史與記憶看待世界，卻也會因好奇而離開長久的家園。\n\n高等、木與黑暗精靈形成不同傳統：高等精靈重視魔法與學識，木精靈貼近自然，卓爾則與幽暗地域及其複雜歷史相連。`],
  ["提夫林 (Tiefling，2014 Legacy)", `提夫林承繼邪魔血脈，犄角、尾巴、眼色或膚色等外觀特徵使其傳承容易被看見；但血統不決定個性、信仰或道德。許多提夫林在旁人的恐懼與偏見之外，自行塑造身分與歸屬。`],
  ["龍裔 (Dragonborn，2014 Legacy)", `龍裔是驕傲而自立的龍類後裔，外形近於沒有翅膀的雙足巨龍。氏族、榮譽與為家族承擔責任在許多龍裔文化中十分重要；其龍族血統也會表現在吐息與抗性。`],
  ["色彩龍裔 (Chromatic Dragonborn，2014 Legacy)", `色彩龍裔承繼色彩龍的血脈與外觀，血統讓其吐息與抗性帶有不同元素性質。這是龍裔的傳承選項，而不是對個人陣營或性格的判定。`],
  ["金屬龍裔 (Metallic Dragonborn，2014 Legacy)", `金屬龍裔承繼金屬龍血脈，外觀、吐息與抗性反映其祖先的元素本質。不同個體如何理解這份傳承，仍取決於自己的成長、文化與選擇。`],
  ["寶石龍裔 (Gem Dragonborn，2014 Legacy)", `寶石龍裔的血脈與寶石龍相連，其外觀與靈能特質呈現晶體般的龍類傳承。這份血統賦予能力與家族故事，卻不限制其人生道路。`],
  ["人馬 (Centaur，2014 Legacy)", `此處的人馬與妖精荒野相連，腰部以上近似精靈、下半身則為馬的身軀。他們與自然世界具有神秘共鳴，外貌也保留不同精靈血統的膚色與特徵。`],
  ["土元素裔 (Earth Genasi，2014 Legacy)", `土元素裔承繼土元素位面或土靈相關的力量；其體格、膚色與舉止可能表現石、泥土或礦物的特質。每人的元素傳承與成長經驗並不相同。`],
  ["水元素裔 (Water Genasi，2014 Legacy)", `水元素裔帶有水元素力量，外觀常令人聯想到潮汐、雨水或深海。他們可能出身海岸、河流或其他元素魔法影響深刻的地方，但不以單一文化定義自身。`],
  ["火元素裔 (Fire Genasi，2014 Legacy)", `火元素裔承繼火焰與元素位面的力量，膚色、髮絲或情緒表現有時會帶有餘燼與火焰的意象。其力量來源不決定性格或生命方向。`],
  ["氣元素裔 (Air Genasi，2014 Legacy)", `氣元素裔與風、天空和空氣元素的力量相連。其容貌與動作常令人想起流風或雲霧，而不同社群對這份元素傳承會有各自的理解。`],
  ["大地精 (Hobgoblin，2014 Legacy)", `大地精源自妖精荒野的妖精族群，與其他地精族同樣帶著妖精傳承。他們的社會經驗與個人志向多樣，不應以怪物傳說或單一軍事形象概括。`],
  ["化獸者 (Shifter，2014 Legacy)", `化獸者是承繼獸化詛咒者血脈的類人生物，能暫時喚起野獸特徵卻不會完全變形。外貌、動物意象與如何看待這份傳承，會隨個人及社群而異。`],
  ["天狗 (Kenku，2014 Legacy)", `天狗身披羽毛、形似渡鴉，擁有敏銳觀察力與超自然記憶。沒有人能確定其起源；有人將其說成詛咒，也有人把自己視為記錄多元宇宙奇蹟的見證者。\n\n他們常見於墮影冥界與物質位面，外觀多帶渡鴉的色澤。`],
  ["幻身靈 (Changeling，2014 Legacy)", `幻身靈能改變外貌與身分，真實形貌通常不易辨認。這份變形天賦讓他們能在不同社會中生活，也使「自我」與人格面具成為重要的個人選擇。`],
  ["牛頭人 (Minotaur，2014 Legacy)", `牛頭人有強壯的人形身軀與牛首，傳說、迷宮與競技常見於他們的文化想像。個體可能以力量、方向感或對複雜道路的理解看待自身傳承，而非受單一刻板印象限制。`],
  ["仙靈 (Fairy，2014 Legacy)", `仙靈是妖精荒野的居民，外貌、翅膀與魔法各具差異。他們可能帶著自然、季節與奇想的氣息前往其他世界，卻不因此失去個人的目的與社群關係。`],
  ["半羊人 (Satyr，2014 Legacy)", `半羊人與妖精荒野及其自由奔放的生命力相連。他們有羊角與蹄足，常被描述為熱愛音樂、舞蹈、歡宴與新鮮經歷，但每個半羊人仍有自己的承諾與道路。`],
  ["吉斯洋基人 (Githyanki，2014 Legacy)", `吉斯洋基人是從奪心魔奴役中解放後的吉斯族後裔，多居於星界。他們的文化保存反抗歷史、軍事訓練與對自由的強烈記憶，也因長久的流亡而形成獨特社群。`],
  ["吉斯澤萊人 (Githzerai，2014 Legacy)", `吉斯澤萊人同樣源自脫離奪心魔奴役的吉斯族，選擇在混沌海等嚴峻環境中以紀律、冥想與社群維持秩序。他們珍視精神自主，也持續記得與吉斯洋基人的分歧。`],
  ["地底侏儒 (Deep Gnome，2014 Legacy)", `地底侏儒生活於幽暗地域，長期面對危險環境而培養出謹慎、隱匿與石工技藝。他們仍保有侏儒的創造力與社群意識，只是生活經驗使其文化與地表近親不同。`],
  ["地精 (Goblin，2014 Legacy)", `地精與妖精荒野的古老傳承相連，體型小巧且擅長在比自己更強大的勢力之間求生。不同世界和社群中的地精有各自的家庭、野心與生活方式。`],
  ["灰矮人 (Duergar，2014 Legacy)", `灰矮人居於幽暗地域，是矮人支系之一。長年壓迫、勞作與地底生活形塑其嚴肅而堅韌的社群；個體對這段歷史的回應則各不相同。`],
  ["兔人 (Harengon，2014 Legacy)", `兔人與妖精荒野的變幻與活力相連，具有兔類外觀、敏捷腳步與敏銳本能。他們可能因好奇、機會或意外而前往其他世界，並以自己的方式理解命運。`],
  ["狗頭人 (Kobold，2014 Legacy)", `狗頭人是小型龍類親族，社群、合作與對龍的傳說在其生活中常佔重要位置。不同部落與個體會以工藝、機智、勇氣或龍裔身分建立自我認同。`],
  ["阿斯莫 (Aasimar，2014 Legacy)", `阿斯莫帶有天界傳承，可能在任何凡命社群中出生。其外觀與天啟力量會提醒他人這份血脈，但個人如何面對期望、責任與凡人生活仍由自己決定。`],
  ["海精靈 (Sea Elf，2014 Legacy)", `海精靈是適應海洋生活的精靈社群，能在水中自在活動，並與海洋生物及深海環境建立關係。他們的傳統與陸地精靈共享部分根源，卻受海底生活深刻影響。`],
  ["梭螺魚人 (Triton，2014 Legacy)", `梭螺魚人出身深海與元素位面交界附近的海洋社群，長久守望來自深淵與海底的威脅。離開故鄉的人可能懷抱使命，也可能只是想認識陌生的地表世界。`],
  ["蛇人 (Yuan-ti，2014 Legacy)", `蛇人帶有蛇類特徵與悠久神秘傳承。不同個體可能承受祖先故事與外界偏見，也可能選擇與舊有社群、信仰或目的保持距離。`],
  ["鳥羽人 (Aarakocra，2014 Legacy)", `鳥羽人是具鳥類外觀的天空居民，能以翅膀飛翔並以高空視野理解世界。他們的群體與遷徙、山巔、風與元素力量的故事常有關聯。`],
  ["斑貓人 (Tabaxi，2014 Legacy)", `斑貓人擁有貓科外觀與旺盛好奇心，常把新的景象、故事、技藝或珍奇之物視為值得追尋的事物。每個人對冒險、社群與收集的熱情各不相同。`],
  ["費爾伯格人 (Firbolg，2014 Legacy)", `費爾伯格人是巨人親族，體格高大而常與森林、隱居和自然社群相連。他們重視避免不必要的傷害，也可能為保護親友或自然環境離開家園。`],
  ["雅靈 (Eladrin，2014 Legacy)", `雅靈是與妖精荒野深度相連的精靈，其情緒與外貌可呈現季節般的變化。這些季節特質不是固定性格，而是個人情感、經歷與妖精魔力交織的表現。`],
  ["歌利亞 (Goliath，2014 Legacy)", `歌利亞是高大強健的山地族群，重視在險峻環境中展現能力、承擔責任與尊重同伴。競技與自我超越可以是社群傳統，也不妨礙個人選擇不同道路。`],
  ["熊地精 (Bugbear，2014 Legacy)", `熊地精身形高大、具有地精與妖精荒野的傳承。他們的力量、長肢與潛行天賦不預先決定其生活；家族、部落與個人經驗會形成多種不同身分。`],
  ["蜥蜴人 (Lizardfolk，2014 Legacy)", `蜥蜴人適應沼澤、河岸與荒野環境，外表與思維常受求生經驗形塑。他們可能以實用與社群需求看待世界，但個人情感、忠誠與目標並不因此缺席。`],
  ["影靈 (Shadar-kai，2014 Legacy)", `影靈是與墮影冥界及渡鴉女王相連的精靈。他們的社群長久面對陰影與死亡的記憶，卻仍會追求使命、連結與屬於自己的經驗。`],
  ["龜人 (Tortle，2014 Legacy)", `龜人擁有龜殼與耐心的旅行者形象，許多社群重視簡樸生活、家族和從世界經驗中學習。壽命相對短促也使不少龜人更願意在有限歲月中探索與留下故事。`],
  ["獸人 (Orc，2014 Legacy)", `獸人有強壯體格與深厚氏族傳統，許多故事圍繞求生、榮譽與面對偏見。不同世界中的獸人社群與個體各自選擇信仰、家園與價值，不能由血緣替其定義。`],
]);

const pages = walk(SPECIES_ROOT).filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return isSpeciesPage(file, text) && (!only || file.includes(only));
});

const report = { changed: [], unchanged: [], missingIntroduction: [] };
for (const file of pages) {
  const original = fs.readFileSync(file, "utf8");
  const title = readTitle(original);
  const intro = INTRODUCTIONS.get(title);
  const cleanWithoutIntroduction = title === "定製血統 (Custom Lineage，2014 Legacy)";
  if (cleanWithoutIntroduction && !/^## 種族介紹$/m.test(original)) {
    report.missingIntroduction.push({ title, file: path.relative(ROOT, file) });
  }
  if (!intro && !cleanWithoutIntroduction && !/^## 種族介紹$/m.test(original)) {
    report.missingIntroduction.push({ title, file: path.relative(ROOT, file) });
    continue;
  }
  let next = normalizeRuleHeading(original);
  next = normalizeLegacyNotice(next);
  next = removeImportantSummary(next);
  if (intro) next = addIntroduction(next, intro);
  next = addBasicDataHeading(next);
  if (next !== original || cleanWithoutIntroduction) next = refreshUpdatedDate(next);
  if (next === original) report.unchanged.push({ title, file: path.relative(ROOT, file) });
  else {
    report.changed.push({ title, file: path.relative(ROOT, file) });
    if (apply) fs.writeFileSync(file, next, "utf8");
  }
}

console.log(`${apply ? "套用" : "預覽"}：種族頁 ${pages.length}；變更 ${report.changed.length}；未變更 ${report.unchanged.length}；缺介紹 ${report.missingIntroduction.length}`);
for (const item of report.missingIntroduction) console.log(`待補介紹：${item.file}｜${item.title}`);
