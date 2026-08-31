import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const values = process.argv.slice(2);

function option(name) {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] : undefined;
}

const category = option("--category");
const apply = values.includes("--apply");
const only = option("--only");
const itemType = option("--type") ?? "戒指";
const source = option("--source");
const report = option("--report");
const includeOverviews = values.includes("--include-overviews");
const pruneStale = values.includes("--prune-stale");
const replace = values.includes("--replace");
const diff = values.includes("--diff");
const publication = option("--publication");
const patch = option("--patch");
const setting = option("--setting");
const sourceMode = option("--source-mode");

if (patch) {
  if (category) {
    process.stderr.write("--patch 不能與 --category 同時使用。\n");
    process.exit(1);
  }
  const args = ["scripts/ingest/ingest-patches.mjs", "--patch", patch];
  if (apply) args.push("--apply");
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", stdio: "inherit" });
  process.exit(result.status ?? 1);
}

if (!category) {
  process.stderr.write("缺少 --category 或 --patch。類別可用：職業、種族、背景、法術、專長、魔法物品、角色建立與成長、怪物、戰役設定。\n");
  process.exit(1);
}

let script;
let args = [];
if (category === "職業") {
  script = "scripts/ingest/ingest-classes.mjs";
  if (apply) args.push("--apply");
  else args.push("--dry-run");
  if (only) args.push("--only", only);
  if (replace) args.push("--replace");
  if (diff) args.push("--diff");
  if (report) args.push("--report", report);
} else if (category === "魔法物品") {
  script = "scripts/ingest/ingest-magic-items.mjs";
  args.push(itemType, apply ? "--apply" : "--dry-run");
  if (only) args.push("--only", only);
  if (replace) args.push("--force");
} else if (["種族", "背景", "法術", "專長"].includes(category)) {
  script = { 種族: "scripts/ingest/ingest-species.mjs", 背景: "scripts/ingest/ingest-backgrounds.mjs", 法術: "scripts/ingest/ingest-spells.mjs", 專長: "scripts/ingest/ingest-feats.mjs" }[category];
  if (apply) args.push("--apply");
  if (replace) args.push("--replace");
  if (only) args.push("--only", only);
  if (source) args.push("--source", source);
  if (report) args.push("--report", report);
} else if (category === "角色建立與成長") {
  script = "scripts/ingest/append-character-creation-tables.mjs";
  if (apply) args.push("--apply");
  if (only) args.push("--only", only);
} else if (category === "怪物") {
  script = "scripts/ingest/ingest-monsters.mjs";
  if (!source) {
    process.stderr.write("怪物吸收必須指定 --source，例如：原始資料/怪物圖鑑2025。\n");
    process.exit(1);
  }
  args.push("--source", source);
  if (report) args.push("--report", report);
  if (includeOverviews) args.push("--include-overviews");
  if (pruneStale) args.push("--prune-stale");
  if (apply) args.push("--apply");
  if (!apply) args.push("--dry-run");
  if (only) args.push("--only", only);
  if (replace) args.push("--replace");
  if (diff) args.push("--diff");
} else if (category === "戰役設定") {
  if (!publication) {
    process.stderr.write("戰役設定吸收必須指定 --publication，例如：SCAG2015。\n");
    process.exit(1);
  }
  script = "scripts/ingest/ingest-lore.mjs";
  if (setting) args.push("--setting", setting);
  if (sourceMode) args.push("--source-mode", sourceMode);
  if (itemType && itemType !== "戒指") args.push("--type", itemType);
  if (only) args.push("--only", only);
  if (report) args.push("--report", report);
  else if (values.includes("--report")) args.push("--report");
  if (diff) args.push("--diff");
  if (apply) args.push("--apply");
} else {
  process.stderr.write(`不支援的 category：${category}\n`);
  process.exit(1);
}

if (publication) args.push("--publication", publication);

process.stdout.write(`${apply ? "套用" : "預覽"}：${category}\n`);
const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", stdio: "inherit" });
process.exit(result.status ?? 1);
