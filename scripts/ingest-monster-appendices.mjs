import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = path.join(root, "原始資料", "怪物圖鑑2025", "附錄B");
const wikiRoot = path.join(root, "wiki", "怪物");
const apply = process.argv.includes("--apply");
const updated = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

if (!fs.existsSync(sourceRoot)) throw new Error("找不到原始資料/怪物圖鑑2025/附錄B。");

function quote(value) { return String(value).replaceAll('"', '\\"'); }
function sourcePath(file) { return path.relative(root, file).replaceAll("\\", "/"); }

const monsterLinks = [];
for (const relative of fs.readdirSync(wikiRoot, { recursive: true })) {
  const file = path.join(wikiRoot, relative);
  if (!relative.endsWith(".md") || !fs.statSync(file).isFile() || !relative.includes(path.sep)) continue;
  const title = fs.readFileSync(file, "utf8").match(/^title:\s+"(.+?)"\s*$/m)?.[1];
  const matched = title?.match(/^(.+?)\s+\((.+)\)$/);
  if (!matched) continue;
  monsterLinks.push({ chinese: matched[1], english: matched[2], target: `wiki/怪物/${relative.replaceAll("\\", "/").replace(/\.md$/, "")}` });
}
monsterLinks.sort((a, b) => `${b.chinese} ${b.english}`.length - `${a.chinese} ${a.english}`.length);

function linkify(text) {
  return text.split(/\r?\n/).map((line) => {
    let output = line;
    const separator = /^\s*\|/.test(line) ? "\\|" : "|";
    for (const monster of monsterLinks) {
      const plain = `${monster.chinese} ${monster.english}`;
      const linked = `[[${monster.target}${separator}${plain}]]`;
      output = output.split(plain).join(linked);
    }
    return output;
  }).join("\n");
}

const specs = [
  { file: "棲息地分組.md", target: "棲息地分組.md", title: "怪物棲息地分組 (Monsters by Habitat)" },
  { file: "挑戰等級分組.md", target: "挑戰等級分組.md", title: "怪物挑戰等級分組 (Monsters by Challenge Rating)" },
  { file: "怪物轉換.md", target: "怪物轉換.md", title: "怪物轉換 (Monster Conversions)" },
  { file: "怪物群類.md", target: "怪物群類.md", title: "怪物群類 (Monsters by Group)" },
];

function page(spec) {
  const rawFile = path.join(sourceRoot, spec.file);
  const raw = fs.readFileSync(rawFile, "utf8");
  const body = raw.replace(/^# .+\r?\n\r?\n?/, "").trim();
  return `---\ntitle: "${quote(spec.title)}"\ncategory: "怪物"\nversion: "2024-Core"\ntags:\n  - "怪物圖鑑2025"\n  - "怪物_索引"\nsources:\n  - file: "${sourcePath(rawFile)}"\n    locator: "L1 標題：${spec.title.split(" (")[0]}"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Monster Manual (2025)"\nerrata: []\nupdated: "${updated}"\n---\n\n# ${spec.title}\n\n${linkify(body)}\n\n## 🔗 相關連結\n\n- [[wiki/怪物/怪物速查索引|怪物速查 (Monster Lists)]]\n`;
}

const indexSource = path.join(sourceRoot, "附錄B：怪物速查.md");
const indexIntro = fs.readFileSync(indexSource, "utf8").replace(/^# .+\r?\n\r?\n?/, "").trim();
const index = `---\ntitle: "怪物速查 (Monster Lists)"\ncategory: "怪物"\nversion: "2024-Core"\ntags:\n  - "怪物圖鑑2025"\n  - "怪物_索引"\nsources:\n  - file: "${sourcePath(indexSource)}"\n    locator: "L1 標題：附錄 B：怪物速查"\n    authority: "官方"\n    translation: "community"\nsource_type: "official"\nconfidence: "confirmed"\nrules_sources:\n  - "Monster Manual (2025)"\nerrata: []\nupdated: "${updated}"\n---\n\n# 怪物速查 (Monster Lists)\n\n${indexIntro}\n\n## 附錄導覽\n\n- [[wiki/怪物/棲息地分組|怪物棲息地分組 (Monsters by Habitat)]]\n- [[wiki/怪物/挑戰等級分組|怪物挑戰等級分組 (Monsters by Challenge Rating)]]\n- [[wiki/怪物/怪物轉換|怪物轉換 (Monster Conversions)]]\n- [[wiki/怪物/怪物群類|怪物群類 (Monsters by Group)]]\n`;

const outputs = [{ target: path.join(wikiRoot, "怪物速查索引.md"), content: index }, ...specs.map((spec) => ({ target: path.join(wikiRoot, spec.target), content: page(spec) }))];
console.log(`怪物資料卡連結：${monsterLinks.length}`);
console.log(`附錄 B 頁面：${outputs.length}`);
for (const output of outputs) console.log(`${apply ? "寫入" : "預覽"}：${path.relative(root, output.target)}`);
if (apply) for (const output of outputs) fs.writeFileSync(output.target, output.content);
