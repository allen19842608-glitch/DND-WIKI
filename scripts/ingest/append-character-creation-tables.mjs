import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const raw = path.join(root, "原始資料", "玩家手冊2024", "創建角色");
const targets = new Map([
  ["創建角色.md", ["創建你的角色.md", "第一步：選擇職業.md", "第二步：確定起源.md", "第四步：選擇陣營.md"]],
  ["屬性值與角色細節.md", ["第三步：確定屬性值.md", "第五步：豐富細節.md"]],
  ["兼職.md", ["兼職.md"]],
  ["等級提升.md", ["等級提升.md", "以更高等級開始.md"]],
  ["飾品.md", ["飾品.md"]],
]);
const destination = path.join(root, "wiki", "規則", "角色建立與成長");
const apply = process.argv.includes("--apply");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : undefined;

function tablesFrom(file) {
  const lines = fs.readFileSync(path.join(raw, file), "utf8").split(/\r?\n/);
  const groups = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith("|")) continue;
    const table = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) table.push(lines[i++]);
    i -= 1;
    let title = lines.slice(0, i - table.length + 1).reverse().find((line) => line.trim().startsWith("**"))?.trim();
    title = title?.replace(/^\*\*|\*\*$/g, "").replace(/。$/, "") ?? "來源表格";
    groups.push(`### ${title}\n\n${table.join("\n")}`);
  }
  return groups;
}

for (const [target, inputs] of targets) {
  if (only && !target.includes(only)) continue;
  const output = path.join(destination, target);
  let text = fs.readFileSync(output, "utf8");
  text = text.replace(/\n## 完整來源表格[\s\S]*?(?=\n## 🔗 相關連結)/, "");
  const tables = inputs.flatMap(tablesFrom);
  if (tables.length) text = text.replace("\n## 🔗 相關連結", `\n## 完整來源表格\n\n${tables.join("\n\n")}\n\n## 🔗 相關連結`);
  if (apply) fs.writeFileSync(output, text, "utf8");
  console.log(`${apply ? "更新" : "預覽"}：${path.relative(root, output)}`);
}
