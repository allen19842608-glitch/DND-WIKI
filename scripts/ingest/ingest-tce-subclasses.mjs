import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT, applyCandidateBatch, candidateChange, frontmatter, loadIngestProfile, loadPublication, parseOptions, planCandidateBatch,
} from "../core/ingest-publication-utils.mjs";
import { lintWiki } from "../core/wiki-lint.mjs";

const options = parseOptions();
if (options.apply && !options.report) throw new Error("套用 Wiki 變更必須指定 --report reports/<plan>.json，以保留可追溯報告。");
const pending = [];
const staged = new Map();
const publicationId = process.argv.includes("--publication") ? options.publicationId : "TCE2020";
const publication = loadPublication(publicationId);
const profile = loadIngestProfile(publicationId);
const sourceRoot = path.join(ROOT, profile.source_root, profile.inputs.character_options, "職業");
const outputRoot = path.join(ROOT, profile.outputs.classes);
const openccRoot = process.env.DND_WIKI_OPENCC_PATH ?? "C:\\Users\\Owner\\.codex\\tools\\dnd-wiki-opencc";
const python = process.env.DND_WIKI_PYTHON ?? "C:\\Users\\Owner\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const openccProgram = "import sys;sys.path.insert(0,sys.argv[1]);from opencc import OpenCC;sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))";

const parents = new Map([
  ["吟遊詩人（TCE）", ["吟遊詩人", "Bard"]], ["邪術師（TCE）", ["契術師", "Warlock"]],
  ["奇械師", ["奇械師", "Artificer"]], ["武僧（TCE）", ["武僧", "Monk"]], ["法師（TCE）", ["法師", "Wizard"]],
  ["牧師（TCE）", ["牧師", "Cleric"]], ["術士（TCE）", ["術士", "Sorcerer"]], ["野蠻人（TCE）", ["野蠻人", "Barbarian"]],
  ["聖武士（TCE）", ["聖騎士", "Paladin"]], ["遊俠（TCE）", ["遊俠", "Ranger"]], ["遊蕩者（TCE）", ["遊蕩者", "Rogue"]],
  ["德魯伊（TCE）", ["德魯伊", "Druid"]], ["戰士（TCE）", ["戰士", "Fighter"]],
]);
const titleOverrides = new Map([
  ["符文騎士.md", ["符文騎士", "Rune Knight"]], ["靈能武士.md", ["靈能武士", "Psi Warrior"]],
  ["命流宗.md", ["命流宗", "Way of Mercy"]], ["星我宗.md", ["星我宗", "Way of the Astral Self"]],
  ["鬼魅.md", ["鬼魅", "Phantom"]], ["魂刃.md", ["魂刃", "Soulknife"]],
  ["守望之誓.md", ["守望之誓", "Oath of the Watchers"]], ["榮耀之誓.md", ["榮耀之誓", "Oath of Glory"]],
  ["狂野魔法道途.md", ["狂野魔法道途", "Path of Wild Magic"]], ["野獸道途.md", ["野獸道途", "Path of the Beast"]],
  ["妖精漫遊者.md", ["妖精漫遊者", "Fey Wanderer"]], ["集群牧者.md", ["集群牧者", "Swarmkeeper"]],
  ["馴獸師夥伴.md", ["馴獸師夥伴", "Beast Master"]], ["孢子結社.md", ["孢子結社", "Circle of Spores"]],
  ["星辰結社.md", ["星辰結社", "Circle of Stars"]], ["野火結社.md", ["野火結社", "Circle of Wildfire"]],
  ["創造學院.md", ["創造學院", "College of Creation"]], ["雄辯學院.md", ["雄辯學院", "College of Eloquence"]],
  ["巨靈宗主.md", ["巨靈宗主", "The Genie"]], ["深海意志.md", ["深海意志", "The Fathomless"]],
  ["書士會.md", ["書士會", "Order of Scribes"]], ["劍詠.md", ["劍詠", "Bladesinging"]],
  ["和平領域.md", ["和平領域", "Peace Domain"]], ["秩序領域.md", ["秩序領域", "Order Domain"]], ["暮光領域.md", ["暮光領域", "Twilight Domain"]],
  ["時械之魂.md", ["時械之魂", "Clockwork Soul"]], ["畸變心智.md", ["畸變心智", "Aberrant Mind"]],
  ["裝甲師.md", ["裝甲師", "Armorer"]], ["戰地匠師.md", ["戰地匠師", "Battle Smith"]], ["鍊金師.md", ["煉金師", "Alchemist"]], ["魔炮師.md", ["魔炮師", "Artillerist"]],
]);

function convert(text) {
  if (!fs.existsSync(openccRoot)) throw new Error(`找不到 OpenCC：${openccRoot}`);
  return execFileSync(python, ["-c", openccProgram, openccRoot], { input: text, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .replace(/(\d+)\s*尺/g, "$1 呎").replace(/(\d+)\s*(分鐘|小時|輪|磅)/g, "$1 $2")
    .replaceAll("尺", "呎").replaceAll("聖武士", "聖騎士").replaceAll("邪術師", "契術師").replaceAll("魔契師", "契術師");
}
function safeName(name) { return name.replace(/[\\/:*?"<>|]/g, "-").trim(); }
function sourceOf(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function titleFrom(lines, file) {
  const line = lines.find((value) => /^##\s+.+\s+[A-Z]/.test(value));
  const match = line?.match(/^##\s+(.+?)\s+([A-Z][A-Za-z'’\- ]+)$/);
  return match ? [match[1].trim(), match[2].trim()] : titleOverrides.get(path.basename(file));
}
function featureHeadings(lines) {
  return lines.flatMap((line, index) => {
    const match = line.match(/^\*\*([^*]+?)\s+([A-Z][A-Za-z'’\- ]+)\*\*$/);
    const level = lines[index + 1]?.match(/^_+第\s*(\d+)\s*級.*特性_+$/)?.[1];
    return match && level ? [{ index, level: Number(level), chinese: match[1].trim(), english: match[2].trim() }] : [];
  });
}
function introduction(lines, firstFeature) {
  return lines.slice(0, firstFeature?.index ?? lines.length).filter((line) => line.trim() && !/^#|^##/.test(line) && !/^—/.test(line)).join(" ").replace(/\s+/g, " ").slice(0, 700);
}
function details(lines, features) {
  return features.map((feature, index) => {
    const end = features[index + 1]?.index ?? lines.length;
    const body = lines.slice(feature.index + 2, end).filter((line) => line.trim() && !/^_+第\s*\d+\s*級.*特性_+$/.test(line)).join("\n").trim();
    return `#### ${feature.level} 級：${feature.chinese} (${feature.english})\n\n- **效果**：${body || "依可定位來源補齊。"}`;
  }).join("\n\n");
}
function currentCounterpart(parent, english) {
  const directory = path.join(ROOT, "wiki", "職業", parent);
  if (!fs.existsSync(directory)) return undefined;
  return fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => path.join(directory, entry.name))
    .find((file) => (fs.readFileSync(file, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? "").includes(`(${english})`));
}
function addBacklink(current, target, title) {
  if (!current) return;
  let text = staged.get(current) ?? fs.readFileSync(current, "utf8"); const link = `[[${target}|${title}]]`;
  if (text.includes(link)) return;
  text = text.replace(/(## 🔗 相關連結\r?\n\r?\n)/, `$1- ${link}\n`);
  queueWrite(current, text, "現行子職反向連結");
}

function queueWrite(destination, content, locator) {
  const before = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : null;
  if (before === content || staged.get(destination) === content) return;
  staged.set(destination, content);
  const change = candidateChange({ destination, before, after: content, operation: before === null ? "create" : "update", source: locator, locator });
  const index = pending.findIndex((item) => item.target === change.target);
  if (index >= 0) pending[index] = change;
  else pending.push(change);
}

function queueCandidate(destination, content, matchValues = []) {
  const filter = String(options.only ?? "").normalize("NFKC").toLowerCase();
  if (filter && !matchValues.concat(destination).some((value) => String(value).normalize("NFKC").toLowerCase().includes(filter))) return false;
  if (fs.existsSync(destination) && !options.replace) return false;
  queueWrite(destination, content, matchValues.at(-1) ?? destination);
  return true;
}

const indexEntries = [];
for (const [rawParent, [parent, parentEnglish]] of parents) {
  const inputDirectory = path.join(sourceRoot, rawParent);
  if (!fs.existsSync(inputDirectory)) continue;
  for (const entry of fs.readdirSync(inputDirectory).filter((name) => name.endsWith(".md"))) {
    const input = path.join(inputDirectory, entry); const lines = convert(fs.readFileSync(input, "utf8")).split(/\r?\n/);
    const title = titleFrom(lines, input); const features = featureHeadings(lines);
    if (!title || !features.length) continue;
    const [chinese, english] = title; const source = sourceOf(input); const current = currentCounterpart(parent, english);
    const legacyTitle = `${chinese} (${english}，2014 Legacy)`; const rows = [...new Map(features.map((feature) => [feature.level, []])).entries()];
    for (const feature of features) rows.find(([level]) => level === feature.level)[1].push(feature.chinese);
    const table = rows.map(([level, names]) => `| ${level} | ${names.join("、")} |`).join("\n");
    const currentLink = current ? `- [[職業/${parent}/${path.basename(current, ".md")}|${fs.readFileSync(current, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? path.basename(current, ".md")}]]\n` : "";
    const metadata = frontmatter({ publicationId, publication, kind: "subclass", concept: english, title: legacyTitle, category: "職業", tag: `子職_${parent}`, source, locator: `# ${chinese}` })
      .replace(/\n---$/, `\nentry_type: "子職"\nparent_class: "${parent}"\n---`);
    const content = `${metadata}\n\n# ${legacyTitle}\n\n> [!WARNING] 本條目為 2014 舊版規則。${current ? `2024 新版請參閱 [[職業/${parent}/${path.basename(current, ".md")}|${fs.readFileSync(current, "utf8").match(/^title: "(.+?)"$/m)?.[1] ?? path.basename(current, ".md")}]]。` : ""}\n\n**子職定位**：${introduction(lines, features[0]) || "依可定位來源確認。"}\n\n## ⚙️ 規則條文 (Rule Text)\n\n### 子職特性表\n\n| 職業等級 | 子職特性 |\n| :--: | :--- |\n${table}\n\n### 子職特性詳解\n\n${details(lines, features)}\n\n## 🔗 相關連結\n\n- [[職業/${parent}|${parent} (${parentEnglish})]]\n${currentLink}`;
    const destination = path.join(outputRoot, parent, `${safeName(chinese)}.md`);
    const queued = queueCandidate(destination, content, [chinese, english, source]);
    if (queued && current) addBacklink(current, `職業/2014/${parent}/${safeName(chinese)}`, legacyTitle);
    indexEntries.push({ parent, parentEnglish, chinese, english, file: safeName(chinese), source });
  }
}
console.log(`TCE 子職：${indexEntries.length} 個。`);

const plan = planCandidateBatch(pending, { root: ROOT, lint: lintWiki });
if (options.report) {
  const reportPath = path.resolve(ROOT, options.report);
  if (!reportPath.startsWith(`${path.join(ROOT, "reports")}${path.sep}`)) throw new Error("報告只能輸出至 reports/。");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}
if (options.apply) {
  const result = applyCandidateBatch(plan, { root: ROOT, lint: lintWiki });
  console.log(`已套用 TCE 子職：${result.applied.length} 個候選變更。`);
} else {
  console.log(`預覽 TCE 子職：${plan.changes.length} 個候選變更；加入 --apply 才會寫入。`);
}
