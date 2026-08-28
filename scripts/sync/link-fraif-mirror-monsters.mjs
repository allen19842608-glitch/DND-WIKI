import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ROOT } from "../core/ingest-publication-utils.mjs";

const RAW = "原始資料/被遺忘的國度：費倫冒險/第九章";
const DATASET = "原始資料/外部來源鏡像/FRAIF2025/datasets/bestiary-fraif.json";

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : entry.name.endsWith(".md") ? [file] : [];
  });
}

function rel(file) { return path.relative(ROOT, file).split(path.sep).join("/"); }
function rawSignature(text) {
  const ac = text.match(/^\*\*AC\*\*\s*(\d+)/m)?.[1];
  const hp = text.match(/^\*\*HP\*\*\s*(\d+)/m)?.[1];
  const cr = text.match(/^\*\*CR\*\*\s*([\d/]+)/m)?.[1];
  return ac && hp && cr ? `${ac}|${hp}|${cr}` : null;
}

function monsterSignature(monster) {
  const ac = Array.isArray(monster.ac) ? monster.ac.find((item) => Number.isInteger(item)) : monster.ac;
  const hp = monster.hp?.average;
  const cr = typeof monster.cr === "string" ? monster.cr : monster.cr?.cr;
  return Number.isInteger(ac) && Number.isInteger(hp) && cr ? `${ac}|${hp}|${cr}` : null;
}

export function linkFraifMirrorMonsters({ apply = false } = {}) {
  const monsters = JSON.parse(fs.readFileSync(path.join(ROOT, DATASET), "utf8")).monster ?? [];
  const rawFiles = walk(path.join(ROOT, RAW));
  const rawBySignature = new Map();
  for (const file of rawFiles) {
    const signature = rawSignature(fs.readFileSync(file, "utf8"));
    if (!signature) continue;
    const values = rawBySignature.get(signature) ?? [];
    values.push(rel(file));
    rawBySignature.set(signature, values);
  }
  const rawByEnglish = new Map();
  for (const monster of monsters) {
    const matches = rawBySignature.get(monsterSignature(monster)) ?? [];
    if (matches.length === 1) rawByEnglish.set(monster.name, matches[0]);
  }
  const changes = [];
  for (const wikiFile of walk(path.join(ROOT, "wiki", "怪物"))) {
    if (rel(wikiFile).startsWith("wiki/怪物/介紹/")) continue;
    let text = fs.readFileSync(wikiFile, "utf8");
    for (const [english, rawFile] of rawByEnglish) {
      if (!text.includes(`file: "${rawFile}"`) || text.includes(`locator: "monster: ${english}"`)) continue;
      text = text.replace(/^source_type:/m, `  - file: "${DATASET}"\n    locator: "monster: ${english}"\n    authority: "官方"\n    translation: "none"\nsource_type:`);
      changes.push({ page: rel(wikiFile), english, raw: rawFile });
    }
    if (apply && changes.some((item) => item.page === rel(wikiFile))) fs.writeFileSync(wikiFile, text, "utf8");
  }
  const unmatched = monsters.filter((monster) => !rawByEnglish.has(monster.name)).map((monster) => monster.name);
  return { mapped: rawByEnglish.size, changes, unmatched };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const result = linkFraifMirrorMonsters({ apply: process.argv.includes("--apply") });
  process.stdout.write(`FRAIF 怪物鏡像來源：映射 ${result.mapped}；更新 ${result.changes.length}；未映射 ${result.unmatched.length}。\n`);
  if (result.unmatched.length) process.stdout.write(`未映射：${result.unmatched.join("、")}\n`);
}
