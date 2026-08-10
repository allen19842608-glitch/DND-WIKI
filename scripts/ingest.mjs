import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const values = process.argv.slice(2);

function option(name) {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] : undefined;
}

const category = option("--category");
const apply = values.includes("--apply");
const only = option("--only");
const itemType = option("--type") ?? "戒指";
const replace = values.includes("--replace");
const diff = values.includes("--diff");

if (!category) {
  process.stderr.write("缺少 --category。可用：職業、魔法物品、角色建立與成長。\n");
  process.exit(1);
}

let script;
let args = [];
if (category === "職業") {
  script = "scripts/ingest-classes.mjs";
  if (!apply) args.push("--dry-run");
  if (only) args.push("--only", only);
  if (replace) args.push("--replace");
  if (diff) args.push("--diff");
} else if (category === "魔法物品") {
  script = "scripts/ingest-magic-items.mjs";
  args.push(itemType, apply ? "--apply" : "--dry-run");
  if (only) args.push("--only", only);
  if (replace) args.push("--force");
} else if (category === "角色建立與成長") {
  script = "scripts/append-character-creation-tables.mjs";
  if (apply) args.push("--apply");
  if (only) args.push("--only", only);
} else {
  process.stderr.write(`不支援的 category：${category}\n`);
  process.exit(1);
}

process.stdout.write(`${apply ? "套用" : "預覽"}：${category}\n`);
const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", stdio: "inherit" });
process.exit(result.status ?? 1);
