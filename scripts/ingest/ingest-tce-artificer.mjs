import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, frontmatter, loadIngestProfile, loadPublication, parseOptions, writableCandidate } from "../core/ingest-publication-utils.mjs";

const options = parseOptions(); const publicationId = options.publicationId ?? "TCE2020";
const publication = loadPublication(publicationId); const profile = loadIngestProfile(publicationId);
const sourcePath = path.join(ROOT, profile.source_root, profile.inputs.character_options, "職業", "奇械師.md");
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const program = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";
function convert(text) { return execFileSync(python, ["-c", program, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).replace(/(\d+)\s*尺/g, "$1 呎").replaceAll("尺", "呎"); }
const source = path.relative(ROOT, sourcePath).split(path.sep).join("/");
const classTable = `| 等級 | PB | 職業特性 | 已知注法 | 注法數量 | 已知戲法 | 1 環 | 2 環 | 3 環 | 4 環 | 5 環 |\n| :--: | :--: | :--- | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :--: |\n| 1 | +2 | 魔法工藝、施法 | — | — | 2 | 2 | — | — | — | — |\n| 2 | +2 | 物品注法 | 4 | 2 | 2 | 2 | — | — | — | — |\n| 3 | +2 | 奇械師專業、稱手工具 | 4 | 2 | 2 | 3 | — | — | — | — |\n| 4 | +2 | 屬性值提升 | 4 | 2 | 2 | 3 | — | — | — | — |\n| 5 | +3 | 奇械師專業特性 | 4 | 2 | 2 | 4 | 2 | — | — | — |\n| 6 | +3 | 工具專精 | 6 | 3 | 2 | 4 | 2 | — | — | — |\n| 7 | +3 | 靈光一閃 | 6 | 3 | 2 | 4 | 3 | — | — | — |\n| 8 | +3 | 屬性值提升 | 6 | 3 | 2 | 4 | 3 | — | — | — |\n| 9 | +4 | 奇械師專業特性 | 6 | 3 | 2 | 4 | 3 | 2 | — | — |\n| 10 | +4 | 魔法物品熟稔 | 8 | 4 | 3 | 4 | 3 | 2 | — | — |\n| 11 | +4 | 儲法物品 | 8 | 4 | 3 | 4 | 3 | 3 | — | — |\n| 12 | +4 | 屬性值提升 | 8 | 4 | 3 | 4 | 3 | 3 | — | — |\n| 13 | +5 | — | 8 | 4 | 3 | 4 | 3 | 3 | 1 | — |\n| 14 | +5 | 魔法物品專家 | 10 | 5 | 4 | 4 | 3 | 3 | 1 | — |\n| 15 | +5 | 奇械師專業特性 | 10 | 5 | 4 | 4 | 3 | 3 | 2 | — |\n| 16 | +5 | 屬性值提升 | 10 | 5 | 4 | 4 | 3 | 3 | 2 | — |\n| 17 | +6 | — | 10 | 5 | 4 | 4 | 3 | 3 | 3 | 1 |\n| 18 | +6 | 魔法物品大師 | 12 | 6 | 4 | 4 | 3 | 3 | 3 | 1 |\n| 19 | +6 | 屬性值提升 | 12 | 6 | 4 | 4 | 3 | 3 | 3 | 2 |\n| 20 | +6 | 奇械之魂 | 12 | 6 | 4 | 4 | 3 | 3 | 3 | 2 |`;
let raw = convert(fs.readFileSync(sourcePath, "utf8")).replace(/^#\s+.+$/m, "").trim();
raw = raw.replace(/\*\*奇械師職業表\*\*[\s\S]*?(?=\*\*生命值 Hit Points\*\*)/, `### 奇械師職業表\n\n${classTable}\n\n`);
raw = raw.replace(/\*\*([^*\n]+?)\s+([A-Za-z][A-Za-z'’ -]+)\*\*\s*\n\s*_第(\d+)級奇械師特性_/g, "#### $3 級：$1 ($2)");
raw = raw.replace(/\*\*(生命值|熟練項|裝備|職業特性)\s+([A-Za-z][A-Za-z'’ -]+)\*\*/g, "### $1 ($2)");
const metadata = frontmatter({ publicationId, publication, kind: "class", concept: "Artificer", title: "奇械師 (Artificer，2014 Legacy)", category: "職業", tag: "職業_奇械師", source, locator: "# 奇械師（TCE）" }).replace(/\n---$/, '\nentry_type: "職業"\n---');
const content = `${metadata}\n\n# 奇械師 (Artificer，2014 Legacy)\n\n> [!WARNING]\n> 本條目為 2014 舊版職業；2024 新版請參閱 [[奇械師|奇械師 (Artificer)]]。\n\n**職業定位**：以工具引導魔法、製造與強化物品的半施法職業。\n\n## ⚙️ 規則條文 (Rule Text)\n\n${raw}\n\n### 奇械師子職 (Artificer Specialists)\n\n- [[職業/2014/奇械師/煉金師|煉金師 (Alchemist)]]\n- [[職業/2014/奇械師/魔炮師|魔炮師 (Artillerist)]]\n- [[職業/2014/奇械師/裝甲師|裝甲師 (Armorer)]]\n- [[職業/2014/奇械師/戰地匠師|戰地匠師 (Battle Smith)]]\n\n## 🔗 相關連結\n\n- [[規則/2014/角色建立與成長/塔莎的萬事坩堝/奇械師/奇械師注法|奇械師注法 (Artificer Infusions)]]\n- [[規則/2014/角色建立與成長/塔莎的萬事坩堝/奇械師/奇械師法術列表|奇械師法術列表 (Artificer Spell List)]]\n- [[奇械師|奇械師 (Artificer)]]\n`;
writableCandidate({ destination: path.join(ROOT, "wiki", "職業", "2014", "奇械師.md"), content, options });
console.log("TCE 奇械師：1 頁。");
