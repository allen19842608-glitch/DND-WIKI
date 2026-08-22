import fs from "node:fs";
import path from "node:path";
import { ROOT, today } from "../core/ingest-publication-utils.mjs";

const spellRoot = path.join(ROOT, "wiki", "法術");
const identical = new Set(["火焰箭", "魔法飛彈", "護盾術", "迷蹤步", "寒冰錐", "連鎖閃電", "時間停止"]);

function pages(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(root, item.name);
    if (item.isDirectory()) return pages(target);
    return item.isFile() && item.name.endsWith(".md") && !item.name.endsWith("法術索引.md") ? [target] : [];
  });
}

function wikiPath(file) {
  return path.relative(spellRoot, file).replaceAll(path.sep, "/").replace(/\.md$/, "");
}

function title(file) {
  const text = fs.readFileSync(file, "utf8");
  return text.match(/^title: "([^"]+)"/m)?.[1] ?? path.basename(file, ".md");
}

function versionLink(target, targetTitle, targetVersion) {
  return `[[法術/${target}|${targetTitle.replace(/\)$/, `，${targetVersion})`) }]]`;
}

function versionSection({ link, targetVersion }) {
  const priority = targetVersion === "2024" ? "若採用 2024 規則，仍以 2024 PHB 的文字敘述為準。" : "若採用 2024 規則，仍以本頁所載《玩家手冊 2024》條文為準。";
  return `## 版本對照\n\n- **${targetVersion} 版**：${link} 的核心機制相同。${priority}\n`;
}

function update(file, { link, section }) {
  let text = fs.readFileSync(file, "utf8");
  const existing = /## 版本對照\n[\s\S]*?(?=\n## |$)/;
  if (section) {
    text = existing.test(text)
      ? text.replace(existing, section.trimEnd())
      : text.replace(/\r?\n## 🔗 相關連結/, `\n${section}\n## 🔗 相關連結`);
  } else {
    text = text.replace(existing, "");
    if (!text.includes(link)) text = text.replace(/(## 🔗 相關連結\r?\n)/, `$1\n- ${link}\n`);
  }
  text = text.replace(/^updated: "\d{4}-\d{2}-\d{2}"/m, `updated: "${today()}"`);
  fs.writeFileSync(file, text, "utf8");
}

const legacy = pages(path.join(spellRoot, "2014"));
const current = pages(spellRoot).filter((file) => !file.startsWith(path.join(spellRoot, "2014")));
const currentByName = new Map(current.map((file) => [path.basename(file, ".md"), file]));
let linked = 0;

for (const legacyFile of legacy) {
  const name = path.basename(legacyFile, ".md");
  const currentFile = currentByName.get(name);
  if (!currentFile) continue;
  const same = identical.has(name);
  const currentLink = versionLink(wikiPath(currentFile), title(currentFile), "2024");
  const legacyLink = versionLink(wikiPath(legacyFile), title(legacyFile), "2014 Legacy");
  update(legacyFile, { link: currentLink, section: same ? versionSection({ link: currentLink, targetVersion: "2024" }) : null });
  update(currentFile, { link: legacyLink, section: same ? versionSection({ link: legacyLink, targetVersion: "2014 Legacy" }) : null });
  linked += 1;
}

console.log(`已同步 ${linked} 組同名法術的雙向版本連結。`);
